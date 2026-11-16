-- ---------------------------------------------------------------------------
-- SKU components (Bill of Materials)
--
-- A SKU can be composed of other SKUs. `sku_components` records, for a given
-- parent SKU, which component SKUs it contains and how many units of each
-- component are required per single unit of the parent. Used to auto-expand
-- component lines when recording production usage against a parent SKU.
-- ---------------------------------------------------------------------------
create table if not exists public.sku_components (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  parent_sku_id uuid not null references public.skus(id) on delete cascade,
  component_sku_id uuid not null references public.skus(id) on delete cascade,
  quantity numeric not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sku_components_no_self check (parent_sku_id <> component_sku_id),
  constraint sku_components_unique unique (company_id, parent_sku_id, component_sku_id)
);

create index if not exists sku_components_parent_idx
  on public.sku_components (company_id, parent_sku_id);

create index if not exists sku_components_component_idx
  on public.sku_components (company_id, component_sku_id);

-- Row level security, matching the other company-scoped tables.
alter table public.sku_components enable row level security;

drop policy if exists "company members can access" on public.sku_components;
create policy "company members can access" on public.sku_components
  for all to authenticated
  using (company_id in (select public.current_company_ids()))
  with check (company_id in (select public.current_company_ids()));

drop trigger if exists set_updated_at on public.sku_components;
create trigger set_updated_at
  before update on public.sku_components
  for each row execute function public.touch_updated_at();

grant select, insert, update, delete on public.sku_components to authenticated;

notify pgrst, 'reload schema';