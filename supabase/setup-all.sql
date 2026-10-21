-- =====================================================================
-- GENERATED FILE (npm run db:bundle). Do not edit; edit supabase/migrations instead.
-- Paste this whole file into Supabase > SQL Editor > New query, then click Run, ONCE.
-- Everything runs in one transaction: if anything fails, nothing is changed.
-- =====================================================================
begin;

-- >>> 20261018000001_core_schema.sql
-- =====================================================================
-- Dogar's Unique Books Rawalpindi — core schema
-- Tables, constraints, indexes and timestamps. Security is in 0002.
-- Money is numeric(10,2) PKR. The server always recalculates totals.
-- =====================================================================

-- ---------- Enums ----------
create type public.post_kind as enum ('blog', 'vacancy');
create type public.post_status as enum ('draft', 'published', 'archived');
create type public.delivery_method as enum ('pakistan_post', 'courier');
create type public.payment_method as enum ('jazzcash', 'easypaisa', 'cod');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded', 'not_applicable');
create type public.order_status as enum ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');

-- ---------- updated_at helper ----------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------- Categories ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 80),
  name text not null check (length(btrim(name)) between 1 and 80),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------- Books ----------
create table public.books (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 200),
  title text not null check (length(btrim(title)) between 1 and 300),
  subtitle text check (length(subtitle) <= 500),
  author text check (length(author) <= 200),
  publisher text check (length(publisher) <= 120),
  edition text check (length(edition) <= 80),
  -- Stored without dashes/spaces: 10 or 13 characters (last ISBN-10 char may be X).
  isbn text check (isbn ~ '^(97[89])?[0-9]{9}[0-9X]$'),
  -- Plain text; lines starting with "• " are list items. Never rendered as HTML.
  description text not null default '' check (length(description) <= 20000),
  category_id uuid references public.categories (id) on delete set null,
  exam_tags text[] not null default '{}' check (cardinality(exam_tags) <= 20),
  language text check (language in ('English', 'Urdu', 'Bilingual')),
  price numeric(10, 2) not null check (price >= 0),
  compare_at_price numeric(10, 2) check (compare_at_price > price),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  -- Per-book override; otherwise store_settings.low_stock_threshold applies.
  low_stock_threshold integer check (low_stock_threshold >= 0),
  -- Path inside the "book-covers" storage bucket, or a full https:// URL.
  cover_image_path text check (length(cover_image_path) <= 500),
  -- Extra photos shown after the cover ("look inside", back cover); same path rules.
  gallery_paths text[] not null default '{}' check (cardinality(gallery_paths) <= 12),
  is_active boolean not null default true,
  is_new_arrival boolean not null default false,
  -- Where an imported book came from, e.g. "lahore:49400". Makes imports repeatable.
  source_ref text unique,
  search tsvector generated always as (
    to_tsvector(
      'simple'::regconfig,
      coalesce(title, '') || ' ' || coalesce(subtitle, '') || ' ' || coalesce(author, '') || ' ' ||
      coalesce(publisher, '') || ' ' || coalesce(isbn, '')
    )
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index books_active_created_idx on public.books (is_active, created_at desc);
create index books_category_idx on public.books (category_id);
create index books_exam_tags_idx on public.books using gin (exam_tags);
create index books_search_idx on public.books using gin (search);
create index books_publisher_idx on public.books (lower(publisher));
create index books_price_idx on public.books (price);

create trigger books_updated_at before update on public.books
  for each row execute function public.set_updated_at();

-- ---------- Posts (blog + vacancies) ----------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 200),
  title text not null check (length(btrim(title)) between 1 and 300),
  kind public.post_kind not null,
  excerpt text not null default '' check (length(excerpt) <= 500),
  -- Markdown/plain text, rendered safely (no raw HTML).
  body text not null default '' check (length(body) <= 50000),
  cover_image_path text check (length(cover_image_path) <= 500),
  status public.post_status not null default 'draft',
  published_at timestamptz,
  seo_title text check (length(seo_title) <= 120),
  seo_description text check (length(seo_description) <= 300),
  vacancy_organisation text check (length(vacancy_organisation) <= 200),
  vacancy_positions text check (length(vacancy_positions) <= 300),
  vacancy_location text check (length(vacancy_location) <= 120),
  vacancy_last_date date,
  -- External link: https only, no spaces, no credentials.
  apply_url text check (
    length(apply_url) <= 2000
    and apply_url ~ '^https://[A-Za-z0-9.-]+(:443)?(/[^[:space:]]*)?$'
  ),
  exam_tag text check (exam_tag ~ '^[a-z0-9-]{1,40}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_published_needs_date check (status <> 'published' or published_at is not null)
);

