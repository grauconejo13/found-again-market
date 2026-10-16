import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

const catalog = new Map([
  [1, { name: 'The Secret Garden', price: '12.00' }], [2, { name: 'Ceramic Daisy Mug', price: '9.00' }],
  [3, { name: 'Woven Market Tote', price: '18.00' }], [4, { name: 'The Art of Simple Food', price: '14.00' }],
  [5, { name: 'Brass Leaf Frame', price: '11.00' }], [6, { name: 'Canvas Field Jacket', price: '26.00' }],
]);
const paypalBase = () => process.env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
async function accessToken() {
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const result = await fetch(`${paypalBase()}/v1/oauth2/token`, { method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' });
  const data = await result.json();
  if (!result.ok) throw new Error(data.error_description || 'Could not authenticate with PayPal.');
  return data.access_token;
}

async function trustedItems(itemIds) {
  if (!isSupabaseConfigured()) {
    const items = itemIds.map((id) => catalog.get(Number(id))).filter(Boolean);
    if (!items.length || items.length !== itemIds.length) throw new Error('Please refresh your bag and try again.');
    return items;
  }
  const ids = itemIds.map(String);
  const rows = await supabase(`products?select=id,title,price_cents&id=in.${encodeURIComponent(`(${ids.join(',')})`)}`);
  if (!rows.length || rows.length !== ids.length) throw new Error('One of these items could not be found. Please refresh your bag.');
  return rows.map((row) => ({ id: row.id, name: row.title, price: (Number(row.price_cents) / 100).toFixed(2) }));
}

async function reserveItems(itemIds, orderId) {
  if (!isSupabaseConfigured()) return;
  await supabase('rpc/reserve_products', { method: 'POST', body: {
    p_ids: itemIds.map(String), p_order_id: orderId, p_reserved_until: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  } });
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' });
  const itemIds = [...new Set(request.body?.itemIds || [])].map(String).filter(Boolean);
  if (!itemIds.length) return response.status(400).json({ error: 'Your bag is empty.' });
  try {
    const items = await trustedItems(itemIds);
    const total = items.reduce((sum, item) => sum + Number(item.price), 0).toFixed(2);
    const origin = request.headers.origin || `https://${request.headers.host}`;
    const payload = { intent: 'CAPTURE', purchase_units: [{ amount: { currency_code: 'USD', value: total, breakdown: { item_total: { currency_code: 'USD', value: total } } }, items: items.map((item) => ({ name: item.name, unit_amount: { currency_code: 'USD', value: item.price }, quantity: '1' })) }], application_context: { return_url: `${origin}/?paypal=return`, cancel_url: `${origin}/?paypal=cancel`, user_action: 'PAY_NOW', shipping_preference: 'GET_FROM_FILE' } };
    const result = await fetch(`${paypalBase()}/v2/checkout/orders`, { method: 'POST', headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json', 'PayPal-Request-Id': crypto.randomUUID() }, body: JSON.stringify(payload) });
    const order = await result.json();
    if (!result.ok) throw new Error(order.message || 'PayPal could not create an order.');
    try { await reserveItems(itemIds, order.id); }
    catch (error) { return response.status(409).json({ error: error.message || 'One of these one-of-one items was just claimed.' }); }
    return response.status(201).json({ orderId: order.id, approveUrl: order.links?.find((link) => link.rel === 'approve')?.href });
  } catch (error) { return response.status(500).json({ error: error.message || 'Unable to start PayPal checkout.' }); }
}
