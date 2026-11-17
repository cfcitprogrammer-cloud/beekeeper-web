"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Ban, FlaskConical, Loader2, Pencil, Plus, Save } from "lucide-react"

import { updateOwnProductionUsage } from "@/actions/production.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { Modal } from "@/components/shared/modal"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/toast"
import { formatDate, formatNumber } from "@/lib/format"
import type { ProductionUsageWithRelations } from "@/lib/data/operations"
import {
  groupProductionUsage,
  type ProductionUsageBatch,
} from "@/lib/production/usage"
import {
  canSubmitterEditUsage,
  resolveUsageStatus,
  usageStatusLabel,
  type UsageSettings,
} from "@/lib/production/usage-status"

type EditDraft = {
  usageDate: string
  notes: string
  quantities: Record<string, string>
}

export function UsageManager({
  usage,
  canRecord,
  recordHref = "/production/usage/new",
  settings,
  currentUserId,
  now,
}: {
  usage: ProductionUsageWithRelations[]
  canRecord: boolean
  recordHref?: string
  settings: UsageSettings
  currentUserId: string | null
  now: string
}) {
  const router = useRouter()
  const nowDate = React.useMemo(() => new Date(now), [now])
  const batches = React.useMemo(() => groupProductionUsage(usage), [usage])

  const [editing, setEditing] = React.useState<ProductionUsageBatch | null>(null)
  const [draft, setDraft] = React.useState<EditDraft>({
    usageDate: "",
    notes: "",
    quantities: {},
  })
  const [saving, setSaving] = React.useState(false)

  function batchStatus(batch: ProductionUsageBatch) {
    const statuses = batch.items.map((item) =>
      resolveUsageStatus(item, settings, nowDate)
    )
    if (statuses.every((status) => status === "cancelled")) return "cancelled"
    if (statuses.every((status) => status !== "submitted")) return "completed"
    return "submitted"
  }

  function canEdit(batch: ProductionUsageBatch) {
    if (!settings.allowSubmitterEdit || !currentUserId) return false
    return batch.items.every((item) =>
      canSubmitterEditUsage(item, settings, currentUserId, nowDate)
    )
  }

  function openEditor(batch: ProductionUsageBatch) {
    setDraft({
      usageDate: batch.usageDate.slice(0, 10),
      notes: batch.notes ?? "",
      quantities: Object.fromEntries(
        batch.items.map((item) => [item.id, String(Number(item.quantity))])
      ),
    })
    setEditing(batch)
  }

  async function saveOwnUsage() {
    if (!editing) return

    const items = editing.items.map((item) => ({
      id: item.id,
      quantity: Number(draft.quantities[item.id]),
    }))
    if (
      items.some(
        (item) => !Number.isFinite(item.quantity) || item.quantity < 0
      )
    ) {
      toast.add({
        type: "error",
        title: "Check the quantities",
        description: "Every quantity must be a number greater than or equal to 0.",
      })
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.usageDate)) {
      toast.add({ type: "error", title: "Select a valid usage date" })
      return
    }

    setSaving(true)
    const result = await updateOwnProductionUsage({
      ids: editing.items.map((item) => item.id),
      usageDate: draft.usageDate,
      notes: draft.notes.trim() || null,
      items,
    })
    setSaving(false)

    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not update your usage",
        description: result.error,
      })
      return
    }

    setEditing(null)
    toast.add({
      type: "success",
      title: "Usage updated",
      description: "Your change was recorded in the usage changelog.",
    })
    router.refresh()
  }

  async function cancelOwnUsage() {
    if (!editing) return
    if (
      !window.confirm(
        "Mark this usage as a cancellation? BOM components in the same usage entry are cancelled too. This is recorded in the usage changelog."
      )
    ) {
      return
    }

    setSaving(true)
    const result = await updateOwnProductionUsage({
      ids: editing.items.map((item) => item.id),
      cancel: true,
    })
    setSaving(false)

    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not cancel your usage",
        description: result.error,
      })
      return
    }

    setEditing(null)
    toast.add({
      type: "success",
      title: "Usage cancelled",
      description: "The cancellation was recorded in the usage changelog.",
    })
    router.refresh()
  }

  const columns: DataTableColumn<ProductionUsageBatch>[] = [
    {
      id: "date",
      header: "Date",
      sortValue: (row) => row.usageDate,
      cell: (row) => (
        <div className="space-y-1">
          <span className="text-xs tabular-nums">
            {formatDate(row.usageDate)}
          </span>
          <StatusBadge
            status={batchStatus(row)}
            label={usageStatusLabel(batchStatus(row))}
            tone={
              batchStatus(row) === "cancelled"
                ? "danger"
                : batchStatus(row) === "completed"
                  ? "info"
                  : "warning"
            }
          />
        </div>
      ),
    },
    {
      id: "pipeline",
      header: "Pipeline / stage",
      sortValue: (row) =>
        `${row.pipeline?.name ?? ""} ${row.stage?.sequence ?? 0}`,
      cell: (row) => (
        <div>
          <p className="text-xs font-medium">
            {row.pipeline?.name ?? "—"}
          </p>
          <p className="text-[0.625rem] text-muted-foreground">
            {row.stage
              ? `${row.stage.sequence}. ${row.stage.name}`
              : "Stage removed"}
          </p>
        </div>
      ),
    },
    {
      id: "skus",
      header: "SKUs",
      sortValue: (row) =>
        row.items
          .map((item) => item.sku?.sku_code ?? "")
          .join(" "),
      cell: (row) => (
        <div className="space-y-1">
          {row.items.map((item) => {
            const status = resolveUsageStatus(item, settings, nowDate)
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 text-xs"
              >
                <span className="min-w-0 truncate">
                  {item.sku ? item.sku.name : "Legacy run usage"}
                  {item.sku ? (
                    <span className="ml-1 font-mono text-[0.625rem] text-muted-foreground">
                      {item.sku.sku_code}
                    </span>
                  ) : null}
                  {status === "cancelled" ? (
                    <span className="ml-1 text-[0.625rem] text-destructive">
                      (cancelled)
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 tabular-nums">
                  {formatNumber(item.quantity)}{" "}
                  <span className="text-muted-foreground">{item.uom ?? ""}</span>
                </span>
              </div>
            )
          })}
        </div>
      ),
    },
    {
      id: "items",
      header: "Lines",
      align: "right",
      hideBelow: "sm",
      sortValue: (row) => row.items.length,
      cell: (row) => (
        <span className="text-xs tabular-nums">{row.items.length}</span>
      ),
    },
    {
      id: "submitter",
      header: "Submitted by",
      hideBelow: "md",
      sortValue: (row) =>
        row.submitter
          ? `${row.submitter.first_name} ${row.submitter.last_name}`
          : "",
      cell: (row) => (
        <div>
          <p className="text-xs">
            {row.submitter
              ? `${row.submitter.first_name} ${row.submitter.last_name}`
              : row.submittedBy
                ? `User ${row.submittedBy.slice(0, 8)}`
                : "Unknown user"}
          </p>
          <p className="text-[0.625rem] text-muted-foreground">
            {row.submitter?.employee_no ?? "No employee record"}
          </p>
        </div>
      ),
    },
    {
      id: "notes",
      header: "Notes",
      hideBelow: "lg",
      cell: (row) => (
        <span className="line-clamp-1 max-w-56 text-[0.625rem] text-muted-foreground">
          {row.notes || "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (row) =>
        canEdit(row) ? (
          <Button
            variant="outline"
            size="xs"
            onClick={() => openEditor(row)}
            aria-label="Edit your usage"
          >
            <Pencil />
            Edit
          </Button>
        ) : null,
    },
  ]

  return (
    <>
      <DataTable
        data={batches}
        columns={columns}
        getRowId={(row) => row.id}
        searchable={(row) =>
          [
            row.pipeline?.name,
            row.pipeline?.code,
            row.stage?.name,
            row.submitter?.first_name,
            row.submitter?.last_name,
            row.submitter?.employee_no,
            row.notes,
            ...row.items.flatMap((item) => [
              item.sku?.name,
              item.sku?.sku_code,
            ]),
          ]
            .filter(Boolean)
            .join(" ")
        }
        searchPlaceholder="Search usage by pipeline, stage, SKU or user…"
        pageSize={10}
        emptyTitle="No production usage yet"
        emptyDescription="Record usage against a stage SKU to start tracking production."
        emptyIcon={FlaskConical}
        initialSort={{ id: "date", desc: true }}
        toolbar={
          canRecord ? (
            <Button size="sm" render={<Link href={recordHref} />}>
              <Plus />
              New usage
            </Button>
          ) : null
        }
      />

      <Modal
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
        title="Edit your usage"
        description={
          editing
            ? `${editing.pipeline?.name ?? "Pipeline"} · ${
                editing.stage?.name ?? "Stage"
              } · ${editing.items.length} SKU line(s). You can edit until the cutoff, then an administrator must correct it.`
            : undefined
        }
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={cancelOwnUsage}
              disabled={saving}
            >
              {saving ? <Loader2 className="animate-spin" /> : <Ban />}
              Mark cancellation
            </Button>
            <Button size="sm" onClick={saveOwnUsage} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              Save changes
            </Button>
          </>
        }
      >
        {editing ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="own-usage-date">Usage date</Label>
                <Input
                  id="own-usage-date"
                  type="date"
                  value={draft.usageDate}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      usageDate: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="own-usage-notes">Notes</Label>
                <Input
                  id="own-usage-notes"
                  value={draft.notes}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="space-y-2">
              {editing.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 px-2 py-1.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">
                      {item.sku?.name ?? "Legacy run usage"}
                    </p>
                    <p className="font-mono text-[0.625rem] text-muted-foreground">
                      {item.sku?.sku_code ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={draft.quantities[item.id] ?? ""}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          quantities: {
                            ...current.quantities,
                            [item.id]: event.target.value,
                          },
                        }))
                      }
                      className="h-7 w-28 text-right tabular-nums"
                      aria-label={`Quantity for ${item.sku?.sku_code ?? "usage line"}`}
                    />
                    <span className="w-10 text-[0.625rem] text-muted-foreground">
                      {item.uom ?? ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[0.625rem] text-muted-foreground">
              Editing is limited to your own submitted usage inside the cutoff
              window. Cancelling replaces deletion and is recorded in the usage
              changelog.
            </p>
          </div>
        ) : null}
      </Modal>
    </>
  )
}
