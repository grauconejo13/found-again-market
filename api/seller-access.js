import { requireSellerAccess } from './_lib/seller-access.js';

export default function handler(request, response) {
  if (request.method !== 'POST')
    return response.status(405).json({ error: 'Method not allowed.' });
  if (!requireSellerAccess(request, response)) return;
  return response.status(200).json({ ok: true });
}
