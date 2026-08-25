import { connectDB, disconnectDB } from './config/configdb.js'
import express from 'express'
import dotenv from 'dotenv'
import authRoutes from './routes/authRoutes.js'
import producRoutes from './routes/productsRoutes.js'
import cartRoutes from './routes/cartRoutes.js'
import orderRoutes from './routes/orderRoutes.js'
import webhookRoutes from './routes/webhookRoutes.js'
import cors from 'cors'
import cookieParser from 'cookie-parser'

dotenv.config()

const app = express()

app.use(
    cors({
        origin: process.env.FRONTEND_URL,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'Cookie',
            'Set-Cookie',
        ],
        credentials: true,
    })
)
app.use(cookieParser())
app.use(express.json())

const PORT = 3001

// Rutas API
app.use('/api/auth', authRoutes)
app.use('/api/products', producRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/webhook', webhookRoutes)

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Servidor corriendo en puerto ${PORT}`)
        })
    })
    .catch(() => {
        disconnectDB()
    })
