-- Allow production usage settings to be configured per workspace while keeping
-- at most one company-wide default (workspace_id IS NULL).

alter table public.production_usage_settings
  drop constraint if exists production_usage_settings_company_id_key;

drop index if exists production_usage_settings_company_workspace_uidx;

create unique index if not exists production_usage_settings_company_workspace_uidx
  on public.production_usage_settings (company_id, workspace_id);

notify pgrst, 'reload schema';