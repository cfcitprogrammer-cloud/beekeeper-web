-- ============================================================================
-- Beekeeper — Supabase Storage
-- ----------------------------------------------------------------------------
-- Creates the private buckets used by employee documents and expense
-- attachments, plus their company-scoped access policies.
-- Run this in the Supabase SQL Editor after the seed/RLS files.
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

-- ----------------------------------------------------------------------------
-- Expense attachments
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('expense-attachments', 'expense-attachments', false)
on conflict (id) do nothing;

drop policy if exists "expense attachments upload" on storage.objects;
create policy "expense attachments upload"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'expense-attachments'
    and (storage.foldername(name))[1] in (
      select company_id::text from public.company_members where user_id = auth.uid()
    )
  );

drop policy if exists "expense attachments read" on storage.objects;
create policy "expense attachments read"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'expense-attachments'
    and (storage.foldername(name))[1] in (
      select company_id::text from public.company_members where user_id = auth.uid()
    )
  );

drop policy if exists "expense attachments delete" on storage.objects;
create policy "expense attachments delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'expense-attachments'
    and (storage.foldername(name))[1] in (
      select company_id::text from public.company_members where user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- Visit photos (required check-in / check-out captures)
-- ----------------------------------------------------------------------------
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

select 'Storage policies applied' as status;
