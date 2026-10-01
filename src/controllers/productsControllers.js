import { productSchema } from '../schemas/productSchema.js'
import ProductModel from '../models/ProductModel.js'
import { ZodError } from 'zod'

export const createProduct = async (req, res) => {
    try {
        // 1. Si se subió un archivo físico con multer, construimos su URL local
        let finalImageUrl = req.body.imageUrl
        if (req.file) {
            finalImageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
        }

        // 2. Preparamos los datos convirtiendo números y asignando la imagen
        const dataToValidate = {
            name: req.body.name,
            description: req.body.description,
            price: req.body.price !== undefined ? Number(req.body.price) : undefined,
            stock: req.body.stock !== undefined ? Number(req.body.stock) : undefined,
            category: req.body.category,
            imageUrl: finalImageUrl,
        }

        // 3. Validar con Zod
        const validatedProduct = productSchema.parse(dataToValidate)

        // 4. Guardar en MongoDB
        const product = await ProductModel.create(validatedProduct)

        return res
            .status(201)
            .json({ message: 'Producto creado exitosamente', product })
    } catch (error) {
        console.error('ERROR AL CREAR PRODUCTO:', error)

        if (error instanceof ZodError) {
            return res
                .status(400)
                .json(error.issues.map((issue) => ({ message: issue.message })))
        }

        return res.status(500).json({ 
            message: 'Error al crear el producto', 
            error: error.message 
        })
    }
}

export const updateProduct = async (req, res) => {
    try {
        let payloadToValidate = { ...req.body }

        if (req.file) {
            payloadToValidate.imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
        }

        if (payloadToValidate.price !== undefined) {
            payloadToValidate.price = Number(payloadToValidate.price)
        }
        if (payloadToValidate.stock !== undefined) {
            payloadToValidate.stock = Number(payloadToValidate.stock)
        }

        // 1 Validar los datos de entrada con Zod
        const validateData = productSchema.partial().parse(payloadToValidate)

        // 2 Buscar y actualizar el producto
        const updatedProduct = await ProductModel.findByIdAndUpdate(
            req.params.id,
            validateData,
            { new: true, runValidators: true }
        )

        // 3 Manejar el caso de que el producto no exista
        if (!updatedProduct) {
            return res.status(404).json({ message: 'Producto no encontrado' })
        }

        // 4 Devolver producto actualizado
        return res.status(200).json(updatedProduct)
    } catch (error) {
        if (error instanceof ZodError) {
            return res
                .status(400)
                .json(error.issues.map((issue) => ({ message: issue.message })))
        }
        return res.status(500).json({ message: 'Error al actualizar producto' })
    }
}

export const getProductById = async (req, res) => {
    try {
        const product = await ProductModel.findById(req.params.id)
        return res.status(200).json(product)
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener el producto' })
    }
}

export const getAllProducts = async (req, res) => {
    try {
        // Filtrar productos por categoria
        const categoryValues = {
            INDUMENTARIA: ['INDUMENTARIA', 'Indumentaria'],
            TAZAS: ['TAZAS', 'Taza'],
        }
        const category = String(req.query.category || '').toUpperCase()
        const filter = categoryValues[category]
            ? { category: { $in: categoryValues[category] } }
            : {}
        const products = await ProductModel.find(filter)
        return res.status(200).json(products)
    } catch (error) {
        return res
            .status(500)
            .json({ message: 'Error al obtener los productos' })
    }
}

export const deleteProduct = async (req, res) => {
    try {
        const product = await ProductModel.findByIdAndDelete(req.params.id)
        return res.status(200).json(product)
    } catch (error) {
        return res
            .status(500)
            .json({ message: ' Error al eliminar el producto' })
    }
}