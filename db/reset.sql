-- ============================================================================
-- Beekeeper — reset the public schema
-- ----------------------------------------------------------------------------
-- DESTRUCTIVE. Drops every table, view, materialized view, sequence, type and
-- user-defined function/procedure in the `public` schema.
--
-- It does NOT touch:
--   * the `auth` schema (users/sessions survive, so the seeded Super Admin
--     keeps working and `super_admin.sql` can simply update it)
--   * the `storage` schema / buckets
--   * extension-owned objects (e.g. pgcrypto functions in `public`)
--
-- Run in the Supabase SQL editor as the `postgres` role, then re-run:
--   db/migrations/20261101_init.sql
--   db/migrations/20261108_extended_operations.sql
--   db/migrations/20261109_outlet_location_fields.sql
--   db/migrations/20261110_outlet_distributor.sql
--   db/migrations/20261111_operations_rework.sql
--   db/migrations/20261112_visit_schedule_photos.sql
--   db/migrations/20261113_visit_plan_explicit_attachment.sql
--   db/migrations/20261114_production_stage_usage.sql
--   db/migrations/20261115_production_usage_batch.sql
--   db/seed/super_admin.sql
--   db/seed/rls_policies.sql        (optional)
--   db/seed/storage.sql             (optional, once per project)
-- ============================================================================

begin;

-- Keep unqualified names in the generated DROP statements resolvable.
set local search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- 1. Views + materialized views
-- ---------------------------------------------------------------------------
do $$
declare
  v_name text;
  v_kind "char";
begin
  for v_name, v_kind in
    select c.relname, c.relkind
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind in ('v', 'm')
       and not exists (
         select 1
           from pg_depend d
          where d.classid = 'pg_class'::regclass
            and d.objid = c.oid
            and d.deptype = 'e'
       )
  loop
    if v_kind = 'm' then
      execute format('drop materialized view if exists public.%I cascade', v_name);
    else
      execute format('drop view if exists public.%I cascade', v_name);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Tables (CASCADE removes FKs, policies, triggers, indexes, owned sequences)
-- ---------------------------------------------------------------------------
do $$
declare
  v_name text;
begin
  for v_name in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind in ('r', 'p', 'f')
       and not exists (
         select 1
           from pg_depend d
          where d.classid = 'pg_class'::regclass
            and d.objid = c.oid
            and d.deptype = 'e'
       )
  loop
    execute format('drop table if exists public.%I cascade', v_name);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Standalone sequences (anything not owned by a dropped table)
-- ---------------------------------------------------------------------------
do $$
declare
  v_name text;
begin
  for v_name in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind = 'S'
       and not exists (
         select 1
           from pg_depend d
          where d.classid = 'pg_class'::regclass
            and d.objid = c.oid
            and d.deptype = 'e'
       )
  loop
    execute format('drop sequence if exists public.%I cascade', v_name);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4. User-defined functions + procedures (extension-owned objects skipped)
-- ---------------------------------------------------------------------------
do $$
declare
  v_name text;
  v_kind "char";
begin
  for v_name, v_kind in
    select p.oid::regprocedure::text, p.prokind
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prokind in ('f', 'p')
       and not exists (
         select 1
           from pg_depend d
          where d.classid = 'pg_proc'::regclass
            and d.objid = p.oid
            and d.deptype = 'e'
       )
  loop
    if v_kind = 'p' then
      execute format('drop procedure if exists %s cascade', v_name);
    else
      execute format('drop function if exists %s cascade', v_name);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Custom types/enums/domains (extension-owned objects skipped)
-- ---------------------------------------------------------------------------
do $$
declare
  v_name text;
begin
  for v_name in
    select t.oid::regtype::text
      from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
     where n.nspname = 'public'
       and t.typtype in ('e', 'd', 'c')
       and not exists (
         select 1
           from pg_depend d
          where d.classid = 'pg_type'::regclass
            and d.objid = t.oid
            and d.deptype = 'e'
       )
  loop
    execute format('drop type if exists %s cascade', v_name);
  end loop;
end $$;

commit;

-- Ask PostgREST to drop its cached schema too.
notify pgrst, 'reload schema';

select 'public schema reset — re-run the migrations and seeds' as status;
