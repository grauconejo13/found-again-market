import { isSupabaseConfigured, supabase } from './_lib/supabase.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATA_URL = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/;

// Serves one listing photo as a real, cacheable image instead of inlining base64 in JSON.
export default async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed.' });
  if (!isSupabaseConfigured()) return response.status(404).end();
  const id = String(request.query?.id || '');
  const index = Number(request.query?.i ?? 0);
  if (!UUID.test(id) || !Number.isInteger(index) || index < 0 || index > 3) return response.status(400).end();
  try {
    const rows = await supabase(`products?select=photo:photos->>${index}&id=eq.${id}`);
    const match = DATA_URL.exec(rows[0]?.photo || '');
    if (!match) return response.status(404).end();
    response.setHeader('Content-Type', match[1]);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, immutable');
    return response.status(200).send(Buffer.from(match[2], 'base64'));
  } catch { return response.status(500).end(); }
}
