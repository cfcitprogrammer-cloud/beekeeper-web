"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeftRight, Boxes, Plus, Warehouse } from "lucide-react"

import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/native-select"
import { formatDateTime, formatNumber } from "@/lib/format"
import type { ProductionSkuSummary } from "@/lib/data/operations"
import type {
  InventoryStockRow,
  InventoryWarehouse,
} from "@/types/database"

import { StockMovementDialog } from "./stock-movement-dialog"

export function InventoryStockManager({
  stock,
  warehouses,
  skus,
}: {
  stock: InventoryStockRow[]
  warehouses: InventoryWarehouse[]
  skus: ProductionSkuSummary[]
}) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [warehouseFilter, setWarehouseFilter] = React.useState("all")

  const filtered = React.useMemo(
    () =>
      warehouseFilter === "all"
        ? stock
        : stock.filter((row) => row.warehouse_id === warehouseFilter),
    [stock, warehouseFilter]
  )

  const totalUnits = filtered.reduce((sum, row) => sum + row.quantity, 0)
  const distinctSkus = new Set(filtered.map((row) => row.sku_id)).size
  const warehousesWithStock = new Set(
    filtered.filter((row) => row.quantity > 0).map((row) => row.warehouse_id)
  ).size

  const columns: DataTableColumn<InventoryStockRow>[] = [
    {
      id: "item",
      header: "Item",
      sortValue: (row) => row.sku?.name ?? "",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">
            {row.sku?.name ?? "Unknown SKU"}
          </p>
          <p className="font-mono text-[0.625rem] text-muted-foreground">
            {row.sku?.sku_code ?? row.sku_id}
            {row.sku?.brand ? ` · ${row.sku.brand}` : ""}
          </p>
        </div>
      ),
    },
    {
      id: "warehouse",
      header: "Warehouse",
      hideBelow: "md",
      sortValue: (row) => row.warehouse?.name ?? "",
      cell: (row) =>
        row.warehouse ? (
          <div className="min-w-0">
            <p className="truncate text-xs">{row.warehouse.name}</p>
            <p className="font-mono text-[0.625rem] text-muted-foreground">
              {row.warehouse.code}
            </p>
          </div>
        ) : (
          <span className="text-[0.625rem] text-muted-foreground">—</span>
        ),
    },
    {
      id: "quantity",
      header: "On hand",
      align: "right",
      sortValue: (row) => row.quantity,
      cell: (row) => (
        <div className="text-right">
          <p className="font-mono text-xs font-medium tabular-nums">
            {formatNumber(row.quantity)}
          </p>
          <p className="text-[0.625rem] text-muted-foreground">
            {row.sku?.uom ?? ""}
          </p>
        </div>
      ),
    },
    {
      id: "updated",
      header: "Last updated",
      hideBelow: "lg",
      sortValue: (row) => row.updated_at,
      cell: (row) => (
        <span className="text-[0.625rem] text-muted-foreground">
          {formatDateTime(row.updated_at)}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">
            Total units on hand
          </p>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums">
            {formatNumber(totalUnits)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">
            Items in stock
          </p>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums">
            {formatNumber(distinctSkus)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">
            Warehouses holding stock
          </p>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums">
            {formatNumber(warehousesWithStock)}
          </p>
        </div>
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(row) => row.id}
        searchable={(row) =>
          [
            row.sku?.sku_code,
            row.sku?.name,
            row.sku?.brand,
            row.warehouse?.name,
            row.warehouse?.code,
          ]
            .filter(Boolean)
            .join(" ")
        }
        searchPlaceholder="Search item, brand or warehouse…"
        initialSort={{ id: "item", desc: false }}
        pageSize={10}
        emptyTitle="No stock on hand"
        emptyDescription="Record a receipt against a warehouse to start tracking stock."
        emptyIcon={Boxes}
        onRowClick={(row) =>
          router.push(`/inventory/warehouses/${row.warehouse_id}`)
        }
        filters={
          <NativeSelect
            value={warehouseFilter}
            onChange={(event) => setWarehouseFilter(event.target.value)}
            className="w-full sm:w-52"
            aria-label="Filter by warehouse"
          >
            <option value="all">All warehouses</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name} ({warehouse.code})
              </option>
            ))}
          </NativeSelect>
        }
        toolbar={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus />
            Record movement
          </Button>
        }
      />

      <p className="flex items-center gap-1.5 text-[0.625rem] text-muted-foreground">
        <ArrowLeftRight className="size-3" />
        Select a row to open the warehouse and see its full movement history.
        <Warehouse className="ml-2 size-3" />
        The production warehouse label on SKUs is separate from stock and does
        not affect these balances.
      </p>

      {dialogOpen ? (
        <StockMovementDialog
          open
          onOpenChange={setDialogOpen}
          warehouses={warehouses}
          skus={skus}
        />
      ) : null}
    </div>
  )
}