create index posts_public_idx on public.posts (status, published_at desc);
create index posts_kind_idx on public.posts (kind, published_at desc);

create trigger posts_updated_at before update on public.posts
  for each row execute function public.set_updated_at();

-- ---------- Store settings (exactly one row) ----------
create table public.store_settings (
  id boolean primary key default true check (id),
  store_name text not null default 'Dogar''s Unique Books Rawalpindi' check (length(store_name) <= 120),
  phone text not null default '0324-9574895' check (length(phone) <= 30),
  whatsapp_e164 text not null default '923249574895' check (whatsapp_e164 ~ '^92[0-9]{10}$'),
  address text not null default 'Iqbal Road, Committee Chowk, Rawalpindi' check (length(address) <= 300),
  hours_text text not null default '10:00 AM - 9:00 PM, closed Friday' check (length(hours_text) <= 200),
  currency text not null default 'PKR' check (currency ~ '^[A-Z]{3}$'),
  low_stock_threshold integer check (low_stock_threshold >= 0),
  pakistan_post_enabled boolean not null default true,
  pakistan_post_fee numeric(10, 2) not null default 300 check (pakistan_post_fee >= 0),
  courier_enabled boolean not null default true,
  courier_fee numeric(10, 2) not null default 550 check (courier_fee >= 0),
  cod_enabled boolean not null default true,
  -- Payment account details are entered by the owner in Admin > Settings, never in code.
  jazzcash_enabled boolean not null default true,
  jazzcash_account_title text check (length(jazzcash_account_title) <= 120),
  jazzcash_number text check (length(jazzcash_number) <= 30),
  easypaisa_enabled boolean not null default true,
  easypaisa_account_title text check (length(easypaisa_account_title) <= 120),
  easypaisa_number text check (length(easypaisa_number) <= 30),
  payment_instructions text not null default
    'Send the exact amount with your order number in the payment note, then send the screenshot on WhatsApp. We dispatch after confirming the payment in our account.'
    check (length(payment_instructions) <= 2000),
  updated_at timestamptz not null default now()
);

insert into public.store_settings (id) values (true);

create trigger store_settings_updated_at before update on public.store_settings
  for each row execute function public.set_updated_at();

-- ---------- Admins ----------
-- There is NO sign-up route. The owner adds admin rows by hand (see docs/database-setup.md).
create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text check (length(note) <= 200),
  created_at timestamptz not null default now()
);

-- ---------- Orders ----------
create sequence public.order_number_seq start 10001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('DUB-' || nextval('public.order_number_seq')),
  -- SHA-256 (hex) of a random secret given only to the customer, for the confirmation page.
  access_token_hash text not null check (access_token_hash ~ '^[0-9a-f]{64}$'),
  -- Sent by the checkout form; the same key twice means a double-click/refresh, not a new order.
  idempotency_key uuid unique,
  -- Guest customer snapshot (no accounts in version 1).
  customer_name text not null check (length(btrim(customer_name)) between 2 and 80),
  customer_phone text not null check (customer_phone ~ '^03[0-9]{9}$'),
  customer_email text check (length(customer_email) <= 120 and customer_email like '%_@_%'),
  address text not null check (length(btrim(address)) between 10 and 300),
  city text not null check (length(btrim(city)) between 2 and 60),
  notes text check (length(notes) <= 500),
  delivery_method public.delivery_method not null,
  delivery_fee numeric(10, 2) not null check (delivery_fee >= 0),
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'pending',
  status public.order_status not null default 'pending',
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  total numeric(12, 2) not null,
  -- Stock is deducted when the order is placed; restored at most once on cancellation.
  stock_restored_at timestamptz,
  paid_at timestamptz,
  paid_verified_by uuid references auth.users (id) on delete set null,
  cancelled_at timestamptz,
  cancel_reason text check (length(cancel_reason) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_total_matches check (total = subtotal + delivery_fee),
  constraint orders_cod_needs_courier check (payment_method <> 'cod' or delivery_method = 'courier'),
  constraint orders_paid_has_date check (payment_status <> 'paid' or paid_at is not null),
  constraint orders_cancelled_has_date check (status <> 'cancelled' or cancelled_at is not null),
  constraint orders_restock_only_if_cancelled check (stock_restored_at is null or status = 'cancelled')
);

