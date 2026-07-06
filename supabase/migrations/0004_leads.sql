-- ===========================================================================
-- 0004_leads.sql  —  Leads (clients) + interactions + AI qualification fields
-- ===========================================================================

create table if not exists public.leads (
  id             uuid primary key default uuid_generate_v4(),
  tenant_id      uuid not null references public.tenants(id) on delete cascade,
  name           text,
  phone          text,
  email          text,
  source         text,          -- whatsapp | referral | facebook | walk_in | website
  status         text not null default 'new', -- new|contacted|qualified|viewing|negotiating|won|lost
  -- Requirements (drive matching + qualification)
  budget_min     numeric,
  budget_max     numeric,
  preferred_city text,
  preferred_type text,          -- apartment | villa | land | office | chalet
  bedrooms_min   int,
  notes          text,
  -- AI qualification output
  score          int,           -- 0..100
  qualification  text,          -- hot | warm | cold | unqualified
  ai_summary     text,
  next_action    text,
  qualified_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Every touchpoint with a lead (note now; WhatsApp/call/email feed this later).
create table if not exists public.lead_interactions (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  lead_id     uuid not null references public.leads(id) on delete cascade,
  channel     text,           -- note | whatsapp | call | email
  direction   text,           -- inbound | outbound | internal
  content     text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- Triggers: auto tenant + updated_at
drop trigger if exists leads_set_tenant on public.leads;
create trigger leads_set_tenant before insert on public.leads
  for each row execute function public.set_tenant_id();

drop trigger if exists leads_touch on public.leads;
create trigger leads_touch before update on public.leads
  for each row execute function public.touch_updated_at();

drop trigger if exists lead_interactions_set_tenant on public.lead_interactions;
create trigger lead_interactions_set_tenant before insert on public.lead_interactions
  for each row execute function public.set_tenant_id();

-- Indexes
create index if not exists leads_tenant_idx  on public.leads (tenant_id, created_at desc);
create index if not exists leads_status_idx  on public.leads (status);
create index if not exists lead_interactions_lead_idx on public.lead_interactions (lead_id, created_at desc);

-- RLS
alter table public.leads             enable row level security;
alter table public.lead_interactions enable row level security;

drop policy if exists leads_tenant on public.leads;
create policy leads_tenant on public.leads
  for all using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

drop policy if exists lead_interactions_tenant on public.lead_interactions;
create policy lead_interactions_tenant on public.lead_interactions
  for all using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));
