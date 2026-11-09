import Link from "next/link"
import { ArrowLeft, Package, Pencil } from "lucide-react"

import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/format"
import type { SkuWithCategory } from "@/types/database"

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null
  return (
    <div className="space-y-0.5">
      <p className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm">{value}</p>
    </div>
  )
}

export function SkuDetail({ sku }: { sku: SkuWithCategory }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" render={<Link href="/inventory/skus" />}>
          <ArrowLeft />
          Back to SKUs
        </Button>
        <Button size="sm" render={<Link href={`/inventory/skus/${sku.id}/edit`} />}>
          <Pencil />
          Edit SKU
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Package className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold leading-tight">{sku.name}</h2>
            <p className="font-mono text-sm text-muted-foreground">{sku.sku_code}</p>
            <div className="mt-2">
              <StatusBadge
                status={sku.is_active ? "ACTIVE" : "INACTIVE"}
                label={sku.is_active ? "Active" : "Inactive"}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Category" value={sku.category?.name ?? null} />
          <Field label="Brand" value={sku.brand} />
          <Field label="Barcode" value={sku.barcode} />
          <Field label="Unit of measure" value={sku.uom} />
          <Field label="Selling price" value={formatCurrency(sku.unit_price)} />
          <Field label="Tax rate" value={`${sku.tax_rate}%`} />
          <Field
            label="Created"
            value={sku.created_at ? new Date(sku.created_at).toLocaleString() : null}
          />
          <Field
            label="Updated"
            value={sku.updated_at ? new Date(sku.updated_at).toLocaleString() : null}
          />
        </div>
      </div>
    </div>
  )
}
