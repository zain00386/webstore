-- =====================================================================
-- Store settings, Phase 12.
--
--  * delivery_notes: a short note shown with the delivery options
--    (e.g. "Remote areas can take 5-7 working days").
--  * Delivery fees stay within a sensible range (0 - 10,000 rupees).
--  * get_public_settings also returns delivery_notes (still never the
--    payment account details).
-- =====================================================================

alter table public.store_settings
  add column delivery_notes text not null default '' check (length(delivery_notes) <= 500),
  add constraint store_settings_fee_range check (pakistan_post_fee <= 10000 and courier_fee <= 10000),
  add constraint store_settings_one_delivery check (pakistan_post_enabled or courier_enabled);

drop function public.get_public_settings();

create function public.get_public_settings()
returns table (
  store_name text,
  phone text,
  whatsapp_e164 text,
  address text,
  hours_text text,
  currency text,
  low_stock_threshold integer,
  pakistan_post_enabled boolean,
  pakistan_post_fee numeric,
  courier_enabled boolean,
  courier_fee numeric,
  cod_enabled boolean,
  jazzcash_enabled boolean,
  easypaisa_enabled boolean,
  bank_enabled boolean,
  delivery_notes text
)
language sql
stable
security definer
set search_path = ''
as $$
  select store_name, phone, whatsapp_e164, address, hours_text, currency, low_stock_threshold,
         pakistan_post_enabled, pakistan_post_fee, courier_enabled, courier_fee, cod_enabled,
         jazzcash_enabled, easypaisa_enabled, bank_enabled, delivery_notes
  from public.store_settings
  where id;
$$;

revoke all on function public.get_public_settings() from public;
grant execute on function public.get_public_settings() to anon, authenticated, service_role;
