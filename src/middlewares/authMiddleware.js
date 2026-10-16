import jwt from 'jsonwebtoken'
import UserModel from '../models/UserModel.js'

// Verifica el JWT de la cookie, busca el usuario y lo deja en req.user.
export const validateIsLoggedIn = async (req, res, next) => {
    const token = req.cookies?.accessToken

    if (!token) {
        return res.status(401).json({ message: 'No autorizado' })
    }

    try {
        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                message: 'La configuración del servidor no está completa',
            })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await UserModel.findById(decoded.userId).select(
            '-password'
        )

        if (!user) {
            return res.status(401).json({ message: 'Usuario no encontrado' })
        }

        req.user = user
        return next()
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ message: 'Su token venció' })
        }

        return res.status(401).json({ message: 'No autorizado' })
    }
}

// Solo deja pasar a usuarios administradores. Debe ejecutarse después de
// validateIsLoggedIn.
export const isAdmin = (req, res, next) => {
    if (!req.user?.isAdmin) {
        return res
            .status(403)
            .json({ message: 'Solo un administrador puede realizar esta acción' })
    }

    return next()
}

// Alias de compatibilidad para las rutas que ya usaban estos nombres.
export const verifyToken = validateIsLoggedIn
export const requireAdmin = isAdmin