create index orders_created_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_payment_status_idx on public.orders (payment_status, created_at desc);
create index orders_phone_idx on public.orders (customer_phone);

create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  -- Kept even if the book is later deleted; the snapshot columns preserve history.
  book_id uuid references public.books (id) on delete set null,
  title_snapshot text not null check (length(title_snapshot) between 1 and 300),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 20),
  line_total numeric(12, 2) generated always as (unit_price * quantity) stored,
  constraint order_items_one_line_per_book unique (order_id, book_id)
);

create index order_items_order_idx on public.order_items (order_id);
create index order_items_book_idx on public.order_items (book_id);

-- Audit trail of important order changes (status, payment, cancellation).
create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  event text not null check (event ~ '^[a-z_]{1,40}$'),
  from_value text check (length(from_value) <= 40),
  to_value text check (length(to_value) <= 40),
  note text check (length(note) <= 500),
  created_at timestamptz not null default now()
);

create index order_events_order_idx on public.order_events (order_id, created_at);

-- ---------- Categories used by the catalogue ----------
insert into public.categories (slug, name, sort_order) values
  ('css-pms', 'CSS / PMS / PCS', 10),
  ('job-tests', 'Job & Recruitment Tests', 20),
  ('armed-forces', 'Armed Forces & ISSB', 30),
  ('entry-tests', 'Entry Tests (MDCAT, ECAT, NET)', 40),
  ('intermediate', 'Intermediate (F.A / F.Sc)', 50),
  ('university', 'BA / ADP / BS', 60),
  ('masters', 'MA / MPhil / GAT', 70),
  ('law', 'Law (LL.B / LAT)', 80),
  ('english', 'English Learning', 90),
  ('general-knowledge', 'General Knowledge', 100),
  ('medicare', 'Medicare & Allied Health', 110),
  ('children', 'Children''s Books (KidStar)', 120),
  ('other', 'Other books', 999);

-- >>> 20261018000002_security.sql
-- =====================================================================
-- Row Level Security: who may read or change each table.
--
--   Visitors (anon)         read active categories/books and published posts. Nothing else.
--   Signed-in non-admins    same as visitors.
--   Admins (admin_users)    manage everything through the website's admin area.
--   service_role (server)   bypasses RLS; used only by trusted server code and scripts.
--
-- Orders are never readable by visitors. Guest order pages go through server
-- code that checks the secret order token (Phase 9).
-- =====================================================================

-- Is the current signed-in user an admin? SECURITY DEFINER so it can read admin_users.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- Public store settings: everything EXCEPT payment account details.
-- Account numbers are only shown to a customer on their own order page (Phase 9).
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
  easypaisa_enabled boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select store_name, phone, whatsapp_e164, address, hours_text, currency, low_stock_threshold,
         pakistan_post_enabled, pakistan_post_fee, courier_enabled, courier_fee, cod_enabled,
         jazzcash_enabled, easypaisa_enabled
  from public.store_settings
  where id;
$$;

revoke all on function public.get_public_settings() from public;
grant execute on function public.get_public_settings() to anon, authenticated, service_role;

-- ---------- Turn on RLS everywhere ----------
alter table public.categories enable row level security;
alter table public.books enable row level security;
alter table public.posts enable row level security;
alter table public.store_settings enable row level security;
alter table public.admin_users enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;

-- Least privilege: visitors can never write, and never touch private tables at all.
revoke insert, update, delete, truncate on all tables in schema public from anon;
revoke all on public.store_settings, public.admin_users, public.orders, public.order_items, public.order_events from anon;
revoke all on sequence public.order_number_seq from anon, authenticated;
revoke truncate on all tables in schema public from authenticated;

-- ---------- Categories ----------
create policy "Anyone can read active categories"
  on public.categories for select to anon, authenticated
  using (is_active or (select public.is_admin()));

create policy "Admins can add categories"
  on public.categories for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins can edit categories"
  on public.categories for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "Admins can delete categories"
  on public.categories for delete to authenticated
  using ((select public.is_admin()));

-- ---------- Books ----------
create policy "Anyone can read active books"
  on public.books for select to anon, authenticated
  using (is_active or (select public.is_admin()));

