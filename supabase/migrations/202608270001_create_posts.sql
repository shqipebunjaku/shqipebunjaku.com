-- Portfolio publishing schema.
-- Run with the Supabase CLI or paste into the Supabase SQL editor.

create extension if not exists pgcrypto;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() ->> 'email') = 'shqipeebunjakuu@gmail.com'
    and (auth.jwt() -> 'app_metadata' ->> 'provider') = 'google',
    false
  );
$$;

revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to anon, authenticated;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 180),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  excerpt text not null default '' check (char_length(excerpt) <= 320),
  content text not null default '',
  cover_image_url text,
  tags text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'published')),
  author_id uuid not null references auth.users(id) on delete restrict,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_posts_have_date check (status = 'draft' or published_at is not null)
);

create index if not exists posts_public_listing_idx
  on public.posts (published_at desc)
  where status = 'published';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

alter table public.posts enable row level security;

drop policy if exists "Published posts are public" on public.posts;
create policy "Published posts are public"
on public.posts for select
using (status = 'published' or public.is_super_admin());

drop policy if exists "Super admin creates posts" on public.posts;
create policy "Super admin creates posts"
on public.posts for insert
to authenticated
with check (public.is_super_admin() and author_id = auth.uid());

drop policy if exists "Super admin updates posts" on public.posts;
create policy "Super admin updates posts"
on public.posts for update
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin() and author_id = auth.uid());

drop policy if exists "Super admin deletes posts" on public.posts;
create policy "Super admin deletes posts"
on public.posts for delete
to authenticated
using (public.is_super_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Post images are public" on storage.objects;
create policy "Post images are public"
on storage.objects for select
using (bucket_id = 'post-images');

drop policy if exists "Super admin uploads post images" on storage.objects;
create policy "Super admin uploads post images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'post-images'
  and public.is_super_admin()
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Super admin updates post images" on storage.objects;
create policy "Super admin updates post images"
on storage.objects for update
to authenticated
using (bucket_id = 'post-images' and public.is_super_admin())
with check (bucket_id = 'post-images' and public.is_super_admin());

drop policy if exists "Super admin deletes post images" on storage.objects;
create policy "Super admin deletes post images"
on storage.objects for delete
to authenticated
using (bucket_id = 'post-images' and public.is_super_admin());
