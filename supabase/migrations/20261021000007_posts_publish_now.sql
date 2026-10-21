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
