-- ===========================================================================
-- 0007_ingestion.sql  —  Source tracking + de-duplication for imported data
-- ===========================================================================

-- Where a listing came from, so we can de-dupe and re-sync.
alter table public.properties add column if not exists source text;
alter table public.properties add column if not exists external_id text;
alter table public.properties add column if not exists external_url text;

-- One row per (tenant, source, external_id) so re-imports UPDATE instead of
-- creating duplicates. Partial index: only applies when both are present.
create unique index if not exists properties_source_ext_idx
  on public.properties (tenant_id, source, external_id)
  where source is not null and external_id is not null;

-- Track each import run for auditing + a future "data sources" report.
create table if not exists public.import_batches (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  source      text not null,
  total       int not null default 0,
  inserted    int not null default 0,
  updated     int not null default 0,
  skipped     int not null default 0,
  errors      jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

drop trigger if exists import_batches_set_tenant on public.import_batches;
create trigger import_batches_set_tenant before insert on public.import_batches
  for each row execute function public.set_tenant_id();

create index if not exists import_batches_tenant_idx
  on public.import_batches (tenant_id, created_at desc);

alter table public.import_batches enable row level security;

drop policy if exists import_batches_tenant on public.import_batches;
create policy import_batches_tenant on public.import_batches
  for all using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));
