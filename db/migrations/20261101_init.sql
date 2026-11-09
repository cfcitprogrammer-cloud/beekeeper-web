-- ============================================================================
-- Beekeeper — full project schema (bootstrap)
-- ----------------------------------------------------------------------------
-- Creates the complete public schema used by the application:
--   * tenancy (companies, workspaces, locations)
--   * authorization (permissions, roles, memberships)
--   * people (departments, positions, employees, documents)
--   * scheduling + attendance
--   * leave
--   * outlets, SKUs, bookings
--   * approvals (configuration + runtime + inbox view)
--   * expenses, production, visits, activity feed
--   * helper functions, views, permission catalog, RLS and grants
--
-- This file is the baseline: run it FIRST, once, in the Supabase SQL editor as
-- the `postgres` role. It is written to be idempotent so it can also be re-run
-- against an existing database without dropping data.
--
-- The later `20261108_extended_operations.sql` migration is kept for
-- compatibility and remains safe to run afterwards (all of its objects are
-- created here as well).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Helpers
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Tenancy
-- ---------------------------------------------------------------------------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  legal_name text,
  tax_id text,
  email text,
  phone text,
  address text,
  logo_path text,
  timezone text not null default 'Asia/Manila',
  currency text not null default 'PHP',
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  code text,
  address text,
  timezone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);

create index if not exists workspaces_company_idx
  on public.workspaces (company_id, name);

create table if not exists public.workspace_locations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  radius_m numeric(10, 2) not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspace_locations_workspace_idx
  on public.workspace_locations (workspace_id, name);

-- ---------------------------------------------------------------------------
-- 2. Authorization
-- ---------------------------------------------------------------------------
create table if not exists public.permissions (
  key text primary key,
  description text
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, name)
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  primary key (role_id, permission_key)
);

create table if not exists public.company_members (
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, company_id)
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists workspace_members_user_idx
  on public.workspace_members (user_id, company_id);

-- `company_members` now exists, so the SQL-language helper can be created.
-- (SQL function bodies are validated at CREATE time.)
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
-- 3. Organization + employees
-- ---------------------------------------------------------------------------
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  code text,
  parent_id uuid references public.departments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists departments_company_idx
  on public.departments (company_id, name);

create table if not exists public.positions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  description text,
  min_salary numeric(14, 2),
  max_salary numeric(14, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists positions_company_idx
  on public.positions (company_id, title);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  employee_no text not null,
  sss_no text,
  philhealth_no text,
  tin_no text,
  pagibig_no text,
  first_name text not null,
  middle_name text,
  last_name text not null,
  suffix text,
  email text,
  phone text,
  birth_date date,
  gender text,
  civil_status text,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  department_id uuid references public.departments(id) on delete set null,
  position_id uuid references public.positions(id) on delete set null,
  manager_id uuid references public.employees(id) on delete set null,
  employment_type text not null default 'full_time'
    check (employment_type in ('full_time', 'part_time', 'contractual', 'intern', 'consultant')),
  status text not null default 'active'
    check (status in ('active', 'probation', 'on_leave', 'suspended', 'resigned', 'terminated')),
  hire_date date,
  regularization_date date,
  separation_date date,
  base_salary numeric(14, 2),
  pay_frequency text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, employee_no)
);

create index if not exists employees_workspace_idx
  on public.employees (workspace_id, last_name);
create index if not exists employees_user_idx
  on public.employees (user_id);
create index if not exists employees_department_idx
  on public.employees (department_id);

create table if not exists public.employee_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  name text not null,
  category text,
  file_path text not null,
  expires_on date,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists employee_documents_employee_idx
  on public.employee_documents (employee_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 4. Scheduling + attendance
-- ---------------------------------------------------------------------------
create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  start_time time not null,
  end_time time not null,
  break_minutes integer not null default 0,
  grace_minutes integer not null default 0,
  is_overnight boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employee_schedules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  shift_id uuid not null references public.shifts(id) on delete cascade,
  days_of_week integer[] not null default '{}',
  effective_from date not null,
  effective_to date,
  created_at timestamptz not null default now()
);

