-- ============================================================
-- CMA — Supabase (Postgres) schema + Row Level Security (RLS)
-- Run this whole file once in:
-- Supabase Dashboard → SQL Editor → New query → paste → Run
-- ============================================================

-- ---- profiles ----
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  phone text,
  role text not null default 'parent' check (role in ('parent', 'volunteer', 'authority')),
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---- cases ----
create table cases (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id),
  child_name text not null,
  age int not null,
  description text not null,
  photo_url text,
  last_known_lat double precision,
  last_known_lng double precision,
  last_known_address text,
  fir_number text,
  police_station text,
  district text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'resolved')),
  created_at timestamptz not null default now(),
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  resolved_at timestamptz
);

-- ---- sightings ----
create table sightings (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  reporter_id uuid not null references profiles(id),
  lat double precision,
  lng double precision,
  notes text,
  photo_url text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Helper functions
-- ============================================================
create or replace function is_authority()
returns boolean language sql security definer stable as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'authority');
$$;

create or replace function is_verified()
returns boolean language sql security definer stable as $$
  select exists (select 1 from profiles where id = auth.uid() and verified = true);
$$;

-- ============================================================
-- Enable RLS
-- ============================================================
alter table profiles enable row level security;
alter table cases enable row level security;
alter table sightings enable row level security;

-- ---- profiles policies ----
create policy "profiles are readable by any signed-in user"
  on profiles for select using (auth.uid() is not null);

create policy "users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id and role in ('parent', 'volunteer'));

create policy "users can update their own profile but not their role"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from profiles where id = auth.uid()));

-- ---- cases policies ----
create policy "verified users can create pending cases"
  on cases for insert
  with check (is_verified() and reporter_id = auth.uid() and status = 'pending');

create policy "read approved cases, own cases, or all if authority"
  on cases for select
  using (status = 'approved' or reporter_id = auth.uid() or is_authority());

create policy "authority can update any case"
  on cases for update using (is_authority()) with check (is_authority());

create policy "owner can edit their own case details but not its status"
  on cases for update
  using (reporter_id = auth.uid())
  with check (reporter_id = auth.uid());

create policy "authority can delete cases"
  on cases for delete using (is_authority());

create or replace function prevent_owner_status_change()
returns trigger language plpgsql as $$
begin
  if not is_authority() and NEW.status is distinct from OLD.status then
    raise exception 'Only an authority account can change case status';
  end if;
  return NEW;
end;
$$;

create trigger trg_prevent_owner_status_change
  before update on cases
  for each row execute function prevent_owner_status_change();

-- ---- sightings policies ----
create policy "verified users can add sightings on approved cases"
  on sightings for insert
  with check (
    is_verified() and reporter_id = auth.uid()
    and exists (select 1 from cases where id = case_id and status = 'approved')
  );

create policy "any signed-in user can read sightings"
  on sightings for select using (auth.uid() is not null);

create policy "only authority can edit or delete sightings"
  on sightings for update using (is_authority()) with check (is_authority());

create policy "only authority can delete sightings"
  on sightings for delete using (is_authority());

-- ============================================================
-- AFTER creating a "case-photos" bucket in Storage (Public ON),
-- come back and run these two:
-- ============================================================
-- create policy "verified users can upload case photos"
--   on storage.objects for insert
--   with check (bucket_id = 'case-photos' and is_verified());
--
-- create policy "anyone can view case photos"
--   on storage.objects for select
--   using (bucket_id = 'case-photos');
