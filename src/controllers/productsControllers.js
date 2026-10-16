import mongoose from 'mongoose'
import { productSchema } from '../schemas/productSchema.js'
import ProductModel from '../models/ProductModel.js'
import { ZodError } from 'zod'
import {
    saveProductImage,
    deleteLocalImage,
    StorageError,
} from '../services/storageService.js'

const zodErrorResponse = (res, error) =>
    res
        .status(400)
        .json(error.issues.map((issue) => ({ message: issue.message })))

const storageErrorResponse = (res, error) =>
    res.status(error.status).json({ message: error.message })

export const createProduct = async (req, res) => {
    let uploadedImageUrl = null
    try {
        // 1. Datos del formulario (multipart) o JSON
        const dataToValidate = {
            name: req.body.name,
            description: req.body.description,
            price: req.body.price !== undefined ? Number(req.body.price) : undefined,
            stock: req.body.stock !== undefined ? Number(req.body.stock) : undefined,
            category: req.body.category,
            // Sin archivo se acepta una URL de imagen (por ejemplo desde request.http)
            imageUrl: req.file ? 'https://placeholder.local/pendiente' : req.body.imageUrl,
        }

        if (!req.file && !req.body.imageUrl) {
            return res
                .status(400)
                .json([{ message: 'La imagen del producto es obligatoria' }])
        }

        // 2. Validar antes de guardar la imagen, para no dejar archivos huérfanos
        const validatedProduct = productSchema.parse(dataToValidate)

        // 3. Guardar la imagen (filesystem local o Postimages, según STORAGE_PROVIDER)
        if (req.file) {
            uploadedImageUrl = await saveProductImage(req.file, req)
            validatedProduct.imageUrl = uploadedImageUrl
        }

        // 4. Guardar en MongoDB
        const product = await ProductModel.create(validatedProduct)

        return res
            .status(201)
            .json({ message: 'Producto creado exitosamente', product })
    } catch (error) {
        await deleteLocalImage(uploadedImageUrl)

        if (error instanceof ZodError) return zodErrorResponse(res, error)
        if (error instanceof StorageError) return storageErrorResponse(res, error)

        console.error('ERROR AL CREAR PRODUCTO:', error)
        return res.status(500).json({ message: 'Error al crear el producto' })
    }
}

export const updateProduct = async (req, res) => {
    let uploadedImageUrl = null
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ message: 'Producto no encontrado' })
        }

        const payloadToValidate = { ...req.body }
        if (payloadToValidate.price !== undefined) {
            payloadToValidate.price = Number(payloadToValidate.price)
        }
        if (payloadToValidate.stock !== undefined) {
            payloadToValidate.stock = Number(payloadToValidate.stock)
        }
        // La imagen nueva llega como archivo; se ignora una imageUrl vacía del formulario
        if (req.file || payloadToValidate.imageUrl === '') {
            delete payloadToValidate.imageUrl
        }

        // 1 Validar los datos de entrada con Zod
        const validateData = productSchema.partial().parse(payloadToValidate)

        const currentProduct = await ProductModel.findById(req.params.id)
        if (!currentProduct) {
            return res.status(404).json({ message: 'Producto no encontrado' })
        }

        // 2 Si viene una imagen nueva, guardarla
        if (req.file) {
            uploadedImageUrl = await saveProductImage(req.file, req)
            validateData.imageUrl = uploadedImageUrl
        }

        // 3 Actualizar el producto
        const previousImageUrl = currentProduct.imageUrl
        const updatedProduct = await ProductModel.findByIdAndUpdate(
            req.params.id,
            validateData,
            { new: true, runValidators: true }
        )

        // 4 Si se reemplazó la imagen, borrar la anterior (solo si era local)
        if (validateData.imageUrl && validateData.imageUrl !== previousImageUrl) {
            await deleteLocalImage(previousImageUrl)
        }

        return res.status(200).json(updatedProduct)
    } catch (error) {
        await deleteLocalImage(uploadedImageUrl)

        if (error instanceof ZodError) return zodErrorResponse(res, error)
        if (error instanceof StorageError) return storageErrorResponse(res, error)

        console.error('ERROR AL ACTUALIZAR PRODUCTO:', error)
        return res.status(500).json({ message: 'Error al actualizar producto' })
    }
}

// Setea (o reemplaza) solo la imagen de un producto existente
export const setProductImage = async (req, res) => {
    let uploadedImageUrl = null
    try {
        if (!req.file) {
            return res
                .status(400)
                .json({ message: 'Debe adjuntar una imagen en el campo "image"' })
        }
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ message: 'Producto no encontrado' })
        }

        const product = await ProductModel.findById(req.params.id)
        if (!product) {
            return res.status(404).json({ message: 'Producto no encontrado' })
        }

        uploadedImageUrl = await saveProductImage(req.file, req)
        const previousImageUrl = product.imageUrl
        product.imageUrl = uploadedImageUrl
        await product.save()
        await deleteLocalImage(previousImageUrl)

        return res
            .status(200)
            .json({ message: 'Imagen actualizada correctamente', product })
    } catch (error) {
        await deleteLocalImage(uploadedImageUrl)

        if (error instanceof StorageError) return storageErrorResponse(res, error)

        console.error('ERROR AL GUARDAR LA IMAGEN:', error)
        return res.status(500).json({ message: 'Error al guardar la imagen' })
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
        if (!product) {
            return res.status(404).json({ message: 'Producto no encontrado' })
        }
        await deleteLocalImage(product.imageUrl)
        return res.status(200).json(product)
    } catch (error) {
        return res
            .status(500)
            .json({ message: ' Error al eliminar el producto' })
    }
}