# Found Again Market

> Good things, continued.

Found Again is a thoughtful storefront for secondhand books, clothing, home goods, and little treasures. It is being built for the **PayPal AI Hackathon**.

## The product

- A buyer-facing storefront for one-of-one secondhand finds
- A seller workspace that will use AI to draft item listings from photos and seller notes
- AI recommendations for similar items and budget-friendly bundles
- PayPal Sandbox checkout, with payment totals always shown to and explicitly approved by the buyer

## Current progress

The first buyer-facing experience and seller-workspace concept are in place. The next build milestones are real inventory data, AI listing drafts, a cart API, and PayPal Sandbox checkout.

## Run locally

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` when integration keys are needed. Never commit `.env`.

## Tech

- React + Vite
- PayPal JavaScript SDK / Orders API (planned, Sandbox)
- AI listing and recommendation workflow (planned)

## License

MIT
