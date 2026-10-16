import express from 'express'
import {
    createProduct,
    deleteProduct,
    getAllProducts,
    getProductById,
    setProductImage,
    updateProduct,
} from '../controllers/productsControllers.js'
import {
    validateIsLoggedIn,
    isAdmin,
} from '../middlewares/authMiddleware.js'
import { uploadProductImage } from '../middlewares/upload.middleware.js'

const router = express.Router()

// Públicas
router.get('/', getAllProducts)
router.get('/:id', getProductById)

// Solo administradores. La imagen se envía como multipart/form-data en el campo "image".
router.post(
    '/',
    validateIsLoggedIn,
    isAdmin,
    uploadProductImage,
    createProduct
)
router.put(
    '/:id',
    validateIsLoggedIn,
    isAdmin,
    uploadProductImage,
    updateProduct
)
router.patch(
    '/:id/image',
    validateIsLoggedIn,
    isAdmin,
    uploadProductImage,
    setProductImage
)
router.delete('/:id', validateIsLoggedIn, isAdmin, deleteProduct)

export default router
