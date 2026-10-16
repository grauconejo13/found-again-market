const model = () => process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

function safeJson(content) {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('The AI response was not in the expected format. Please try again.');
  return JSON.parse(match[0]);
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' });
  if (!process.env.OPENROUTER_API_KEY) return response.status(503).json({ error: 'The AI guide is not configured yet.' });
  const { mode, prompt, listing, products = [] } = request.body || {};
  if (!['guide', 'listing'].includes(mode)) return response.status(400).json({ error: 'Unknown AI request.' });
  const catalog = products.map(({ id, title, category, condition, price, note }) => ({ id, title, category, condition, price, note }));
  const system = mode === 'guide'
    ? `You are Found Again Guide, a thoughtful assistant for a secondhand storefront. Recommend from this catalog only: ${JSON.stringify(catalog)}. Never claim an item is available if it is absent. Never make payments, alter a cart, or imply that anything was added. Respond with only JSON: {"reply":"warm concise answer, max 55 words","suggestedIds":[numbers from catalog, at most 3]}.`
    : `You help a seller draft an honest secondhand listing. Use only stated details and never invent damage, provenance, measurements, or a price. Respond with only JSON: {"title":"string","description":"string, max 55 words","tags":["3 to 5 short tags"],"conditionWording":"string","priceRange":"string or 'Not enough information to suggest a range'"}. Seller input: ${JSON.stringify(listing)}`;
  try {
    const result = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'HTTP-Referer': request.headers.origin || 'https://found-again-market.vercel.app', 'X-Title': 'Found Again Market' }, body: JSON.stringify({ model: model(), messages: [{ role: 'system', content: system }, { role: 'user', content: mode === 'guide' ? String(prompt || '') : 'Draft this listing.' }], temperature: 0.4, max_tokens: 350 }) });
    const data = await result.json();
    if (!result.ok) throw new Error(data.error?.message || 'OpenRouter could not complete the request.');
    return response.status(200).json(safeJson(data.choices?.[0]?.message?.content || ''));
  } catch (error) { return response.status(502).json({ error: error.message || 'The AI guide is unavailable right now.' }); }
}
