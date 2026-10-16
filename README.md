# Found Again Market

> Good things, continued.

Found Again is a thoughtful storefront for secondhand books, clothing, home goods, and little treasures. It is being built for the **PayPal AI Hackathon**.

## The product

- A buyer-facing storefront for one-of-one secondhand finds
- A seller workspace that will use AI to draft item listings from photos and seller notes
- AI recommendations for similar items and budget-friendly bundles
- PayPal Sandbox checkout, with payment totals always shown to and explicitly approved by the buyer

## Current progress

The first buyer-facing experience and interactive seller workflow are in place. Sellers can add basic item details, generate a draft, review it, and publish it directly into the storefront during the session. The guide can propose a bundle, but only adds it after the buyer explicitly confirms. PayPal Orders are created server-side from the trusted catalog—never from a browser-submitted total.

## Run locally

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` when integration keys are needed. Never commit `.env`.

## Tech

- React + Vite
- PayPal Orders API (Sandbox)
- AI listing and recommendation workflow (OpenRouter connection next)

## License

MIT
