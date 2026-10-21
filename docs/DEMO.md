# Demo and sandbox testing

## What to demonstrate

1. Open the storefront and browse one-of-one finds.
2. Open **Sell**, add up to four photos and honest notes, then generate an AI draft.
3. Review and publish the draft. The listing appears in the collection.
4. Ask the Found Again Guide for a type of item, budget, or small bundle.
5. Add an available item to the bag and select **Pay with PayPal**.
6. Sign in to PayPal Sandbox with a Sandbox personal buyer account—not a real PayPal account.
7. Approve the payment. Back in Found Again, the receipt appears and the purchased item is marked Sold.

## Required environment variables

Create `.env` locally, or add the same values in Vercel Project Settings → Environment Variables:

```bash
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_ENV=sandbox
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openai/gpt-4o-mini
SUPABASE_URL=
SUPABASE_SECRET_KEY=
```

`SUPABASE_SECRET_KEY`, `PAYPAL_CLIENT_SECRET`, and `OPENROUTER_API_KEY` are server-only secrets. Do not use a `VITE_` prefix and do not commit them.

## Supabase setup

1. Create a Supabase project.
2. Open **SQL Editor**.
3. Run [`../supabase/schema.sql`](../supabase/schema.sql) once.
4. Add `SUPABASE_URL` and `SUPABASE_SECRET_KEY` to your local environment or Vercel.

The SQL script creates the products table, safe one-of-one reservation function, sold-state function, and starter listings.

## PayPal Sandbox setup

1. In PayPal Developer, create a Sandbox app.
2. Put its client ID and secret in the environment variables above.
3. Use a Sandbox **personal** account as the buyer during checkout.
4. Use only generated Sandbox payment methods and credentials. Never enter real financial information in a recording or demo.

## Local run

```bash
npm install
npm run dev
```

Run a production build check with:

```bash
npm run build
```

## Known prototype boundaries

- This is a single-storefront prototype, not yet a multi-seller marketplace.
- Seller photos are small compressed data stored with the product record; production should use Supabase Storage.
- There is no buyer/seller authentication yet.
- The AI drafts from seller notes plus clearly visible photo details. The seller must confirm its observations before publishing.
- Payments are Sandbox-only for the hackathon demo.
