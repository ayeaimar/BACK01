import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import UserModel from '../models/UserModel.js'
import { registerSchema, loginSchema } from '../schemas/authSchema.js'
import { ZodError } from 'zod'

export const registerUser = async (req, res) => {
    try {
        const JWT_SECRET = process.env.JWT_SECRET

        if (!JWT_SECRET) {
            return res.status(500).json({
                message: 'La configuración del servidor no está completa',
            })
        }

        const parsedBody = registerSchema.parse(req.body)
        const username = parsedBody.username.trim()
        const email = parsedBody.email.trim().toLowerCase()
        const password = parsedBody.password

        const existingUser = await UserModel.findOne({
            $or: [{ email }, { username }],
        })

        if (existingUser) {
            const duplicateField =
                existingUser.email?.toLowerCase() === email ? 'email' : 'username'
            return res.status(409).json({
                message:
                    duplicateField === 'email'
                        ? 'El email ya está registrado'
                        : 'El nombre de usuario ya existe',
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        const isFisrtUser = (await UserModel.countDocuments()) === 0

        const newUser = await UserModel.create({
            username,
            email,
            password: hashedPassword,
            isAdmin: isFisrtUser,
        })

        const token = jwt.sign({ userId: newUser._id }, JWT_SECRET, {
            expiresIn: '1h',
        })

        return res.cookie('accessToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 60 * 60 * 1000,
        })
            .status(201)
            .json({ message: 'Usuario registrado con éxito' })
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                message: 'Datos inválidos',
                errors: error.issues.map((issue) => ({
                    field: issue.path[0],
                    message: issue.message,
                })),
            })
        }

        if (error?.code === 11000) {
            const duplicateField = Object.keys(error.keyPattern || {})[0]
            return res.status(409).json({
                message:
                    duplicateField === 'email'
                        ? 'El email ya está registrado'
                        : 'El nombre de usuario ya existe',
            })
        }

        return res.status(500).json({
            message: 'Error al registrar usuario',
            error: error.message || error,
        })
    }
}

export const loginuser = async (req, res) => {
    try {
        const JWT_SECRET = process.env.JWT_SECRET

        if (!JWT_SECRET) {
            return res.status(500).json({
                message: 'La configuración del servidor no está completa',
            })
        }

        const parsedBody = loginSchema.parse(req.body)
        const email = parsedBody.email.trim().toLowerCase()
        const password = parsedBody.password

        const user = await UserModel.findOne({ email })

        if (!user) {
            return res.status(400).json({ message: 'Credenciales invalidas' })
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Credenciales invalidas' })
        }

        const token = jwt.sign(
            { userId: user._id, username: user.username },
            JWT_SECRET,
            {
                expiresIn: '1h',
            }
        )

        const userData = {
            id: user._id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin,
        }

        return res.cookie('accessToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 60 * 60 * 1000,
        })
            .status(200)
            .json(userData)
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                message: 'Datos inválidos',
                errors: error.issues.map((issue) => ({
                    field: issue.path[0],
                    message: issue.message,
                })),
            })
        }

        return res.status(500).json({
            message: 'Error al iniciar sesión',
            error: error.message || error,
        })
    }
}

export const profile = async (req, res) => {
    const token = req.cookies.accessToken

    if (!token) {
        return res.status(401).json({ message: 'No autorizado' })
    }

    try {
        const JWT_SECRET = process.env.JWT_SECRET

        if (!JWT_SECRET) {
            return res.status(500).json({
                message: 'La configuración del servidor no está completa',
            })
        }

        const decoded = jwt.verify(token, JWT_SECRET)
        const user = await UserModel.findById(decoded.userId)

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' })
        }

        return res.status(200).json({
            id: user._id,
            email: user.email,
            isAdmin: user.isAdmin,
            username: user.username,
        })
    } catch (error) {
        return res.status(401).json({ message: 'No autorizado' })
    }
}

export const logout = (req, res) => {
    res.clearCookie('accessToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    })
        .status(200)
        .json('Cierre de sesión exitoso')
}
