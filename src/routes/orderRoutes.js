import express from 'express'
import { createOrder } from '../controllers/orderControllers.js'
import { validateIsLoggedIn } from '../middlewares/authMiddleware.js'

const router = express.Router()

// Crear nueva orden de compra y generar preferencia de pago de MP
router.post('/create', validateIsLoggedIn, createOrder)

export default router
