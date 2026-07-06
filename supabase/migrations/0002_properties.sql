-- ===========================================================================
-- 0002_properties.sql  —  Properties, images, events (audit), bilingual + vector
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Properties. Translatable fields are jsonb {"en":..,"ar":..}.
-- ---------------------------------------------------------------------------
create table if not exists public.properties (
  id           uuid primary key default uuid_generate_v4(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  ref_code     text,
  title        jsonb not null default '{}'::jsonb,
  description  jsonb not null default '{}'::jsonb,
  type         text,                          -- apartment | villa | land | office | chalet
  status       text not null default 'available', -- available | reserved | sold | off_market
  price        numeric,
  currency     text not null default 'EGP',
  area_sqm     numeric,
  bedrooms     int,
  bathrooms    int,
  amenities    text[] not null default '{}',
  city         text,
  district     text,
  address      jsonb not null default '{}'::jsonb,
  metadata     jsonb not null default '{}'::jsonb,
  embedding    vector(1536),
  search_tsv   tsvector,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.property_images (
  id           uuid primary key default uuid_generate_v4(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  property_id  uuid not null references public.properties(id) on delete cascade,
  storage_path text not null,
  is_cover     boolean not null default false,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

-- Audit / behavioural event log. Feeds "analyze client behavior" and
-- "suggest next best action" in later milestones.
create table if not exists public.events (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  actor_type  text,          -- user | agent | system
  actor_id    uuid,
  entity_type text,          -- property | lead | conversation ...
  entity_id   uuid,
  action      text,          -- created | updated | viewed | searched ...
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Keyword search vector (bilingual): weight title higher than description.
-- ---------------------------------------------------------------------------
create or replace function public.properties_tsv_update()
returns trigger language plpgsql as $$
begin
  new.search_tsv :=
    setweight(to_tsvector('simple', coalesce(new.title->>'en','') || ' ' || coalesce(new.title->>'ar','')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.description->>'en','') || ' ' || coalesce(new.description->>'ar','')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.city,'') || ' ' || coalesce(new.district,'') || ' ' || array_to_string(new.amenities, ' ')), 'C');
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
drop trigger if exists properties_set_tenant on public.properties;
create trigger properties_set_tenant before insert on public.properties
  for each row execute function public.set_tenant_id();

drop trigger if exists properties_tsv on public.properties;
create trigger properties_tsv before insert or update on public.properties
  for each row execute function public.properties_tsv_update();

drop trigger if exists properties_touch on public.properties;
create trigger properties_touch before update on public.properties
  for each row execute function public.touch_updated_at();

drop trigger if exists property_images_set_tenant on public.property_images;
create trigger property_images_set_tenant before insert on public.property_images
  for each row execute function public.set_tenant_id();

drop trigger if exists events_set_tenant on public.events;
create trigger events_set_tenant before insert on public.events
  for each row execute function public.set_tenant_id();

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists properties_tenant_idx  on public.properties (tenant_id);
create index if not exists properties_status_idx  on public.properties (status);
create index if not exists properties_search_idx  on public.properties using gin (search_tsv);
create index if not exists properties_embed_idx   on public.properties using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists property_images_prop_idx on public.property_images (property_id);
create index if not exists events_tenant_idx       on public.events (tenant_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS: strict tenant isolation on every table
-- ---------------------------------------------------------------------------
alter table public.properties      enable row level security;
alter table public.property_images enable row level security;
alter table public.events          enable row level security;

drop policy if exists properties_tenant on public.properties;
create policy properties_tenant on public.properties
  for all using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

drop policy if exists property_images_tenant on public.property_images;
create policy property_images_tenant on public.property_images
  for all using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

drop policy if exists events_tenant on public.events;
create policy events_tenant on public.events
  for all using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));
