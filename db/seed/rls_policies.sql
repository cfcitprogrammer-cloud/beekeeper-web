-- ============================================================================
-- Beekeeper — RLS policies for authenticated company access
-- ----------------------------------------------------------------------------
-- Run this in the Supabase SQL Editor as the `postgres` role if the app
-- reports RLS violations after sign-in. It is idempotent.
--
-- Strategy:
--   * A security-definer helper returns the company IDs the signed-in user
--     belongs to (bypasses RLS to avoid infinite recursion).
--   * Every company-scoped table gets an RLS policy that allows any
--     authenticated member of the owning company to read/write its rows.
--   * `permissions` is a global catalog readable by all authenticated users.
--   * `role_permissions` is scoped through its role's company.
--
-- App-level permission checks (lib/auth/permissions.ts) still apply on top.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Security-definer helper (avoids recursion on company_members)
-- ---------------------------------------------------------------------------
create or replace function public.current_company_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select company_id
    from public.company_members
   where user_id = auth.uid();
$$;

grant execute on function public.current_company_ids() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. company_members — a user can read/write memberships in their company
-- ---------------------------------------------------------------------------
alter table public.company_members enable row level security;

drop policy if exists "company members can access" on public.company_members;
create policy "company members can access"
  on public.company_members
  for all
  to authenticated
  using (
    user_id = auth.uid()
    or company_id in (select public.current_company_ids())
  )
  with check (
    company_id in (select public.current_company_ids())
  );

-- ---------------------------------------------------------------------------
-- 3. workspace_members
-- ---------------------------------------------------------------------------
alter table public.workspace_members enable row level security;

drop policy if exists "company members can access" on public.workspace_members;
create policy "company members can access"
  on public.workspace_members
  for all
  to authenticated
  using (
    user_id = auth.uid()
    or company_id in (select public.current_company_ids())
  )
  with check (
    company_id in (select public.current_company_ids())
  );

-- ---------------------------------------------------------------------------
-- 4. roles (scoped through company)
-- ---------------------------------------------------------------------------
alter table public.roles enable row level security;

drop policy if exists "company members can access" on public.roles;
create policy "company members can access"
  on public.roles
  for all
  to authenticated
  using (company_id in (select public.current_company_ids()))
  with check (company_id in (select public.current_company_ids()));

-- ---------------------------------------------------------------------------
-- 5. role_permissions (scoped through the role's company)
-- ---------------------------------------------------------------------------
alter table public.role_permissions enable row level security;

drop policy if exists "company members can access" on public.role_permissions;
create policy "company members can access"
  on public.role_permissions
  for all
  to authenticated
  using (
    role_id in (
      select id from public.roles
      where company_id in (select public.current_company_ids())
    )
  )
  with check (
    role_id in (
      select id from public.roles
      where company_id in (select public.current_company_ids())
    )
  );

-- ---------------------------------------------------------------------------
-- 6. permissions — global catalog, readable by everyone authenticated
-- ---------------------------------------------------------------------------
alter table public.permissions enable row level security;

drop policy if exists "authenticated can read permissions" on public.permissions;
create policy "authenticated can read permissions"
  on public.permissions
  for select
  to authenticated
  using (true);

drop policy if exists "company members can manage permissions" on public.permissions;
create policy "company members can manage permissions"
  on public.permissions
  for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- 7a. companies (its own id is the company id)
-- ---------------------------------------------------------------------------
alter table public.companies enable row level security;

drop policy if exists "company members can access" on public.companies;
create policy "company members can access"
  on public.companies
  for all
  to authenticated
  using (id in (select public.current_company_ids()))
  with check (id in (select public.current_company_ids()));

-- ---------------------------------------------------------------------------
-- 7. All other company-scoped tables (loop)
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := ARRAY[
    'workspaces',
    'workspace_locations',
    'departments',
    'positions',
    'employees',
    'employee_documents',
    'shifts',
    'employee_schedules',
    'holidays',
    'attendances',
    'leave_types',
    'leave_balances',
    'leave_requests',
    'outlets',
    'sku_categories',
    'skus',
    'bookings',
    'booking_lines',
    'document_counters',
    'approval_stages',
    'approval_stage_approvers',
    'approval_templates',
    'approval_template_originators',
    'approval_template_stages',
    'approval_template_conditions',
    'approval_requests',
    'approval_request_stages',
    'approval_decisions'
  ];
begin
  foreach t in array tables loop
    -- Skip if the table does not exist.
    if not exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) then
      continue;
    end if;

    -- Skip if the table has no company_id column.
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'company_id'
    ) then
      continue;
    end if;

    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "company members can access" on public.%I;', t);
    execute format(
      'create policy "company members can access" on public.%I '
      'for all to authenticated '
      'using (company_id in (select public.current_company_ids())) '
      'with check (company_id in (select public.current_company_ids()))',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Done
-- ---------------------------------------------------------------------------
select 'RLS policies applied successfully' as status;