create policy "Admins can add books"
  on public.books for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins can edit books"
  on public.books for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "Admins can delete books"
  on public.books for delete to authenticated
  using ((select public.is_admin()));

-- ---------- Posts ----------
create policy "Anyone can read published posts"
  on public.posts for select to anon, authenticated
  using ((status = 'published' and published_at <= now()) or (select public.is_admin()));

create policy "Admins can add posts"
  on public.posts for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins can edit posts"
  on public.posts for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "Admins can delete posts"
  on public.posts for delete to authenticated
  using ((select public.is_admin()));

-- ---------- Store settings (admins only; visitors use get_public_settings) ----------
create policy "Admins can read settings"
  on public.store_settings for select to authenticated
  using ((select public.is_admin()));

create policy "Admins can edit settings"
  on public.store_settings for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------- Admin list (read-only from the website) ----------
create policy "Admins can see the admin list"
  on public.admin_users for select to authenticated
  using ((select public.is_admin()));

-- ---------- Orders (admins only) ----------
-- No insert policy: orders are created by server code / a database function (Phase 8),
-- which re-checks prices and stock. Nobody can insert an order straight from a browser.
create policy "Admins can read orders"
  on public.orders for select to authenticated
  using ((select public.is_admin()));

create policy "Admins can update orders"
  on public.orders for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "Admins can read order items"
  on public.order_items for select to authenticated
  using ((select public.is_admin()));

create policy "Admins can read order history"
  on public.order_events for select to authenticated
  using ((select public.is_admin()));

create policy "Admins can add order history"
  on public.order_events for insert to authenticated
  with check ((select public.is_admin()) and actor_id = (select auth.uid()));

-- >>> 20261018000003_storage.sql
-- =====================================================================
-- Image storage. Covers and post images are public to VIEW (they appear on
-- the shop), but only admins can upload, replace or delete them.
-- Listing a bucket's files is not allowed for visitors.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('book-covers', 'book-covers', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('post-images', 'post-images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Admins can upload shop images"
  on storage.objects for insert to authenticated
  with check (bucket_id in ('book-covers', 'post-images') and (select public.is_admin()));

create policy "Admins can replace shop images"
  on storage.objects for update to authenticated
  using (bucket_id in ('book-covers', 'post-images') and (select public.is_admin()))
  with check (bucket_id in ('book-covers', 'post-images') and (select public.is_admin()));

create policy "Admins can delete shop images"
  on storage.objects for delete to authenticated
  using (bucket_id in ('book-covers', 'post-images') and (select public.is_admin()));

-- Admins need SELECT for upsert/replace to work through the storage API.
create policy "Admins can see shop image records"
  on storage.objects for select to authenticated
  using (bucket_id in ('book-covers', 'post-images') and (select public.is_admin()));

-- >>> 20261019000004_place_order.sql
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

-- >>> 20261021000005_bank_transfer.sql
-- =====================================================================
-- Bank transfer as a third prepaid payment method, plus the shop's bank
-- account details (entered by the owner in Admin > Settings, never in code).
--
--  * payment_method gets the value 'bank_transfer'.
--  * store_settings gets bank_* columns. Bank transfer starts OFF and can only
--    be switched on once bank name, account title and account number are filled.
--  * get_public_settings also says whether bank transfer is on (not the details).
--  * place_order refuses bank transfer while it is switched off.
-- =====================================================================

alter type public.payment_method add value if not exists 'bank_transfer';

alter table public.store_settings
  add column bank_enabled boolean not null default false,
  add column bank_name text check (length(btrim(bank_name)) between 2 and 80),
  add column bank_account_title text check (length(btrim(bank_account_title)) between 2 and 120),
  add column bank_account_number text check (bank_account_number ~ '^[0-9][0-9 -]{4,38}[0-9]$'),
  add column bank_iban text check (bank_iban ~ '^PK[0-9]{2}[A-Z]{4}[0-9]{16}$'),
  add constraint store_settings_bank_complete check (
    not bank_enabled
    or (bank_name is not null and bank_account_title is not null and bank_account_number is not null)
  );

-- ---------- Public settings: now also says whether bank transfer is on ----------
-- (The return columns change, so the function is dropped and created again.)
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
  bank_enabled boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select store_name, phone, whatsapp_e164, address, hours_text, currency, low_stock_threshold,
         pakistan_post_enabled, pakistan_post_fee, courier_enabled, courier_fee, cod_enabled,
         jazzcash_enabled, easypaisa_enabled, bank_enabled
  from public.store_settings
  where id;
