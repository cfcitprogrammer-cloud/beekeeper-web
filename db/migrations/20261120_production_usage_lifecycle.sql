-- ============================================================================
-- Production usage lifecycle, settings and changelog
-- ----------------------------------------------------------------------------
--   * Usage lines get a lifecycle status: submitted, completed, cancelled.
--     `completed` is normally derived from the cutoff window; it is stored only
--     when explicitly set. `cancelled` replaces hard deletes.
--   * A company-level settings row controls the cutoff window, whether the
--     original submitter may edit before the cutoff, and whether the same SKU
--     may be submitted more than once for the same usage date.
--   * Every usage mutation is recorded in a changelog for auditing.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Usage status
-- ---------------------------------------------------------------------------
alter table public.production_usage
  add column if not exists status text not null default 'submitted';

alter table public.production_usage
  drop constraint if exists production_usage_status_check;

alter table public.production_usage
  add constraint production_usage_status_check
  check (status in ('submitted', 'completed', 'cancelled'));

create index if not exists production_usage_status_idx
  on public.production_usage (company_id, status);

-- ---------------------------------------------------------------------------
-- 2. Usage editor settings (one row per company)
-- ---------------------------------------------------------------------------
create table if not exists public.production_usage_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  cutoff_days integer not null default 3 check (cutoff_days >= 0),
  cutoff_time time not null default '17:00:00',
  allow_submitter_edit boolean not null default false,
  allow_duplicates boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.production_usage_settings (company_id)
select id from public.companies
on conflict (company_id) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Usage changelog
-- ---------------------------------------------------------------------------
create table if not exists public.production_usage_changelog (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  usage_id uuid not null references public.production_usage(id) on delete cascade,
  batch_id uuid,
  action text not null,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  previous_values jsonb,
  new_values jsonb,
  reason text
);

create index if not exists production_usage_changelog_usage_idx
  on public.production_usage_changelog (usage_id, changed_at desc);

create index if not exists production_usage_changelog_batch_idx
  on public.production_usage_changelog (batch_id, changed_at desc);

create index if not exists production_usage_changelog_company_idx
  on public.production_usage_changelog (company_id, changed_at desc);

-- ---------------------------------------------------------------------------
-- 4. Row level security
-- ---------------------------------------------------------------------------
alter table public.production_usage_settings enable row level security;
drop policy if exists "company members can access" on public.production_usage_settings;
create policy "company members can access" on public.production_usage_settings
  for all to authenticated
  using (company_id in (select public.current_company_ids()))
  with check (company_id in (select public.current_company_ids()));

grant select, insert, update, delete on public.production_usage_settings to authenticated;

alter table public.production_usage_changelog enable row level security;
drop policy if exists "company members can access" on public.production_usage_changelog;
create policy "company members can access" on public.production_usage_changelog
  for all to authenticated
  using (company_id in (select public.current_company_ids()))
  with check (company_id in (select public.current_company_ids()));

grant select, insert, update, delete on public.production_usage_changelog to authenticated;

notify pgrst, 'reload schema';
