-- ===========================================================================
-- 0003_search_fn.sql  —  Hybrid search RPC (also usable as an AI-agent tool)
-- ===========================================================================
-- Combines: semantic vector similarity + keyword match + hard filters.
-- Tenant is derived from auth.uid() so callers can never cross tenants.
-- ---------------------------------------------------------------------------
create or replace function public.search_properties(
  p_query_embedding vector(1536) default null,
  p_keywords        text    default null,
  p_min_price       numeric default null,
  p_max_price       numeric default null,
  p_bedrooms        int     default null,
  p_type            text    default null,
  p_city            text    default null,
  p_match_count     int     default 20
)
returns table (
  id          uuid,
  ref_code    text,
  title       jsonb,
  description jsonb,
  type        text,
  status      text,
  price       numeric,
  currency    text,
  area_sqm    numeric,
  bedrooms    int,
  bathrooms   int,
  amenities   text[],
  city        text,
  district    text,
  score       double precision
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_tenant uuid;
begin
  select public.current_tenant_id() into v_tenant;

  return query
  select
    p.id, p.ref_code, p.title, p.description, p.type, p.status,
    p.price, p.currency, p.area_sqm, p.bedrooms, p.bathrooms,
    p.amenities, p.city, p.district,
    -- Lower distance = better; convert to a 0..1-ish score for the UI.
    case
      when p_query_embedding is null or p.embedding is null then 0.0
      else 1.0 - (p.embedding <=> p_query_embedding)
    end as score
  from public.properties p
  where p.tenant_id = v_tenant
    and p.status = 'available'
    and (p_min_price is null or p.price >= p_min_price)
    and (p_max_price is null or p.price <= p_max_price)
    and (p_bedrooms  is null or p.bedrooms >= p_bedrooms)
    and (p_type      is null or p.type = p_type)
    and (p_city      is null or p.city ilike '%' || p_city || '%')
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
