import { isSupabaseConfigured, supabase } from '../_lib/supabase.js';
import {
  getOrder,
  isOrderId,
  orderItemCount,
  paypal,
  paypalIssue,
  receiptFrom,
} from '../_lib/paypal.js';
import { releaseHold } from '../_lib/holds.js';

const markSold = async (orderId) => {
  if (!isSupabaseConfigured()) return;
  await supabase('rpc/complete_paypal_order', {
    method: 'POST',
    body: { p_order_id: orderId },
  });
};

// Re-confirm this order's hold before charging. Only rows still reserved by this order
// and not yet expired count, so an expired hold that another buyer has since claimed can
// never be charged for. Holds about to lapse are topped up to a short capture window, but
// a longer remaining hold is never shortened (a retry keeps the full 10-minute window).
async function confirmHold(orderId, expectedCount) {
  if (!isSupabaseConfigured()) return true;
  const now = encodeURIComponent(new Date().toISOString());
  const captureWindow = new Date(Date.now() + 2 * 60 * 1000).toISOString();
  const mine = `products?paypal_order_id=eq.${orderId}&availability=eq.reserved&reserved_until=gt.${now}`;
  await supabase(`${mine}&reserved_until=lt.${encodeURIComponent(captureWindow)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: { reserved_until: captureWindow },
  });
  const rows = await supabase(`${mine}&select=id`);
  return rows.length > 0 && rows.length === expectedCount;
}

export default async function handler(request, response) {
  if (request.method !== 'POST')
    return response.status(405).json({ error: 'Method not allowed.' });
  const orderId = request.body?.orderId;
  if (!isOrderId(orderId))
    return response.status(400).json({ error: 'A valid PayPal order is required.' });
  try {
    // 1. Ask PayPal where this order stands. A refresh after a successful capture lands here as COMPLETED.
    const current = await getOrder(orderId);
    if (!current.ok)
      throw new Error(current.data?.message || 'We could not find this PayPal order.');
    if (current.data.status === 'COMPLETED') {
      await markSold(orderId);
      return response
        .status(200)
        .json({ ...receiptFrom(current.data), alreadyCaptured: true });
    }
    if (current.data.status !== 'APPROVED') {
      return response.status(409).json({
        error:
          'This payment has not been approved in PayPal yet. You have not been charged.',
      });
    }

    // 2. Never charge for an item whose hold has lapsed.
    if (!(await confirmHold(orderId, orderItemCount(current.data)))) {
      // An overlapping request (e.g. a refresh) may have just captured and marked the items
      // sold. Ask PayPal again before telling the buyer they were not charged.
      const latest = await getOrder(orderId);
      if (latest.ok && latest.data.status === 'COMPLETED') {
        await markSold(orderId);
        return response
          .status(200)
          .json({ ...receiptFrom(latest.data), alreadyCaptured: true });
      }
      await releaseHold(orderId).catch(() => {});
      return response.status(409).json({
        error:
          'Your 10-minute hold ended before payment was confirmed, so you were not charged. Please check the collection and try again.',
        holdExpired: true,
      });
    }

    // 3. Capture with a stable request ID so retries are idempotent on PayPal's side.
    const captured = await paypal(`/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      requestId: `capture-${orderId}`,
    });
    if (!captured.ok) {
      if (paypalIssue(captured.data) === 'ORDER_ALREADY_CAPTURED') {
        const done = await getOrder(orderId);
        await markSold(orderId);
        return response
          .status(200)
          .json({ ...receiptFrom(done.data), alreadyCaptured: true });
      }
      if (paypalIssue(captured.data) === 'INSTRUMENT_DECLINED') {
        return response.status(402).json({
          error:
            'PayPal declined that payment method. Please return to PayPal and choose another.',
          retry: true,
        });
      }
      throw new Error(captured.data?.message || 'PayPal did not complete the payment.');
    }
    if (captured.data.status !== 'COMPLETED')
      throw new Error('PayPal did not complete the payment.');

    await markSold(orderId);
    return response.status(200).json(receiptFrom(captured.data));
  } catch (error) {
    return response
      .status(500)
      .json({ error: error.message || 'Unable to confirm your PayPal payment.' });
  }
}
