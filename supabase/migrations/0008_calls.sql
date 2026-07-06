-- ===========================================================================
-- 0008_calls.sql  —  Call & conversation summarization (Milestone 7)
-- Stores a transcript + AI-generated structured summary, optionally linked to
-- a lead. Transcription (Whisper) happens in the app; this table is the record.
-- ===========================================================================

create table if not exists public.calls (
  id               uuid primary key default uuid_generate_v4(),
  tenant_id        uuid not null references public.tenants(id) on delete cascade,
  lead_id          uuid references public.leads(id) on delete set null,
  title            text,
  transcript       text,
  summary          jsonb not null default '{}'::jsonb,
  sentiment        text,                       -- positive | neutral | negative
  duration_seconds integer,
  source           text not null default 'manual', -- manual | upload | whatsapp
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

drop trigger if exists calls_set_tenant on public.calls;
create trigger calls_set_tenant before insert on public.calls
  for each row execute function public.set_tenant_id();

drop trigger if exists calls_touch on public.calls;
create trigger calls_touch before update on public.calls
  for each row execute function public.touch_updated_at();

create index if not exists calls_tenant_idx on public.calls (tenant_id, created_at desc);
create index if not exists calls_lead_idx on public.calls (lead_id);

alter table public.calls enable row level security;

drop policy if exists calls_tenant on public.calls;
create policy calls_tenant on public.calls
  for all using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));
