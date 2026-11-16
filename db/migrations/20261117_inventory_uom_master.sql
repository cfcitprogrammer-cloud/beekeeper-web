-- ---------------------------------------------------------------------------
-- Inventory units of measure (UOM master data)
--
-- SKU units of measure were previously a hard-coded list in the SKU form. This
-- migration promotes them to company-scoped master data so each company can
-- configure the units it actually uses.
--
-- `public.skus.uom` is kept as the short code so bookings, production stages
-- and production usage history keep working and keep their historical
-- snapshots. `public.skus.uom_id` links the current SKU to the master record.
-- ---------------------------------------------------------------------------

create table if not exists public.inventory_uoms (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_uoms_company_code_key unique (company_id, code)
);

create index if not exists inventory_uoms_company_idx
  on public.inventory_uoms (company_id, is_active);

alter table public.skus
  add column if not exists uom_id uuid
  references public.inventory_uoms(id) on delete set null;

create index if not exists skus_uom_idx
  on public.skus (uom_id);

-- Keep the column default in sync with the seeded master code below.
alter table public.skus alter column uom set default 'PCS';

-- Seed a sensible starting catalog for every existing company.
insert into public.inventory_uoms (company_id, code, name)
select c.id, v.code, v.name
  from public.companies c
  cross join (values
    ('PCS', 'Pieces'),
    ('PACK', 'Pack'),
    ('BOTTLE', 'Bottle'),
    ('CAN', 'Can'),
    ('BOX', 'Box'),
    ('CARTON', 'Carton'),
    ('BAR', 'Bar'),
    ('TUBE', 'Tube'),
    ('JAR', 'Jar'),
    ('TUB', 'Tub'),
    ('KG', 'Kilogram'),
    ('G', 'Gram'),
    ('L', 'Liter'),
    ('ML', 'Milliliter')
  ) as v(code, name)
on conflict (company_id, code) do nothing;

-- Keep any unit already used by an existing SKU even if it is not in the
-- default catalog (for example imported or legacy data).
insert into public.inventory_uoms (company_id, code, name)
select distinct s.company_id, upper(btrim(s.uom)), initcap(lower(btrim(s.uom)))
  from public.skus s
 where s.uom is not null and btrim(s.uom) <> ''
on conflict (company_id, code) do nothing;

-- Link existing SKUs to their master record and normalise the stored code.
update public.skus s
   set uom_id = u.id,
       uom = u.code
  from public.inventory_uoms u
 where u.company_id = s.company_id
   and u.code = upper(btrim(s.uom))
   and s.uom_id is null;

-- Row level security, matching the other company-scoped tables.
alter table public.inventory_uoms enable row level security;

drop policy if exists "company members can access" on public.inventory_uoms;
create policy "company members can access" on public.inventory_uoms
  for all to authenticated
  using (company_id in (select public.current_company_ids()))
  with check (company_id in (select public.current_company_ids()));

drop trigger if exists set_updated_at on public.inventory_uoms;
create trigger set_updated_at
  before update on public.inventory_uoms
  for each row execute function public.touch_updated_at();

grant select, insert, update, delete on public.inventory_uoms to authenticated;

notify pgrst, 'reload schema';
