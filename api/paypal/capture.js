const paypalBase = () => process.env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
async function accessToken() {
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const result = await fetch(`${paypalBase()}/v1/oauth2/token`, { method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' });
  const data = await result.json();
  if (!result.ok) throw new Error(data.error_description || 'Could not authenticate with PayPal.');
  return data.access_token;
}
export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' });
  const orderId = request.body?.orderId;
  if (!orderId || typeof orderId !== 'string') return response.status(400).json({ error: 'A PayPal order is required.' });
  try {
    const result = await fetch(`${paypalBase()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { method: 'POST', headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json', 'PayPal-Request-Id': crypto.randomUUID() } });
    const order = await result.json();
    if (!result.ok || order.status !== 'COMPLETED') throw new Error(order.message || 'PayPal did not complete the payment.');
    const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
    return response.status(200).json({ receiptId: capture?.id || order.id, amount: capture?.amount?.value || order.purchase_units?.[0]?.amount?.value });
  } catch (error) { return response.status(500).json({ error: error.message || 'Unable to confirm your PayPal payment.' }); }
}
