-- Add workspace scoping to the SKU catalog.
-- NULL means the SKU is company-wide and visible in every workspace.

alter table public.skus
  add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;

create index if not exists skus_workspace_idx
  on public.skus (company_id, workspace_id);

notify pgrst, 'reload schema';