create index if not exists employee_schedules_employee_idx
  on public.employee_schedules (employee_id, effective_from desc);

create table if not exists public.holidays (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  holiday_date date not null,
  name text not null,
  type text not null default 'regular'
    check (type in ('regular', 'special', 'company')),
  created_at timestamptz not null default now()
);

create index if not exists holidays_company_date_idx
  on public.holidays (company_id, holiday_date);

create table if not exists public.attendances (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  type text not null
    check (type in ('clock_in', 'clock_out', 'break_start', 'break_end')),
  source text not null default 'manual'
    check (source in ('mobile', 'manual', 'import')),
  captured_at timestamptz not null default now(),
  received_at timestamptz not null default now(),
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  accuracy_m numeric(10, 2),
  altitude_m numeric(10, 2),
  address_text text,
  is_mock_location boolean not null default false,
  location_id uuid references public.workspace_locations(id) on delete set null,
  distance_m numeric(10, 2),
  within_geofence boolean,
  photo_path text,
  device_id text,
  device_model text,
  os_version text,
  app_version text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  remarks text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists attendances_workspace_idx
  on public.attendances (workspace_id, captured_at desc);
create index if not exists attendances_employee_idx
  on public.attendances (employee_id, captured_at desc);

-- ---------------------------------------------------------------------------
-- 5. Leave
-- ---------------------------------------------------------------------------
create table if not exists public.leave_types (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  code text not null,
  is_paid boolean not null default true,
  default_days_per_year numeric(6, 2) not null default 0,
  requires_approval boolean not null default true,
  carry_over_days numeric(6, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);

create table if not exists public.leave_balances (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type_id uuid not null references public.leave_types(id) on delete cascade,
  year integer not null,
  entitled numeric(6, 2) not null default 0,
  used numeric(6, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, leave_type_id, year)
);

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type_id uuid not null references public.leave_types(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  days numeric(6, 2) not null default 0,
  is_half_day boolean not null default false,
  reason text,
  attachment_path text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leave_requests_date_range check (end_date >= start_date)
);

create index if not exists leave_requests_employee_idx
  on public.leave_requests (employee_id, created_at desc);
create index if not exists leave_requests_status_idx
  on public.leave_requests (company_id, status);

-- ---------------------------------------------------------------------------
-- 6. Outlets + inventory
-- ---------------------------------------------------------------------------
create table if not exists public.outlets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  address text,
  region text,
  province text,
  city text,
  barangay text,
  zip_code text,
  contact_person text,
  phone text,
  email text,
  latitude numeric(10, 7) not null default 14.5995,
  longitude numeric(10, 7) not null default 120.9842,
  geofence_radius_m numeric(10, 2) not null default 150,
  geofence_polygon jsonb,
  photo_path text,
  is_active boolean not null default false,
  is_distributor boolean not null default false,
  distributor_id uuid references public.outlets(id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'pending_approval', 'approved', 'rejected', 'cancelled')),
  submitted_at timestamptz,
  approved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);

create index if not exists outlets_workspace_idx
  on public.outlets (workspace_id, name);
create index if not exists outlets_status_idx
  on public.outlets (company_id, status);
create index if not exists outlets_region_idx
  on public.outlets (region);
create index if not exists outlets_province_idx
  on public.outlets (province);
create index if not exists outlets_city_idx
  on public.outlets (city);
create index if not exists outlets_distributor_id_idx
  on public.outlets (distributor_id);
create index if not exists outlets_is_distributor_idx
  on public.outlets (is_distributor);

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

create table if not exists public.sku_categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  parent_id uuid references public.sku_categories(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.skus (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  sku_code text not null,
  barcode text,
  name text not null,
  description text,
  category_id uuid references public.sku_categories(id) on delete set null,
  brand text,
  uom text not null default 'pcs',
  unit_price numeric(14, 2) not null default 0,
  tax_rate numeric(5, 2) not null default 0,
  photo_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, sku_code)
);

create index if not exists skus_category_idx
  on public.skus (category_id);

