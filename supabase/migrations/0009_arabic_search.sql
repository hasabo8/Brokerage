-- ===========================================================================
-- 0009_arabic_search.sql  —  Arabic-aware keyword search
-- ---------------------------------------------------------------------------
-- Fixes two problems with Arabic queries:
--   1) Letter variants: normalizes ة/ه, ى/ي, أإآ/ا, ؤ/و, ئ/ي so that
--      "شقه" matches "شقة" and "المعادي" matches regardless of spelling.
--   2) Match mode: switches keyword matching from AND to OR, so filler words
--      (e.g. "عايز") no longer block results.
-- Safe to re-run (CREATE OR REPLACE) and re-indexes existing rows at the end.
-- ===========================================================================

-- 1) Arabic normalizer (immutable so it is usable in triggers/indexes).
create or replace function public.arabic_normalize(txt text)
returns text language sql immutable as $$
  select lower(
    replace(replace(replace(replace(replace(replace(replace(
      coalesce(txt, ''),
      'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ى', 'ي'), 'ؤ', 'و'), 'ئ', 'ي'), 'ة', 'ه')
  );
$$;

-- 2) Build a permissive OR tsquery from free text (after normalization).
--    Returns NULL when no usable terms remain.
create or replace function public.keywords_to_query(p_keywords text)
returns tsquery language sql immutable as $$
  select nullif(string_agg(q::text, ' | '), '')::tsquery
  from (
    select plainto_tsquery('simple', w) as q
    from unnest(string_to_array(public.arabic_normalize(p_keywords), ' ')) as w
    where length(trim(w)) > 0
  ) sub
  where q::text <> '';
$$;

-- 3) Rebuild the search vector using the normalizer (bilingual, weighted).
create or replace function public.properties_tsv_update()
returns trigger language plpgsql as $$
begin
  new.search_tsv :=
    setweight(to_tsvector('simple', public.arabic_normalize(coalesce(new.title->>'en','') || ' ' || coalesce(new.title->>'ar',''))), 'A') ||
    setweight(to_tsvector('simple', public.arabic_normalize(coalesce(new.description->>'en','') || ' ' || coalesce(new.description->>'ar',''))), 'B') ||
    setweight(to_tsvector('simple', public.arabic_normalize(coalesce(new.city,'') || ' ' || coalesce(new.district,'') || ' ' || array_to_string(new.amenities, ' '))), 'C');
  return new;
end;
$$;

-- 4) Session search RPC: normalized OR keyword matching + rank ordering.
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
  v_query  tsquery;
begin
  select public.current_tenant_id() into v_tenant;
  v_query := public.keywords_to_query(p_keywords);

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
  where p.tenant_id = v_tenant
    and p.status = 'available'
    and (p_min_price is null or p.price >= p_min_price)
    and (p_max_price is null or p.price <= p_max_price)
    and (p_bedrooms  is null or p.bedrooms >= p_bedrooms)
    and (p_type      is null or p.type = p_type)
    and (p_city      is null or p.city ilike '%' || p_city || '%')
    and (
      v_query is null
      or p.search_tsv @@ v_query
      or p_query_embedding is not null
    )
  order by
    case when p_query_embedding is null then 0
         else (p.embedding <=> p_query_embedding) end asc,
    ts_rank(p.search_tsv, coalesce(v_query, ''::tsquery)) desc,
    p.created_at desc
  limit p_match_count;
end;
$$;

-- 5) Service-role search RPC (WhatsApp webhook) with the same behavior.
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
declare
  v_query tsquery;
begin
  v_query := public.keywords_to_query(p_keywords);

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
      v_query is null
      or p.search_tsv @@ v_query
      or p_query_embedding is not null
    )
  order by
    case when p_query_embedding is null then 0
         else (p.embedding <=> p_query_embedding) end asc,
    ts_rank(p.search_tsv, coalesce(v_query, ''::tsquery)) desc,
    p.created_at desc
  limit p_match_count;
end;
$$;

revoke all on function public.search_properties_admin(uuid, vector, text, int)
  from public, anon, authenticated;
grant execute on function public.search_properties_admin(uuid, vector, text, int)
  to service_role;

-- 6) Re-index existing rows so their search vector uses the new normalizer.
update public.properties set updated_at = now();
