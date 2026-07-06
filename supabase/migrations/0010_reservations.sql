-- ===========================================================================
-- 0010_reservations.sql  --  Reserve a property for a specific client (lead)
-- ===========================================================================
-- Adds a lightweight link from a property to the client it is reserved for.
-- Keeping this on the properties row (instead of a separate table) keeps the
-- feature simple and easy to replace later if a full booking history is needed.

alter table public.properties
  add column if not exists reserved_for uuid references public.leads(id) on delete set null,
  add column if not exists reserved_at timestamptz;

create index if not exists properties_reserved_for_idx
  on public.properties (reserved_for);
