-- ============================================================================
-- Beekeeper — Production stage SKU assignments and standalone usage entries
-- ----------------------------------------------------------------------------
--   * A stage can have one or more SKUs assigned to it.
--   * Production usage is recorded per pipeline -> stage -> assigned SKU, with
--     the quantity and the authenticated user who submitted it.
--   * Usage no longer requires a production run. Run-based rows keep working.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. SKUs assigned to production stages
-- ---------------------------------------------------------------------------
create table if not exists public.production_stage_skus (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  stage_id uuid not null references public.production_stages(id) on delete cascade,
  sku_id uuid not null references public.skus(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (stage_id, sku_id)
);

create index if not exists production_stage_skus_stage_idx
  on public.production_stage_skus (stage_id);

create index if not exists production_stage_skus_sku_idx
  on public.production_stage_skus (sku_id);

-- ---------------------------------------------------------------------------
-- 2. Usage columns for the SKU-level flow
-- ---------------------------------------------------------------------------
alter table public.production_usage
  alter column run_id drop not null,
  add column if not exists sku_id uuid references public.skus(id) on delete set null,
  add column if not exists quantity numeric(14, 4) not null default 0,
  add column if not exists submitted_by uuid references auth.users(id) on delete set null,
  add column if not exists usage_date date not null default current_date;

alter table public.production_usage
  drop constraint if exists production_usage_quantity_check;

alter table public.production_usage
  add constraint production_usage_quantity_check check (quantity >= 0);

-- The old run/stage upsert is replaced by SKU-level usage submissions, which
-- can be recorded more than once for the same stage.
alter table public.production_usage
  drop constraint if exists production_usage_run_id_stage_id_key;

-- Existing run usage becomes the initial quantity and keeps its submitter.
update public.production_usage
set quantity = output_quantity
where quantity = 0
  and output_quantity > 0;

update public.production_usage
set submitted_by = recorded_by
where submitted_by is null;

create index if not exists production_usage_pipeline_stage_idx
  on public.production_usage (pipeline_id, stage_id, recorded_at desc);

create index if not exists production_usage_sku_idx
  on public.production_usage (sku_id);

-- ---------------------------------------------------------------------------
-- 3. Permission descriptions reflect the SKU-level usage flow
-- ---------------------------------------------------------------------------
update public.permissions
set description = 'Create production pipelines, stages and record usage'
where key = 'production.create';

update public.permissions
set description = 'Assign stage SKUs, record usage and update runs'
where key = 'production.update';

-- ---------------------------------------------------------------------------
-- 4. Row level security
-- ---------------------------------------------------------------------------
alter table public.production_stage_skus enable row level security;
drop policy if exists "company members can access" on public.production_stage_skus;
create policy "company members can access" on public.production_stage_skus
  for all to authenticated
  using (company_id in (select public.current_company_ids()))
  with check (company_id in (select public.current_company_ids()));

grant select, insert, update, delete on public.production_stage_skus to authenticated;

notify pgrst, 'reload schema';
