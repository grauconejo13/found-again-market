import { isSupabaseConfigured, supabase, toClientProduct } from './_lib/supabase.js';

const LEAN = 'id,title,category,condition,price_cents,description,tag,accent,availability,reserved_until,created_at,photo_count';
const LIMIT = 60;

export default async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed.' });
  if (!isSupabaseConfigured()) return response.status(503).json({ error: 'Supabase is not configured yet.' });
  try {
    let rows;
    try {
      // Fast path: no photo data at all (needs migration 002 for photo_count).
      rows = await supabase(`products?select=${LEAN}&order=created_at.desc&limit=${LIMIT}`);
    } catch {
      // Before the migration runs: read photos here on the server, but still only send URLs to the browser.
      rows = await supabase(`products?select=*&order=created_at.desc&limit=${LIMIT}`);
    }
    response.setHeader('Cache-Control', 'no-store');
    return response.status(200).json({ products: rows.map(toClientProduct) });
  } catch (error) { return response.status(500).json({ error: error.message || 'Unable to load the collection.' }); }
}
