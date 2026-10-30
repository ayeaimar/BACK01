import dotenv from 'dotenv'
dotenv.config()

const url = 'https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&limit=5'
const res = await fetch(url, {
  headers: { Authorization: 'Bearer ' + process.env.MP_ACCESS_TOKEN },
})
const data = await res.json()
if (!data.results) console.log(data)
for (const p of data.results || []) {
  console.log(p.id, p.status, p.status_detail, p.payment_method_id, p.transaction_amount)
}
const r2 = await fetch('https://api.mercadopago.com/checkout/preferences/search?limit=3', {
  headers: { Authorization: 'Bearer ' + process.env.MP_ACCESS_TOKEN },
})
const prefs = await r2.json()
console.log('Total preferencias:', prefs.total)
for (const p of prefs.elements || []) {
  console.log(p.id, 'collector:', p.collector_id, 'fecha:', p.date_created)
}