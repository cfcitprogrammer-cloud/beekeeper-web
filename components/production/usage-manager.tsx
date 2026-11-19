"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Ban,
  Eye,
  FlaskConical,
  Loader2,
  Pencil,
  Plus,
  Save,
  Undo2,
} from "lucide-react"

import {
  setProductionUsageStatus,
  updateOwnProductionUsage,
  updateProductionUsageLines,
} from "@/actions/production.action"
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
  isOutsideUsageWindow,
  resolveUsageStatus,
  usageStatusLabel,
  usageWindow,
  type UsageSettings,
} from "@/lib/production/usage-status"

type EditDraft = {
  usageDate: string
  notes: string
  quantities: Record<string, string>
}

function statusTone(status: string) {
  if (status === "cancelled") return "danger" as const
  if (status === "completed") return "info" as const
  return "warning" as const
}

export function UsageManager({
  usage,
  canRecord,
  canManage = false,
  recordHref = "/production/usage/new",
  settings,
  currentUserId,
  now,
}: {
  usage: ProductionUsageWithRelations[]
  canRecord: boolean
  canManage?: boolean
  recordHref?: string
  settings: UsageSettings
  currentUserId: string | null
  now: string
}) {
  const router = useRouter()
  const nowDate = React.useMemo(() => new Date(now), [now])
  const window = usageWindow(settings, nowDate)
  const batches = React.useMemo(() => groupProductionUsage(usage), [usage])

  const [viewing, setViewing] = React.useState<ProductionUsageBatch | null>(null)
  const [editing, setEditing] = React.useState<ProductionUsageBatch | null>(null)
  const [draft, setDraft] = React.useState<EditDraft>({
    usageDate: "",
    notes: "",
    quantities: {},
  })
  const [saving, setSaving] = React.useState<string | null>(null)

  const statusOf = React.useCallback(
    (item: ProductionUsageWithRelations) =>
      resolveUsageStatus(item, settings, nowDate),
    [settings, nowDate]
  )

  function batchStatus(batch: ProductionUsageBatch) {
    const statuses = batch.items.map(statusOf)
    if (statuses.every((status) => status === "cancelled")) return "cancelled"
    if (statuses.every((status) => status !== "submitted")) return "completed"
    return "submitted"
  }

  function batchMeta(batch: ProductionUsageBatch) {
    const statuses = batch.items.map(statusOf)
    const cancelled = statuses.filter((status) => status === "cancelled").length
    const active = statuses.length - cancelled
    const owned =
      Boolean(currentUserId) &&
      batch.items.every(
        (item) => (item.submitted_by ?? item.recorded_by) === currentUserId
      )
    const submitterEditable =
      Boolean(currentUserId) &&
      settings.allowSubmitterEdit &&
      owned &&
      batch.items.every((item) =>
        canSubmitterEditUsage(item, settings, currentUserId, nowDate)
      )
    // The date window locks every user, including usage editors. A batch is
    // only editable while all of its lines sit inside the window.
    const withinWindow = batch.items.every(
      (item) => !isOutsideUsageWindow(item.usage_date, settings, nowDate)
    )

    return {
      cancelled,
      active,
      owned,
      submitterEditable,
      withinWindow,
      canEdit:
        withinWindow && active > 0 && (canManage || submitterEditable),
      canCancel:
        withinWindow && active > 0 && (canManage || submitterEditable),
      canRestore: withinWindow && canManage && cancelled > 0,
    }
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

    const editableItems = editing.items.filter(
      (item) => statusOf(item) !== "cancelled"
    )
    if (editableItems.length === 0) {
      toast.add({
        type: "error",
        title: "Nothing to edit",
        description: "Cancelled usage lines must be restored first.",
      })
      return
    }

    const items = editableItems.map((item) => ({
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
    if (isOutsideUsageWindow(draft.usageDate, settings, nowDate)) {
      toast.add({
        type: "error",
        title: "Usage date is locked",
        description: `Only ${window.start} through ${window.end} can be submitted, edited or cancelled.`,
      })
      return
    }

    setSaving("save")
    const result = canManage
      ? await updateProductionUsageLines({
          lines: items.map((item) => ({
            id: item.id,
            quantity: item.quantity,
            usageDate: draft.usageDate,
            notes: draft.notes.trim() || null,
          })),
        })
      : await updateOwnProductionUsage({
          ids: items.map((item) => item.id),
          usageDate: draft.usageDate,
          notes: draft.notes.trim() || null,
          items,
        })
    setSaving(null)

    if (!result.success) {
      toast.add({
        type: "error",
        title: canManage ? "Could not save the usage" : "Could not update your usage",
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

  async function cancelUsage(batch: ProductionUsageBatch) {
    const meta = batchMeta(batch)
    if (meta.active === 0) return

    if (
      !window.confirm(
        "Mark this usage as a cancellation? BOM components in the same usage entry are cancelled too. This is recorded in the usage changelog."
      )
    ) {
      return
    }

    setSaving("cancel")
    const ids = batch.items.map((item) => item.id)
    const result = canManage
      ? await setProductionUsageStatus({
          ids,
          status: "cancelled",
          reason: "Cancelled from the usage list.",
        })
      : await updateOwnProductionUsage({ ids, cancel: true })
    setSaving(null)

    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not cancel the usage",
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

  async function restoreUsage(batch: ProductionUsageBatch) {
    const meta = batchMeta(batch)
    if (meta.cancelled === 0) return

    if (
      !window.confirm(
        "Restore this usage to submitted? BOM components in the same usage entry are restored too."
      )
    ) {
      return
    }

    setSaving("restore")
    const result = await setProductionUsageStatus({
      ids: batch.items.map((item) => item.id),
      status: "submitted",
      reason: "Restored from the usage list.",
    })
    setSaving(null)

    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not restore the usage",
        description: result.error,
      })
      return
    }

    toast.add({
      type: "success",
      title: "Usage restored",
      description: "The usage is submitted again and recorded in the changelog.",
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
            tone={statusTone(batchStatus(row))}
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
            const status = statusOf(item)
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
      cell: (row) => {
        const meta = batchMeta(row)
        const busy = saving !== null
        return (
          <div className="flex items-center justify-end gap-0.5">
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="View usage details"
              title="View"
              onClick={() => setViewing(row)}
            >
              <Eye />
            </Button>
            {meta.canEdit ? (
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Edit usage"
                title="Edit"
                disabled={busy}
                onClick={() => openEditor(row)}
              >
                <Pencil />
              </Button>
            ) : null}
            {meta.canCancel ? (
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Mark usage as cancellation"
                title="Cancellation"
                disabled={busy}
                onClick={() => void cancelUsage(row)}
              >
                {saving === "cancel" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Ban className="text-destructive" />
                )}
              </Button>
            ) : null}
            {meta.canRestore ? (
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Restore cancelled usage"
                title="Restore"
                disabled={busy}
                onClick={() => void restoreUsage(row)}
              >
                {saving === "restore" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Undo2 className="text-emerald-600 dark:text-emerald-400" />
                )}
              </Button>
            ) : null}
          </div>
        )
      },
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
        open={viewing !== null}
        onOpenChange={(open) => {
          if (!open) setViewing(null)
        }}
        title="Usage details"
        description={
          viewing
            ? `${viewing.pipeline?.name ?? "Pipeline"} · ${
                viewing.stage?.name ?? "Stage"
              } · ${formatDate(viewing.usageDate)}`
            : undefined
        }
        footer={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewing(null)}
          >
            Close
          </Button>
        }
      >
        {viewing ? (
          <div className="space-y-3">
            <div className="grid gap-2 rounded-md border bg-muted/20 p-2.5 text-xs sm:grid-cols-2">
              <div>
                <p className="text-[0.625rem] text-muted-foreground">Status</p>
                <StatusBadge
                  status={batchStatus(viewing)}
                  label={usageStatusLabel(batchStatus(viewing))}
                  tone={statusTone(batchStatus(viewing))}
                />
              </div>
              <div>
                <p className="text-[0.625rem] text-muted-foreground">
                  Submitted by
                </p>
                <p>
                  {viewing.submitter
                    ? `${viewing.submitter.first_name} ${viewing.submitter.last_name}`
                    : viewing.submittedBy
                      ? `User ${viewing.submittedBy.slice(0, 8)}`
                      : "Unknown user"}
                </p>
              </div>
              <div>
                <p className="text-[0.625rem] text-muted-foreground">Recorded</p>
                <p>{formatDate(viewing.recordedAt)}</p>
              </div>
              <div>
                <p className="text-[0.625rem] text-muted-foreground">Notes</p>
                <p>{viewing.notes || "—"}</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted/60 text-[0.625rem] text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-medium">SKU</th>
                    <th className="px-2 py-1.5 text-right font-medium">
                      Quantity
                    </th>
                    <th className="px-2 py-1.5 text-left font-medium">Unit</th>
                    <th className="px-2 py-1.5 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {viewing.items.map((item) => {
                    const status = statusOf(item)
                    return (
                      <tr key={item.id} className="border-t">
                        <td className="px-2 py-1.5">
                          <p className="font-medium">
                            {item.sku?.name ?? "Legacy run usage"}
                          </p>
                          <p className="font-mono text-[0.625rem] text-muted-foreground">
                            {item.sku?.sku_code ?? "—"}
                          </p>
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums">
                          {formatNumber(item.quantity)}
                        </td>
                        <td className="px-2 py-1.5 text-muted-foreground">
                          {item.uom ?? "—"}
                        </td>
                        <td className="px-2 py-1.5">
                          <StatusBadge
                            status={status}
                            label={usageStatusLabel(status)}
                            tone={statusTone(status)}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
        title="Edit usage"
        description={
          editing
            ? `${editing.pipeline?.name ?? "Pipeline"} · ${
                editing.stage?.name ?? "Stage"
              } · ${editing.items.length} SKU line(s). Only usage dates inside the allowed date window can be edited.`
            : undefined
        }
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(null)}
              disabled={saving !== null}
            >
              Cancel
            </Button>
            {editing && batchMeta(editing).canCancel ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => void cancelUsage(editing)}
                disabled={saving !== null}
              >
                {saving === "cancel" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Ban />
                )}
                Mark cancellation
              </Button>
            ) : null}
            <Button
              size="sm"
              onClick={saveOwnUsage}
              disabled={saving !== null}
            >
              {saving === "save" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Save />
              )}
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
                  min={window.start}
                  max={window.end}
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
              {editing.items.map((item) => {
                const status = statusOf(item)
                const cancelled = status === "cancelled"
                return (
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
                        {cancelled ? " · cancelled" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={draft.quantities[item.id] ?? ""}
                        disabled={cancelled}
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
                )
              })}
            </div>

            <p className="text-[0.625rem] text-muted-foreground">
              {canManage
                ? "Usage editors are held to the same date window as everyone else. Cancelled lines stay read-only until they are restored."
                : "Editing is limited to your own submitted usage inside the allowed date window."}{" "}
              Every change is recorded in the usage changelog.
            </p>
          </div>
        ) : null}
      </Modal>
    </>
  )
}
