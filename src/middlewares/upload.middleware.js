import multer from 'multer'
import path from 'path'
import fs from 'fs'

// Carpeta uploads en la raíz del proyecto backend
const uploadDir = path.join(process.cwd(), 'uploads')

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
}

// 1. Storage para Filesystem local (disco)
const diskStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir)
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname)
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
        cb(null, `prod-${uniqueSuffix}${ext}`)
    },
})

// 2. Storage en Memoria (para enviar directo a la API de Postimages)
const memoryStorage = multer.memoryStorage()

export const uploadLocal = multer({ storage: diskStorage })
export const uploadMemory = multer({ storage: memoryStorage })