import { isSupabaseConfigured, supabase, toClientProduct } from './_lib/supabase.js';
import { rateLimit } from './_lib/rate-limit.js';

const accents = new Set(['moss', 'butter', 'clay', 'lilac', 'sky', 'olive']);
const categories = new Set(['Books', 'Clothing', 'Home', 'Accessories']);
const conditions = new Set(['Excellent', 'Very good', 'Gently loved', 'Good']);
const MAX_PHOTO_BYTES = 2_500_000;
const MAX_PRICE = 10_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Site-wide cap so a public demo can't be flooded, whichever server instance handles the request.
const HOURLY_LISTING_CAP = 25;

const clean = (value, max) =>
  String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

const isPhoto = (photo) =>
  typeof photo === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(photo);

const manageRateLimit = (request, response) =>
  rateLimit(request, response, 'listing-manage', {
    limit: 15,
    windowMs: 10 * 60 * 1000,
  });

const findAvailableListing = (id) =>
  supabase(`products?select=*&id=eq.${id}&availability=eq.available&limit=1`);

async function replaceCoverPhoto(request, response) {
  const { id, photo } = request.body || {};
  if (!UUID.test(String(id || '')))
    return response.status(400).json({ error: 'Choose a valid listing first.' });
  if (!isPhoto(photo) || photo.length > MAX_PHOTO_BYTES)
    return response
      .status(400)
      .json({ error: 'Use one smaller JPEG, PNG, or WebP photo.' });
  try {
    const current = await findAvailableListing(id);
    if (!current[0])
      return response.status(409).json({
        error: 'Only available listings can be changed. This one is reserved or sold.',
      });
    const existingPhotos = Array.isArray(current[0].photos) ? current[0].photos : [];
    const rows = await supabase(`products?id=eq.${id}&availability=eq.available`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: { photos: [photo, ...existingPhotos.slice(1, 4)] },
    });
    if (!rows[0])
      return response.status(409).json({
        error:
          'This listing changed while you were editing it. Please refresh and try again.',
      });
    return response.status(200).json({ product: toClientProduct(rows[0]) });
  } catch (error) {
    return response
      .status(500)
      .json({ error: error.message || 'Unable to replace this photo.' });
  }
}

async function removeListing(request, response) {
  const id = String(request.query?.id || '');
  if (!UUID.test(id))
    return response.status(400).json({ error: 'Choose a valid listing first.' });
  try {
    const rows = await supabase(`products?id=eq.${id}&availability=eq.available`, {
      method: 'DELETE',
      headers: { Prefer: 'return=representation' },
    });
    if (!rows[0])
      return response.status(409).json({
        error: 'Only available listings can be removed. This one is reserved or sold.',
      });
    return response.status(200).json({ removedId: id });
  } catch (error) {
    return response
      .status(500)
      .json({ error: error.message || 'Unable to remove this listing.' });
  }
}

export default async function handler(request, response) {
  if (!isSupabaseConfigured())
    return response.status(503).json({ error: 'Supabase is not configured yet.' });
  if (request.method === 'PATCH') {
    if (!manageRateLimit(request, response)) return;
    return replaceCoverPhoto(request, response);
  }
  if (request.method === 'DELETE') {
    if (!manageRateLimit(request, response)) return;
    return removeListing(request, response);
  }
  if (request.method !== 'POST')
    return response.status(405).json({ error: 'Method not allowed.' });
  if (
    !rateLimit(request, response, 'listing', {
      limit: 5,
      windowMs: 10 * 60 * 1000,
    })
  )
    return;
  const listing = request.body || {};
  const title = clean(listing.title, 120);
  const price = Math.round(Number(listing.price) * 100) / 100;
  if (!title || !Number.isFinite(price) || price <= 0 || price > MAX_PRICE)
    return response.status(400).json({
      error: `A title and a price between $0.01 and $${MAX_PRICE.toLocaleString()} are required.`,
    });
  const photos = Array.isArray(listing.photos)
    ? listing.photos.slice(0, 4).filter((photo) => isPhoto(photo))
    : [];
  if (!photos.length)
    return response
      .status(400)
      .json({ error: 'Add at least one JPEG, PNG, or WebP item photo.' });
  if (photos.reduce((total, photo) => total + photo.length, 0) > MAX_PHOTO_BYTES)
    return response
      .status(413)
      .json({ error: 'Please use smaller photos for this demo listing.' });
  try {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recent = await supabase(
      `products?select=id&created_at=gt.${encodeURIComponent(since)}&limit=${HOURLY_LISTING_CAP + 1}`,
    );
    if (recent.length >= HOURLY_LISTING_CAP)
      return response.status(429).json({
        error:
          'The demo shop has had a lot of new listings this hour. Please try again a little later.',
      });
    const rows = await supabase('products', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: {
        title,
        category: categories.has(listing.category) ? listing.category : 'Home',
        condition: conditions.has(listing.condition) ? listing.condition : 'Good',
        price_cents: Math.round(price * 100),
        description: clean(listing.note, 600),
        tag: clean(listing.tag, 60) || 'Found again',
        accent: accents.has(listing.accent) ? listing.accent : 'moss',
        photos,
        availability: 'available',
      },
    });
    return response.status(201).json({ product: toClientProduct(rows[0]) });
  } catch (error) {
    return response
      .status(500)
      .json({ error: error.message || 'Unable to publish this listing.' });
  }
}
