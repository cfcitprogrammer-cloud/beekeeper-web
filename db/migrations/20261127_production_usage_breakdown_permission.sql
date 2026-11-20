-- ---------------------------------------------------------------------------
-- Production usage breakdown permission
--
-- Gates the Usage Breakdown report, which shows the SKU usage recorded for a
-- pipeline's stages on a selected date. Kept separate from production.view so
-- it can be granted only to users who should see this report.
-- ---------------------------------------------------------------------------

insert into public.permissions (key, description)
values (
  'production.usage_breakdown',
  'View the production usage breakdown by pipeline stage'
)
on conflict (key) do update
  set description = excluded.description;

-- Give system roles (including Super Admin) the new permission by default.
-- Other roles can be granted it from the Roles & permissions page.
insert into public.role_permissions (role_id, permission_key)
select r.id, 'production.usage_breakdown'
  from public.roles r
 where r.is_system = true
on conflict (role_id, permission_key) do nothing;

notify pgrst, 'reload schema';
