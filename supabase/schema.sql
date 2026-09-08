-- ============================================================
-- Equipment Coming - Supabase šema
-- Nalepi ceo ovaj fajl u Supabase Dashboard -> SQL Editor -> Run
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- PROFILES: dodatni podaci o korisniku (ime, uloga) uz auth.users
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  username text unique,
  role text not null default 'FLEET' check (role in ('ADMIN','MAINTENANCE','FLEET')),
  created_at timestamptz not null default now()
);

-- Helper funkcije (SECURITY DEFINER da izbegnemo beskonačnu rekurziju u RLS politikama)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'ADMIN'
  );
$$;

create or replace function public.current_role()
returns text
language sql
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles for update
  using (public.is_admin());

-- Automatski napravi profil kad se napravi nalog (i za admin-created naloge preko Netlify funkcije)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    lower(new.raw_user_meta_data->>'username'),
    coalesce(new.raw_user_meta_data->>'role', 'FLEET')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- VEHICLES: kamioni i prikolice
-- ------------------------------------------------------------
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  plate text not null,
  driver text not null default '',
  arrival_date date not null default current_date,
  eta text,
  reason text not null,
  comment text,
  destination text not null default 'SOHO' check (destination in ('SOHO','MEPA')),
  status text not null default 'ARRIVING' check (status in ('ARRIVING','ARRIVED','READY')),
  ready_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vehicles enable row level security;

-- Tabla na TV-u je javna (bez logina) - svako sme da ČITA listu vozila
drop policy if exists "vehicles_select_public" on public.vehicles;
create policy "vehicles_select_public"
  on public.vehicles for select
  using (true);

-- Samo MAINTENANCE i ADMIN prijavljuju dolazak (kreiraju novo vozilo)
drop policy if exists "vehicles_insert_maintenance_admin" on public.vehicles;
create policy "vehicles_insert_maintenance_admin"
  on public.vehicles for insert
  to authenticated
  with check (public.current_role() in ('MAINTENANCE','ADMIN'));

-- Samo FLEET i ADMIN menjaju status (ARRIVED/READY)
drop policy if exists "vehicles_update_fleet_admin" on public.vehicles;
create policy "vehicles_update_fleet_admin"
  on public.vehicles for update
  to authenticated
  using (public.current_role() in ('FLEET','ADMIN'));

-- Samo ADMIN briše
drop policy if exists "vehicles_delete_admin" on public.vehicles;
create policy "vehicles_delete_admin"
  on public.vehicles for delete
  to authenticated
  using (public.is_admin());

-- Auto-update "updated_at"
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_vehicles_updated_at on public.vehicles;
create trigger trg_vehicles_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Privilegije (Postgres GRANT - odvojeno od RLS politika)
-- ------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on public.vehicles to anon, authenticated;
grant insert, update, delete on public.vehicles to authenticated;

grant select, update on public.profiles to authenticated;

-- ------------------------------------------------------------
-- Realtime (za TV tablu koja se uživo osvežava)
-- ------------------------------------------------------------
alter publication supabase_realtime add table public.vehicles;

-- ============================================================
-- Kraj. Sledeći korak: napravi svoj prvi ADMIN nalog -
-- vidi uputstvo u README.md ("Prvi admin nalog").
-- ============================================================
