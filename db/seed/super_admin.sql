-- ============================================================================
-- Beekeeper — first user bootstrap (Super Admin)
-- ----------------------------------------------------------------------------
-- Run this in the Supabase SQL Editor. It runs as the `postgres` role, so it
-- bypasses RLS while inserting.
--
-- Edit the values in the DECLARE block, then run the whole file.
--
-- What it creates:
--   1. auth user (email confirmed, password set)
--   2. company
--   3. workspace
--   4. permission catalog (mirrors lib/auth/permissions.ts)
--   5. Super Admin role
--   6. every permission granted to the Super Admin role
--   7. company membership + workspace membership for the user
--   8. employee profile for the user (so the app resolves a display name)
--
-- The script is idempotent: rerunning it updates the same rows. It also resets
-- the seeded user's password to the value configured below.
-- ============================================================================

-- Make crypt()/gen_salt() resolve whether pgcrypto lives in public or extensions.
set search_path = public, extensions;

do $$
declare
  -- ------------------------------------------------------------------------
  -- EDIT THESE VALUES
  -- ------------------------------------------------------------------------
  v_email          text := 'superadmin@example.com';
  v_password       text := 'ChangeMe123!';
  v_full_name      text := 'Super Admin';
  v_first_name     text := 'Super';
  v_last_name      text := 'Admin';

  v_company_name   text := 'Beekeeper Demo Company';
  v_company_slug   text := 'beekeeper-demo';
  v_company_tz     text := 'Asia/Manila';
  v_currency       text := 'PHP';

  v_workspace_name text := 'Main Workspace';
  v_workspace_code text := 'MAIN';
  v_workspace_tz   text := 'Asia/Manila';

  v_role_name      text := 'Super Admin';
  v_employee_no    text := 'EMP-0001';
  -- ------------------------------------------------------------------------

  -- Stable fallback IDs, used only when the row does not exist yet.
  v_user_id_seed      uuid := '11111111-1111-4111-8111-111111111111';
  v_company_id_seed   uuid := '22222222-2222-4222-8222-222222222222';
  v_workspace_id_seed uuid := '33333333-3333-4333-8333-333333333333';
  v_role_id_seed      uuid := '44444444-4444-4444-8444-444444444444';
  v_employee_id_seed  uuid := '55555555-5555-4555-8555-555555555555';

  v_user_id      uuid;
  v_company_id   uuid;
  v_workspace_id uuid;
  v_role_id      uuid;
  v_employee_id  uuid;

  -- Default approval workflow (created only when the company has none).
  v_approval_stage_id     uuid := '66666666-6666-4666-8666-666666666666';
  v_booking_template_id   uuid := '77777777-7777-4777-8777-777777777777';
  v_outlet_template_id    uuid := '88888888-8888-4888-8888-888888888888';
