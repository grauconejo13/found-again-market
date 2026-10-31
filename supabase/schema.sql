create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) <= 120),
  category text not null,
  condition text not null,
  price_cents integer not null check (price_cents > 0),
  description text not null default '',
  tag text not null default 'Found again',
  accent text not null default 'moss',
  photos jsonb not null default '[]'::jsonb,
  availability text not null default 'available' check (availability in ('available', 'reserved', 'sold')),
  reserved_until timestamptz,
  paypal_order_id text,
  created_at timestamptz not null default now(),
  photo_count integer generated always as (jsonb_array_length(photos)) stored
);

create index if not exists products_availability_idx on public.products (availability, reserved_until);
-- One PayPal order can reserve several one-of-one items, so this must not be unique.
create index if not exists products_paypal_order_idx on public.products (paypal_order_id);
create index if not exists products_created_at_idx on public.products (created_at desc);

create or replace function public.reserve_products(p_ids uuid[], p_order_id text, p_reserved_until timestamptz)
returns setof public.products
language plpgsql
security definer
as $$
declare target_count integer;
begin
  perform id from public.products
  where id = any(p_ids)
    and (availability = 'available' or (availability = 'reserved' and reserved_until < now()))
  for update;
  get diagnostics target_count = row_count;

  if target_count <> cardinality(p_ids) then
    raise exception 'One or more items are no longer available';
  end if;

  return query
  update public.products
  set availability = 'reserved', reserved_until = p_reserved_until, paypal_order_id = p_order_id
  where id = any(p_ids)
  returning *;
end;
$$;

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

alter table public.products enable row level security;

insert into public.products (title, category, condition, price_cents, description, tag, accent) values
  ('Shark-Print Lanyard & Coin Purse', 'Accessories', 'Very good', 1200, 'A playful shark-print lanyard with a matching coin purse and patch.', 'Playful carry', 'sky'),
  ('Dad Jokes Novelty Pin', 'Accessories', 'Good', 500, 'A bright little conversation piece for a jacket, bag, or pin board.', 'Pocket-sized grin', 'butter'),
  ('Striped Knit Cuff', 'Accessories', 'Very good', 1000, 'A textured knit cuff with a colorful stripe pattern and soft feel.', 'Handmade texture', 'lilac'),
  ('Woven Leather Crossbody Bag', 'Accessories', 'Good', 2400, 'A colorful woven leather crossbody with an adjustable strap and zipper pockets.', 'Everyday carry', 'clay'),
  ('Hand-Painted Floral Teacup Set', 'Home', 'Excellent', 1800, 'A painted floral teacup and matching saucer in cheerful reds, yellow, and aqua.', 'Morning ritual', 'butter');
