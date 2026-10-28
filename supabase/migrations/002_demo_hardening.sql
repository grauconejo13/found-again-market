-- Run once in the Supabase SQL Editor on a project created from the original schema.sql.
-- Safe to run more than once.

-- 1. A bundle reserves several products under one PayPal order ID. The original
--    UNIQUE constraint made every multi-item checkout fail, so replace it with a plain index.
alter table public.products drop constraint if exists products_paypal_order_id_key;
create index if not exists products_paypal_order_idx on public.products (paypal_order_id);
create index if not exists products_created_at_idx on public.products (created_at desc);

-- 2. Let the storefront list products without downloading every photo.
alter table public.products
  add column if not exists photo_count integer generated always as (jsonb_array_length(photos)) stored;

-- 3. Only reserved (or already sold) items for this order can become sold.
create or replace function public.complete_paypal_order(p_order_id text)
returns setof public.products
language sql
security definer
as $$
  update public.products
  set availability = 'sold', reserved_until = null
  where paypal_order_id = p_order_id and availability in ('reserved', 'sold')
  returning *;
$$;
