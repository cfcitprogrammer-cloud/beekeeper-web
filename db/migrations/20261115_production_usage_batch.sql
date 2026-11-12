-- ============================================================================
-- Beekeeper — Group multiple SKU quantities into one production usage entry
-- ----------------------------------------------------------------------------
-- A single usage submission can now include several assigned SKUs. Each SKU
-- line remains a row in production_usage, linked by a shared batch_id.
-- ============================================================================

alter table public.production_usage
  add column if not exists batch_id uuid;

-- Existing rows were single-SKU submissions; each becomes its own batch.
update public.production_usage
set batch_id = id
where batch_id is null;

alter table public.production_usage
  alter column batch_id set default gen_random_uuid();

alter table public.production_usage
  alter column batch_id set not null;

create index if not exists production_usage_batch_idx
  on public.production_usage (batch_id);

create index if not exists production_usage_submitted_by_idx
  on public.production_usage (submitted_by, recorded_at desc);

notify pgrst, 'reload schema';
