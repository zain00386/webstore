-- =====================================================================
-- place_order: creates an order in ONE transaction.
--
--  * Re-reads every book's price, status and stock from the database
--    (prices sent by the browser are never used).
--  * Locks the books (FOR UPDATE, in id order) so two customers can't buy
--    the same last copy: one succeeds, the other gets CART_CHANGED.
--  * Takes the delivery fee and allowed payment methods from store_settings.
--  * Stores title/price snapshots in order_items.
--  * Deducts stock. If anything fails, nothing is saved.
--  * Idempotent: the same idempotency key returns the same order, so a
--    double-click or refresh never creates a second order or deducts twice.
--
-- Only the website's server (service_role) may call it; browsers can't.
-- =====================================================================

create function public.place_order(
  p_idempotency_key uuid,
  p_access_token_hash text,
  p_customer jsonb,
  p_delivery_method public.delivery_method,
  p_payment_method public.payment_method,
  p_items jsonb
)
returns table (order_id uuid, order_number text, total numeric, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.store_settings%rowtype;
  v_fee numeric(10, 2);
  v_subtotal numeric(12, 2) := 0;
  v_order_id uuid;
  v_order_number text;
  v_existing_total numeric(12, 2);
  v_problems jsonb := '[]'::jsonb;
  v_item_count int;
  r record;
begin
  -- Same key again (double-click, refresh, retry): return the existing order.
  -- (A separate variable: SELECT INTO sets its targets to NULL when nothing is found.)
  select o.id, o.order_number, o.total into v_order_id, v_order_number, v_existing_total
  from public.orders o where o.idempotency_key = p_idempotency_key;
  if found then
    return query select v_order_id, v_order_number, v_existing_total, false;
    return;
  end if;

  -- ---- delivery and payment rules from the owner's settings ----
  select * into v_settings from public.store_settings where id;
  if p_delivery_method = 'pakistan_post' then
    if not v_settings.pakistan_post_enabled then raise exception 'DELIVERY_UNAVAILABLE'; end if;
    v_fee := v_settings.pakistan_post_fee;
  else
    if not v_settings.courier_enabled then raise exception 'DELIVERY_UNAVAILABLE'; end if;
    v_fee := v_settings.courier_fee;
  end if;
  if (p_payment_method = 'cod' and (not v_settings.cod_enabled or p_delivery_method <> 'courier'))
     or (p_payment_method = 'jazzcash' and not v_settings.jazzcash_enabled)
     or (p_payment_method = 'easypaisa' and not v_settings.easypaisa_enabled) then
    raise exception 'PAYMENT_UNAVAILABLE';
  end if;

  -- ---- items: 1-50 different books, 1-20 copies each, no duplicates ----
  if jsonb_typeof(p_items) <> 'array' then raise exception 'INVALID_ITEMS'; end if;
  select count(*) into v_item_count from jsonb_array_elements(p_items);
  if v_item_count < 1 or v_item_count > 50 then raise exception 'INVALID_ITEMS'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) e
    where (e->>'quantity')::int not between 1 and 20
  ) or (select count(distinct e->>'book_id') from jsonb_array_elements(p_items) e) <> v_item_count then
    raise exception 'INVALID_ITEMS';
  end if;

  -- ---- lock the books first (id order prevents deadlocks), then check them ----
  perform 1
  from public.books b
  where b.id in (select (e->>'book_id')::uuid from jsonb_array_elements(p_items) e)
  order by b.id
  for update;

  for r in
    select i.book_id, i.quantity, b.id as found_id, b.title, b.price, b.stock_quantity, b.is_active
    from (
      select (e->>'book_id')::uuid as book_id, (e->>'quantity')::int as quantity
      from jsonb_array_elements(p_items) e
    ) i
    left join public.books b on b.id = i.book_id
    order by i.book_id
  loop
    if r.found_id is null or not r.is_active then
      v_problems := v_problems || jsonb_build_object('book_id', r.book_id, 'reason', 'unavailable', 'available', 0);
    elsif r.stock_quantity < r.quantity then
      v_problems := v_problems || jsonb_build_object('book_id', r.book_id, 'reason', 'stock', 'available', r.stock_quantity);
    else
      v_subtotal := v_subtotal + r.price * r.quantity;
    end if;
  end loop;

  if jsonb_array_length(v_problems) > 0 then
    raise exception 'CART_CHANGED' using detail = v_problems::text;
  end if;

  -- ---- create the order, its items, deduct stock ----
  begin
    insert into public.orders (
      access_token_hash, idempotency_key, customer_name, customer_phone, customer_email,
      address, city, notes, delivery_method, delivery_fee, payment_method, payment_status,
      status, subtotal, total
    ) values (
      p_access_token_hash, p_idempotency_key,
      btrim(p_customer->>'name'), p_customer->>'phone', nullif(btrim(coalesce(p_customer->>'email', '')), ''),
      btrim(p_customer->>'address'), btrim(p_customer->>'city'), nullif(btrim(coalesce(p_customer->>'notes', '')), ''),
      p_delivery_method, v_fee, p_payment_method, 'pending',
      'pending', v_subtotal, v_subtotal + v_fee
    )
    returning id, orders.order_number into v_order_id, v_order_number;
  exception when unique_violation then
    -- Two identical submissions raced: the other one won; return its order.
    select o.id, o.order_number, o.total into v_order_id, v_order_number, v_existing_total
    from public.orders o where o.idempotency_key = p_idempotency_key;
    return query select v_order_id, v_order_number, v_existing_total, false;
    return;
  end;

  insert into public.order_items (order_id, book_id, title_snapshot, unit_price, quantity)
  select v_order_id, b.id, b.title, b.price, (e->>'quantity')::int
  from jsonb_array_elements(p_items) e
  join public.books b on b.id = (e->>'book_id')::uuid;

  update public.books b
  set stock_quantity = b.stock_quantity - (e->>'quantity')::int
  from jsonb_array_elements(p_items) e
  where b.id = (e->>'book_id')::uuid;

  insert into public.order_events (order_id, event, to_value, note)
  values (v_order_id, 'created', 'pending', 'Placed on the website');

  return query select v_order_id, v_order_number, v_subtotal + v_fee, true;
end;
$$;

-- Browsers (anon / signed-in users) must not call this directly.
revoke all on function public.place_order(uuid, text, jsonb, public.delivery_method, public.payment_method, jsonb) from public, anon, authenticated;
grant execute on function public.place_order(uuid, text, jsonb, public.delivery_method, public.payment_method, jsonb) to service_role;

-- Guest order page: the server looks orders up by number + secret token hash.
create index if not exists orders_number_idx on public.orders (order_number);
