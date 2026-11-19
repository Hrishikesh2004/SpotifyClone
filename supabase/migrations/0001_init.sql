-- Vibeify database schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).

-- ---------- Profiles (extends auth.users) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Playlists ----------
create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  description text default '',
  cover_url text,
  created_at timestamptz not null default now()
);

create index if not exists playlists_user_id_idx on public.playlists(user_id);

alter table public.playlists enable row level security;

create policy "playlists_owner_all" on public.playlists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Playlist tracks (track payload stored as jsonb) ----------
create table if not exists public.playlist_tracks (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  track jsonb not null,
  position int not null default 0,
  added_at timestamptz not null default now(),
  unique (playlist_id, track)
);

create index if not exists playlist_tracks_playlist_idx on public.playlist_tracks(playlist_id, position);

alter table public.playlist_tracks enable row level security;

create policy "playlist_tracks_owner_all" on public.playlist_tracks
  for all using (
    exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid())
  );

-- ---------- Liked songs ----------
create table if not exists public.liked_songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  track jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, track)
);

create index if not exists liked_songs_user_idx on public.liked_songs(user_id, created_at desc);

alter table public.liked_songs enable row level security;

create policy "liked_songs_owner_all" on public.liked_songs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Saved albums ----------
create table if not exists public.saved_albums (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  album jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, album)
);

alter table public.saved_albums enable row level security;

create policy "saved_albums_owner_all" on public.saved_albums
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Followed artists ----------
create table if not exists public.followed_artists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  artist jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, artist)
);

alter table public.followed_artists enable row level security;

create policy "followed_artists_owner_all" on public.followed_artists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Recently played ----------
create table if not exists public.recently_played (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  track jsonb not null,
  played_at timestamptz not null default now()
);

create index if not exists recently_played_user_idx on public.recently_played(user_id, played_at desc);

alter table public.recently_played enable row level security;

create policy "recently_played_owner_all" on public.recently_played
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
