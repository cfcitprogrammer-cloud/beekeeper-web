-- Add workspace scoping to the remaining company-wide master/config tables.
-- NULL means the row is company-wide and visible in every workspace.

alter table public.sku_categories
  add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;
alter table public.inventory_uoms
  add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;
alter table public.departments
  add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;
alter table public.positions
  add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;
alter table public.shifts
  add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;
alter table public.leave_types
  add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;
alter table public.expense_categories
  add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;
alter table public.production_stages
  add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;
alter table public.production_stage_skus
  add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;
alter table public.production_usage_settings
  add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;
alter table public.sku_components
  add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;

create index if not exists sku_categories_workspace_idx on public.sku_categories (company_id, workspace_id);
create index if not exists inventory_uoms_workspace_idx on public.inventory_uoms (company_id, workspace_id);
create index if not exists departments_workspace_idx on public.departments (company_id, workspace_id);
create index if not exists positions_workspace_idx on public.positions (company_id, workspace_id);
create index if not exists shifts_workspace_idx on public.shifts (company_id, workspace_id);
create index if not exists leave_types_workspace_idx on public.leave_types (company_id, workspace_id);
create index if not exists expense_categories_workspace_idx on public.expense_categories (company_id, workspace_id);
create index if not exists production_stages_workspace_idx on public.production_stages (company_id, workspace_id);
create index if not exists production_stage_skus_workspace_idx on public.production_stage_skus (company_id, workspace_id);
create index if not exists production_usage_settings_workspace_idx on public.production_usage_settings (company_id, workspace_id);
create index if not exists sku_components_workspace_idx on public.sku_components (company_id, workspace_id);

notify pgrst, 'reload schema';
