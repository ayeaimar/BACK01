import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import UserModel from '../models/UserModel.js'
import { registerSchema, loginSchema } from '../schemas/authSchema.js'
import { ZodError } from 'zod'

export const registerUser = async (req, res) => {
    try {
        // Traer la clave secreta de JWT
        const JWT_SECRET = process.env.JWT_SECRET

        // Extraer los datos del usuario
        const { username, email, password } = registerSchema.parse(req.body)

        // Comprobar si ya existe el usuario
        const existingUser = await UserModel.findOne({ email })

        if (existingUser) {
            return res.status(400).json({ message: 'El usuario ya existe' })
        }

        // Encriptar la contraseña
        const hashedPassword = await bcrypt.hash(password, 10)

        // Comprobar el usuario admin
        const isFisrtUser = (await UserModel.countDocuments()) === 0

        // Crear el usuario y guardarlo en la DB
        const newUser = await UserModel.create({
            username,
            email,
            password: hashedPassword,
            isAdmin: isFisrtUser,
        })

        // Generar un token con JWT
        // payload
        const token = jwt.sign({ userId: newUser._id }, JWT_SECRET, {
            expiresIn: '1h',
        })

        console.log('NEW USER', newUser)
        console.log('token', token)

        // Enviar el token como una cookie
        res.cookie('accessToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 60 * 60 * 1000,
        })
            .status(201)
            .json({ message: 'Usuario registrado con éxito' })
    } catch (error) {
        res.json(error)
    }
}

export const loginuser = async (req, res) => {
    try {
        // Obtener la clave secreta del entorno
        const JWT_SECRET = process.env.JWT_SECRET

        // Extraer el email y contraseña del cuerpo de la peticion
        // además validarlo
        const { email, password } = loginSchema.parse(req.body)

        // Buscar el usuario por email
        const user = await UserModel.findOne({ email })

        if (!user) {
            return res.status(400).json({ message: 'Credenciales invalidas' })
        }

        // Comparar las contraseñas
        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Credenciales invalidas' })
        }

        // Generar un token con JWT
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

        res.cookie('accessToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 60 * 60 * 1000,
        })
            .status(200)
            .json(userData)
    } catch (error) {
        if (error instanceof ZodError) {
            return res
                .status(400)
                .json(error.issues.map((issue) => ({ message: issue.message })))
        }

        res.status(500).json({
            message: 'Error al iniciar sesión',
            error: error,
        })
    }
}

export const profile = async (req, res) => {
    // Extraer el accessToken enviado por el cliente
    const token = req.cookies.accessToken
    try {
        // Verificar o decodificar el token
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        // Buscar el usuario en la DB
        const user = await UserModel.findById(decoded.userId)

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' })
        }

        res.status(200).json({
            id: user._id,
            email: user.email,
            isAdmin: user.isAdmin,
            username: user.username,
        })
    } catch (error) {
        return res.status(400).json({ message: 'No autorizado' })
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
