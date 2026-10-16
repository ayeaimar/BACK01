import multer from 'multer'

export const MAX_IMAGE_SIZE_MB = 5
export const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
]

// La imagen queda en memoria (req.file.buffer). El servicio de storage decide
// si se guarda en el filesystem local o en Postimages.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_IMAGE_SIZE_MB * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
            return cb(null, true)
        }
        return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname))
    },
})

// Campo del formulario: "image"
export const uploadProductImage = (req, res, next) => {
    upload.single('image')(req, res, (error) => {
        if (!error) return next()

        if (error instanceof multer.MulterError) {
            const messages = {
                LIMIT_FILE_SIZE: `La imagen no puede superar los ${MAX_IMAGE_SIZE_MB} MB`,
                LIMIT_UNEXPECTED_FILE:
                    'Formato no permitido. Use JPG, PNG, WEBP o GIF (campo "image")',
                LIMIT_FILE_COUNT: 'Solo se puede subir una imagen',
            }
            return res
                .status(400)
                .json({ message: messages[error.code] || error.message })
        }

        return next(error)
    })
}
