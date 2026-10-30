# Found Again Market

> Good things, continued.

Found Again is a thoughtful storefront for secondhand books, clothing, home goods, and little treasures. It is being built for the **PayPal AI Hackathon**.

## The product

- A buyer-facing storefront for one-of-one secondhand finds
- A seller workspace that uses AI to draft honest item listings from seller notes and clearly visible photo details, while preserving up to four listing photos for buyers
- AI recommendations for similar items and budget-friendly bundles
- PayPal Sandbox checkout, with payment totals always shown to and explicitly approved by the buyer

## Current progress

The first buyer-facing experience and interactive seller workflow are in place. Sellers can add up to four item photos, generate a draft, review it, and publish it into the storefront. When Supabase is configured, listings persist and one-of-one items move from available to reserved during checkout, then sold after PayPal confirms payment. The guide can propose a bundle, but only adds it after the buyer explicitly confirms. PayPal Orders are always created server-side from trusted database prices—never from a browser-submitted total.

## Run locally

The fastest way to try Found Again is the hosted demo: https://found-again-market.vercel.app

To run it locally with the AI guide and PayPal checkout working, use the Vercel CLI so the `api/` functions run too:

```bash
npm install
cp .env.example .env   # add your Sandbox and API keys
npx vercel dev         # or: npm run dev:full
```

`npm run dev` starts only the Vite storefront. The `/api` routes (AI, listings, PayPal) are not available in that mode, so the shop falls back to its built-in starter collection.

Never commit `.env`.

## Tests

```bash
npm test
```

17 API tests run offline in about a second, with no keys needed. They cover checkout pricing, bundle reservations, expired and overlapping holds, idempotent capture, cancel and release, photo serving, listing limits, and the AI guide's inventory checks. PayPal and OpenRouter are stubbed, and Supabase is an in-memory stand-in that applies the same filters as the real API.

## Enable Supabase persistence

1. Create a Supabase project.
2. In its **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql). It creates the products table, safe reservation functions, and the six starter listings.
   - **Already set up from an earlier version?** Run [`supabase/migrations/002_demo_hardening.sql`](supabase/migrations/002_demo_hardening.sql) once instead. It lets one checkout include several items and keeps product lists small.
3. In **Project Settings → API Keys**, copy the project URL and a server-only **secret** key (`sb_secret_…`).
4. Add these to Vercel (Production, Preview, and Development), then redeploy:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-secret-key
```

`SUPABASE_SECRET_KEY` is server-only. Never use a `VITE_` prefix and never place it in browser code. The code also accepts the legacy `SUPABASE_SERVICE_ROLE_KEY` if that is what an older project provides.

For the demo, seller photos are stored with the listing as small image data. A production version should upload images to Supabase Storage and save only their URLs.

## Documentation

- [Architecture and safety design](docs/ARCHITECTURE.md)
- [Demo and sandbox testing](docs/DEMO.md)
- [Devpost submission package](docs/DEVPOST_SUBMISSION.md)
- [Three-minute demo video script](docs/VIDEO_SCRIPT.md)

## Tech

- React + Vite
- PayPal Orders API (Sandbox)
- OpenRouter AI listing and recommendation workflow
- Supabase (listings and one-of-one inventory state)

## License

MIT
