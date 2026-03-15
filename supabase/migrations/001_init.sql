-- ============================================================
-- dishd — Initial Schema
-- ============================================================

-- Enable required extensions
create extension if not exists "pgcrypto";
create extension if not exists "pg_cron";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null,
  display_name  text,
  avatar_url    text,
  bio           text,
  created_at    timestamptz default now()
);

comment on table public.profiles is 'One-to-one extension of auth.users with public profile data.';

-- Auto-create a profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    -- derive username from email prefix, ensure uniqueness by appending random suffix
    lower(regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g'))
      || '_' || substr(gen_random_uuid()::text, 1, 6),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- FOLLOWS
-- ============================================================
create table public.follows (
  follower_id   uuid not null references public.profiles(id) on delete cascade,
  following_id  uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index on public.follows(follower_id);
create index on public.follows(following_id);

-- ============================================================
-- RECIPES
-- ============================================================
create table public.recipes (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  source_url          text not null,
  title               text,
  description         text,
  image_url           text,
  cook_time_min       int,
  prep_time_min       int,
  servings            int,
  cuisine             text,
  extraction_status   text not null default 'pending'
                        check (extraction_status in ('pending','processing','done','failed')),
  is_public           boolean not null default false,
  notes               text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index on public.recipes(user_id);
create index on public.recipes(extraction_status) where extraction_status in ('pending','processing');
create index on public.recipes(user_id, created_at desc);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger recipes_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

-- ============================================================
-- RECIPE STEPS
-- ============================================================
create table public.recipe_steps (
  id          uuid primary key default gen_random_uuid(),
  recipe_id   uuid not null references public.recipes(id) on delete cascade,
  step_number int not null,
  instruction text not null,
  image_url   text,
  unique(recipe_id, step_number)
);

create index on public.recipe_steps(recipe_id);

-- ============================================================
-- INGREDIENTS (normalized canonical names)
-- ============================================================
create table public.ingredients (
  id        uuid primary key default gen_random_uuid(),
  name      text unique not null,  -- "garlic", "chicken breast", "olive oil"
  category  text                   -- "produce", "protein", "pantry staple", etc.
);

create index on public.ingredients(name);

-- ============================================================
-- RECIPE INGREDIENTS
-- ============================================================
create table public.recipe_ingredients (
  id              uuid primary key default gen_random_uuid(),
  recipe_id       uuid not null references public.recipes(id) on delete cascade,
  ingredient_id   uuid not null references public.ingredients(id),
  quantity        numeric,
  unit            text,         -- "cup", "tbsp", "g", "whole"
  preparation     text,         -- "minced", "diced", "room temperature"
  is_optional     boolean not null default false,
  sort_order      int not null default 0
);

create index on public.recipe_ingredients(recipe_id);
create index on public.recipe_ingredients(ingredient_id);

-- ============================================================
-- COOK LOGS
-- ============================================================
create table public.cook_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  recipe_id     uuid not null references public.recipes(id) on delete cascade,
  cooked_at     timestamptz not null default now(),
  servings_made int,
  rating        int check (rating between 1 and 5),
  notes         text,
  photo_url     text
);

create index on public.cook_logs(user_id, cooked_at desc);
create index on public.cook_logs(recipe_id);

-- ============================================================
-- PANTRY ITEMS
-- ============================================================
create table public.pantry_items (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  ingredient_id   uuid not null references public.ingredients(id),
  quantity        numeric,
  unit            text,
  expires_at      date,
  source          text check (source in ('manual','from_cook_log','from_leftover')),
  cook_log_id     uuid references public.cook_logs(id) on delete set null,
  created_at      timestamptz default now(),
  unique(user_id, ingredient_id)
);

create index on public.pantry_items(user_id);
create index on public.pantry_items(expires_at) where expires_at is not null;

-- ============================================================
-- TAGS
-- ============================================================
create table public.tags (
  id    uuid primary key default gen_random_uuid(),
  name  text unique not null
);

create table public.recipe_tags (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  tag_id    uuid not null references public.tags(id) on delete cascade,
  primary key (recipe_id, tag_id)
);

create index on public.recipe_tags(recipe_id);

-- ============================================================
-- EXTRACTION JOBS (async queue)
-- ============================================================
create table public.extraction_jobs (
  id            uuid primary key default gen_random_uuid(),
  recipe_id     uuid not null references public.recipes(id) on delete cascade,
  status        text not null default 'queued'
                  check (status in ('queued','running','done','failed')),
  attempts      int not null default 0,
  error         text,
  created_at    timestamptz default now(),
  started_at    timestamptz,
  completed_at  timestamptz
);

create index on public.extraction_jobs(status) where status in ('queued','running');
create index on public.extraction_jobs(recipe_id);
