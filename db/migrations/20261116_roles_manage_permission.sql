-- ---------------------------------------------------------------------------
-- Roles & permissions administration
--
-- Adds the permission that gates the Roles & permissions page. System roles
-- (including the seeded Super Admin role) receive it automatically; other
-- roles can be granted it from the new page by someone who already has it.
-- ---------------------------------------------------------------------------

insert into public.permissions (key, description)
values (
  'roles.manage',
  'Create roles and manage role permissions and member access'
)
on conflict (key) do update
  set description = excluded.description;

insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
  from public.roles r
  cross join public.permissions p
 where r.is_system = true
   and p.key = 'roles.manage'
on conflict (role_id, permission_key) do nothing;
