-- Make code uniqueness per workspace so the same code can exist in different
-- workspaces without colliding. NULL workspace_id (company-wide rows) keeps
-- its existing behaviour.

alter table public.production_pipelines
  drop constraint if exists production_pipelines_company_id_code_key;
alter table public.production_pipelines
  add constraint production_pipelines_company_workspace_code_key
  unique (company_id, workspace_id, code);

alter table public.inventory_warehouses
  drop constraint if exists inventory_warehouses_company_code_key;
alter table public.inventory_warehouses
  add constraint inventory_warehouses_company_workspace_code_key
  unique (company_id, workspace_id, code);

alter table public.inventory_uoms
  drop constraint if exists inventory_uoms_company_code_key;
alter table public.inventory_uoms
  add constraint inventory_uoms_company_workspace_code_key
  unique (company_id, workspace_id, code);

alter table public.skus
  drop constraint if exists skus_company_id_sku_code_key;
alter table public.skus
  add constraint skus_company_workspace_sku_code_key
  unique (company_id, workspace_id, sku_code);

notify pgrst, 'reload schema';