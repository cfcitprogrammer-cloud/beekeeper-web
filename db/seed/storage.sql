-- ============================================================================
-- Beekeeper — Supabase Storage for employee documents
-- ----------------------------------------------------------------------------
-- Run this in the Supabase SQL Editor after the seed/RLS files if you want
-- the employee documents upload/download feature to work.
-- ============================================================================

-- Create the bucket (private).
insert into storage.buckets (id, name, public)
values ('employee-documents', 'employee-documents', false)
on conflict (id) do nothing;

-- Allow authenticated users to upload/read/delete objects in their company folder.
-- The object path is `${company_id}/${employee_id}/${file}`.
drop policy if exists "employee docs upload" on storage.objects;
create policy "employee docs upload"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'employee-documents'
    and (storage.foldername(name))[1] in (
      select company_id::text from public.company_members where user_id = auth.uid()
    )
  );

drop policy if exists "employee docs read" on storage.objects;
create policy "employee docs read"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'employee-documents'
    and (storage.foldername(name))[1] in (
      select company_id::text from public.company_members where user_id = auth.uid()
    )
  );

drop policy if exists "employee docs delete" on storage.objects;
create policy "employee docs delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'employee-documents'
    and (storage.foldername(name))[1] in (
      select company_id::text from public.company_members where user_id = auth.uid()
    )
  );

select 'Storage policies applied' as status;
