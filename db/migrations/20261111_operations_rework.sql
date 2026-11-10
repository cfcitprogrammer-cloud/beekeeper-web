-- ============================================================================
-- Beekeeper — Operations rework
-- ----------------------------------------------------------------------------
--   * Configurable expense categories (master data)
--   * Expense plans become optional for expense items
--   * Reimbursable flag + multiple expense attachments
--   * Visit plans are no longer outlet-target based; classification only
--     depends on the employee and the plan date range
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Expense categories (master data)
-- ---------------------------------------------------------------------------
create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  code text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);

create index if not exists expense_categories_company_idx
  on public.expense_categories (company_id, name);

-- Give every existing company a useful starter set of categories. Companies
-- created later can add their own through the master-data screen.
insert into public.expense_categories (company_id, name, code)
select c.id, v.name, v.code
from public.companies c
cross join (
  values
    ('Travel', 'travel'),
    ('Meals', 'meals'),
    ('Transport', 'transport'),
    ('Accommodation', 'accommodation'),
    ('Supplies', 'supplies'),
    ('Other', 'other')
) as v(name, code)
on conflict (company_id, code) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Expense items: optional plan, category, reimbursement, attachments
-- ---------------------------------------------------------------------------
alter table public.expenses
  add column if not exists category_id uuid references public.expense_categories(id) on delete set null,
  add column if not exists is_reimbursable boolean not null default false;

alter table public.expenses
  alter column plan_id drop not null;

create index if not exists expenses_category_idx
  on public.expenses (category_id);

create table if not exists public.expense_attachments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  expense_id uuid not null references public.expenses(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists expense_attachments_expense_idx
  on public.expense_attachments (expense_id, created_at);

-- ---------------------------------------------------------------------------
-- 3. Row level security
-- ---------------------------------------------------------------------------
alter table public.expense_categories enable row level security;
alter table public.expense_attachments enable row level security;

drop policy if exists "company members can access" on public.expense_categories;
create policy "company members can access" on public.expense_categories
  for all to authenticated
  using (company_id in (select public.current_company_ids()))
  with check (company_id in (select public.current_company_ids()));

drop policy if exists "company members can access" on public.expense_attachments;
create policy "company members can access" on public.expense_attachments
  for all to authenticated
  using (company_id in (select public.current_company_ids()))
  with check (company_id in (select public.current_company_ids()));

-- ---------------------------------------------------------------------------
-- 4. Visit plans no longer use target outlets
-- ---------------------------------------------------------------------------
-- A visit is planned when the employee has a draft/active visit plan whose date
-- range contains the visit date. The outlet chosen at check-in is irrelevant.
create or replace function public.classify_visit_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_id uuid;
begin
  -- Check-out and note edits must not reclassify a visit after its plan has
  -- been completed or cancelled. Classification is only recomputed when the
  -- employee, plan or check-in time actually changes.
  if tg_op = 'UPDATE'
     and new.employee_id = old.employee_id
     and new.check_in_at = old.check_in_at
     and new.plan_id is not distinct from old.plan_id then
    if new.check_out_at is not null and new.status = 'checked_in' then
      new.status := 'checked_out';
    end if;
    return new;
  end if;

  if new.plan_id is not null then
    select p.id
      into v_plan_id
      from public.visit_plans p
     where p.id = new.plan_id
       and p.company_id = new.company_id
       and p.employee_id = new.employee_id
       and p.status in ('draft', 'active')
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
     where p.company_id = new.company_id
       and p.employee_id = new.employee_id
       and p.status in ('draft', 'active')
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

-- Ask PostgREST to pick up the new tables and columns immediately.
grant select, insert, update, delete on public.expense_categories to authenticated;
grant select, insert, update, delete on public.expense_attachments to authenticated;

notify pgrst, 'reload schema';
