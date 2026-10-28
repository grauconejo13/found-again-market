// Shared PayPal REST helpers. Server-only: never import from browser code.
export const paypalBase = () => (process.env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com');

let cachedToken = null;

export async function accessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) throw new Error('PayPal checkout is not configured yet.');
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const result = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const data = await result.json();
  if (!result.ok) throw new Error(data.error_description || 'Could not authenticate with PayPal.');
  cachedToken = { value: data.access_token, expiresAt: Date.now() + Number(data.expires_in || 0) * 1000 };
  return cachedToken.value;
}

// Returns { ok, status, data } so callers can react to specific PayPal error names.
export async function paypal(path, { method = 'GET', body, requestId } = {}) {
  const headers = { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' };
  if (requestId) headers['PayPal-Request-Id'] = requestId;
  const result = await fetch(`${paypalBase()}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await result.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  return { ok: result.ok, status: result.status, data };
}

export const paypalIssue = (data) => data?.details?.[0]?.issue || data?.name || '';

export const getOrder = (orderId) => paypal(`/v2/checkout/orders/${encodeURIComponent(orderId)}`);

export const orderItemCount = (order) => (order?.purchase_units?.[0]?.items || []).reduce((sum, item) => sum + Number(item.quantity || 1), 0);

export const receiptFrom = (order) => {
  const capture = order?.purchase_units?.[0]?.payments?.captures?.[0];
  return { receiptId: capture?.id || order?.id, amount: capture?.amount?.value || order?.purchase_units?.[0]?.amount?.value };
};

// PayPal order IDs are short uppercase alphanumerics; reject anything else before it reaches a URL or a query filter.
export const isOrderId = (value) => typeof value === 'string' && /^[A-Z0-9]{8,32}$/.test(value);
