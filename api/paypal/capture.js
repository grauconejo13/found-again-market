import { isSupabaseConfigured, supabase } from '../_lib/supabase.js';
import { getOrder, isOrderId, orderItemCount, paypal, paypalIssue, receiptFrom } from '../_lib/paypal.js';
import { releaseHold } from '../_lib/holds.js';

const markSold = async (orderId) => {
  if (!isSupabaseConfigured()) return;
  await supabase('rpc/complete_paypal_order', { method: 'POST', body: { p_order_id: orderId } });
};

// Re-confirm and briefly extend this order's hold in one statement. Only rows still
// reserved by this order and not yet expired match, so an expired hold that another
// buyer has since claimed can never be charged for.
async function confirmHold(orderId, expectedCount) {
  if (!isSupabaseConfigured()) return true;
  const now = new Date().toISOString();
  const until = new Date(Date.now() + 2 * 60 * 1000).toISOString();
  const rows = await supabase(
    `products?paypal_order_id=eq.${orderId}&availability=eq.reserved&reserved_until=gt.${encodeURIComponent(now)}&select=id`,
    { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: { reserved_until: until } },
  );
  return rows.length > 0 && rows.length === expectedCount;
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' });
  const orderId = request.body?.orderId;
  if (!isOrderId(orderId)) return response.status(400).json({ error: 'A valid PayPal order is required.' });
  try {
    // 1. Ask PayPal where this order stands. A refresh after a successful capture lands here as COMPLETED.
    const current = await getOrder(orderId);
    if (!current.ok) throw new Error(current.data?.message || 'We could not find this PayPal order.');
    if (current.data.status === 'COMPLETED') {
      await markSold(orderId);
      return response.status(200).json({ ...receiptFrom(current.data), alreadyCaptured: true });
    }
    if (current.data.status !== 'APPROVED') {
      return response.status(409).json({ error: 'This payment has not been approved in PayPal yet. You have not been charged.' });
    }

    // 2. Never charge for an item whose hold has lapsed.
    if (!(await confirmHold(orderId, orderItemCount(current.data)))) {
      await releaseHold(orderId).catch(() => {});
      return response.status(409).json({ error: 'Your 10-minute hold ended before payment was confirmed, so you were not charged. Please check the collection and try again.', holdExpired: true });
    }

    // 3. Capture with a stable request ID so retries are idempotent on PayPal's side.
    const captured = await paypal(`/v2/checkout/orders/${orderId}/capture`, { method: 'POST', requestId: `capture-${orderId}` });
    if (!captured.ok) {
      if (paypalIssue(captured.data) === 'ORDER_ALREADY_CAPTURED') {
        const done = await getOrder(orderId);
        await markSold(orderId);
        return response.status(200).json({ ...receiptFrom(done.data), alreadyCaptured: true });
      }
      if (paypalIssue(captured.data) === 'INSTRUMENT_DECLINED') {
        return response.status(402).json({ error: 'PayPal declined that payment method. Please return to PayPal and choose another.', retry: true });
      }
      throw new Error(captured.data?.message || 'PayPal did not complete the payment.');
    }
    if (captured.data.status !== 'COMPLETED') throw new Error('PayPal did not complete the payment.');

    await markSold(orderId);
    return response.status(200).json(receiptFrom(captured.data));
  } catch (error) { return response.status(500).json({ error: error.message || 'Unable to confirm your PayPal payment.' }); }
}
