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
