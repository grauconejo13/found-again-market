import { getOrder, isOrderId } from '../_lib/paypal.js';
import { releaseHold } from '../_lib/holds.js';

// Called when a buyer cancels on PayPal, so one-of-one items are not stuck as "Reserved".
export default async function handler(request, response) {
  if (request.method !== 'POST')
    return response.status(405).json({ error: 'Method not allowed.' });
  const orderId = request.body?.orderId;
  if (!isOrderId(orderId))
    return response.status(400).json({ error: 'A valid PayPal order is required.' });
  try {
    const order = await getOrder(orderId);
    // Only release orders that were never paid for. An approved order may still be captured.
    if (order.ok && ['APPROVED', 'COMPLETED'].includes(order.data.status))
      return response.status(200).json({ released: 0 });
    const rows = await releaseHold(orderId);
    return response.status(200).json({ released: rows.length });
  } catch (error) {
    return response
      .status(500)
      .json({ error: error.message || 'Unable to release this hold.' });
  }
}
