import { isSupabaseConfigured, supabase, toClientProduct } from './lib/supabase.js';

const accents = new Set(['moss', 'butter', 'clay', 'lilac', 'sky', 'olive']);

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' });
  if (!isSupabaseConfigured()) return response.status(503).json({ error: 'Supabase is not configured yet.' });
  const listing = request.body || {};
  const title = String(listing.title || '').trim().slice(0, 120);
  const price = Number(listing.price);
  if (!title || !Number.isFinite(price) || price <= 0) return response.status(400).json({ error: 'A title and a valid price are required.' });
  const photos = Array.isArray(listing.photos) ? listing.photos.slice(0, 4).filter((photo) => typeof photo === 'string' && photo.startsWith('data:image/')) : [];
  if (photos.reduce((total, photo) => total + photo.length, 0) > 2_500_000) return response.status(413).json({ error: 'Please use smaller photos for this demo listing.' });
  try {
    const rows = await supabase('products', { method: 'POST', headers: { Prefer: 'return=representation' }, body: {
      title, category: String(listing.category || 'Other').slice(0, 40), condition: String(listing.condition || 'Good').slice(0, 60),
      price_cents: Math.round(price * 100), description: String(listing.note || '').slice(0, 600), tag: String(listing.tag || 'Found again').slice(0, 60),
      accent: accents.has(listing.accent) ? listing.accent : 'moss', photos, availability: 'available',
    } });
    return response.status(201).json({ product: toClientProduct(rows[0]) });
  } catch (error) { return response.status(500).json({ error: error.message || 'Unable to publish this listing.' }); }
}
