-- ============================================================================
-- Beekeeper — outlet location detail fields
-- ============================================================================
alter table public.outlets
  add column if not exists description text,
  add column if not exists region text,
  add column if not exists province text,
  add column if not exists city text,
  add column if not exists barangay text,
  add column if not exists zip_code text;

create index if not exists outlets_region_idx on public.outlets (region);
create index if not exists outlets_province_idx on public.outlets (province);
create index if not exists outlets_city_idx on public.outlets (city);

notify pgrst, 'reload schema';
