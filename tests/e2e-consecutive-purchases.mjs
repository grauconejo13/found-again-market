// Browser test: two consecutive PayPal purchases in one browser session.
// Run after `npm run build`:  node tests/e2e-consecutive-purchases.mjs
// Uses the real built app; /api/* and the PayPal approval page are simulated.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { createRequire } from 'node:module';
// Playwright is not a project dependency; use the copy installed on the machine.
const { chromium } = createRequire(import.meta.url)('playwright');

const dist = new URL('../dist/', import.meta.url).pathname;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  try {
    const file = join(dist, path === '/' ? 'index.html' : path);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(await readFile(join(dist, 'index.html')));
  }
}).listen(0);
const origin = `http://127.0.0.1:${server.address().port}`;

// ---- simulated backend ----
const ids = ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'];
const products = [
  { id: ids[0], title: 'The Secret Garden', category: 'Books', condition: 'Very good', price: 12, accent: 'moss', note: 'A first find.', tag: 'Found again', photos: [], availability: 'available', reservedUntil: null },
  { id: ids[1], title: 'Ceramic Daisy Mug', category: 'Home', condition: 'Excellent', price: 9.5, accent: 'butter', note: 'A second find.', tag: 'Found again', photos: [], availability: 'available', reservedUntil: null },
  { id: ids[2], title: 'Woven Market Tote', category: 'Accessories', condition: 'Good', price: 18, accent: 'clay', note: 'A third find.', tag: 'Found again', photos: [], availability: 'available', reservedUntil: null },
];
const orders = {}; const log = [];
let orderCount = 0;

async function routeApi(route) {
  const url = new URL(route.request().url());
  const body = route.request().postDataJSON?.() ?? null;
  const json = (status, data) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
  log.push(`${route.request().method()} ${url.pathname}`);
  if (url.pathname === '/api/products') return json(200, { products });
  if (url.pathname === '/api/paypal/order') {
    const items = body.itemIds.map((id) => products.find((p) => p.id === id));
    if (items.some((item) => !item || item.availability !== 'available')) return json(409, { error: 'claimed', unavailableIds: body.itemIds });
    const orderId = `ORDER${++orderCount}TEST000`;
    orders[orderId] = { itemIds: body.itemIds, total: items.reduce((s, i) => s + i.price, 0).toFixed(2), captured: false };
    items.forEach((item) => Object.assign(item, { availability: 'reserved', reservedUntil: new Date(Date.now() + 600000).toISOString() }));
    return json(201, { orderId, approveUrl: `${origin}/__paypal?token=${orderId}`, total: orders[orderId].total });
  }
  if (url.pathname === '/api/paypal/capture') {
    const order = orders[body.orderId];
    assert.ok(order, `capture for unknown order ${body.orderId}`);
    order.captured = true;
    order.itemIds.forEach((id) => Object.assign(products.find((p) => p.id === id), { availability: 'sold', reservedUntil: null }));
    return json(200, { receiptId: `CAP-${body.orderId}`, amount: order.total });
  }
  if (url.pathname === '/api/paypal/release') return json(200, { released: 0 });
  return json(404, { error: 'not simulated' });
}

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.route('**/api/**', routeApi);
// Simulated PayPal: approving sends the buyer back exactly like PayPal's return_url.
await page.route('**/__paypal?**', (route) => {
  const token = new URL(route.request().url()).searchParams.get('token');
  return route.fulfill({ contentType: 'text/html', body: `<p>PayPal Sandbox</p><script>location.replace('${origin}/?paypal=return&token=${token}')</script>` });
});

const drawer = page.locator('aside.drawer:not(.seller)');
const card = (title) => page.locator('article, .product-card, [class*="card"]').filter({ has: page.getByRole('heading', { name: title }) }).first();
const addFromCard = async (title) => card(title).locator('button.add').click();
const checkout = async () => {
  await Promise.all([page.waitForURL(/paypal=return/), drawer.locator('button.checkout').click()]);
  await page.waitForFunction(() => !location.search.includes('paypal='));
  await drawer.locator('.eyebrow', { hasText: 'ORDER CONFIRMED' }).waitFor();
};
const step = (text) => console.log(`✓ ${text}`);

await page.goto(origin);
await page.getByRole('heading', { name: 'The Secret Garden' }).waitFor();

