-- ---------------------------------------------------------------------------
-- Warehouse stock
--
-- A simple on-hand inventory per warehouse and SKU, backed by an append-only
-- movement ledger. `public.skus.production_warehouse_id` remains a descriptive
-- label and is deliberately not used for stock calculations.
--
-- Movements are applied through the two functions below so a balance update
-- and its ledger entry always happen together. Quantities are signed in the
-- ledger: receipts/transfer-ins are positive, issues/transfer-outs negative,
-- and adjustments can be either.
-- ---------------------------------------------------------------------------

create table if not exists public.warehouse_stock (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  warehouse_id uuid not null references public.inventory_warehouses(id) on delete cascade,
  sku_id uuid not null references public.skus(id) on delete cascade,
  quantity numeric(14, 3) not null default 0 check (quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint warehouse_stock_warehouse_sku_key unique (company_id, warehouse_id, sku_id)
);

create index if not exists warehouse_stock_warehouse_idx
  on public.warehouse_stock (company_id, warehouse_id);
create index if not exists warehouse_stock_sku_idx
  on public.warehouse_stock (company_id, sku_id);

create table if not exists public.warehouse_stock_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  warehouse_id uuid not null references public.inventory_warehouses(id) on delete cascade,
  sku_id uuid not null references public.skus(id) on delete cascade,
  movement_type text not null
    check (movement_type in ('receipt', 'issue', 'adjustment', 'transfer_in', 'transfer_out')),
  quantity numeric(14, 3) not null check (quantity <> 0),
  balance_after numeric(14, 3) not null check (balance_after >= 0),
  reference text,
  notes text,
  transfer_group_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists warehouse_stock_movements_warehouse_idx
  on public.warehouse_stock_movements (company_id, warehouse_id, created_at desc);
create index if not exists warehouse_stock_movements_sku_idx
  on public.warehouse_stock_movements (company_id, sku_id, created_at desc);

-- Row level security, matching the other company-scoped tables.
alter table public.warehouse_stock enable row level security;
alter table public.warehouse_stock_movements enable row level security;

drop policy if exists "company members can access" on public.warehouse_stock;
create policy "company members can access" on public.warehouse_stock
  for all to authenticated
  using (company_id in (select public.current_company_ids()))
  with check (company_id in (select public.current_company_ids()));

drop policy if exists "company members can access" on public.warehouse_stock_movements;
create policy "company members can access" on public.warehouse_stock_movements
  for all to authenticated
  using (company_id in (select public.current_company_ids()))
  with check (company_id in (select public.current_company_ids()));

drop trigger if exists set_updated_at on public.warehouse_stock;
create trigger set_updated_at
  before update on public.warehouse_stock
  for each row execute function public.touch_updated_at();

grant select, insert, update, delete on public.warehouse_stock to authenticated;
grant select, insert, update, delete on public.warehouse_stock_movements to authenticated;

-- ---------------------------------------------------------------------------
-- Apply a single stock movement atomically.
-- Returns the updated stock row.
-- ---------------------------------------------------------------------------
create or replace function public.apply_warehouse_stock_movement(
  p_company_id uuid,
  p_workspace_id uuid,
  p_warehouse_id uuid,
  p_sku_id uuid,
  p_movement_type text,
  p_quantity numeric,
  p_reference text default null,
  p_notes text default null,
  p_transfer_group_id uuid default null,
  p_created_by uuid default null
) returns public.warehouse_stock
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_stock public.warehouse_stock;
  v_new_quantity numeric(14, 3);
begin
  if p_quantity is null or p_quantity = 0 then
    raise exception 'Quantity must not be zero.' using errcode = '22023';
  end if;

  if p_movement_type not in (
    'receipt', 'issue', 'adjustment', 'transfer_in', 'transfer_out'
  ) then
    raise exception 'Invalid stock movement type.' using errcode = '22023';
  end if;

  insert into public.warehouse_stock (
    company_id, workspace_id, warehouse_id, sku_id, quantity
  ) values (
    p_company_id, p_workspace_id, p_warehouse_id, p_sku_id, 0
  )
  on conflict (company_id, warehouse_id, sku_id) do nothing;

  select *
    into v_stock
    from public.warehouse_stock
   where company_id = p_company_id
     and warehouse_id = p_warehouse_id
     and sku_id = p_sku_id
   for update;

  v_new_quantity := v_stock.quantity + p_quantity;
  if v_new_quantity < 0 then
    raise exception 'Insufficient stock: % available, % requested.',
      v_stock.quantity, abs(p_quantity)
      using errcode = '22023';
  end if;

  update public.warehouse_stock
     set quantity = v_new_quantity,
         updated_at = now()
   where id = v_stock.id
   returning * into v_stock;

  insert into public.warehouse_stock_movements (
    company_id, workspace_id, warehouse_id, sku_id, movement_type,
    quantity, balance_after, reference, notes, transfer_group_id, created_by
  ) values (
    p_company_id, p_workspace_id, p_warehouse_id, p_sku_id, p_movement_type,
    p_quantity, v_new_quantity, p_reference, p_notes, p_transfer_group_id,
    p_created_by
  );

  return v_stock;
end;
$$;

-- ---------------------------------------------------------------------------
-- Transfer stock between two warehouses as a paired out/in movement.
-- ---------------------------------------------------------------------------
create or replace function public.transfer_warehouse_stock(
  p_company_id uuid,
  p_workspace_id uuid,
  p_from_warehouse_id uuid,
  p_to_warehouse_id uuid,
  p_sku_id uuid,
  p_quantity numeric,
  p_notes text default null,
  p_created_by uuid default null
) returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_group uuid := gen_random_uuid();
begin
  if p_from_warehouse_id = p_to_warehouse_id then
    raise exception 'Choose a different destination warehouse.'
      using errcode = '22023';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero.'
      using errcode = '22023';
  end if;

  perform public.apply_warehouse_stock_movement(
    p_company_id,
    p_workspace_id,
    p_from_warehouse_id,
    p_sku_id,
    'transfer_out',
    -p_quantity,
    'Transfer',
    p_notes,
    v_group,
    p_created_by
  );

  perform public.apply_warehouse_stock_movement(
    p_company_id,
    p_workspace_id,
    p_to_warehouse_id,
    p_sku_id,
    'transfer_in',
    p_quantity,
    'Transfer',
    p_notes,
    v_group,
    p_created_by
  );
end;
$$;

grant execute on function public.apply_warehouse_stock_movement(
  uuid, uuid, uuid, uuid, text, numeric, text, text, uuid, uuid
) to authenticated;

grant execute on function public.transfer_warehouse_stock(
  uuid, uuid, uuid, uuid, uuid, numeric, text, uuid
) to authenticated;

notify pgrst, 'reload schema';
