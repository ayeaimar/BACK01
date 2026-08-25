import dotenv from 'dotenv'
import { MercadoPagoConfig } from 'mercadopago'
dotenv.config()

// Crear el cliente
export const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN,
})
