-- ============================================================================
-- Beekeeper — extended operations migration
-- ----------------------------------------------------------------------------
-- Adds:
--   * statutory employee IDs
--   * outlet assignments
--   * expense plans + expenses
--   * production pipelines, stages, runs and stage usage/flow
--   * visit plans, target outlets, visits (planned/unplanned classification)
--   * activity feed + operational monitoring view
--   * permission keys and RLS policies for every new table
--
-- Run this file once in the Supabase SQL editor as the `postgres` role.
-- It is idempotent and safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Helpers
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
-- 1. Employee statutory IDs
-- ---------------------------------------------------------------------------
alter table public.employees
  add column if not exists sss_no text,
  add column if not exists philhealth_no text,
  add column if not exists tin_no text,
  add column if not exists pagibig_no text;

create index if not exists employees_sss_no_idx
  on public.employees (company_id, sss_no)
  where sss_no is not null;

create index if not exists employees_philhealth_no_idx
  on public.employees (company_id, philhealth_no)
  where philhealth_no is not null;

create index if not exists employees_tin_no_idx
  on public.employees (company_id, tin_no)
  where tin_no is not null;

create index if not exists employees_pagibig_no_idx
  on public.employees (company_id, pagibig_no)
  where pagibig_no is not null;

-- ---------------------------------------------------------------------------
-- 2. Outlet assignments
-- ---------------------------------------------------------------------------
create table if not exists public.employee_outlet_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  outlet_id uuid not null references public.outlets(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists employee_outlet_assignments_active_uidx
  on public.employee_outlet_assignments (employee_id, outlet_id)
  where is_active = true;

create index if not exists employee_outlet_assignments_employee_idx
  on public.employee_outlet_assignments (employee_id, is_active);

create index if not exists employee_outlet_assignments_outlet_idx
  on public.employee_outlet_assignments (outlet_id, is_active);

-- ---------------------------------------------------------------------------
-- 3. Expense plans + expenses
-- ---------------------------------------------------------------------------
create table if not exists public.expense_plans (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  title text not null,
  description text,
  start_date date not null,
  end_date date not null,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'approved', 'rejected', 'closed')),
  currency text not null default 'PHP',
  total_amount numeric(14, 2) not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expense_plans_date_range check (end_date >= start_date)
);

create index if not exists expense_plans_employee_idx
  on public.expense_plans (employee_id, start_date desc);

create index if not exists expense_plans_status_idx
  on public.expense_plans (company_id, status);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  plan_id uuid not null references public.expense_plans(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  expense_date date not null default current_date,
  category text not null default 'other',
  description text not null,
  amount numeric(14, 2) not null default 0 check (amount >= 0),
  currency text not null default 'PHP',
  receipt_path text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'reimbursed', 'cancelled')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_plan_idx
  on public.expenses (plan_id, expense_date desc);

create index if not exists expenses_employee_idx
  on public.expenses (employee_id, expense_date desc);

-- ---------------------------------------------------------------------------
-- 4. Production usage
-- ---------------------------------------------------------------------------
create table if not exists public.production_pipelines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  code text not null,
  description text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);

create table if not exists public.production_stages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  pipeline_id uuid not null references public.production_pipelines(id) on delete cascade,
  name text not null,
  sequence integer not null default 1,
  stage_type text not null default 'processing',
  input_uom text,
  output_uom text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pipeline_id, sequence)
);

create index if not exists production_stages_pipeline_idx
  on public.production_stages (pipeline_id, sequence);

create table if not exists public.production_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  pipeline_id uuid not null references public.production_pipelines(id) on delete cascade,
  run_no text not null,
  status text not null default 'planned'
    check (status in ('planned', 'in_progress', 'completed', 'cancelled')),
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, run_no)
);

create index if not exists production_runs_pipeline_idx
  on public.production_runs (pipeline_id, created_at desc);

create table if not exists public.production_usage (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  pipeline_id uuid not null references public.production_pipelines(id) on delete cascade,
  run_id uuid not null references public.production_runs(id) on delete cascade,
  stage_id uuid not null references public.production_stages(id) on delete cascade,
  source_stage_id uuid references public.production_stages(id) on delete set null,
  input_quantity numeric(14, 4) not null default 0 check (input_quantity >= 0),
  output_quantity numeric(14, 4) not null default 0 check (output_quantity >= 0),
  waste_quantity numeric(14, 4) not null default 0 check (waste_quantity >= 0),
  uom text,
  notes text,
  recorded_by uuid references auth.users(id) on delete set null,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, stage_id)
);

