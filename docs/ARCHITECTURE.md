# Architecture and safety design

Found Again is a small, one-of-one secondhand storefront. Its design goal is simple: AI can help a seller describe an item and help a buyer discover it, but AI never sets a final charge or completes a purchase without an explicit buyer action.

## System overview

```text
React storefront
  ├─ /api/ai                 → OpenRouter
  ├─ /api/products           → Supabase products table
  ├─ /api/listings           → Supabase products table
  ├─ /api/paypal/order       → Supabase reservation + PayPal Orders API
  └─ /api/paypal/capture     → PayPal capture + Supabase sold state
```

The frontend is a Vite/React application deployed with Vercel. The `api/` directory contains Vercel serverless functions. Server-only credentials remain in Vercel environment variables and are never sent to the browser.

## One-of-one inventory lifecycle

1. A seller publishes a listing as `available`.
2. Adding an item to a bag does **not** reserve it.
3. When a buyer starts PayPal checkout, the server reads trusted titles and prices from Supabase and creates a PayPal order.
4. The server calls the `reserve_products` PostgreSQL function. It locks the requested rows, verifies every item is available, and reserves them for ten minutes.
5. After PayPal confirms capture, the server calls `complete_paypal_order`, which marks the reserved items `sold`.

This prevents a second buyer from completing checkout for the same used item.

## AI boundaries

The Found Again Guide can answer questions and suggest matching in-stock products. A seller can ask AI to create a draft title, description, tags, condition wording, and a possible price range from the seller's written notes.

AI does not:

- add items to a buyer's bag without their click;
- create or capture a PayPal payment;
- choose the final selling price;
- invent condition, provenance, measurements, or damage.

At present, listing photos are uploaded and displayed but are **not** sent to the AI model for visual analysis. That is a deliberate, documented next step rather than a claim the current prototype does not meet.

## Payment safety

The browser sends only selected product IDs to `/api/paypal/order`. The server retrieves the product prices from the trusted catalog or Supabase; it does not accept a browser-provided total. PayPal capture also happens server-side.

The project uses PayPal Sandbox by default. `PAYPAL_ENV=live` exists only as a deployment configuration option and should not be enabled without production readiness work such as authentication, order records, webhooks, tax/shipping policy, and real seller/payment compliance.

## Data and privacy

The prototype stores products, availability, and small, compressed listing images in Supabase. For a production marketplace, images should move to Supabase Storage and the database should store image URLs instead. Seller authentication, row-level ownership policies, and a retention/archive policy are also production requirements.
