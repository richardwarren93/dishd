-- ============================================================
-- Row Level Security Policies
-- ============================================================

-- ── profiles ────────────────────────────────────────────────
alter table public.profiles enable row level security;

create policy "profiles_select_public"
  on public.profiles for select using (true);

create policy "profiles_insert_own"
  on public.profiles for insert with check (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update using (id = auth.uid());

-- ── follows ─────────────────────────────────────────────────
alter table public.follows enable row level security;

create policy "follows_select_own"
  on public.follows for select using (follower_id = auth.uid() or following_id = auth.uid());

create policy "follows_insert_own"
  on public.follows for insert with check (follower_id = auth.uid());

create policy "follows_delete_own"
  on public.follows for delete using (follower_id = auth.uid());

-- ── recipes ─────────────────────────────────────────────────
alter table public.recipes enable row level security;

create policy "recipes_select"
  on public.recipes for select
  using (user_id = auth.uid() or is_public = true);

create policy "recipes_insert_own"
  on public.recipes for insert with check (user_id = auth.uid());

create policy "recipes_update_own"
  on public.recipes for update using (user_id = auth.uid());

create policy "recipes_delete_own"
  on public.recipes for delete using (user_id = auth.uid());

-- ── recipe_steps ────────────────────────────────────────────
alter table public.recipe_steps enable row level security;

create policy "recipe_steps_select"
  on public.recipe_steps for select
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and (r.user_id = auth.uid() or r.is_public = true)
    )
  );

create policy "recipe_steps_write_own"
  on public.recipe_steps for all
  using (
    exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid())
  );

-- ── ingredients ─────────────────────────────────────────────
alter table public.ingredients enable row level security;

-- Ingredients are read-only from client; inserts happen server-side (service role)
create policy "ingredients_select_all"
  on public.ingredients for select using (true);

-- ── recipe_ingredients ──────────────────────────────────────
alter table public.recipe_ingredients enable row level security;

create policy "recipe_ingredients_select"
  on public.recipe_ingredients for select
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and (r.user_id = auth.uid() or r.is_public = true)
    )
  );

create policy "recipe_ingredients_write_own"
  on public.recipe_ingredients for all
  using (
    exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid())
  );

-- ── cook_logs ───────────────────────────────────────────────
alter table public.cook_logs enable row level security;

create policy "cook_logs_own"
  on public.cook_logs for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── pantry_items ────────────────────────────────────────────
alter table public.pantry_items enable row level security;

create policy "pantry_items_own"
  on public.pantry_items for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── tags ────────────────────────────────────────────────────
alter table public.tags enable row level security;

create policy "tags_select_all"
  on public.tags for select using (true);

-- ── recipe_tags ─────────────────────────────────────────────
alter table public.recipe_tags enable row level security;

create policy "recipe_tags_select"
  on public.recipe_tags for select
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and (r.user_id = auth.uid() or r.is_public = true)
    )
  );

create policy "recipe_tags_write_own"
  on public.recipe_tags for all
  using (
    exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid())
  );

-- ── extraction_jobs ─────────────────────────────────────────
alter table public.extraction_jobs enable row level security;

-- Only service role can read/write extraction_jobs (via admin client in API routes)
-- No policies needed — service role bypasses RLS
