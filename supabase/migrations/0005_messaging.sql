-- ===========================================================================
-- 0005_messaging.sql  —  WhatsApp accounts, conversations, messages
-- + a tenant-explicit search RPC used by the (session-less) webhook.
-- ===========================================================================

-- Maps an incoming WhatsApp Cloud API phone_number_id -> tenant, so a single
-- webhook can route messages to the right brokerage (multi-tenant).
create table if not exists public.whatsapp_accounts (
  id                   uuid primary key default uuid_generate_v4(),
  tenant_id            uuid not null references public.tenants(id) on delete cascade,
  phone_number_id      text not null unique,   -- from Meta (WhatsApp Cloud API)
  display_phone_number text,
  created_at           timestamptz not null default now()
);

create table if not exists public.conversations (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  lead_id         uuid references public.leads(id) on delete set null,
  channel         text not null default 'whatsapp',
  external_id     text not null,               -- customer phone (E.164)
  status          text not null default 'open',
  last_message_at timestamptz,
  created_at      timestamptz not null default now(),
  unique (tenant_id, channel, external_id)
);

create table if not exists public.messages (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  lead_id         uuid references public.leads(id) on delete set null,
  direction       text not null,               -- inbound | outbound
  channel         text not null default 'whatsapp',
  external_id     text,                         -- provider message id (wamid)
  body            text,
  status          text,                         -- received | sent | failed
  created_at      timestamptz not null default now()
);

-- Triggers: auto tenant stamping for session-based inserts
drop trigger if exists whatsapp_accounts_set_tenant on public.whatsapp_accounts;
create trigger whatsapp_accounts_set_tenant before insert on public.whatsapp_accounts
  for each row execute function public.set_tenant_id();

drop trigger if exists conversations_set_tenant on public.conversations;
create trigger conversations_set_tenant before insert on public.conversations
  for each row execute function public.set_tenant_id();

drop trigger if exists messages_set_tenant on public.messages;
create trigger messages_set_tenant before insert on public.messages
  for each row execute function public.set_tenant_id();

-- Indexes
create index if not exists conversations_tenant_idx on public.conversations (tenant_id, last_message_at desc);
create index if not exists conversations_lead_idx   on public.conversations (lead_id);
create index if not exists messages_convo_idx       on public.messages (conversation_id, created_at desc);
create index if not exists messages_tenant_idx      on public.messages (tenant_id, created_at desc);

-- RLS
alter table public.whatsapp_accounts enable row level security;
alter table public.conversations     enable row level security;
alter table public.messages          enable row level security;

drop policy if exists whatsapp_accounts_tenant on public.whatsapp_accounts;
create policy whatsapp_accounts_tenant on public.whatsapp_accounts
  for all using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

drop policy if exists conversations_tenant on public.conversations;
create policy conversations_tenant on public.conversations
  for all using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

drop policy if exists messages_tenant on public.messages;
create policy messages_tenant on public.messages
  for all using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

-- ---------------------------------------------------------------------------
-- Tenant-explicit search RPC. The WhatsApp webhook runs WITHOUT a user
-- session (service role), so it can't rely on current_tenant_id(). This
-- function takes the tenant explicitly and is locked to service_role ONLY,
-- so authenticated users cannot use it to read another tenant's data.
-- ---------------------------------------------------------------------------
create or replace function public.search_properties_admin(
  p_tenant          uuid,
  p_query_embedding vector(1536) default null,
  p_keywords        text    default null,
  p_match_count     int     default 8
)
returns table (
  id uuid, ref_code text, title jsonb, description jsonb, type text,
  status text, price numeric, currency text, area_sqm numeric,
  bedrooms int, bathrooms int, amenities text[], city text, district text,
  score double precision
)
language plpgsql stable security definer set search_path = public as $$
begin
  return query
  select
    p.id, p.ref_code, p.title, p.description, p.type, p.status,
    p.price, p.currency, p.area_sqm, p.bedrooms, p.bathrooms,
    p.amenities, p.city, p.district,
    case
      when p_query_embedding is null or p.embedding is null then 0.0
      else 1.0 - (p.embedding <=> p_query_embedding)
    end as score
  from public.properties p
  where p.tenant_id = p_tenant
    and p.status = 'available'
    and (
      p_keywords is null
      or p.search_tsv @@ plainto_tsquery('simple', p_keywords)
      or p_query_embedding is not null
    )
  order by
    case when p_query_embedding is null then 0
         else (p.embedding <=> p_query_embedding) end asc,
    p.created_at desc
  limit p_match_count;
end;
$$;

revoke all on function public.search_properties_admin(uuid, vector, text, int)
  from public, anon, authenticated;
grant execute on function public.search_properties_admin(uuid, vector, text, int)
  to service_role;
