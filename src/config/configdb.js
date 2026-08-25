import mongoose from 'mongoose'

export const connectDB = async () => {
    try {
        const dbURI = process.env.MONGO_DB_URI.replace(
            '<db_username>',
            process.env.MONGO_DB_USER
        )
            .replace('<db_password>', process.env.MONGO_DB_PASSWORD)
            .replace('<db_name>', process.env.MONGO_DB_NAME)

        await mongoose.connect(dbURI)
        console.log('Conectado a mongodb')
    } catch (error) {
        console.error(error)
    }
}

export const disconnectDB = async () => {
    try {
        await mongoose.disconnect()
    } catch (error) {
        console.error('Error al desconectar', error)
    }
}
