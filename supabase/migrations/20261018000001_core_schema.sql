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
