import express from 'express'
import { createOrder } from '../controllers/orderControllers.js'

const router = express.Router()

// Crear nueva orden de compra y generar preferencia de pago de MP
router.post('/create', createOrder)

export default router
