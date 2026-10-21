-- =====================================================================
-- Home page banner slides, edited by the owner in Admin > Banner.
--
--  * Visitors see only slides that are switched on.
--  * Only admins can add, change or delete slides.
--  * Each slide shows either its own picture (stored in the "post-images"
--    bucket under banners/) or the covers of the latest books for an exam.
--  * store_settings.banner_auto_vacancies: also add a slide automatically
--    for each new vacancy post (on by default).
-- =====================================================================

create table public.banner_slides (
  id uuid primary key default gen_random_uuid(),
  eyebrow text not null default '' check (length(eyebrow) <= 40),
  title text not null check (length(btrim(title)) between 1 and 120),
  body text not null default '' check (length(body) <= 300),
  image_path text check (length(image_path) <= 500),
  exam_tag text check (exam_tag ~ '^[a-z0-9-]{1,40}$'),
  -- Links: a page of this site ("/books?exam=css-pms") or an https:// address ("//..." is refused).
  button_label text not null check (length(btrim(button_label)) between 1 and 30),
  button_href text not null check (button_href ~ '^(/[A-Za-z0-9/_?=&.%-]*|https://[A-Za-z0-9.-]+(/[^[:space:]]*)?)$' and button_href !~ '^//' and length(button_href) <= 500),
  secondary_label text check (length(btrim(secondary_label)) between 1 and 30),
  secondary_href text check (secondary_href ~ '^(/[A-Za-z0-9/_?=&.%-]*|https://[A-Za-z0-9.-]+(/[^[:space:]]*)?)$' and secondary_href !~ '^//' and length(secondary_href) <= 500),
  is_active boolean not null default true,
  sort_order integer not null default 100 check (sort_order between 0 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint banner_slides_secondary_pair check ((secondary_label is null) = (secondary_href is null))
);

create index banner_slides_order_idx on public.banner_slides (is_active, sort_order, created_at);

create trigger banner_slides_updated_at before update on public.banner_slides
  for each row execute function public.set_updated_at();

alter table public.banner_slides enable row level security;

create policy "Anyone can read switched-on banner slides"
  on public.banner_slides for select to anon, authenticated
  using (is_active or (select public.is_admin()));

create policy "Admins can add banner slides"
  on public.banner_slides for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins can edit banner slides"
  on public.banner_slides for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "Admins can delete banner slides"
  on public.banner_slides for delete to authenticated
  using ((select public.is_admin()));

revoke insert, update, delete, truncate on public.banner_slides from anon;
grant select on public.banner_slides to anon;
grant select, insert, update, delete on public.banner_slides to authenticated;

-- Also show automatic slides for new vacancy posts?
alter table public.store_settings add column banner_auto_vacancies boolean not null default true;

-- Public settings now also say whether automatic vacancy slides are on.
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
  delivery_notes text,
  banner_auto_vacancies boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select store_name, phone, whatsapp_e164, address, hours_text, currency, low_stock_threshold,
         pakistan_post_enabled, pakistan_post_fee, courier_enabled, courier_fee, cod_enabled,
         jazzcash_enabled, easypaisa_enabled, bank_enabled, delivery_notes, banner_auto_vacancies
  from public.store_settings
  where id;
$$;

revoke all on function public.get_public_settings() from public;
grant execute on function public.get_public_settings() to anon, authenticated, service_role;
