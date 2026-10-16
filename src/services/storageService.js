import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import axios from 'axios'

/*
 * Guarda las imágenes de los productos en uno de dos lugares, según la variable
 * de entorno STORAGE_PROVIDER:
 *   - "local"   (por defecto): carpeta /uploads del backend, servida en /uploads
 *   - "postimg": Postimages (https://postimages.org), necesita POSTIMG_API_KEY
 */

export const UPLOAD_DIR = path.join(process.cwd(), 'uploads')
const POSTIMG_UPLOAD_URL = 'https://api.postimage.org/1/upload'

// Extensión según el contenido real del archivo (no se confía en el nombre ni
// en el mimetype que manda el navegador).
const detectImageType = (buffer) => {
    if (!buffer || buffer.length < 12) return null
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg'
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png'
    if (buffer.subarray(0, 4).toString('ascii') === 'GIF8') return 'gif'
    if (
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
        return 'webp'
    }
    return null
}

export class StorageError extends Error {
    constructor(message, status = 500) {
        super(message)
        this.status = status
    }
}

const getProvider = () => (process.env.STORAGE_PROVIDER || 'local').toLowerCase()

const getPublicBaseUrl = (req) =>
    (process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '')

const saveLocal = async (buffer, extension, req) => {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
    const fileName = `prod-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${extension}`
    await fs.writeFile(path.join(UPLOAD_DIR, fileName), buffer)
    return `${getPublicBaseUrl(req)}/uploads/${fileName}`
}

const saveToPostimg = async (buffer, extension, originalName) => {
    const apiKey = process.env.POSTIMG_API_KEY
    if (!apiKey) {
        throw new StorageError('Falta configurar POSTIMG_API_KEY en el .env')
    }

    const baseName = path.parse(originalName || 'producto').name.replace(/[^\w-]/g, '_') || 'producto'
    const params = new URLSearchParams({
        key: apiKey,
        o: '2b819584285c102318568238c7d4a4c7',
        m: '59c2ad4b46b0c1e12d5703302bff0120',
        version: '1.0.1',
        portable: '1',
        name: baseName,
        type: extension,
        image: buffer.toString('base64'),
    })

    let response
    try {
        response = await axios.post(POSTIMG_UPLOAD_URL, params.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 30000,
            maxBodyLength: Infinity,
        })
    } catch (error) {
        console.error('Error subiendo imagen a Postimages:', error.message)
        throw new StorageError('No se pudo subir la imagen a Postimages', 502)
    }

    // La API responde XML; el link directo a la imagen está en <hotlink>
    const hotlink = String(response.data).match(/<hotlink>\s*([^<\s]+)\s*<\/hotlink>/i)?.[1]
    if (!hotlink) {
        console.error('Respuesta inesperada de Postimages:', String(response.data).slice(0, 300))
        throw new StorageError('Postimages no devolvió la URL de la imagen', 502)
    }
    return hotlink
}

/**
 * Guarda la imagen subida con multer (req.file) y devuelve su URL pública.
 */
export const saveProductImage = async (file, req) => {
    const extension = detectImageType(file?.buffer)
    if (!extension) {
        throw new StorageError('El archivo no es una imagen válida (JPG, PNG, WEBP o GIF)', 400)
    }

    const provider = getProvider()
    if (provider === 'postimg') {
        return saveToPostimg(file.buffer, extension, file.originalname)
    }
    if (provider === 'local') {
        return saveLocal(file.buffer, extension, req)
    }
    throw new StorageError(`STORAGE_PROVIDER inválido: "${provider}". Use "local" o "postimg"`)
}

/**
 * Borra una imagen guardada en el filesystem local. Las imágenes de Postimages u
 * otras URLs externas no se tocan. Nunca lanza error: un archivo que no se pudo
 * borrar no debe romper la operación principal.
 */
export const deleteLocalImage = async (imageUrl) => {
    try {
        if (!imageUrl) return
        const { pathname } = new URL(imageUrl)
        if (!pathname.startsWith('/uploads/')) return

        const fileName = path.basename(pathname)
        const filePath = path.join(UPLOAD_DIR, fileName)
        if (path.dirname(filePath) !== UPLOAD_DIR) return

        await fs.unlink(filePath)
    } catch (error) {
        if (error?.code !== 'ENOENT') {
            console.warn('No se pudo borrar la imagen local:', error.message)
        }
    }
}
