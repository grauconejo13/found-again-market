import { isSupabaseConfigured, supabase, toClientProduct } from './_lib/supabase.js';
import { rateLimit } from './_lib/rate-limit.js';

const accents = new Set(['moss', 'butter', 'clay', 'lilac', 'sky', 'olive']);
const categories = new Set(['Books', 'Clothing', 'Home', 'Accessories']);
const conditions = new Set(['Excellent', 'Very good', 'Gently loved', 'Good']);
const MAX_PHOTO_BYTES = 2_500_000;
const MAX_PRICE = 10_000;
// Site-wide cap so a public demo can't be flooded, whichever server instance handles the request.
const HOURLY_LISTING_CAP = 25;

const clean = (value, max) => String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' });
  if (!isSupabaseConfigured()) return response.status(503).json({ error: 'Supabase is not configured yet.' });
  if (!rateLimit(request, response, 'listing', { limit: 5, windowMs: 10 * 60 * 1000 })) return;
  const listing = request.body || {};
  const title = clean(listing.title, 120);
  const price = Math.round(Number(listing.price) * 100) / 100;
  if (!title || !Number.isFinite(price) || price <= 0 || price > MAX_PRICE) return response.status(400).json({ error: `A title and a price between $0.01 and $${MAX_PRICE.toLocaleString()} are required.` });
  const photos = Array.isArray(listing.photos) ? listing.photos.slice(0, 4).filter((photo) => typeof photo === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(photo)) : [];
  if (photos.reduce((total, photo) => total + photo.length, 0) > MAX_PHOTO_BYTES) return response.status(413).json({ error: 'Please use smaller photos for this demo listing.' });
  try {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recent = await supabase(`products?select=id&created_at=gt.${encodeURIComponent(since)}&limit=${HOURLY_LISTING_CAP + 1}`);
    if (recent.length >= HOURLY_LISTING_CAP) return response.status(429).json({ error: 'The demo shop has had a lot of new listings this hour. Please try again a little later.' });
    const rows = await supabase('products', { method: 'POST', headers: { Prefer: 'return=representation' }, body: {
      title,
      category: categories.has(listing.category) ? listing.category : 'Home',
      condition: conditions.has(listing.condition) ? listing.condition : 'Good',
      price_cents: Math.round(price * 100),
      description: clean(listing.note, 600),
      tag: clean(listing.tag, 60) || 'Found again',
      accent: accents.has(listing.accent) ? listing.accent : 'moss',
      photos,
      availability: 'available',
    } });
    return response.status(201).json({ product: toClientProduct(rows[0]) });
  } catch (error) { return response.status(500).json({ error: error.message || 'Unable to publish this listing.' }); }
}
