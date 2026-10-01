import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import {
    createProduct,
    deleteProduct,
    getAllProducts,
    getProductById,
    updateProduct,
} from '../controllers/productsControllers.js'

const router = express.Router()

// Asegurar que la carpeta uploads exista
const uploadDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
}

// Configuración de Multer para guardar en disco local
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname)
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`)
    },
})

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            return cb(null, true)
        }

        return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'imageUrl'))
    },
})

// Rutas
router.get('/', getAllProducts)
router.get('/:id', getProductById)


// Subida de imagen con el campo 'imageUrl'
router.post('/', upload.single('imageUrl'), createProduct)
router.put('/:id', upload.single('imageUrl'), updateProduct)
router.delete('/:id', deleteProduct)

export default router