create index if not exists production_usage_run_idx
  on public.production_usage (run_id, recorded_at);

-- ---------------------------------------------------------------------------
-- 5. Visits
-- ---------------------------------------------------------------------------
create table if not exists public.visit_plans (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  notes text,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'completed', 'cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visit_plans_date_range check (end_date >= start_date)
);

create index if not exists visit_plans_employee_idx
  on public.visit_plans (employee_id, start_date desc);

create table if not exists public.visit_plan_outlets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  plan_id uuid not null references public.visit_plans(id) on delete cascade,
  outlet_id uuid not null references public.outlets(id) on delete cascade,
  planned_date date,
  notes text,
  created_at timestamptz not null default now(),
  unique (plan_id, outlet_id)
);

create index if not exists visit_plan_outlets_plan_idx
  on public.visit_plan_outlets (plan_id);

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  outlet_id uuid not null references public.outlets(id) on delete cascade,
  plan_id uuid references public.visit_plans(id) on delete set null,
  is_planned boolean not null default false,
  planned_date date,
  check_in_at timestamptz not null default now(),
  check_out_at timestamptz,
  check_in_latitude numeric(10, 7),
  check_in_longitude numeric(10, 7),
  check_out_latitude numeric(10, 7),
  check_out_longitude numeric(10, 7),
  check_in_distance_m numeric(10, 2),
  notes text,
  status text not null default 'checked_in'
    check (status in ('checked_in', 'checked_out', 'cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists visits_employee_idx
  on public.visits (employee_id, check_in_at desc);

create index if not exists visits_outlet_idx
  on public.visits (outlet_id, check_in_at desc);

-- Classify a visit as planned when it falls inside an active visit plan for the
-- same employee, outlet and date. Anything outside a plan is unplanned.
create or replace function public.classify_visit_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_id uuid;
begin
  if new.plan_id is not null then
    select p.id
      into v_plan_id
      from public.visit_plans p
      join public.visit_plan_outlets o on o.plan_id = p.id
     where p.id = new.plan_id
       and p.company_id = new.company_id
       and p.employee_id = new.employee_id
       and p.status in ('draft', 'active')
       and o.outlet_id = new.outlet_id
       and (new.check_in_at at time zone 'UTC')::date between p.start_date and p.end_date
     limit 1;

    if v_plan_id is null then
      new.plan_id := null;
      new.is_planned := false;
    else
      new.plan_id := v_plan_id;
      new.is_planned := true;
    end if;
  else
    select p.id
      into v_plan_id
      from public.visit_plans p
      join public.visit_plan_outlets o on o.plan_id = p.id
     where p.company_id = new.company_id
       and p.employee_id = new.employee_id
       and p.status in ('draft', 'active')
       and o.outlet_id = new.outlet_id
       and (new.check_in_at at time zone 'UTC')::date between p.start_date and p.end_date
     order by p.start_date desc
     limit 1;

    new.plan_id := v_plan_id;
    new.is_planned := v_plan_id is not null;
  end if;

  if new.planned_date is null and new.is_planned then
    new.planned_date := (new.check_in_at at time zone 'UTC')::date;
  end if;

  if new.check_out_at is not null and new.status = 'checked_in' then
    new.status := 'checked_out';
  end if;

  return new;
end;
$$;

drop trigger if exists classify_visit_plan_trigger on public.visits;
create trigger classify_visit_plan_trigger
  before insert or update of employee_id, outlet_id, plan_id, check_in_at, check_out_at
  on public.visits
  for each row
  execute function public.classify_visit_plan();

-- ---------------------------------------------------------------------------
-- 6. Activity feed + operational monitoring
-- ---------------------------------------------------------------------------
create table if not exists public.activity_feed (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_employee_id uuid references public.employees(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_feed_company_idx
  on public.activity_feed (company_id, created_at desc);

create index if not exists activity_feed_workspace_idx
  on public.activity_feed (workspace_id, created_at desc);

create or replace view public.operational_monitoring
with (security_invoker = true)
as
select
  w.company_id,
  w.id as workspace_id,
  w.name as workspace_name,
  (select count(*) from public.employees e
    where e.workspace_id = w.id and e.status = 'active') as active_employees,
  (select count(*) from public.outlets o
    where o.workspace_id = w.id and o.is_active = true) as active_outlets,
  (select count(*) from public.employee_outlet_assignments a
    where a.workspace_id = w.id and a.is_active = true) as active_assignments,
  (select count(*) from public.visits v
    where v.workspace_id = w.id
      and (v.check_in_at at time zone 'UTC')::date = (now() at time zone 'UTC')::date) as visits_today,
  (select count(*) from public.visits v
    where v.workspace_id = w.id and v.is_planned = false
      and v.check_in_at > now() - interval '7 days') as unplanned_visits_7d,
  (select count(*) from public.expense_plans p
    where p.workspace_id = w.id and p.status in ('draft', 'submitted')) as open_expense_plans,
  (select count(*) from public.expenses x
    where x.workspace_id = w.id and x.status = 'pending') as pending_expenses,
  (select count(*) from public.production_runs r
    where r.workspace_id = w.id and r.status = 'in_progress') as runs_in_progress,
  (select count(*) from public.activity_feed f
    where f.workspace_id = w.id and f.created_at > now() - interval '24 hours') as activity_24h
from public.workspaces w
where w.is_active = true;

-- ---------------------------------------------------------------------------
-- 7. Permission catalog
-- ---------------------------------------------------------------------------
insert into public.permissions (key, description)
values
  ('expenses.view',       'View expense plans and expenses'),
  ('expenses.create',     'Create expense plans and expenses'),
  ('expenses.update',     'Update expense plans and expenses'),
  ('expenses.delete',     'Delete expense plans and expenses'),
  ('production.view',     'View production pipelines and usage'),
  ('production.create',   'Create production pipelines, stages and runs'),
  ('production.update',   'Record production usage and update runs'),
  ('production.delete',   'Delete production pipelines, stages and runs'),
  ('visits.view',         'View visits and visit plans'),
  ('visits.create',       'Create visit plans, targets and check-ins'),
  ('visits.update',       'Check out or update visits'),
  ('visits.delete',       'Delete visits and visit plans'),
  ('imports.view',        'View the import/export workspace'),
  ('imports.execute',     'Import and export data'),
  ('feed.view',           'View the activity feed and monitoring')
on conflict (key) do update
  set description = excluded.description;

-- Grant the new permissions to system roles and to any role that already
-- manages approvals (the existing admin equivalent).
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
  from public.roles r
  cross join public.permissions p
 where p.key in (
   'expenses.view', 'expenses.create', 'expenses.update', 'expenses.delete',
   'production.view', 'production.create', 'production.update', 'production.delete',
   'visits.view', 'visits.create', 'visits.update', 'visits.delete',
   'imports.view', 'imports.execute', 'feed.view'
 )
   and (
     r.is_system = true
     or exists (
       select 1
         from public.role_permissions rp
        where rp.role_id = r.id
          and rp.permission_key = 'approvals.manage'
     )
   )
on conflict (role_id, permission_key) do nothing;

-- ---------------------------------------------------------------------------
-- 8. Row level security for all new company-scoped tables
-- ---------------------------------------------------------------------------
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'employee_outlet_assignments',
    'expense_plans',
    'expenses',
    'production_pipelines',
    'production_stages',
    'production_runs',
    'production_usage',
    'visit_plans',
    'visit_plan_outlets',
    'visits',
    'activity_feed'
  ]
  loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format(
      'drop policy if exists "company members can access" on public.%I',
      v_table
    );
    execute format(
      'create policy "company members can access" on public.%I '
      'for all to authenticated '
      'using (company_id in (select public.current_company_ids())) '
      'with check (company_id in (select public.current_company_ids()))',
      v_table
    );
  end loop;
end $$;

grant select on public.operational_monitoring to authenticated;
grant select, insert, update, delete on public.activity_feed to authenticated;

-- Ask PostgREST to pick up the new tables, view and columns immediately.
notify pgrst, 'reload schema';
