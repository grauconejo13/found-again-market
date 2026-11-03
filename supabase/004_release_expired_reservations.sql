-- Run once in the Supabase SQL Editor for existing projects.
-- It releases old demo reservations and updates the reservation rule so an
-- expired or legacy malformed hold can never permanently block an item.

update public.products
set availability = 'available',
    reserved_until = null,
    paypal_order_id = null
where availability = 'reserved'
  and (reserved_until is null or reserved_until <= now());

create or replace function public.reserve_products(p_ids uuid[], p_order_id text, p_reserved_until timestamptz)
returns setof public.products
language plpgsql
security definer
as $$
declare target_count integer;
begin
  perform id from public.products
  where id = any(p_ids)
    and (
      availability = 'available'
      or (availability = 'reserved' and (reserved_until is null or reserved_until <= now()))
    )
  for update;
  get diagnostics target_count = row_count;

  if target_count <> cardinality(p_ids) then
    raise exception 'One or more items are no longer available';
  end if;

  return query
  update public.products
  set availability = 'reserved',
      reserved_until = p_reserved_until,
      paypal_order_id = p_order_id
  where id = any(p_ids)
  returning *;
end;
$$;