$$;

revoke all on function public.get_public_settings() from public;
grant execute on function public.get_public_settings() to anon, authenticated, service_role;

-- ---------- place_order: same as before, plus the bank transfer switch ----------
create or replace function public.place_order(
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
     or (p_payment_method = 'easypaisa' and not v_settings.easypaisa_enabled)
     or (p_payment_method = 'bank_transfer' and not v_settings.bank_enabled) then
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

revoke all on function public.place_order(uuid, text, jsonb, public.delivery_method, public.payment_method, jsonb) from public, anon, authenticated;
grant execute on function public.place_order(uuid, text, jsonb, public.delivery_method, public.payment_method, jsonb) to service_role;

-- >>> 20261021000006_admin_orders.sql
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

-- >>> 20261021000007_posts_publish_now.sql
-- =====================================================================
-- "Publish now" uses the database clock.
--
-- When a post is saved as published without a date, the database fills in
-- now(). (Using the admin computer's clock could make a post count as
-- "scheduled" for a few seconds or minutes if that clock runs fast.)
-- Runs before the posts_published_needs_date check, which still applies.
-- =====================================================================

create function public.posts_fill_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger posts_fill_published_at
  before insert or update on public.posts
  for each row execute function public.posts_fill_published_at();

-- >>> 20261021000008_delivery_notes.sql
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

-- >>> 20261021000009_rate_limits.sql
-- =====================================================================
-- Shared rate limits (login attempts, orders per device / phone).
--
-- The website used to count attempts in each server's memory, which doesn't
-- work when the site runs on several servers (e.g. Vercel). Now the counts
-- live here, shared by all servers.
--
--  * Only scrambled keys are stored (an HMAC of the IP / phone / email made
--    on the server), never the phone number, email or IP itself.
--  * Only the website's server (service_role) can use these functions.
--  * Old entries (over a day) are cleaned up automatically.
-- =====================================================================

create table public.rate_limit_hits (
  id bigint generated always as identity primary key,
  bucket text not null check (bucket ~ '^[a-z_]{1,40}$'),
  key_hash text not null check (key_hash ~ '^[0-9a-f]{64}$'),
  hit_at timestamptz not null default now()
);

create index rate_limit_hits_lookup_idx on public.rate_limit_hits (bucket, key_hash, hit_at desc);

-- Nobody reads or writes this table from a browser.
alter table public.rate_limit_hits enable row level security;
revoke all on public.rate_limit_hits from anon, authenticated;

/** Seconds to wait before the next attempt is allowed (0 = allowed now). Records nothing. */
create function public.rate_limit_check(p_bucket text, p_key_hash text, p_limit int, p_window_seconds int)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
  v_oldest timestamptz;
begin
  select count(*), min(hit_at) into v_count, v_oldest
  from public.rate_limit_hits
  where bucket = p_bucket and key_hash = p_key_hash and hit_at > now() - make_interval(secs => p_window_seconds);
  if v_count < p_limit then return 0; end if;
  return greatest(1, ceil(extract(epoch from (v_oldest + make_interval(secs => p_window_seconds) - now())))::int);
end;
$$;

/** Records one attempt (and tidies entries older than a day). */
create function public.rate_limit_hit(p_bucket text, p_key_hash text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.rate_limit_hits (bucket, key_hash) values (p_bucket, p_key_hash);
  delete from public.rate_limit_hits where hit_at < now() - interval '1 day';
end;
$$;

/** Forgets the attempts for one key (e.g. after a successful sign-in). */
create function public.rate_limit_reset(p_bucket text, p_key_hash text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.rate_limit_hits where bucket = p_bucket and key_hash = p_key_hash;
$$;

revoke all on function public.rate_limit_check(text, text, int, int) from public, anon, authenticated;
revoke all on function public.rate_limit_hit(text, text) from public, anon, authenticated;
revoke all on function public.rate_limit_reset(text, text) from public, anon, authenticated;
grant execute on function public.rate_limit_check(text, text, int, int) to service_role;
grant execute on function public.rate_limit_hit(text, text) to service_role;
grant execute on function public.rate_limit_reset(text, text) to service_role;

-- >>> 20261021000010_banner_slides.sql
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

commit;
