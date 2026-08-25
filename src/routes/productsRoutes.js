import express from 'express'
import {
    createProduct,
    deleteProduct,
    getAllProducts,
    getProductById,
    updateProduct,
} from '../controllers/productsControllers.js'

const router = express.Router()

// Rutas publicas
router.get('/', getAllProducts)

router.get('/:id', getProductById)

// Rutas protegidas donde solo administradores pueden modificar productos
router.post('/', createProduct) // crear producto
router.put('/:id', updateProduct) // actualzar producto
router.delete('/:id', deleteProduct) // eliminar un producto

export default router
