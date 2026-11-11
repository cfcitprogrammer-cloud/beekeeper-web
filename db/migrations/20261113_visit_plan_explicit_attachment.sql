-- ============================================================================
-- Beekeeper — Visit plans only attach visits explicitly when the plan is saved
-- ----------------------------------------------------------------------------
-- Previously the classification trigger matched any draft/active plan whose
-- date range covered a new visit. That meant visits added later were loosely
-- attached to an already-created plan. Automatic matching is removed:
--
--   * A new visit with no plan_id stays unplanned.
--   * Visits are attached only by `syncPlanVisits` when a plan is created or
--     updated (explicit plan_id is still validated against the plan range).
-- ============================================================================

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
      new.planned_date := null;
    else
      new.plan_id := v_plan_id;
      new.is_planned := true;
      if new.planned_date is null then
        new.planned_date := new.start_date;
      end if;
    end if;
  else
    -- No automatic date-range matching. A visit only joins a plan when the
    -- plan is saved and explicitly attaches it.
    new.is_planned := false;
    new.planned_date := null;
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

notify pgrst, 'reload schema';
