-- =====================================================================
-- Admin order operations (Phase 10).
--
-- Orders can only be changed through admin_update_order(), which:
--  * checks the caller is an admin,
--  * allows only these status steps:
--      pending -> confirmed -> processing (packed) -> shipped -> delivered
--      pending / confirmed / processing -> cancelled   (needs a reason)
--  * keeps payment status separate: only "mark_paid", "payment_failed" and
--    "refund" touch it, never a status step,
--  * refuses to ship a prepaid (JazzCash / Easypaisa / bank) order until an
--    admin has marked it paid,
--  * puts stock back exactly once when an order is cancelled
--    (stock_restored_at is set the first time),
--  * refuses stale changes (another tab/admin changed the order first),
--  * writes every change to order_events (who, what, from, to, note).
-- =====================================================================

alter table public.orders
  add column shipped_via text check (length(btrim(shipped_via)) between 1 and 40),
  add column tracking_number text check (tracking_number ~ '^[A-Za-z0-9 -]{3,40}$'),
  add column shipped_at timestamptz,
  add column delivered_at timestamptz;

-- Admins no longer edit order rows directly: every change goes through the function below.
drop policy if exists "Admins can update orders" on public.orders;
revoke update on public.orders from authenticated;

create function public.admin_update_order(
  p_order_id uuid,
  p_expected_updated_at timestamptz,
  p_action text,
  p_note text default null,
  p_shipped_via text default null,
  p_tracking_number text default null
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders%rowtype;
  v_uid uuid := auth.uid();
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_status public.order_status;
  v_payment public.payment_status;
  v_updated timestamptz;
begin
  if not public.is_admin() then
    raise exception 'NOT_ADMIN' using errcode = '42501';
  end if;
  if v_note is not null and length(v_note) > 500 then raise exception 'NOTE_TOO_LONG'; end if;

  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if o.updated_at <> p_expected_updated_at then raise exception 'STALE'; end if;

  v_status := o.status;
  v_payment := o.payment_status;

  case p_action
    when 'confirm' then
      if o.status <> 'pending' then raise exception 'INVALID_TRANSITION'; end if;
      v_status := 'confirmed';
    when 'pack' then
      if o.status <> 'confirmed' then raise exception 'INVALID_TRANSITION'; end if;
      v_status := 'processing';
    when 'ship' then
      if o.status not in ('confirmed', 'processing') then raise exception 'INVALID_TRANSITION'; end if;
      if o.payment_method <> 'cod' and o.payment_status <> 'paid' then raise exception 'NOT_PAID'; end if;
      v_status := 'shipped';
    when 'deliver' then
      if o.status <> 'shipped' then raise exception 'INVALID_TRANSITION'; end if;
      v_status := 'delivered';
    when 'cancel' then
      if o.status not in ('pending', 'confirmed', 'processing') then raise exception 'INVALID_TRANSITION'; end if;
      if v_note is null then raise exception 'REASON_REQUIRED'; end if;
      v_status := 'cancelled';
    when 'mark_paid' then
      if o.status = 'cancelled' or o.payment_status not in ('pending', 'failed') then raise exception 'INVALID_TRANSITION'; end if;
      -- Cash on Delivery is only "paid" once the courier has the books.
      if o.payment_method = 'cod' and o.status not in ('shipped', 'delivered') then raise exception 'INVALID_TRANSITION'; end if;
      v_payment := 'paid';
    when 'payment_failed' then
      if o.payment_method = 'cod' or o.status = 'cancelled' or o.payment_status <> 'pending' then raise exception 'INVALID_TRANSITION'; end if;
      v_payment := 'failed';
    when 'refund' then
      if o.status <> 'cancelled' or o.payment_status <> 'paid' then raise exception 'INVALID_TRANSITION'; end if;
      if v_note is null then raise exception 'REASON_REQUIRED'; end if;
      v_payment := 'refunded';
    when 'note' then
      if v_note is null then raise exception 'REASON_REQUIRED'; end if;
    else
      raise exception 'UNKNOWN_ACTION';
  end case;

  -- Put stock back exactly once.
  if v_status = 'cancelled' and o.stock_restored_at is null then
    update public.books b
    set stock_quantity = b.stock_quantity + i.quantity
    from public.order_items i
    where i.order_id = o.id and i.book_id = b.id;
  end if;

  update public.orders set
    status = v_status,
    payment_status = v_payment,
    cancelled_at = case when v_status = 'cancelled' then coalesce(cancelled_at, now()) else cancelled_at end,
    cancel_reason = case when p_action = 'cancel' then v_note else cancel_reason end,
    stock_restored_at = case when v_status = 'cancelled' then coalesce(stock_restored_at, now()) else stock_restored_at end,
    paid_at = case when p_action = 'mark_paid' then now() else paid_at end,
    paid_verified_by = case when p_action = 'mark_paid' then v_uid else paid_verified_by end,
    shipped_at = case when p_action = 'ship' then now() else shipped_at end,
    shipped_via = case when p_action = 'ship' then nullif(btrim(coalesce(p_shipped_via, '')), '') else shipped_via end,
    tracking_number = case when p_action = 'ship' then nullif(btrim(coalesce(p_tracking_number, '')), '') else tracking_number end,
    delivered_at = case when p_action = 'deliver' then now() else delivered_at end
  where id = o.id
  returning updated_at into v_updated;

  insert into public.order_events (order_id, actor_id, event, from_value, to_value, note)
  values (
    o.id,
    v_uid,
    p_action,
    case when p_action in ('mark_paid', 'payment_failed', 'refund') then o.payment_status::text
         when p_action = 'note' then null else o.status::text end,
    case when p_action in ('mark_paid', 'payment_failed', 'refund') then v_payment::text
         when p_action = 'note' then null else v_status::text end,
    case when p_action = 'ship' and p_tracking_number is not null
         then left(concat_ws(' · ', v_note, nullif(btrim(coalesce(p_shipped_via, '')), ''), 'Tracking ' || btrim(p_tracking_number)), 500)
         else v_note end
  );

  return v_updated;
end;
$$;

revoke all on function public.admin_update_order(uuid, timestamptz, text, text, text, text) from public, anon;
grant execute on function public.admin_update_order(uuid, timestamptz, text, text, text, text) to authenticated, service_role;
