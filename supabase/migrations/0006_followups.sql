-- ===========================================================================
-- 0006_followups.sql  —  Scheduled follow-ups (automation engine)
-- ===========================================================================

create table if not exists public.follow_ups (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  lead_id     uuid not null references public.leads(id) on delete cascade,
  due_at      timestamptz not null,
  channel     text not null default 'whatsapp', -- whatsapp | call | email | manual
  reason      text,
  message     text,
  status      text not null default 'pending',  -- pending | sent | done | cancelled
  auto        boolean not null default true,    -- scheduled by rules vs. added by hand
  sent_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists follow_ups_set_tenant on public.follow_ups;
create trigger follow_ups_set_tenant before insert on public.follow_ups
  for each row execute function public.set_tenant_id();

drop trigger if exists follow_ups_touch on public.follow_ups;
create trigger follow_ups_touch before update on public.follow_ups
  for each row execute function public.touch_updated_at();

create index if not exists follow_ups_tenant_idx on public.follow_ups (tenant_id, due_at);
create index if not exists follow_ups_due_idx on public.follow_ups (status, due_at);
create index if not exists follow_ups_lead_idx on public.follow_ups (lead_id);

alter table public.follow_ups enable row level security;

drop policy if exists follow_ups_tenant on public.follow_ups;
create policy follow_ups_tenant on public.follow_ups
  for all using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));
