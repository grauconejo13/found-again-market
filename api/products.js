import { isSupabaseConfigured, supabase, toClientProduct } from './lib/supabase.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed.' });
  if (!isSupabaseConfigured()) return response.status(503).json({ error: 'Supabase is not configured yet.' });
  try {
    const rows = await supabase('products?select=*&order=created_at.desc');
    return response.status(200).json({ products: rows.map(toClientProduct) });
  } catch (error) { return response.status(500).json({ error: error.message || 'Unable to load the collection.' }); }
}
