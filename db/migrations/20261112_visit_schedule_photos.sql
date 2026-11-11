-- ============================================================================
-- Beekeeper — Visit scheduling and required check-in/check-out photos
-- ----------------------------------------------------------------------------
--   * Visits are added/scheduled before they happen (start/end date + optional
--     start/end time).
--   * check_in_at becomes nullable; a new `scheduled` status is the default.
--   * Check-in and check-out each require a captured photo stored in the
--     private `visit-photos` bucket.
--   * Visit plans attach every visit scheduled inside their date range.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Schedule + photo columns
-- ---------------------------------------------------------------------------
alter table public.visits
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists start_time time,
  add column if not exists end_time time,
  add column if not exists check_in_photo_path text,
  add column if not exists check_out_photo_path text;

-- Existing visits were created as immediate check-ins. Use the check-in date
-- as their schedule so the new required columns can be enforced.
update public.visits
set start_date = coalesce(start_date, (check_in_at at time zone 'UTC')::date),
    end_date = coalesce(end_date, (check_in_at at time zone 'UTC')::date)
where start_date is null or end_date is null;

alter table public.visits
  alter column start_date set not null,
  alter column end_date set not null,
  alter column check_in_at drop default,
  alter column check_in_at drop not null;

-- A visit that has not happened yet is `scheduled`. The database default is the
-- only place a new visit is given a status.
alter table public.visits drop constraint if exists visits_status_check;
alter table public.visits
  add constraint visits_status_check
  check (status in ('scheduled', 'checked_in', 'checked_out', 'cancelled'));

alter table public.visits alter column status set default 'scheduled';

alter table public.visits drop constraint if exists visits_schedule_range;
alter table public.visits
  add constraint visits_schedule_range check (end_date >= start_date);

alter table public.visits drop constraint if exists visits_time_range;
alter table public.visits
  add constraint visits_time_range
  check (
    start_time is null
    or end_time is null
    or end_date > start_date
    or end_time >= start_time
  );

create index if not exists visits_schedule_idx
  on public.visits (employee_id, start_date desc);

create index if not exists visits_plan_idx
  on public.visits (plan_id, start_date desc);

-- ---------------------------------------------------------------------------
-- 2. Classification trigger now uses the scheduled start date
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
  -- Check-in/check-out and note edits must not reclassify a visit. They only
  -- move the status forward when the matching timestamp is present.
  if tg_op = 'UPDATE'
     and new.employee_id = old.employee_id
     and new.start_date = old.start_date
     and new.plan_id is not distinct from old.plan_id then
    if new.check_in_at is not null
       and new.check_out_at is null
       and new.status = 'scheduled' then
      new.status := 'checked_in';
    end if;

    if new.check_out_at is not null
       and new.status in ('scheduled', 'checked_in') then
      new.status := 'checked_out';
    end if;

    return new;
  end if;

  if new.plan_id is not null then
    -- Explicit attachment: the plan must belong to the employee and cover the
    -- visit start date. Plan status is irrelevant for an explicit attachment.
    select p.id
      into v_plan_id
      from public.visit_plans p
     where p.id = new.plan_id
       and p.company_id = new.company_id
       and p.employee_id = new.employee_id
       and new.start_date between p.start_date and p.end_date
     limit 1;

    if v_plan_id is null then
      new.plan_id := null;
      new.is_planned := false;
    else
      new.plan_id := v_plan_id;
      new.is_planned := true;
    end if;
  else
    -- Automatic classification: match an open plan for the employee.
    select p.id
      into v_plan_id
      from public.visit_plans p
     where p.company_id = new.company_id
       and p.employee_id = new.employee_id
       and p.status in ('draft', 'active')
       and new.start_date between p.start_date and p.end_date
     order by p.start_date desc
     limit 1;

    new.plan_id := v_plan_id;
    new.is_planned := v_plan_id is not null;
  end if;

  if new.is_planned and new.planned_date is null then
    new.planned_date := new.start_date;
  end if;

  if new.check_in_at is not null
     and new.check_out_at is null
     and new.status = 'scheduled' then
    new.status := 'checked_in';
  end if;

  if new.check_out_at is not null
     and new.status in ('scheduled', 'checked_in') then
    new.status := 'checked_out';
  end if;

  return new;
end;
$$;

drop trigger if exists classify_visit_plan_trigger on public.visits;
create trigger classify_visit_plan_trigger
  before insert or update of
    employee_id, outlet_id, plan_id, start_date, check_in_at, check_out_at
  on public.visits
  for each row
  execute function public.classify_visit_plan();

-- ---------------------------------------------------------------------------
-- 3. Private visit photo bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('visit-photos', 'visit-photos', false)
on conflict (id) do nothing;

drop policy if exists "visit photos upload" on storage.objects;
create policy "visit photos upload"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'visit-photos'
    and (storage.foldername(name))[1] in (
      select company_id::text from public.company_members where user_id = auth.uid()
    )
  );

drop policy if exists "visit photos read" on storage.objects;
create policy "visit photos read"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'visit-photos'
    and (storage.foldername(name))[1] in (
      select company_id::text from public.company_members where user_id = auth.uid()
    )
  );

drop policy if exists "visit photos delete" on storage.objects;
create policy "visit photos delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'visit-photos'
    and (storage.foldername(name))[1] in (
      select company_id::text from public.company_members where user_id = auth.uid()
    )
  );

notify pgrst, 'reload schema';
