import { Preference } from 'mercadopago'
import { client } from '../config/mercadoPagoConfig.js'
import OrderModel from '../models/OrderModel.js'

const preference = new Preference(client)

export const createOrder = async (req, res) => {
    try {
        const { items, payer, shippingInfo } = req.body

        if (!items || !items.length) {
            return res.status(400).json({
                success: false,
                message: 'Se requieren items para crear la orden',
            })
        }

        // 1. Sanitizar items con tipos de datos estrictos para Mercado Pago
        const mpItems = items.map((item) => ({
            id: String(item.id || item._id),
            title: String(item.title || item.name || 'Producto'),
            unit_price: Number(item.unit_price || item.price),
            quantity: Number(item.quantity || 1),
            currency_id: 'ARS',
        }))

        // 2. Crear la orden en MongoDB
        const newOrder = new OrderModel({
            userId: req.user?._id,
            products: mpItems.map((item) => ({
                productId: item.id,
                quantity: item.quantity,
                price: item.unit_price,
            })),
            totalAmount: mpItems.reduce(
                (total, item) => total + item.unit_price * item.quantity,
                0
            ),
            status: 'pending',
            shippingInfo: shippingInfo,
            mercadoPagoData: {
                payerEmail: payer?.email || '',
            },
        })

        const savedOrder = await newOrder.save()

        // 3. URLs de retorno seguras
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'

        // 4. Armar el body de la preferencia SIN payer vacío ni localhost en notification_url
        const preferenceBody = {
            items: mpItems,
            external_reference: savedOrder._id.toString(),
            back_urls: {
                success: `${frontendUrl}/payment/success`,
                failure: `${frontendUrl}/payment/failure`,
                pending: `${frontendUrl}/payment/pending`,
            },
            metadata: {
                order_id: savedOrder._id.toString(),
            },
        }

        // Solo agregar notification_url si es un dominio público real (no localhost)
        if (process.env.BACKEND_URL && !process.env.BACKEND_URL.includes('localhost')) {
            preferenceBody.notification_url = `${process.env.BACKEND_URL}/api/webhook`
        }

        // Solo agregar payer si tiene email válido
        if (payer?.email) {
            preferenceBody.payer = { email: payer.email }
        }

        const result = await preference.create({ body: preferenceBody })

        console.log('PREFERENCIA CREADA:', result.id)

        // 5. Guardar el ID de preferencia en la orden
        savedOrder.mercadoPagoData.preferenceId = result.id
        await savedOrder.save()

        // 6. Retornar sandbox_init_point para pruebas
        res.status(201).json({
            success: true,
            message: 'Orden creada exitosamente',
            paymentUrl: result.sandbox_init_point || result.init_point,
            order: savedOrder,
            preferenceId: result.id,
        })
    } catch (error) {
        console.error('Error al crear orden:', error)
        console.error('Detalle Mercado Pago:', error.response?.data || error.cause || error)
        res.status(500).json({
            success: false,
            message: 'Error al crear la orden',
            error: error.response?.data?.message || error.message,
        })
    }
}