"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Download, Eye, Package, PackagePlus, Pencil, Trash2 } from "lucide-react"

import { deleteSku } from "@/actions/sku.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import { formatCurrency } from "@/lib/format"
import type { SkuCategory, SkuWithCategory } from "@/types/database"

export function SkuCatalog({
  skus,
  categories,
}: {
  skus: SkuWithCategory[]
  categories: SkuCategory[]
}) {
  const router = useRouter()
  const [categoryId, setCategoryId] = React.useState("all")
  const [status, setStatus] = React.useState("all")

  const filtered = React.useMemo(
    () =>
      skus.filter((sku) => {
        if (categoryId !== "all" && sku.category_id !== categoryId) return false
        if (status === "active" && !sku.is_active) return false
        if (status === "inactive" && sku.is_active) return false
        return true
      }),
    [skus, categoryId, status]
  )

  async function deleteSkuHandler(id: string, name: string) {
    if (!window.confirm(`Delete SKU "${name}"? This cannot be undone.`)) return
    const result = await deleteSku(id)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not delete SKU", description: result.error })
      return
    }
    toast.add({ type: "success", title: "SKU deleted", description: `${name} was removed.` })
    router.refresh()
  }

  const columns: DataTableColumn<SkuWithCategory>[] = [
    {
      id: "sku",
      header: "SKU",
      sortValue: (row) => row.name,
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Package className="size-3.5" />
          </span>
          <div>
            <p className="text-xs font-medium">{row.name}</p>
            <p className="font-mono text-[0.625rem] text-muted-foreground">
              {row.sku_code}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "category",
      header: "Category",
      sortValue: (row) => row.category?.name ?? "",
      cell: (row) => <span className="text-xs">{row.category?.name ?? "—"}</span>,
    },
    {
      id: "brand",
      header: "Brand",
      hideBelow: "xl",
      sortValue: (row) => row.brand ?? "",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">{row.brand ?? "—"}</span>
      ),
    },
    {
      id: "uom",
      header: "UOM",
      hideBelow: "lg",
      sortValue: (row) => row.uom,
      cell: (row) => (
        <span className="text-[0.625rem] text-muted-foreground">{row.uom}</span>
      ),
    },
    {
      id: "price",
      header: "Selling price",
      align: "right",
      sortValue: (row) => row.unit_price,
      cell: (row) => (
        <span className="text-xs font-medium tabular-nums">
          {formatCurrency(row.unit_price)}
        </span>
      ),
    },
    {
      id: "tax",
      header: "Tax",
      align: "right",
      hideBelow: "xl",
      sortValue: (row) => row.tax_rate,
      cell: (row) => (
        <span className="text-[0.625rem] text-muted-foreground">{row.tax_rate}%</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortValue: (row) => (row.is_active ? 1 : 0),
      cell: (row) => (
        <StatusBadge
          status={row.is_active ? "ACTIVE" : "INACTIVE"}
          label={row.is_active ? "Active" : "Inactive"}
        />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="View SKU"
            render={<Link href={`/inventory/skus/${row.id}`} />}
          >
            <Eye className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Edit SKU"
            render={<Link href={`/inventory/skus/${row.id}/edit`} />}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation()
              void deleteSkuHandler(row.id, row.name)
            }}
            aria-label="Delete SKU"
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <DataTable
      data={filtered}
      columns={columns}
      getRowId={(row) => row.id}
      searchable={(row) =>
        [row.name, row.sku_code, row.category?.name, row.brand, row.uom]
          .filter(Boolean)
          .join(" ")
      }
      searchPlaceholder="Search SKU, code or category…"
      initialSort={{ id: "sku", desc: false }}
      pageSize={10}
      emptyTitle="No SKUs match your filters"
      emptyDescription="Clear the filters or add a new SKU to the catalog."
      emptyIcon={Package}
      onRowClick={(row) => router.push(`/inventory/skus/${row.id}`)}
      filters={
        <>
          <NativeSelect
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </NativeSelect>
        </>
      }
      toolbar={
        <>
          <Button variant="outline" size="sm">
            <Download />
            Export
          </Button>
          <Button size="sm" render={<Link href="/inventory/skus/new" />}>
            <PackagePlus />
            Add SKU
          </Button>
        </>
      }
    />
  )
}
