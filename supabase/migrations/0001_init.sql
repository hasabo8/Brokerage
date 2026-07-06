-- ===========================================================================
-- 0001_init.sql  —  Foundation: extensions, tenancy, auth wiring, RLS helpers
-- ===========================================================================

create extension if not exists "uuid-ossp";
create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- Tenants (brokerages / workspaces) + memberships
-- ---------------------------------------------------------------------------
create table if not exists public.tenants (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  slug       text unique,
  plan       text not null default 'free',
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  phone      text,
  avatar_url text,
  locale     text not null default 'en',
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      text not null default 'owner', -- owner | agent | viewer
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

-- ---------------------------------------------------------------------------
-- RLS helper: which tenants can the current user access?
-- ---------------------------------------------------------------------------
create or replace function public.current_tenant_ids()
returns setof uuid
language sql stable security definer set search_path = public as $$
  select tenant_id from public.memberships where user_id = auth.uid()
$$;

-- Convenience: the caller's primary (first) tenant.
create or replace function public.current_tenant_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select tenant_id from public.memberships where user_id = auth.uid() limit 1
$$;

-- ---------------------------------------------------------------------------
-- Auto-provision a tenant + profile + membership on every new signup.
-- This is what makes the app "multi-tenant SaaS from day one" with zero
-- manual onboarding: sign up -> you instantly own a workspace.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  new_tenant uuid;
begin
  insert into public.tenants (name, slug)
  values (
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)) || '''s Brokerage',
    't_' || replace(new.id::text, '-', '')
  )
  returning id into new_tenant;

  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');

  insert into public.memberships (tenant_id, user_id, role)
  values (new_tenant, new.id, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Generic BEFORE INSERT trigger to stamp tenant_id automatically, so API
-- callers and AI agents never need to know/pass the tenant id.
-- ---------------------------------------------------------------------------
create or replace function public.set_tenant_id()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.tenant_id is null then
    new.tenant_id := public.current_tenant_id();
  end if;
  return new;
end;
$$;

-- Generic updated_at maintenance.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS on tenancy tables
-- ---------------------------------------------------------------------------
alter table public.tenants     enable row level security;
alter table public.profiles    enable row level security;
alter table public.memberships enable row level security;

drop policy if exists tenants_member_read on public.tenants;
create policy tenants_member_read on public.tenants
  for select using (id in (select public.current_tenant_ids()));

drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists memberships_self on public.memberships;
create policy memberships_self on public.memberships
  for select using (user_id = auth.uid());