begin
  -- ==========================================================================
  -- 1. Auth user
  -- ==========================================================================
  select id into v_user_id
    from auth.users
   where lower(email) = lower(v_email)
   limit 1;

  if v_user_id is null then
    v_user_id := v_user_id_seed;

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      lower(v_email),
      crypt(v_password, gen_salt('bf')),
      now(),
      jsonb_build_object(
        'provider', 'email',
        'providers', jsonb_build_array('email')
      ),
      jsonb_build_object('full_name', v_full_name),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  else
    update auth.users
       set email = lower(v_email),
           encrypted_password = crypt(v_password, gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           raw_app_meta_data = jsonb_build_object(
             'provider', 'email',
             'providers', jsonb_build_array('email')
           ),
           raw_user_meta_data =
             coalesce(raw_user_meta_data, '{}'::jsonb)
             || jsonb_build_object('full_name', v_full_name),
           updated_at = now()
     where id = v_user_id;
  end if;

  -- Email identity is required for password sign-in.
  insert into auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    v_user_id,
    v_user_id::text,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', lower(v_email),
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  )
  on conflict (provider_id, provider) do update
    set identity_data = excluded.identity_data,
        updated_at = now();

  -- ==========================================================================
  -- 2. Company
  -- ==========================================================================
  select id into v_company_id
    from public.companies
   where slug = v_company_slug
   limit 1;

  if v_company_id is null then
    v_company_id := v_company_id_seed;
  end if;

  insert into public.companies (
    id,
    name,
    slug,
    legal_name,
    email,
    timezone,
    currency,
    is_active,
    created_by
  )
  values (
    v_company_id,
    v_company_name,
    v_company_slug,
    v_company_name,
    lower(v_email),
    v_company_tz,
    v_currency,
    true,
    v_user_id
  )
  on conflict (id) do update
    set name = excluded.name,
        slug = excluded.slug,
        legal_name = excluded.legal_name,
        email = excluded.email,
        timezone = excluded.timezone,
        currency = excluded.currency,
        is_active = true,
        created_by = excluded.created_by,
        updated_at = now();

  -- ==========================================================================
  -- 3. Workspace
  -- ==========================================================================
  select id into v_workspace_id
    from public.workspaces
   where company_id = v_company_id
     and code = v_workspace_code
   limit 1;

  if v_workspace_id is null then
    v_workspace_id := v_workspace_id_seed;
  end if;

  insert into public.workspaces (
    id,
    company_id,
    name,
    code,
    timezone,
    is_active
  )
  values (
    v_workspace_id,
    v_company_id,
    v_workspace_name,
    v_workspace_code,
    v_workspace_tz,
    true
  )
  on conflict (id) do update
    set company_id = excluded.company_id,
        name = excluded.name,
        code = excluded.code,
        timezone = excluded.timezone,
        is_active = true,
        updated_at = now();

  -- ==========================================================================
  -- 4. Permission catalog
  -- ==========================================================================
  insert into public.permissions (key, description)
  values
    ('dashboard.view',   'View the operations dashboard'),
    ('dashboard.create', 'Create dashboard widgets and layouts'),
    ('dashboard.update', 'Update dashboard widgets and layouts'),
    ('dashboard.delete', 'Delete dashboard widgets and layouts'),
    ('employees.view',   'View the employee directory and profiles'),
    ('employees.create', 'Onboard new employees'),
    ('employees.update', 'Update employee records and profiles'),
    ('employees.delete', 'Delete or deactivate employees'),
    ('attendance.view',  'View the attendance feed and daily summary'),
    ('attendance.create','Capture attendance records'),
    ('attendance.update','Update attendance records'),
    ('attendance.delete','Delete attendance records'),
    ('shifts.view',      'View shift templates'),
    ('shifts.create',    'Create shift templates'),
    ('shifts.update',    'Update shift templates'),
    ('shifts.delete',    'Delete shift templates'),
    ('leave.view',       'View leave balances'),
    ('leave.create',     'Create leave requests'),
    ('leave.update',     'Update leave requests'),
    ('leave.delete',     'Delete leave requests'),
    ('leave.review',     'Approve or reject leave requests'),
    ('outlets.view',     'View the outlet directory'),
    ('outlets.create',   'Add outlets for onboarding'),
    ('outlets.update',   'Update outlets'),
    ('outlets.delete',   'Delete outlets'),
    ('inventory.view',   'View the SKU catalog'),
    ('inventory.create', 'Create SKUs'),
    ('inventory.update', 'Update SKUs'),
    ('inventory.delete', 'Delete SKUs'),
    ('bookings.view',    'View the bookings register and booking details'),
    ('bookings.create',  'Create field bookings'),
    ('bookings.update',  'Update booking status'),
    ('bookings.delete',  'Delete bookings'),
    ('approvals.view',   'View the approval inbox and history'),
    ('approvals.create', 'Create approval requests'),
    ('approvals.update', 'Update approval requests'),
    ('approvals.delete', 'Delete approval requests'),
    ('approvals.decide', 'Approve or reject approval requests'),
    ('approvals.manage', 'Manage approval templates')
  on conflict (key) do update
    set description = excluded.description;

  -- ==========================================================================
  -- 5. Super Admin role
  -- ==========================================================================
  select id into v_role_id
    from public.roles
   where company_id = v_company_id
     and name = v_role_name
   limit 1;

  if v_role_id is null then
    v_role_id := v_role_id_seed;
  end if;

  insert into public.roles (
    id,
    company_id,
    name,
    description,
    is_system
  )
  values (
    v_role_id,
    v_company_id,
    v_role_name,
    'Full access to every module, action and approval workflow.',
    true
  )
  on conflict (id) do update
    set company_id = excluded.company_id,
        name = excluded.name,
        description = excluded.description,
        is_system = true,
        updated_at = now();

  -- ==========================================================================
  -- 6. Grant every permission to Super Admin
  -- ==========================================================================
  insert into public.role_permissions (role_id, permission_key)
  select v_role_id, p.key
    from public.permissions p
  on conflict (role_id, permission_key) do nothing;

  -- ==========================================================================
  -- 7. Company membership + role assignment
  -- ==========================================================================
  insert into public.company_members (user_id, company_id, role_id)
  values (v_user_id, v_company_id, v_role_id)
  on conflict (user_id, company_id) do update
    set role_id = excluded.role_id,
        updated_at = now();

  -- ==========================================================================
  -- 8. Workspace membership + role assignment
  -- ==========================================================================
  insert into public.workspace_members (
    workspace_id,
    user_id,
    company_id,
    role_id
  )
  values (
    v_workspace_id,
    v_user_id,
    v_company_id,
    v_role_id
  )
  on conflict (workspace_id, user_id) do update
    set company_id = excluded.company_id,
        role_id = excluded.role_id;

  -- ==========================================================================
  -- 9. Employee profile (optional, but gives the app a display name)
  -- ==========================================================================
  select id into v_employee_id
    from public.employees
   where user_id = v_user_id
   limit 1;

  if v_employee_id is null then
    select id into v_employee_id
      from public.employees
     where company_id = v_company_id
       and employee_no = v_employee_no
     limit 1;
  end if;

  if v_employee_id is null then
    v_employee_id := v_employee_id_seed;
  end if;

  insert into public.employees (
    id,
    company_id,
    workspace_id,
    user_id,
    employee_no,
    first_name,
    last_name,
    email,
    employment_type,
    status,
    hire_date
  )
  values (
    v_employee_id,
    v_company_id,
    v_workspace_id,
    v_user_id,
    v_employee_no,
    v_first_name,
    v_last_name,
    lower(v_email),
    'full_time',
    'active',
    current_date
  )
  on conflict (id) do update
    set company_id = excluded.company_id,
        workspace_id = excluded.workspace_id,
        user_id = excluded.user_id,
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        email = excluded.email,
        employment_type = excluded.employment_type,
        status = excluded.status,
        updated_at = now();

  -- ==========================================================================
  -- 10. Default approval workflow (only when the company has none)
  -- ==========================================================================
  -- One single-stage workflow that the Super Admin role can decide. Without a
  -- template, submissions auto-approve; this makes the inbox testable on a
  -- fresh install. Existing companies with templates are left untouched.
  if not exists (
    select 1 from public.approval_templates where company_id = v_company_id
  ) then
    insert into public.approval_stages (
      id, company_id, name, description, required_approvals, is_active
    )
    values (
      v_approval_stage_id,
      v_company_id,
      'Manager approval',
      'Single-stage review performed by the Super Admin role.',
      1,
      true
    )
    on conflict (id) do update
      set company_id = excluded.company_id,
          name = excluded.name,
          description = excluded.description,
          required_approvals = excluded.required_approvals,
          is_active = true,
          updated_at = now();

    insert into public.approval_stage_approvers (company_id, stage_id, role_id)
    select v_company_id, v_approval_stage_id, v_role_id
     where not exists (
       select 1 from public.approval_stage_approvers
        where stage_id = v_approval_stage_id and role_id = v_role_id
     );

    insert into public.approval_templates (
      id, company_id, name, description, document_type, workspace_id, is_active
    )
    values
      (
        v_booking_template_id,
        v_company_id,
        'Booking approval',
        'Routes booking submissions through manager approval.',
        'booking',
        null,
        true
      ),
      (
        v_outlet_template_id,
        v_company_id,
        'Outlet onboarding approval',
        'Routes outlet onboarding through manager approval.',
        'outlet',
        null,
        true
      )
    on conflict (id) do update
      set company_id = excluded.company_id,
          name = excluded.name,
          description = excluded.description,
          document_type = excluded.document_type,
          workspace_id = excluded.workspace_id,
          is_active = true,
          updated_at = now();

    insert into public.approval_template_stages (
      company_id, template_id, stage_id, seq
    )
    values
      (v_company_id, v_booking_template_id, v_approval_stage_id, 1),
      (v_company_id, v_outlet_template_id, v_approval_stage_id, 1)
    on conflict do nothing;
  end if;

  raise notice 'Seed complete — Super Admin: % (user id %)', v_email, v_user_id;
end $$;


-- ============================================================================
-- OPTIONAL: RLS policies
-- ----------------------------------------------------------------------------
-- If the app still shows "workspace access pending" or RLS errors after
-- signing in, run the companion file:
--
--   db/seed/rls_policies.sql
--
-- It enables RLS on every company-scoped table and grants access to
-- authenticated members of the user's company (via a security-definer
-- helper to avoid recursion on company_members).
-- ============================================================================
