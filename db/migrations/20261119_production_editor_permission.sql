-- ---------------------------------------------------------------------------
-- Production usage editor permission
--
-- A dedicated permission for the usage editor module. Users with this permission
-- can edit or delete any production usage line and run mass CSV updates.
-- It is intentionally separate from production.update so it can be granted to
-- a small group of reviewers.
-- ---------------------------------------------------------------------------

insert into public.permissions (key, description)
values (
  'production.editor',
  'Edit or delete any production usage, and import usage updates'
)
on conflict (key) do update
  set description = excluded.description;

-- Give system roles (including Super Admin) the new permission by default.
-- Other roles can be granted it from the Roles & permissions page.
insert into public.role_permissions (role_id, permission_key)
select r.id, 'production.editor'
  from public.roles r
 where r.is_system = true
on conflict (role_id, permission_key) do nothing;

notify pgrst, 'reload schema';
