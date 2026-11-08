-- ============================================================================
-- Beekeeper — outlet distributor support
-- ============================================================================
alter table public.outlets
  add column if not exists is_distributor boolean not null default false,
  add column if not exists distributor_id uuid references public.outlets(id) on delete set null;

create index if not exists outlets_distributor_id_idx on public.outlets (distributor_id);
create index if not exists outlets_is_distributor_idx on public.outlets (is_distributor);

notify pgrst, 'reload schema';
