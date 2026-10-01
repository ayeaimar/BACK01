import axios from 'axios'
import FormData from 'form-data'

export const uploadToPostimages = async (fileBuffer, originalname) => {
    try {
        const form = new FormData()
        form.append('upload', fileBuffer, originalname)
        form.append('mode', 'json')

        const response = await axios.post('https://postimages.org/json/rr', form, {
            headers: form.getHeaders(),
        })

        if (response.data && response.data.url) {
            return response.data.url
        }

        throw new Error('No se recibió la URL directa desde Postimages')
    } catch (error) {
        console.error('Error subiendo imagen a Postimages:', error.message)
        throw new Error('Fallo al subir la imagen al almacenamiento externo')
    }
}