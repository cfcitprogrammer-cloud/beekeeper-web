"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Download, Package, PackagePlus, Plus } from "lucide-react"

import { createSku } from "@/actions/sku.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { Modal } from "@/components/shared/modal"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import { formatCurrency, humanize } from "@/lib/format"
import type { SkuCategory, SkuWithCategory } from "@/types/database"

const emptyDraft = {
  name: "",
  sku_code: "",
  category_id: "",
  brand: "",
  barcode: "",
  uom: "PACK",
  unit_price: "0",
  tax_rate: "12",
  is_active: "true",
}

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
  const [open, setOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [draft, setDraft] = React.useState({
    ...emptyDraft,
    category_id: categories[0]?.id ?? "",
  })

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

  async function createSkuHandler() {
    if (!draft.name.trim() || !draft.sku_code.trim()) {
      toast.add({
        type: "error",
        title: "Missing details",
        description: "Name and SKU code are required.",
      })
      return
    }

    setSaving(true)
    const result = await createSku({
      name: draft.name,
      skuCode: draft.sku_code,
      categoryId: draft.category_id || undefined,
      brand: draft.brand,
      barcode: draft.barcode,
      uom: draft.uom,
      unitPrice: Number(draft.unit_price) || 0,
      taxRate: Number(draft.tax_rate) || 0,
      isActive: draft.is_active === "true",
    })
    setSaving(false)

    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not create SKU",
        description: result.error,
      })
      return
    }

    toast.add({
      type: "success",
      title: "SKU created",
      description: `${draft.name.trim()} is now available in the catalog.`,
    })
    setDraft({ ...emptyDraft, category_id: categories[0]?.id ?? "" })
    setOpen(false)
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
  ]

  return (
    <>
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
            <Button size="sm" onClick={() => setOpen(true)}>
              <PackagePlus />
              Add SKU
            </Button>
          </>
        }
      />

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Add a SKU"
        description="Create a sellable item for bookings and inventory tracking."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createSkuHandler} disabled={saving}>
              <Plus />
              {saving ? "Creating…" : "Create SKU"}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sku-name">Product name</Label>
            <Input
              id="sku-name"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="Brewed Iced Tea 500ml"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sku-code">SKU code</Label>
            <Input
              id="sku-code"
              value={draft.sku_code}
              onChange={(event) => setDraft({ ...draft, sku_code: event.target.value })}
              placeholder="BEV-1006"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sku-category">Category</Label>
            <NativeSelect
              id="sku-category"
              value={draft.category_id}
              onChange={(event) => setDraft({ ...draft, category_id: event.target.value })}
              className="w-full"
            >
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sku-brand">Brand</Label>
            <Input
              id="sku-brand"
              value={draft.brand}
              onChange={(event) => setDraft({ ...draft, brand: event.target.value })}
              placeholder="House brand"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sku-barcode">Barcode</Label>
            <Input
              id="sku-barcode"
              value={draft.barcode}
              onChange={(event) => setDraft({ ...draft, barcode: event.target.value })}
              placeholder="4800000000000"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sku-uom">Unit of measure</Label>
            <NativeSelect
              id="sku-uom"
              value={draft.uom}
              onChange={(event) => setDraft({ ...draft, uom: event.target.value })}
              className="w-full"
            >
              {["PACK", "BOTTLE", "CAN", "BOX", "CARTON", "BAR", "TUBE", "JAR", "TUB"].map(
                (value) => (
                  <option key={value} value={value}>
                    {humanize(value)}
                  </option>
                )
              )}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sku-price">Selling price (PHP)</Label>
            <Input
              id="sku-price"
              type="number"
              min={0}
              step="0.01"
              value={draft.unit_price}
              onChange={(event) => setDraft({ ...draft, unit_price: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sku-tax">Tax rate (%)</Label>
            <Input
              id="sku-tax"
              type="number"
              min={0}
              max={100}
              value={draft.tax_rate}
              onChange={(event) => setDraft({ ...draft, tax_rate: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sku-status">Status</Label>
            <NativeSelect
              id="sku-status"
              value={draft.is_active}
              onChange={(event) => setDraft({ ...draft, is_active: event.target.value })}
              className="w-full"
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </NativeSelect>
          </div>
        </div>
      </Modal>
    </>
  )
}
