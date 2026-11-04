-- Run once in the Supabase SQL Editor for existing Found Again projects.
-- A single PayPal checkout order may reserve multiple one-of-one items.
-- Early schemas made paypal_order_id unique, which accidentally allowed
-- checkout for one item only.

alter table public.products
  drop constraint if exists products_paypal_order_id_key;

create index if not exists products_paypal_order_idx
  on public.products (paypal_order_id);
