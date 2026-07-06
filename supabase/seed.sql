-- ===========================================================================
-- seed.sql  —  Sample bilingual listings for local testing.
-- Run AFTER you have signed up at least one user (so a tenant exists).
-- Replace :tenant with your tenant id:  select id from public.tenants;
-- ===========================================================================
-- Example (psql):  \set tenant '00000000-0000-0000-0000-000000000000'

insert into public.properties
  (tenant_id, ref_code, title, description, type, status, price, currency, area_sqm, bedrooms, bathrooms, amenities, city, district)
values
  (:'tenant', 'HSB-0001',
   '{"en":"Sunny 2-BR apartment in Maadi","ar":"شقة غرفتين مشمسة في المعادي"}',
   '{"en":"Bright apartment with a private garden, close to metro.","ar":"شقة مضيئة مع حديقة خاصة وقريبة من المترو."}',
   'apartment', 'available', 2800000, 'EGP', 120, 2, 2,
   array['garden','elevator','parking'], 'Cairo', 'Maadi'),
  (:'tenant', 'HSB-0002',
   '{"en":"Luxury villa with pool in New Cairo","ar":"فيلا فاخرة بحمام سباحة في القاهرة الجديدة"}',
   '{"en":"Spacious family villa with private pool and large garden.","ar":"فيلا عائلية واسعة مع حمام سباحة خاص وحديقة كبيرة."}',
   'villa', 'available', 12500000, 'EGP', 400, 5, 4,
   array['pool','garden','parking','security'], 'Cairo', 'New Cairo');
