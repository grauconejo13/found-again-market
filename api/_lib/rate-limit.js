// Small best-effort rate limiter for public demo endpoints. State lives in the warm
// serverless instance, so it slows down bursts and casual abuse rather than acting
// as a hard global quota. Global caps that must hold everywhere live in Supabase.
const buckets = new Map();

export const clientIp = (request) =>
  String(
    request.headers['x-forwarded-for'] || request.headers['x-real-ip'] || 'unknown',
  )
    .split(',')[0]
    .trim();

export function rateLimit(request, response, name, { limit, windowMs }) {
  const now = Date.now();
  const key = `${name}:${clientIp(request)}`;
  const hits = (buckets.get(key) || []).filter((time) => now - time < windowMs);
  if (buckets.size > 5000) buckets.clear();
  if (hits.length >= limit) {
    const retryAfter = Math.ceil((windowMs - (now - hits[0])) / 1000);
    response.setHeader('Retry-After', String(retryAfter));
    response.status(429).json({
      error:
        'You’re going a little fast for this demo. Please wait a moment and try again.',
    });
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  return true;
}
