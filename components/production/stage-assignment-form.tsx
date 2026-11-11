"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Layers, Package, Tags, X } from "lucide-react"

import { assignStageSkus } from "@/actions/production.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import type { ProductionStageWithRelations } from "@/lib/data/operations"
import type { SkuWithCategory } from "@/types/database"

export function StageAssignmentForm({
  stage,
  skus,
}: {
  stage: ProductionStageWithRelations
  skus: SkuWithCategory[]
}) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = React.useState<string[]>(
    stage.skus.map((sku) => sku.id)
  )
  const [saving, setSaving] = React.useState(false)

  function toggleSku(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id]
    )
  }

  async function save() {
    setSaving(true)
    const result = await assignStageSkus({
      stageId: stage.id,
      skuIds: selectedIds,
    })
    setSaving(false)
    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not assign SKUs",
        description: result.error,
      })
      return
    }
    toast.add({
      type: "success",
      title: "Stage SKUs updated",
      description: `${result.data.assigned} added, ${result.data.removed} removed.`,
    })
    router.push("/production/stages")
    router.refresh()
  }

  const columns: DataTableColumn<SkuWithCategory>[] = [
    {
      id: "select",
      header: (
        <input
          type="checkbox"
          className="size-3.5 accent-primary"
          aria-label="Select all SKUs"
          checked={
            skus.length > 0 && skus.every((sku) => selectedIds.includes(sku.id))
          }
          onChange={(event) => {
            const ids = skus.map((sku) => sku.id)
            setSelectedIds((current) =>
              event.target.checked
                ? Array.from(new Set([...current, ...ids]))
                : current.filter((id) => !ids.includes(id))
            )
          }}
        />
      ),
      width: "2.5rem",
      cell: (row) => (
        <input
          type="checkbox"
          className="size-3.5 accent-primary"
          aria-label={`Select ${row.name}`}
          checked={selectedIds.includes(row.id)}
          onClick={(event) => event.stopPropagation()}
          onChange={() => toggleSku(row.id)}
        />
      ),
    },
    {
      id: "sku",
      header: "SKU",
      sortValue: (row) => row.name,
      cell: (row) => (
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium">
            <Package className="size-3 text-muted-foreground" />
            {row.name}
          </p>
          <p className="font-mono text-[0.625rem] text-muted-foreground">
            {row.sku_code}
            {row.brand ? ` · ${row.brand}` : ""}
          </p>
        </div>
      ),
    },
    {
      id: "category",
      header: "Category",
      hideBelow: "md",
      sortValue: (row) => row.category?.name ?? "",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.category?.name ?? "—"}
        </span>
      ),
    },
    {
      id: "uom",
      header: "UOM",
      hideBelow: "sm",
      cell: (row) => <span className="text-xs">{row.uom}</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <span className="text-[0.625rem] text-muted-foreground">
          {row.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push("/production/stages")}
      >
        <ArrowLeft />
        Back to stages
      </Button>

      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Layers className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">
              {stage.sequence}. {stage.name}
            </p>
            <p className="text-[0.625rem] text-muted-foreground">
              {stage.pipeline?.name ?? "Pipeline"} ·{" "}
              {stage.pipeline?.code ?? "—"}
            </p>
          </div>
        </div>

        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-medium">Assign SKUs to this stage</p>
            <p className="text-[0.625rem] text-muted-foreground">
              Production usage can only be recorded for SKUs selected here.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[0.625rem] text-muted-foreground">
              {selectedIds.length} selected
            </span>
            {selectedIds.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds([])}
              >
                <X />
                Clear
              </Button>
            ) : null}
          </div>
        </div>

        <DataTable
          data={skus}
          columns={columns}
          getRowId={(row) => row.id}
          searchable={(row) =>
            [row.name, row.sku_code, row.brand, row.category?.name]
              .filter(Boolean)
              .join(" ")
          }
          searchPlaceholder="Search the SKU catalog…"
          initialSort={{ id: "sku", desc: false }}
          pageSize={10}
          emptyTitle="No SKUs in the catalog"
          emptyDescription="Add SKUs to the inventory catalog before assigning them."
          emptyIcon={Tags}
          onRowClick={(row) => toggleSku(row.id)}
        />

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={() => router.push("/production/stages")}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            <Tags />
            {saving ? "Saving…" : "Save assignments"}
          </Button>
        </div>
      </div>
    </div>
  )
}
