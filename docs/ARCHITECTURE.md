# Architecture and safety design

Found Again is a small, one-of-one secondhand storefront. Its design goal is simple: AI can help a seller describe an item and help a buyer discover it, but AI never sets a final charge or completes a purchase without an explicit buyer action.

## System overview

```text
React storefront
  ├─ /api/ai                 → OpenRouter
  ├─ /api/products           → Supabase products table (no photo data in the list)
  ├─ /api/photo              → one listing photo as a cacheable image
  ├─ /api/listings           → Supabase products table (rate-limited, hourly cap)
  ├─ /api/paypal/order       → Supabase reservation + PayPal Orders API
  ├─ /api/paypal/capture     → hold check + idempotent PayPal capture + Supabase sold state
  └─ /api/paypal/release     → returns cancelled holds to the collection
```

Shared server helpers live in `api/_lib/`. The underscore keeps Vercel from deploying them as endpoints.

The frontend is a Vite/React application deployed with Vercel. The `api/` directory contains Vercel serverless functions. Server-only credentials remain in Vercel environment variables and are never sent to the browser.

## One-of-one inventory lifecycle

1. A seller publishes a listing as `available`.
2. Adding an item to a bag does **not** reserve it.
3. When a buyer starts PayPal checkout, the server reads trusted titles and prices from Supabase and creates a PayPal order.
4. The server calls the `reserve_products` PostgreSQL function. It locks the requested rows, verifies every item is available, and reserves them for ten minutes.
5. When the buyer returns from PayPal, the server first asks PayPal for the order's status. If it is already `COMPLETED` (for example after a page refresh), it simply returns the receipt.
6. Before capturing, the server re-confirms the hold in one atomic update: every item must still be reserved by _this_ order and not yet expired. If the hold lapsed, the buyer is **not charged**, any remaining hold is released, and they are asked to try again.
7. The capture uses a stable `PayPal-Request-Id` (`capture-<orderId>`), so retries are idempotent on PayPal's side.
8. After PayPal confirms capture, the server calls `complete_paypal_order`, which marks the reserved items `sold`.
9. If the buyer cancels on PayPal, `/api/paypal/release` returns their items to the collection right away instead of leaving them reserved for ten minutes.

This prevents a second buyer from completing checkout for the same used item, and prevents a buyer from being charged for an item whose hold has expired and been claimed by someone else.

## AI boundaries

The Found Again Guide can answer questions and suggest matching in-stock products. Its catalog is read on the server from live, available inventory—not supplied by the browser—and is marked as data so instructions hidden in a listing are ignored. Any item IDs the model returns are checked against that catalog before the browser sees them. A seller can ask AI to create a draft title, description, tags, condition wording, and a possible price range from written notes plus clearly visible photo details.

AI does not:

- add items to a buyer's bag without their click;
- create or capture a PayPal payment;
- choose the final selling price;
- invent condition, provenance, measurements, or damage.

Up to four compressed listing photos are sent to the model with the seller's notes. The model returns at most three clearly visible observations, which the seller must confirm before publishing; it is instructed not to infer condition from photos alone.

## Abuse protection for a public demo

- `/api/ai`, `/api/listings` and `/api/paypal/order` have per-IP rate limits.
- New listings are capped site-wide per hour, so the storefront can't be flooded during judging.
- Listing text is length-limited and cleaned; category, condition and accent must be known values.

## Payment safety

The browser sends only selected product IDs to `/api/paypal/order`. The server retrieves the product prices from the trusted catalog or Supabase and totals them in integer cents; it does not accept a browser-provided total. Orders use PayPal's current `payment_source.paypal.experience_context` (brand name, `PAY_NOW`, return and cancel URLs). PayPal capture also happens server-side.

The project uses PayPal Sandbox by default. `PAYPAL_ENV=live` exists only as a deployment configuration option and should not be enabled without production readiness work such as authentication, order records, webhooks, tax/shipping policy, and real seller/payment compliance.

## Data and privacy

The prototype stores products, availability, and small, compressed listing images in Supabase. For a production marketplace, images should move to Supabase Storage and the database should store image URLs instead. Seller authentication, row-level ownership policies, and a retention/archive policy are also production requirements.
