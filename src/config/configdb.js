import mongoose from 'mongoose'
import dns from 'node:dns'

// DNS públicos que se usan solo si el DNS del sistema no resuelve la URI
// "mongodb+srv://" (error típico en Windows: "querySrv ECONNREFUSED").
const FALLBACK_DNS = (process.env.DNS_SERVERS || '8.8.8.8,1.1.1.1,8.8.4.4')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

const buildURI = () => {
    const rawURI = process.env.MONGO_DB_URI
    if (!rawURI) throw new Error('Falta MONGO_DB_URI en el archivo .env')
    return rawURI
        .replace('<db_username>', encodeURIComponent(process.env.MONGO_DB_USER || ''))
        .replace('<db_password>', encodeURIComponent(process.env.MONGO_DB_PASSWORD || ''))
        .replace('<db_name>', process.env.MONGO_DB_NAME || '')
}

const isDnsError = (error) =>
    /querySrv|ENOTFOUND|ECONNREFUSED.*_mongodb|ETIMEOUT|EREFUSED|ESERVFAIL/i.test(
        `${error?.message} ${error?.cause?.message ?? ''}`
    )

const connectOnce = (dbURI) =>
    mongoose.connect(dbURI, { serverSelectionTimeoutMS: 10000 })

export const connectDB = async () => {
    const dbURI = buildURI()
    console.log('USER:', process.env.MONGO_DB_USER)
    console.log('DB:', process.env.MONGO_DB_NAME)
    console.log('URI:', dbURI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:*****@'))

    try {
        await connectOnce(dbURI)
    } catch (error) {
        if (!dbURI.startsWith('mongodb+srv://') || !isDnsError(error)) {
            printHelp(error)
            throw error
        }
        console.warn(`DNS del sistema falló (${error.code || error.message}). Reintentando con ${FALLBACK_DNS.join(', ')}...`)
        try {
            dns.setServers(FALLBACK_DNS)
            await connectOnce(dbURI)
        } catch (retryError) {
            printHelp(retryError)
            throw retryError
        }
    }
    console.log('Conectado a mongodb')
}

const printHelp = (error) => {
    const msg = `${error?.message} ${error?.cause?.message ?? ''}`
    console.error('\nError al conectar a MongoDB:', error?.message)
    if (isDnsError(error)) {
        console.error(`
>>> Problema de DNS. Soluciones:
    1. En Atlas > Connect > Drivers elegí "Node.js 2.2.12 or later" y copiá la URI 
        que empieza con "mongodb://" (sin +srv). Pegala en MONGO_DB_URI.
    2. Cambiá el DNS de Windows a 8.8.8.8 / 1.1.1.1 y ejecutá: ipconfig /flushdns
    3. Probá desde otra red (datos del celular).`)
    } else if (/bad auth|Authentication failed/i.test(msg)) {
        console.error('\n>>> Usuario o contraseña incorrectos (los del "Database User" de Atlas).')
    } else if (/Server selection timed out|ReplicaSetNoPrimary|whitelist|IP/i.test(msg)) {
        console.error('\n>>> Tu IP no está habilitada: Atlas > Network Access > Add IP Address > 0.0.0.0/0')
    }
}

export const disconnectDB = async () => {
    try {
        await mongoose.disconnect()
    } catch (error) {
        console.error('Error al desconectar', error)
    }
}