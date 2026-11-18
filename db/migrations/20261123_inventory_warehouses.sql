-- ---------------------------------------------------------------------------
-- Inventory warehouses
--
-- Company/workspace-scoped warehouse master data. This is a simple directory
-- used to label where inventory belongs; it does not track stock levels or
-- stock movements.
--
-- `public.skus.production_warehouse_id` is an optional label that records the
-- production warehouse an item is assigned to. It is intentionally just a
-- reference and has no effect on availability, quantities or bookings.
-- ---------------------------------------------------------------------------

create table if not exists public.inventory_warehouses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  code text not null,
  name text not null,
  address text,
  contact_person text,
  phone text,
  email text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_warehouses_company_code_key unique (company_id, code)
);

create index if not exists inventory_warehouses_company_idx
  on public.inventory_warehouses (company_id, is_active);

create index if not exists inventory_warehouses_workspace_idx
  on public.inventory_warehouses (company_id, workspace_id);

alter table public.skus
  add column if not exists production_warehouse_id uuid
  references public.inventory_warehouses(id) on delete set null;

create index if not exists skus_production_warehouse_idx
  on public.skus (production_warehouse_id);

-- Row level security, matching the other company-scoped tables.
alter table public.inventory_warehouses enable row level security;

drop policy if exists "company members can access" on public.inventory_warehouses;
create policy "company members can access" on public.inventory_warehouses
  for all to authenticated
  using (company_id in (select public.current_company_ids()))
  with check (company_id in (select public.current_company_ids()));

drop trigger if exists set_updated_at on public.inventory_warehouses;
create trigger set_updated_at
  before update on public.inventory_warehouses
  for each row execute function public.touch_updated_at();

grant select, insert, update, delete on public.inventory_warehouses to authenticated;

notify pgrst, 'reload schema';