-- ---------------------------------------------------------------------------
-- 7. Bookings
-- ---------------------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  outlet_id uuid not null references public.outlets(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  booking_no text not null,
  booking_date date not null default current_date,
  delivery_date date,
  payment_terms text,
  notes text,
  line_count integer not null default 0,
  subtotal numeric(14, 2) not null default 0,
  discount_total numeric(14, 2) not null default 0,
  tax_total numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  captured_at timestamptz,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  accuracy_m numeric(10, 2),
  is_mock_location boolean not null default false,
  distance_m numeric(10, 2),
  within_geofence boolean,
  status text not null default 'draft'
    check (status in ('draft', 'pending_approval', 'approved', 'rejected', 'cancelled')),
  submitted_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, booking_no)
);

create index if not exists bookings_workspace_idx
  on public.bookings (workspace_id, booking_date desc);
create index if not exists bookings_outlet_idx
  on public.bookings (outlet_id, booking_date desc);
create index if not exists bookings_status_idx
  on public.bookings (company_id, status);

create table if not exists public.booking_lines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  line_no integer not null default 1,
  sku_id uuid not null references public.skus(id) on delete restrict,
  quantity numeric(14, 4) not null default 0,
  uom text,
  unit_price numeric(14, 2) not null default 0,
  discount_pct numeric(5, 2) not null default 0,
  tax_rate numeric(5, 2) not null default 0,
  line_total numeric(14, 2) generated always as (
    round(
      quantity * unit_price
        * (1 - coalesce(discount_pct, 0) / 100.0)
        * (1 + coalesce(tax_rate, 0) / 100.0),
      2
    )
  ) stored,
  notes text,
  created_at timestamptz not null default now(),
  unique (booking_id, line_no)
);

create index if not exists booking_lines_booking_idx
  on public.booking_lines (booking_id, line_no);

create table if not exists public.document_counters (
  company_id uuid not null references public.companies(id) on delete cascade,
  doc_prefix text not null,
  last_no integer not null default 0,
  primary key (company_id, doc_prefix)
);

-- ---------------------------------------------------------------------------
-- 8. Approvals: configuration
-- ---------------------------------------------------------------------------
create table if not exists public.approval_stages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  required_approvals integer not null default 1 check (required_approvals >= 1),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.approval_stage_approvers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  stage_id uuid not null references public.approval_stages(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role_id uuid references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint approval_stage_approvers_target check (
    (user_id is not null)::int + (role_id is not null)::int = 1
  )
);

create index if not exists approval_stage_approvers_stage_idx
  on public.approval_stage_approvers (stage_id);
create index if not exists approval_stage_approvers_user_idx
  on public.approval_stage_approvers (user_id);
create index if not exists approval_stage_approvers_role_idx
  on public.approval_stage_approvers (role_id);

create table if not exists public.approval_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  document_type text not null
    check (document_type in ('booking', 'outlet')),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists approval_templates_company_idx
  on public.approval_templates (company_id, document_type, is_active);

create table if not exists public.approval_template_stages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  template_id uuid not null references public.approval_templates(id) on delete cascade,
  stage_id uuid not null references public.approval_stages(id) on delete cascade,
  seq integer not null default 1,
  unique (template_id, seq),
  unique (template_id, stage_id)
);

create index if not exists approval_template_stages_template_idx
  on public.approval_template_stages (template_id, seq);

create table if not exists public.approval_template_conditions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  template_id uuid not null references public.approval_templates(id) on delete cascade,
  field text not null,
  operator text not null default '='
    check (operator in ('=', '<>', '>', '>=', '<', '<=')),
  value_numeric numeric(18, 4),
  value_text text
);

create index if not exists approval_template_conditions_template_idx
  on public.approval_template_conditions (template_id);

