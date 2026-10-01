import z from 'zod'

const categorySchema = z.preprocess(
    (value) => {
        if (typeof value !== 'string') return value

        const normalizedCategory = value.trim().toUpperCase()
        return normalizedCategory === 'TAZA' ? 'TAZAS' : normalizedCategory
    },
    z.enum(['INDUMENTARIA', 'TAZAS'])
)

export const productSchema = z.object({
    name: z.string().min(3).max(50),
    description: z.string().min(50).max(500),
    price: z.number().min(0),
    stock: z.number().min(0).int(),
    imageUrl: z.url(),
    category: categorySchema,
})
