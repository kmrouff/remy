-- Remy — recipe storage for signed-in users.
--
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New
-- query → paste → Run). Safe to re-run: everything is guarded.
--
-- Guests keep using localStorage and never touch this table. On first
-- sign-in the app claims any on-device recipes into the account.

create table if not exists public.recipes (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  title       text        not null,
  image       text,
  ingredients jsonb       not null default '[]'::jsonb,
  steps       jsonb       not null default '[]'::jsonb,
  -- null when not paused; otherwise { mode, cookingStepIndex,
  -- shoppingConfirmations, pausedAt } — mirrors the client's progress shape.
  progress    jsonb,
  saved_at    timestamptz not null default now()
);

-- The library lists a single user's recipes, newest first.
create index if not exists recipes_user_saved_at_idx
  on public.recipes (user_id, saved_at desc);

-- The app talks to Postgres directly from the browser with the anon key, so
-- RLS is the only thing separating accounts. Without this, any signed-in user
-- could read every row.
alter table public.recipes enable row level security;

drop policy if exists "own recipes: select" on public.recipes;
create policy "own recipes: select" on public.recipes
  for select using (auth.uid() = user_id);

drop policy if exists "own recipes: insert" on public.recipes;
create policy "own recipes: insert" on public.recipes
  for insert with check (auth.uid() = user_id);

drop policy if exists "own recipes: update" on public.recipes;
create policy "own recipes: update" on public.recipes
  for update using (auth.uid() = user_id)
           with check (auth.uid() = user_id);

drop policy if exists "own recipes: delete" on public.recipes;
create policy "own recipes: delete" on public.recipes
  for delete using (auth.uid() = user_id);
