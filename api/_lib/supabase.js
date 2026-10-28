const key = () => process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const configured = () => Boolean(process.env.SUPABASE_URL && key());

export const isSupabaseConfigured = configured;

export async function supabase(path, { method = 'GET', body, headers = {} } = {}) {
  if (!configured()) throw new Error('Supabase is not configured.');
  const result = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key(),
      Authorization: `Bearer ${key()}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await result.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!result.ok) throw new Error(data?.message || data?.hint || 'Supabase could not complete the request.');
  return data;
}

// Photos are served one at a time from /api/photo so product lists stay small.
// `v` changes whenever a photo set changes, which keeps long browser caching safe.
const photoUrls = (row) => {
  const count = Number.isFinite(row.photo_count) ? row.photo_count : Array.isArray(row.photos) ? row.photos.length : 0;
  const version = encodeURIComponent(String(row.created_at || '').replace(/\D/g, '').slice(0, 14));
  return Array.from({ length: Math.min(count, 4) }, (_, index) => `/api/photo?id=${row.id}&i=${index}&v=${version}`);
};

export const toClientProduct = (row) => ({
  id: row.id,
  title: row.title,
  category: row.category,
  condition: row.condition,
  price: Number(row.price_cents) / 100,
  accent: row.accent || 'moss',
  note: row.description,
  tag: row.tag || 'Found again',
  photos: photoUrls(row),
  availability: row.availability,
  reservedUntil: row.reserved_until,
});
