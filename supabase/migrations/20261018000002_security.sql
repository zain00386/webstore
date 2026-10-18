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
