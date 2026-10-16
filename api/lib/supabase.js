const configured = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export const isSupabaseConfigured = configured;

export async function supabase(path, { method = 'GET', body, headers = {} } = {}) {
  if (!configured()) throw new Error('Supabase is not configured.');
  const result = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
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

export const toClientProduct = (row) => ({
  id: row.id,
  title: row.title,
  category: row.category,
  condition: row.condition,
  price: Number(row.price_cents) / 100,
  accent: row.accent || 'moss',
  note: row.description,
  tag: row.tag || 'Found again',
  photos: row.photos || [],
  availability: row.availability,
  reservedUntil: row.reserved_until,
});
