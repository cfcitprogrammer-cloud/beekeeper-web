"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowLeftRight,
  Boxes,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  UserRound,
} from "lucide-react"

import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { formatDateTime, formatNumber } from "@/lib/format"
import type { ProductionSkuSummary } from "@/lib/data/operations"
import type {
  InventoryWarehouse,
  WarehouseMovementType,
  WarehouseStockMovementWithSku,
  WarehouseStockWithSku,
} from "@/types/database"

import { StockMovementDialog } from "./stock-movement-dialog"

const movementMeta: Record<
  WarehouseMovementType,
  { label: string; tone: StatusTone }
> = {
  receipt: { label: "Receipt", tone: "success" },
  issue: { label: "Issue", tone: "info" },
  adjustment: { label: "Adjustment", tone: "violet" },
  transfer_in: { label: "Transfer in", tone: "success" },
  transfer_out: { label: "Transfer out", tone: "warning" },
}

function InfoField({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 space-y-0.5">
        <p className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-sm break-words">{value || "—"}</p>
      </div>
    </div>
  )
}

export function WarehouseDetail({
  warehouse,
  stock,
  movements,
  warehouses,
  skus,
}: {
  warehouse: InventoryWarehouse
  stock: WarehouseStockWithSku[]
  movements: WarehouseStockMovementWithSku[]
  warehouses: InventoryWarehouse[]
  skus: ProductionSkuSummary[]
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false)

  const totalUnits = stock.reduce((sum, row) => sum + row.quantity, 0)
  const distinctSkus = stock.filter((row) => row.quantity > 0).length
  const lastMovement = movements[0]?.created_at ?? null

  const stockColumns: DataTableColumn<WarehouseStockWithSku>[] = [
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
      id: "quantity",
      header: "On hand",
      align: "right",
      sortValue: (row) => row.quantity,
      cell: (row) => (
        <div className="text-right">
          <p
            className={
              row.quantity > 0
                ? "font-mono text-xs font-medium tabular-nums"
                : "font-mono text-xs tabular-nums text-muted-foreground"
            }
          >
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
      hideBelow: "md",
      sortValue: (row) => row.updated_at,
      cell: (row) => (
        <span className="text-[0.625rem] text-muted-foreground">
          {formatDateTime(row.updated_at)}
        </span>
      ),
    },
  ]

  const movementColumns: DataTableColumn<WarehouseStockMovementWithSku>[] = [
    {
      id: "date",
      header: "Date",
      sortValue: (row) => row.created_at,
      cell: (row) => (
        <span className="text-[0.625rem] text-muted-foreground">
          {formatDateTime(row.created_at)}
        </span>
      ),
    },
    {
      id: "type",
      header: "Type",
      sortValue: (row) => row.movement_type,
      cell: (row) => {
        const meta = movementMeta[row.movement_type]
        return (
          <StatusBadge
            status={row.movement_type.toUpperCase()}
            label={meta.label}
            tone={meta.tone}
            showIcon={false}
          />
        )
      },
    },
    {
      id: "item",
      header: "Item",
      hideBelow: "sm",
      sortValue: (row) => row.sku?.name ?? "",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-xs">{row.sku?.name ?? "Unknown SKU"}</p>
          <p className="font-mono text-[0.625rem] text-muted-foreground">
            {row.sku?.sku_code ?? row.sku_id}
          </p>
        </div>
      ),
    },
    {
      id: "quantity",
      header: "Qty",
      align: "right",
      sortValue: (row) => row.quantity,
      cell: (row) => (
        <span
          className={
            row.quantity >= 0
              ? "font-mono text-xs font-medium tabular-nums text-emerald-600 dark:text-emerald-400"
              : "font-mono text-xs font-medium tabular-nums text-rose-600 dark:text-rose-400"
          }
        >
          {row.quantity > 0 ? "+" : ""}
          {formatNumber(row.quantity)}
        </span>
      ),
    },
    {
      id: "balance",
      header: "Balance",
      align: "right",
      hideBelow: "md",
      sortValue: (row) => row.balance_after,
      cell: (row) => (
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {formatNumber(row.balance_after)}
        </span>
      ),
    },
    {
      id: "reference",
      header: "Reference / notes",
      hideBelow: "lg",
      cell: (row) => (
        <div className="max-w-56 text-[0.625rem] text-muted-foreground">
          {row.reference ? <p className="text-foreground">{row.reference}</p> : null}
          {row.notes ? <p className="line-clamp-2">{row.notes}</p> : null}
          {!row.reference && !row.notes ? "—" : null}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" render={<Link href="/inventory/warehouses" />}>
          <ArrowLeft />
          Warehouses
        </Button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/inventory/warehouses/${warehouse.id}/edit`} />}
          >
            <Pencil />
            Edit warehouse
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus />
            Record movement
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[0.625rem] uppercase tracking-wide text-muted-foreground">
              {warehouse.code}
            </p>
            <h2 className="text-lg font-semibold">{warehouse.name}</h2>
          </div>
          <StatusBadge
            status={warehouse.is_active ? "ACTIVE" : "INACTIVE"}
            label={warehouse.is_active ? "Active" : "Inactive"}
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoField icon={MapPin} label="Address" value={warehouse.address} />
          <InfoField
            icon={UserRound}
            label="Contact person"
            value={warehouse.contact_person}
          />
          <InfoField icon={Phone} label="Phone" value={warehouse.phone} />
          <InfoField icon={Mail} label="Email" value={warehouse.email} />
        </div>

        {warehouse.notes ? (
          <p className="mt-4 border-t pt-3 text-[0.625rem] text-muted-foreground">
            {warehouse.notes}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">
            On-hand units
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
            Last movement
          </p>
          <p className="mt-1 text-sm font-medium">
            {lastMovement ? formatDateTime(lastMovement) : "No movements yet"}
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Boxes className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Stock on hand</h3>
        </div>
        <DataTable
          data={stock}
          columns={stockColumns}
          getRowId={(row) => row.id}
          searchable={(row) =>
            [row.sku?.sku_code, row.sku?.name, row.sku?.brand]
              .filter(Boolean)
              .join(" ")
          }
          searchPlaceholder="Search stock…"
          initialSort={{ id: "quantity", desc: true }}
          pageSize={10}
          emptyTitle="No stock in this warehouse"
          emptyDescription="Record a receipt to start tracking stock here."
          emptyIcon={Boxes}
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Movement history</h3>
        </div>
        <DataTable
          data={movements}
          columns={movementColumns}
          getRowId={(row) => row.id}
          searchable={(row) =>
            [
              row.sku?.sku_code,
              row.sku?.name,
              row.reference,
              row.notes,
              row.movement_type,
            ]
              .filter(Boolean)
              .join(" ")
          }
          searchPlaceholder="Search movements…"
          initialSort={{ id: "date", desc: true }}
          pageSize={10}
          emptyTitle="No movements yet"
          emptyDescription="Receipts, issues, adjustments and transfers will appear here."
          emptyIcon={ArrowLeftRight}
        />
      </section>

      {dialogOpen ? (
        <StockMovementDialog
          open
          onOpenChange={setDialogOpen}
          warehouses={warehouses}
          skus={skus}
          defaultWarehouseId={warehouse.id}
        />
      ) : null}
    </div>
  )
}
