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
  paypal_order_id text unique,
  created_at timestamptz not null default now()
);

create index if not exists products_availability_idx on public.products (availability, reserved_until);

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
  where paypal_order_id = p_order_id
  returning *;
$$;

alter table public.products enable row level security;

insert into public.products (title, category, condition, price_cents, description, tag, accent) values
  ('The Secret Garden', 'Books', 'Gently loved', 1200, 'A well-kept classic with a little history in its pages.', 'Cozy classic', 'moss'),
  ('Ceramic Daisy Mug', 'Home', 'Excellent', 900, 'Sunny mornings, already included.', 'Morning ritual', 'butter'),
  ('Woven Market Tote', 'Accessories', 'Very good', 1800, 'A sturdy, easygoing carryall for market days.', 'Everyday find', 'clay'),
  ('The Art of Simple Food', 'Books', 'Gently loved', 1400, 'For slow dinners and notes in the margin.', 'Kitchen shelf', 'lilac'),
  ('Brass Leaf Frame', 'Home', 'Good', 1100, 'A small frame looking for its next memory.', 'Little treasure', 'sky'),
  ('Canvas Field Jacket', 'Clothing', 'Very good', 2600, 'Broken in beautifully, ready for more walks.', 'Second season', 'olive');
