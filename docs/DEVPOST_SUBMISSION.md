# Devpost submission package

Use this as the source text for the PayPal AI Hackathon submission. Replace only the demo-video link and any final deployment URL if they change.

## Project name

Found Again Market

## Tagline

AI-assisted rehoming for one-of-one secondhand finds—guided by people, completed with PayPal.

## Short description

Found Again Market makes selling and buying unique secondhand items feel more trustworthy and less tedious. Sellers upload photos and honest notes; AI creates an editable draft and highlights only clearly visible details for the seller to confirm. Buyers can describe what they need in natural language, receive an in-stock, price-visible proposal, and choose whether to add it to their bag. PayPal Sandbox checkout then safely completes the purchase.

## The problem

Secondhand selling has two trust gaps:

- Sellers spend time photographing, naming, describing, pricing, and publishing one item at a time.
- Buyers cannot easily search a small, changing collection or know whether a unique item is still available by the time they check out.

A normal product grid does not solve either problem. AI should help people make a decision, but it should not silently change a cart, set a charge, or overstate an item's condition.

## What it does

### Seller flow

1. A seller adds up to four photos and a few honest notes.
2. AI uses the notes and clearly visible photo details to create an editable title, description, tags, condition wording, and possible price range.
3. The seller sees an AI photo-check panel and confirms or edits every detail before publishing.
4. The published listing becomes a one-of-one item in the buyer storefront.

### Buyer flow

1. A buyer asks the Found Again Guide for something specific, such as a cozy gift under a budget.
2. AI evaluates the current available catalog and returns a clear proposal with the exact items and total.
3. Nothing enters the bag until the buyer explicitly clicks **Add this/these finds to my bag**.
4. The buyer reviews the bag and explicitly chooses **Pay with PayPal**.

### One-of-one payment flow

When checkout begins, the server reads trusted item prices from Supabase, creates a PayPal Sandbox order, and reserves the selected items for ten minutes. After PayPal capture succeeds, the server marks them Sold. A second buyer cannot complete checkout for the same item.

## How we built it

Found Again is a React + Vite storefront deployed with Vercel. Vercel serverless functions hold the trust-sensitive actions:

```text
React storefront
  ├─ AI guide and listing review → OpenRouter
  ├─ products and seller listings → Supabase Postgres
  ├─ checkout order → PayPal Orders API
  └─ successful capture → Supabase sold state
```

Supabase uses a PostgreSQL reservation function to lock selected product rows, check availability, and reserve all requested items together. The browser never submits a final amount to PayPal. It submits item IDs; the server reads the authoritative title and price from Supabase before creating the order.

## PayPal and AI use

### PayPal

- PayPal Orders API in Sandbox creates and captures checkout orders.
- The buyer is redirected to PayPal to approve the exact amount.
- A server-side capture updates the product lifecycle from available to reserved to sold.
- A receipt panel shows the capture identifier and paid amount.

### AI

- OpenRouter provides the listing assistant and Found Again Guide.
- The seller assistant accepts photo content plus seller notes, but is instructed to return only clearly visible observations and never invent material, brand, provenance, measurements, damage, or price.
- The buyer guide uses the current available catalog to turn natural-language requests into an item proposal.
- AI can recommend; it cannot alter the cart, create a payment, or capture a payment.

## Trust and safety choices

- Human approval is required before publishing a seller listing, adding a guide proposal to the bag, and starting payment.
- Prices are calculated server-side from trusted data, never from a client-submitted total.
- Item reservation is transactional, protecting unique items from double sale.
- The prototype uses PayPal Sandbox only.
- Seller photos are compressed for the prototype. A production version would use Supabase Storage, seller authentication, ownership policies, and a longer-term order/archive system.

## Challenges we ran into

One-of-one products create a very different checkout problem from normal inventory. Holding an item when it merely enters a bag would block other interested buyers; holding it too late risks double-selling. We solved this by beginning the ten-minute hold only once the PayPal order is created, then updating the inventory state only after capture succeeds.

We also treated AI output as a draft, not a source of truth. The seller stays responsible for final listing details, and the buyer always sees the exact proposal and PayPal total before a transaction begins.

## Accomplishments we are proud of

- A complete seller-to-buyer-to-payment prototype rather than a static storefront.
- A photo-aware, seller-confirmed listing workflow.
- A natural-language shopping guide that proposes rather than silently acts.
- A working PayPal Sandbox payment and receipt experience.
- Transactional protection for one-of-one inventory.

## What we learned

AI is most useful here when it reduces repetitive work while preserving human judgment. Pairing recommendations with explicit approval creates a more trustworthy commerce experience than letting an assistant act invisibly.

## What is next

- Add authenticated seller accounts and seller inventory views.
- Move listing photos to Supabase Storage with ownership policies.
- Add webhooks, order history, and production-ready shipping/tax handling.
- Let sellers choose an optional personal goal or community cause for their storefront profile, with any real donation capability implemented transparently through a verified partner.
- Build seller analytics from lightweight, privacy-conscious sold-item records.

## Built with

- React
- Vite
- Vercel Serverless Functions
- Supabase Postgres
- PostgreSQL / PLpgSQL
- PayPal Orders API (Sandbox)
- OpenRouter
- OpenAI GPT-4o mini (through OpenRouter)

## Links

- Live demo: https://found-again-market.vercel.app
- Source code: https://github.com/grauconejo13/found-again-market
- Demo video: _Add public YouTube URL before submitting_
