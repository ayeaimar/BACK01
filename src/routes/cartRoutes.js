import express from 'express'
import {
    addToCart,
    getCart,
    updateCart,
    removeProductFromCart,
    clearCart,
    getCartTotal,
} from '../controllers/cartControllers.js'
import { validateIsLoggedIn } from '../middlewares/authMiddleware.js'
const router = express.Router()

// Rutas que verificarn que el usuario accesa solo a su propio carrito
router.get('/get/:userId', validateIsLoggedIn, getCart) // getCart

router.get('/total/:userId', validateIsLoggedIn, getCartTotal) // getCartTotal

router.put('/update/:userId', validateIsLoggedIn, updateCart) // updateCart

router.delete(
    '/removeProduct/:userId',
    validateIsLoggedIn,
    removeProductFromCart
) // removeProductFromCart

router.delete('/clear/:userId', validateIsLoggedIn, clearCart) // clearCart

// Ruta para agregar al carrito (no necesita userId)
router.post('/add', validateIsLoggedIn, addToCart) // addToCart

export default router
