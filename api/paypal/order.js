import { isSupabaseConfigured, supabase } from '../_lib/supabase.js';
import { paypal } from '../_lib/paypal.js';
import { rateLimit } from '../_lib/rate-limit.js';

// Fallback catalog used only when Supabase is not configured (local demo mode).
const catalog = new Map([
  ['1', { name: 'The Secret Garden', cents: 1200 }],
  ['2', { name: 'Ceramic Daisy Mug', cents: 900 }],
  ['3', { name: 'Woven Market Tote', cents: 1800 }],
  ['4', { name: 'The Art of Simple Food', cents: 1400 }],
  ['5', { name: 'Brass Leaf Frame', cents: 1100 }],
  ['6', { name: 'Canvas Field Jacket', cents: 2600 }],
]);
const MAX_ITEMS = 10;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const money = (cents) => (cents / 100).toFixed(2);

async function trustedItems(ids) {
  if (!isSupabaseConfigured()) {
    const items = ids.map((id) => catalog.get(id)).filter(Boolean);
    if (items.length !== ids.length)
      throw Object.assign(new Error('Please refresh your bag and try again.'), {
        status: 409,
      });
    return items.map((item, index) => ({ id: ids[index], ...item }));
  }
  if (!ids.every((id) => UUID.test(id)))
    throw Object.assign(new Error('Please refresh your bag and try again.'), {
      status: 409,
    });
  const rows = await supabase(
    `products?select=id,title,price_cents,availability,reserved_until&id=in.(${ids.join(',')})`,
  );
  if (rows.length !== ids.length)
    throw Object.assign(
      new Error('One of these items could not be found. Please refresh your bag.'),
      { status: 409 },
    );
  const unavailable = rows.find(
    (row) =>
      row.availability === 'sold' ||
      (row.availability === 'reserved' && new Date(row.reserved_until) > new Date()),
  );
  if (unavailable)
    throw Object.assign(
      new Error(`“${unavailable.title}” was just claimed by another shopper.`),
      { status: 409 },
    );
  return rows.map((row) => ({
    id: row.id,
    name: row.title,
    cents: Number(row.price_cents),
  }));
}

async function reserveItems(ids, orderId) {
  if (!isSupabaseConfigured()) return;
  await supabase('rpc/reserve_products', {
    method: 'POST',
    body: {
      p_ids: ids,
      p_order_id: orderId,
      p_reserved_until: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    },
  });
}

export default async function handler(request, response) {
  if (request.method !== 'POST')
    return response.status(405).json({ error: 'Method not allowed.' });
  if (!rateLimit(request, response, 'order', { limit: 20, windowMs: 10 * 60 * 1000 }))
    return;
  const ids = [
    ...new Set(
      (Array.isArray(request.body?.itemIds) ? request.body.itemIds : [])
        .map(String)
        .filter(Boolean),
    ),
  ];
  if (!ids.length) return response.status(400).json({ error: 'Your bag is empty.' });
  if (ids.length > MAX_ITEMS)
    return response
      .status(400)
      .json({ error: `Checkout is limited to ${MAX_ITEMS} finds at a time.` });
  try {
    const items = await trustedItems(ids);
    // Work in integer cents so the item breakdown always matches the total exactly.
    const totalCents = items.reduce((sum, item) => sum + item.cents, 0);
    const origin = request.headers.origin || `https://${request.headers.host}`;
    const order = await paypal('/v2/checkout/orders', {
      method: 'POST',
      requestId: crypto.randomUUID(),
      body: {
        intent: 'CAPTURE',
        purchase_units: [
          {
            description: 'Found Again · one-of-one secondhand finds',
            amount: {
              currency_code: 'USD',
              value: money(totalCents),
              breakdown: {
                item_total: { currency_code: 'USD', value: money(totalCents) },
              },
            },
            items: items.map((item) => ({
              name: item.name.slice(0, 127),
              sku: String(item.id).slice(0, 127),
              unit_amount: { currency_code: 'USD', value: money(item.cents) },
              quantity: '1',
              category: 'PHYSICAL_GOODS',
            })),
          },
        ],
        // experience_context replaces the deprecated application_context.
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: 'Found Again',
              user_action: 'PAY_NOW',
              shipping_preference: 'GET_FROM_FILE',
              return_url: `${origin}/?paypal=return`,
              cancel_url: `${origin}/?paypal=cancel`,
            },
          },
        },
      },
    });
    if (!order.ok)
      throw new Error(order.data?.message || 'PayPal could not create an order.');
    try {
      await reserveItems(ids, order.data.id);
    } catch {
      return response.status(409).json({
        error:
          'One of these one-of-one finds was just claimed by another shopper. Please refresh your bag.',
      });
    }
    const approveUrl = order.data.links?.find(
      (link) => link.rel === 'payer-action' || link.rel === 'approve',
    )?.href;
    return response
      .status(201)
      .json({ orderId: order.data.id, approveUrl, total: money(totalCents) });
  } catch (error) {
    return response
      .status(error.status || 500)
      .json({ error: error.message || 'Unable to start PayPal checkout.' });
  }
}
