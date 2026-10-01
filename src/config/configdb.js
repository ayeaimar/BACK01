import mongoose from 'mongoose'
import dns from 'node:dns'

dns.setServers(['8.8.8.8', '8.8.4.4'])

export const connectDB = async () => {
    try {
        const dbURI = process.env.MONGO_DB_URI.replace(
            '<db_username>',
            process.env.MONGO_DB_USER
        )
            .replace('<db_password>', process.env.MONGO_DB_PASSWORD)
            .replace('<db_name>', process.env.MONGO_DB_NAME)

            console.log('USER:', process.env.MONGO_DB_USER)
            console.log('DB:', process.env.MONGO_DB_NAME)
            console.log('URI:', dbURI.replace(/\/\/([^:]+):([^@]+)@/,'//$1:*****@'))
        await mongoose.connect(dbURI)
        console.log('Conectado a mongodb')
    } catch (error) {
        console.error('Error al conectar a MongoDB:',error)
        throw error

    }
}

export const disconnectDB = async () => {
    try {
        await mongoose.disconnect()
    } catch (error) {
        console.error('Error al desconectar', error)
    }
}