create table if not exists public.approval_template_originators (
  template_id uuid not null references public.approval_templates(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  primary key (template_id, user_id)
);

create index if not exists approval_template_originators_user_idx
  on public.approval_template_originators (user_id);

-- ---------------------------------------------------------------------------
-- 9. Approvals: runtime
-- ---------------------------------------------------------------------------
create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  template_id uuid references public.approval_templates(id) on delete set null,
  template_name text not null,
  document_type text not null
    check (document_type in ('booking', 'outlet')),
  document_id uuid not null,
  document_snapshot jsonb not null default '{}'::jsonb,
  requested_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists approval_requests_document_idx
  on public.approval_requests (document_type, document_id);
create index if not exists approval_requests_status_idx
  on public.approval_requests (company_id, status, created_at desc);
create index if not exists approval_requests_requester_idx
  on public.approval_requests (requested_by, created_at desc);

create table if not exists public.approval_request_stages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  request_id uuid not null references public.approval_requests(id) on delete cascade,
  stage_id uuid not null references public.approval_stages(id) on delete restrict,
  stage_name text not null,
  seq integer not null default 1,
  required_approvals integer not null default 1 check (required_approvals >= 1),
  status text not null default 'waiting'
    check (status in ('waiting', 'pending', 'approved', 'rejected', 'skipped')),
  completed_at timestamptz,
  unique (request_id, seq)
);

create index if not exists approval_request_stages_request_idx
  on public.approval_request_stages (request_id, seq);
create index if not exists approval_request_stages_status_idx
  on public.approval_request_stages (company_id, status);

create table if not exists public.approval_decisions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  request_id uuid not null references public.approval_requests(id) on delete cascade,
  request_stage_id uuid not null references public.approval_request_stages(id) on delete cascade,
  decided_by uuid not null references auth.users(id) on delete cascade,
  decision text not null check (decision in ('approved', 'rejected')),
  remarks text,
  decided_at timestamptz not null default now(),
  unique (request_stage_id, decided_by)
);

create index if not exists approval_decisions_stage_idx
  on public.approval_decisions (request_stage_id);

-- ---------------------------------------------------------------------------
-- 10. Expenses
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
-- 11. Production
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
-- 12. Visits
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

-- ---------------------------------------------------------------------------
-- 13. Activity feed
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

-- ---------------------------------------------------------------------------
-- 14. updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'companies', 'workspaces', 'workspace_locations', 'roles', 'company_members',
    'departments', 'positions', 'employees', 'shifts', 'attendances', 'leave_types',
    'leave_balances', 'leave_requests', 'outlets', 'employee_outlet_assignments',
    'skus', 'bookings', 'approval_stages', 'approval_templates', 'expense_plans',
    'expenses', 'production_pipelines', 'production_stages', 'production_runs',
    'production_usage', 'visit_plans', 'visits'
  ]
  loop
    if exists (
      select 1 from information_schema.tables
       where table_schema = 'public' and table_name = v_table
    ) then
      execute format('drop trigger if exists set_updated_at on public.%I', v_table);
      execute format(
        'create trigger set_updated_at before update on public.%I '
        'for each row execute function public.touch_updated_at()',
        v_table
      );
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 15. Visit plan classification trigger
-- ---------------------------------------------------------------------------
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
-- 16. Views
-- ---------------------------------------------------------------------------
drop view if exists public.attendance_daily;
create view public.attendance_daily
with (security_invoker = true)
as
select
  a.company_id,
  a.workspace_id,
  a.employee_id,
  (a.captured_at at time zone 'UTC')::date as work_date,
  min(a.captured_at) filter (where a.type = 'clock_in') as first_in,
  max(a.captured_at) filter (where a.type = 'clock_out') as last_out,
  round(
    extract(
      epoch from (
        max(a.captured_at) filter (where a.type = 'clock_out')
        - min(a.captured_at) filter (where a.type = 'clock_in')
      )
    ) / 3600.0,
    2
  ) as hours_elapsed,
  bool_or(a.status = 'pending') as has_pending
from public.attendances a
group by
  a.company_id,
  a.workspace_id,
  a.employee_id,
  (a.captured_at at time zone 'UTC')::date;

-- The approver inbox. A stage is visible to a user when they are explicitly
-- assigned by user or role, or when the stage has no configured approvers
-- (open stage). Users who already decided on the stage never see it again.
drop view if exists public.my_pending_approvals;
create view public.my_pending_approvals
with (security_invoker = true)
as
select
  ars.id as request_stage_id,
  ar.id as request_id,
  ar.company_id,
  ar.workspace_id,
  ar.document_type,
  ar.document_id,
  ar.template_name,
  ars.seq,
  ars.stage_name,
  ars.required_approvals,
  (
    select count(*)::int
      from public.approval_decisions d
     where d.request_stage_id = ars.id
       and d.decision = 'approved'
  ) as approvals_received,
  ar.requested_by,
  ar.created_at as requested_at,
  ar.document_snapshot