// ---------- purchase 1 ----------
await addFromCard('The Secret Garden');
await drawer.locator('.eyebrow', { hasText: 'YOUR BAG' }).waitFor();
assert.equal(await drawer.locator('.view-receipt').count(), 0, 'no receipt link before any purchase');
await checkout();
let receipt = drawer.locator('.receipt');
assert.equal(await receipt.getAttribute('data-order-id'), 'ORDER1TEST000');
assert.match(await receipt.innerText(), /CAP-ORDER1TEST000/);
assert.match(await receipt.innerText(), /The Secret Garden/);
assert.match(await receipt.innerText(), /\$12\.00/);
step('purchase 1 shows its own receipt (ORDER1, The Secret Garden, $12.00)');

// ---------- start a new cart in the same session ----------
await addFromCard('Ceramic Daisy Mug');
await drawer.locator('.eyebrow', { hasText: 'YOUR BAG' }).waitFor();
assert.equal(await drawer.locator('.receipt').count(), 0, 'old receipt must not show when a new item is added');
assert.equal(await drawer.locator('.eyebrow', { hasText: 'ORDER CONFIRMED' }).count(), 0);
assert.match(await drawer.innerText(), /Ceramic Daisy Mug/);
assert.doesNotMatch(await drawer.locator('.bag-items').innerText(), /Secret Garden/);
step('adding a new find opens a clean bag, not the old confirmation');

// closing and reopening the bag from the header must also show the bag
await drawer.locator('button.close').click();
await page.locator('.cart-button').click();
await drawer.locator('.eyebrow', { hasText: 'YOUR BAG' }).waitFor();
assert.equal(await drawer.locator('.receipt').count(), 0);
step('reopening the bag from the header shows the bag');

// the historical receipt is still available, but only on request
await drawer.locator('.view-receipt').click();
receipt = drawer.locator('.receipt');
assert.equal(await receipt.getAttribute('data-order-id'), 'ORDER1TEST000');
await drawer.locator('.receipt-continue').click();
await drawer.locator('.eyebrow', { hasText: 'YOUR BAG' }).waitFor();
assert.match(await drawer.innerText(), /Ceramic Daisy Mug/);
step('"View last receipt" shows order 1 on request, and returns to the bag');

// ---------- purchase 2 ----------
await checkout();
receipt = drawer.locator('.receipt');
assert.equal(await receipt.getAttribute('data-order-id'), 'ORDER2TEST000');
const text2 = await receipt.innerText();
assert.match(text2, /CAP-ORDER2TEST000/);
assert.match(text2, /Ceramic Daisy Mug/);
assert.match(text2, /\$9\.50/);
assert.doesNotMatch(text2, /ORDER1|Secret Garden|\$12\.00/);
assert.deepEqual(orders.ORDER2TEST000.itemIds, [ids[1]], 'second order contains only the new item');
await page.screenshot({ path: process.argv[2] || 'second-receipt.png' });
step('purchase 2 shows only its own receipt (ORDER2, Ceramic Daisy Mug, $9.50)');

// after purchase 2: bag is empty, header bag shows the bag, receipt link points at order 2
await drawer.locator('.receipt-continue').click();
await drawer.locator('.eyebrow', { hasText: 'YOUR BAG' }).waitFor();
assert.match(await drawer.innerText(), /Your next favorite is waiting/);
await drawer.locator('.view-receipt').click();
assert.equal(await drawer.locator('.receipt').getAttribute('data-order-id'), 'ORDER2TEST000');
step('afterwards the bag is empty and "View last receipt" shows order 2');

// a third start after purchase 2 also opens cleanly
await drawer.locator('button.close').click();
await addFromCard('Woven Market Tote');
await drawer.locator('.eyebrow', { hasText: 'YOUR BAG' }).waitFor();
assert.equal(await drawer.locator('.receipt').count(), 0);
step('a third find after purchase 2 also opens a clean bag');

// The collection shows available finds by default; sold ones move to the Sold filter.
await drawer.locator('button.close').click();
assert.equal(await page.getByRole('heading', { name: 'The Secret Garden' }).count(), 0, 'sold item leaves the available view');
await page.locator('button', { hasText: /^Sold$/ }).first().click();
await page.getByRole('heading', { name: 'The Secret Garden' }).waitFor();
await page.getByRole('heading', { name: 'Ceramic Daisy Mug' }).waitFor();
step('both purchased finds are marked Sold');
assert.deepEqual(errors, [], `page errors: ${errors.join('; ')}`);
assert.equal(Object.values(orders).filter((o) => o.captured).length, 2);
step('two orders captured, no browser errors');

await browser.close();
server.close();
console.log('\nConsecutive purchase test passed.');