from public.approval_request_stages ars
join public.approval_requests ar on ar.id = ars.request_id
where ar.status = 'pending'
  and ars.status = 'pending'
  and ar.company_id in (select public.current_company_ids())
  and not exists (
    select 1
      from public.approval_decisions d2
     where d2.request_stage_id = ars.id
       and d2.decided_by = auth.uid()
  )
  and (
    not exists (
      select 1
        from public.approval_stage_approvers asa
       where asa.stage_id = ars.stage_id
    )
    or exists (
      select 1
        from public.approval_stage_approvers asa
       where asa.stage_id = ars.stage_id
         and (
           asa.user_id = auth.uid()
           or asa.role_id in (
             select cm.role_id
               from public.company_members cm
              where cm.user_id = auth.uid()
                and cm.company_id = ar.company_id
             union
             select wm.role_id
               from public.workspace_members wm
              where wm.user_id = auth.uid()
                and wm.company_id = ar.company_id
           )
         )
    )
  );

drop view if exists public.operational_monitoring;
create view public.operational_monitoring
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
-- 17. Approval submission engine
-- ---------------------------------------------------------------------------
create or replace function public.submit_for_approval(
  p_document_type text,
  p_document_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_type text := lower(coalesce(p_document_type, ''));
  v_company uuid;
  v_workspace uuid;
  v_doc jsonb;
  v_existing uuid;
  v_template record;
  v_condition record;
  v_template_id uuid;
  v_template_name text;
  v_request_id uuid;
  v_stage record;
  v_stage_count int := 0;
  v_ok boolean;
  v_actual jsonb;
  v_num numeric;
  v_text text;
  v_first boolean := true;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;
  if v_type not in ('booking', 'outlet') then
    raise exception 'Unsupported document type: %', p_document_type;
  end if;
  if p_document_id is null then
    raise exception 'Document id is required';
  end if;

  if v_type = 'booking' then
    select to_jsonb(b), b.company_id, b.workspace_id
      into v_doc, v_company, v_workspace
      from public.bookings b
     where b.id = p_document_id;
  else
    select to_jsonb(o), o.company_id, o.workspace_id
      into v_doc, v_company, v_workspace
      from public.outlets o
     where o.id = p_document_id;
  end if;

  if v_doc is null then
    raise exception 'Document not found';
  end if;

  if not exists (
    select 1 from public.company_members cm
     where cm.user_id = v_user and cm.company_id = v_company
  ) then
    raise exception 'You do not have access to this document';
  end if;

  -- Idempotent: reuse an in-flight request for the same document.
  select ar.id
    into v_existing
    from public.approval_requests ar
   where ar.document_type = v_type
     and ar.document_id = p_document_id
     and ar.status = 'pending'
   limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  -- Pick the most specific active template that matches this document.
  for v_template in
    select t.id, t.name
      from public.approval_templates t
     where t.company_id = v_company
       and t.document_type = v_type
       and t.is_active = true
       and (t.workspace_id is null or t.workspace_id = v_workspace)
       and (
         not exists (
           select 1 from public.approval_template_originators o
            where o.template_id = t.id
         )
         or exists (
           select 1 from public.approval_template_originators o
            where o.template_id = t.id and o.user_id = v_user
         )
       )
     order by (
       select count(*)
         from public.approval_template_conditions c2
        where c2.template_id = t.id
     ) desc, t.created_at asc
  loop
    v_ok := true;

    for v_condition in
      select *
        from public.approval_template_conditions c
       where c.template_id = v_template.id
    loop
      v_actual := v_doc -> v_condition.field;

      if v_actual is null or jsonb_typeof(v_actual) = 'null' then
        v_ok := false;
      elsif v_condition.value_numeric is not null then
        if jsonb_typeof(v_actual) <> 'number' then
          v_ok := false;
        else
          v_num := (v_actual #>> '{}')::numeric;
          if v_condition.operator = '=' then
            v_ok := v_num = v_condition.value_numeric;
          elsif v_condition.operator = '<>' then
            v_ok := v_num <> v_condition.value_numeric;
          elsif v_condition.operator = '>' then
            v_ok := v_num > v_condition.value_numeric;
          elsif v_condition.operator = '>=' then
            v_ok := v_num >= v_condition.value_numeric;
          elsif v_condition.operator = '<' then
            v_ok := v_num < v_condition.value_numeric;
          elsif v_condition.operator = '<=' then
            v_ok := v_num <= v_condition.value_numeric;
          else
            v_ok := false;
          end if;
        end if;
      else
        v_text := v_actual #>> '{}';
        if v_condition.operator = '=' then
          v_ok := v_text = coalesce(v_condition.value_text, '');
        elsif v_condition.operator = '<>' then
          v_ok := v_text <> coalesce(v_condition.value_text, '');
        elsif v_condition.operator = '>' then
          v_ok := v_text > coalesce(v_condition.value_text, '');
        elsif v_condition.operator = '>=' then
          v_ok := v_text >= coalesce(v_condition.value_text, '');
        elsif v_condition.operator = '<' then
          v_ok := v_text < coalesce(v_condition.value_text, '');
        elsif v_condition.operator = '<=' then
          v_ok := v_text <= coalesce(v_condition.value_text, '');
        else
          v_ok := false;
        end if;
      end if;

      exit when not v_ok;
    end loop;

    if v_ok then
      v_template_id := v_template.id;
      v_template_name := v_template.name;
      exit;
    end if;
  end loop;

  -- No approval workflow configured: documents do not need approval.
  if v_template_id is null then
    if v_type = 'booking' then
      update public.bookings
         set status = 'approved', approved_at = now(), updated_at = now()
       where id = p_document_id;
    else
      update public.outlets
         set status = 'approved', is_active = true, approved_at = now(), updated_at = now()
       where id = p_document_id;
    end if;
    return null;
  end if;

  select count(*)
    into v_stage_count
    from public.approval_template_stages ts
    join public.approval_stages s on s.id = ts.stage_id
   where ts.template_id = v_template_id
     and s.is_active = true;

  -- A template without usable stages cannot route anything; treat it as
  -- "no approval required" so documents are never stranded in pending.
  if v_stage_count = 0 then
    if v_type = 'booking' then
      update public.bookings
         set status = 'approved', approved_at = now(), updated_at = now()
       where id = p_document_id;
    else
      update public.outlets
         set status = 'approved', is_active = true, approved_at = now(), updated_at = now()
       where id = p_document_id;
    end if;
    return null;
  end if;

  insert into public.approval_requests (
    company_id, workspace_id, template_id, template_name, document_type,
    document_id, document_snapshot, requested_by, status
  )
  values (
    v_company, v_workspace, v_template_id, v_template_name, v_type,
    p_document_id, v_doc, v_user, 'pending'
  )
  returning id into v_request_id;

  for v_stage in
    select ts.seq, ts.stage_id, s.name, s.required_approvals
      from public.approval_template_stages ts
      join public.approval_stages s on s.id = ts.stage_id
     where ts.template_id = v_template_id
       and s.is_active = true
     order by ts.seq asc
  loop
    insert into public.approval_request_stages (
      company_id, request_id, stage_id, stage_name, seq,
      required_approvals, status
    )
    values (
      v_company, v_request_id, v_stage.stage_id, v_stage.name, v_stage.seq,
      greatest(v_stage.required_approvals, 1),
      case when v_first then 'pending' else 'waiting' end
    );
    v_first := false;
  end loop;

  if v_type = 'booking' then
    update public.bookings
       set status = 'pending_approval',
           submitted_at = coalesce(submitted_at, now()),
           approved_at = null,
           updated_at = now()
     where id = p_document_id;
  else
    update public.outlets
       set status = 'pending_approval',
           submitted_at = coalesce(submitted_at, now()),
           approved_at = null,
           updated_at = now()
     where id = p_document_id;
  end if;

  return v_request_id;
end;
$$;

revoke all on function public.submit_for_approval(text, uuid) from public;
grant execute on function public.submit_for_approval(text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 17b. Approval auto-enqueue triggers
-- ---------------------------------------------------------------------------
-- Server actions call submit_for_approval() explicitly when a user submits a
-- document. These triggers make the same thing happen for any other writer
-- (imports, scripts, future clients) that flips a document to
-- `pending_approval`.
--
-- Guards:
--   * pg_trigger_depth() prevents re-entry when submit_for_approval() writes
--     the document status back.
--   * an existing pending request short-circuits the trigger.
--   * background jobs without a JWT are ignored (requested_by is not null).
create or replace function public.enqueue_approval_for_document()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_document_type text;
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if new.status is distinct from 'pending_approval' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.status = 'pending_approval' then
      return new;
    end if;
  end if;

  if auth.uid() is null then
    return new;
  end if;

  v_document_type := case tg_table_name
    when 'bookings' then 'booking'
    when 'outlets' then 'outlet'
  end;

  if v_document_type is null then
    return new;
  end if;

  if exists (
    select 1
      from public.approval_requests ar
     where ar.document_type = v_document_type
       and ar.document_id = new.id
       and ar.status = 'pending'
  ) then
    return new;
  end if;

  perform public.submit_for_approval(v_document_type, new.id);
  return new;
end;
$$;

drop trigger if exists bookings_enqueue_approval on public.bookings;
create trigger bookings_enqueue_approval
  after insert or update of status on public.bookings
  for each row
  execute function public.enqueue_approval_for_document();

drop trigger if exists outlets_enqueue_approval on public.outlets;
create trigger outlets_enqueue_approval
  after insert or update of status on public.outlets
  for each row
  execute function public.enqueue_approval_for_document();

-- ---------------------------------------------------------------------------
-- 18. Permission catalog
-- ---------------------------------------------------------------------------
insert into public.permissions (key, description)
values
  ('dashboard.view',    'View the operations dashboard'),
  ('dashboard.create',  'Create dashboard widgets and layouts'),
  ('dashboard.update',  'Update dashboard widgets and layouts'),
  ('dashboard.delete',  'Delete dashboard widgets and layouts'),
  ('employees.view',    'View the employee directory and profiles'),
  ('employees.create',  'Onboard new employees'),
  ('employees.update',  'Update employee records and profiles'),
  ('employees.delete',  'Delete or deactivate employees'),
  ('attendance.view',   'View the attendance feed and daily summary'),
  ('attendance.create', 'Capture attendance records'),
  ('attendance.update', 'Update attendance records'),
  ('attendance.delete', 'Delete attendance records'),
  ('shifts.view',       'View shift templates'),
  ('shifts.create',     'Create shift templates'),
  ('shifts.update',     'Update shift templates'),
  ('shifts.delete',     'Delete shift templates'),
  ('leave.view',        'View leave balances'),
  ('leave.create',      'Create leave requests'),
  ('leave.update',      'Update leave requests'),
  ('leave.delete',      'Delete leave requests'),
  ('leave.review',      'Approve or reject leave requests'),
  ('outlets.view',      'View the outlet directory'),
  ('outlets.create',    'Add outlets for onboarding'),
  ('outlets.update',    'Update outlets'),
  ('outlets.delete',    'Delete outlets'),
  ('inventory.view',    'View the SKU catalog'),
  ('inventory.create',  'Create SKUs'),
  ('inventory.update',  'Update SKUs'),
  ('inventory.delete',  'Delete SKUs'),
  ('bookings.view',     'View the bookings register and booking details'),
  ('bookings.create',   'Create field bookings'),
  ('bookings.update',   'Update booking status'),
  ('bookings.delete',   'Delete bookings'),
  ('approvals.view',    'View the approval inbox and history'),
  ('approvals.create',  'Create approval requests'),
  ('approvals.update',  'Update approval requests'),
  ('approvals.delete',  'Delete approval requests'),
  ('approvals.decide',  'Approve or reject approval requests'),
  ('approvals.manage',  'Manage approval templates'),
  ('expenses.view',     'View expense plans and expenses'),
  ('expenses.create',   'Create expense plans and expenses'),
  ('expenses.update',   'Update expense plans and expenses'),
  ('expenses.delete',   'Delete expense plans and expenses'),
  ('production.view',   'View production pipelines and usage'),
  ('production.create', 'Create production pipelines, stages and runs'),
  ('production.update', 'Record production usage and update runs'),
  ('production.delete', 'Delete production pipelines, stages and runs'),
  ('visits.view',       'View visits and visit plans'),
  ('visits.create',     'Create visit plans, targets and check-ins'),
  ('visits.update',     'Check out or update visits'),
  ('visits.delete',     'Delete visits and visit plans'),
  ('imports.view',      'View the import/export workspace'),
  ('imports.execute',   'Import and export data'),
  ('feed.view',         'View the activity feed and monitoring')
on conflict (key) do update
  set description = excluded.description;

-- ---------------------------------------------------------------------------
-- 19. Row level security
-- ---------------------------------------------------------------------------
alter table public.permissions enable row level security;

drop policy if exists "authenticated can read permissions" on public.permissions;
create policy "authenticated can read permissions"
  on public.permissions for select to authenticated
  using (true);

drop policy if exists "company members can manage permissions" on public.permissions;
create policy "company members can manage permissions"
  on public.permissions for all to authenticated
  using (true)
  with check (true);

alter table public.companies enable row level security;
drop policy if exists "company members can access" on public.companies;
create policy "company members can access"
  on public.companies for all to authenticated
  using (id in (select public.current_company_ids()))
  with check (id in (select public.current_company_ids()));

alter table public.company_members enable row level security;
drop policy if exists "company members can access" on public.company_members;
create policy "company members can access"
  on public.company_members for all to authenticated
  using (
    user_id = auth.uid()
    or company_id in (select public.current_company_ids())
  )
  with check (company_id in (select public.current_company_ids()));

alter table public.workspace_members enable row level security;
drop policy if exists "company members can access" on public.workspace_members;
create policy "company members can access"
  on public.workspace_members for all to authenticated
  using (
    user_id = auth.uid()
    or company_id in (select public.current_company_ids())
  )
  with check (company_id in (select public.current_company_ids()));

alter table public.roles enable row level security;
drop policy if exists "company members can access" on public.roles;
create policy "company members can access"
  on public.roles for all to authenticated
  using (company_id in (select public.current_company_ids()))
  with check (company_id in (select public.current_company_ids()));

alter table public.role_permissions enable row level security;
drop policy if exists "company members can access" on public.role_permissions;
create policy "company members can access"
  on public.role_permissions for all to authenticated
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

-- Standard company-scoped tables.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'workspaces', 'workspace_locations', 'departments', 'positions', 'employees',
    'employee_documents', 'shifts', 'employee_schedules', 'holidays', 'attendances',
    'leave_types', 'leave_balances', 'leave_requests', 'outlets',
    'employee_outlet_assignments', 'sku_categories', 'skus', 'bookings',
    'booking_lines', 'document_counters', 'approval_stages',
    'approval_stage_approvers', 'approval_templates', 'approval_template_stages',
    'approval_template_conditions', 'approval_template_originators',
    'approval_requests', 'approval_request_stages', 'approval_decisions',
    'expense_plans', 'expenses', 'production_pipelines', 'production_stages',
    'production_runs', 'production_usage', 'visit_plans', 'visit_plan_outlets',
    'visits', 'activity_feed'
  ]
  loop
    if not exists (
      select 1 from information_schema.tables
       where table_schema = 'public' and table_name = v_table
    ) then
      continue;
    end if;

    if not exists (
      select 1 from information_schema.columns
       where table_schema = 'public' and table_name = v_table
         and column_name = 'company_id'
    ) then
      continue;
    end if;

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

-- ---------------------------------------------------------------------------
-- 20. Grants
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.attendance_daily to authenticated;
grant select on public.my_pending_approvals to authenticated;
grant select on public.operational_monitoring to authenticated;

-- Ask PostgREST to pick up the new schema immediately.
notify pgrst, 'reload schema';
