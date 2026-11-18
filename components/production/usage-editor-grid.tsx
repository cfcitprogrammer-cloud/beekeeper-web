"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  FileSpreadsheet,
  FilterX,
  FlaskConical,
  History,
  Loader2,
  Pencil,
  RotateCcw,
  Save,
  Tags,
  Undo2,
  Upload,
} from "lucide-react"

import {
  downloadProductionUsageTemplate,
  exportProductionUsage,
  getProductionUsageChangelog,
  importProductionUsageUpdates,
  setProductionUsageStatus,
  updateProductionUsageLines,
  type ProductionUsageChangelogEntry,
  type ProductionUsageImportConflict,
  type ProductionUsageImportResult,
} from "@/actions/production.action"
import { MetricCard } from "@/components/shared/metric-card"
import { Modal } from "@/components/shared/modal"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import { formatDate, formatDateTime, formatNumber, humanize } from "@/lib/format"
import { cn } from "@/lib/utils"
import type {
  ProductionSkuSummary,
  ProductionStageWithRelations,
  ProductionUsageWithRelations,
} from "@/lib/data/operations"
import type { ProductionPipeline } from "@/types/database"
import {
  cutoffInstant,
  normalizeTime,
  resolveUsageStatus,
  usageStatusLabel,
  type UsageSettings,
} from "@/lib/production/usage-status"

type PipelineOption = Pick<ProductionPipeline, "id" | "name" | "code">

type DraftState = {
  usageDate: string
  quantity: string
  notes: string
}

type ConflictDraft = {
  quantity: string
  usageDate: string
  notes: string
}

type StatusFilter = "" | "submitted" | "completed" | "cancelled"

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function originalDraft(row: ProductionUsageWithRelations): DraftState {
  return {
    usageDate: row.usage_date.slice(0, 10),
    quantity: String(Number(row.quantity)),
    notes: row.notes ?? "",
  }
}

function isDirtyDraft(draft: DraftState, row: ProductionUsageWithRelations) {
  const original = originalDraft(row)
  const draftQuantity = Number(draft.quantity)
  const originalQuantity = Number(original.quantity)
  return (
    !Number.isFinite(draftQuantity) ||
    Math.abs(draftQuantity - originalQuantity) > 0.000001 ||
    draft.usageDate !== original.usageDate ||
    draft.notes.trim() !== original.notes.trim()
  )
}

function changelogValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—"
  if (typeof value === "string") return value
  return String(value)
}

export function ProductionUsageEditorGrid({
  pipelines,
  stages,
  usage,
  settings,
  currentUserId,
  now,
}: {
  pipelines: PipelineOption[]
  stages: ProductionStageWithRelations[]
  usage: ProductionUsageWithRelations[]
  settings: UsageSettings
  currentUserId: string | null
  now: string
}) {
  const router = useRouter()
  const nowDate = React.useMemo(() => new Date(now), [now])

  const [pipelineId, setPipelineId] = React.useState("")
  const [stageId, setStageId] = React.useState("")
  const [skuQuery, setSkuQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("")
  const [fromDate, setFromDate] = React.useState("")
  const [toDate, setToDate] = React.useState("")
  const [pageIndex, setPageIndex] = React.useState(0)
  const [pageSize, setPageSize] = React.useState(25)
  const [drafts, setDrafts] = React.useState<Record<string, DraftState>>({})
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [saving, setSaving] = React.useState(false)
  const [lifecycleBusy, setLifecycleBusy] = React.useState<string | null>(null)

  const [historyRow, setHistoryRow] =
    React.useState<ProductionUsageWithRelations | null>(null)
  const [historyEntries, setHistoryEntries] = React.useState<
    ProductionUsageChangelogEntry[]
  >([])
  const [historyLoading, setHistoryLoading] = React.useState(false)
  const [historyError, setHistoryError] = React.useState<string | null>(null)

  const [importOpen, setImportOpen] = React.useState(false)
  const [csv, setCsv] = React.useState("")
  const [fileName, setFileName] = React.useState("")
  const [busy, setBusy] = React.useState<string | null>(null)
  const [importResult, setImportResult] =
    React.useState<ProductionUsageImportResult | null>(null)
  const [editConflict, setEditConflict] =
    React.useState<ProductionUsageImportConflict | null>(null)
  const [conflictForm, setConflictForm] = React.useState<ConflictDraft>({
    quantity: "",
    usageDate: "",
    notes: "",
  })

  const statusOf = React.useCallback(
    (row: ProductionUsageWithRelations) =>
      resolveUsageStatus(row, settings, nowDate),
    [settings, nowDate]
  )

  const skuIndex = React.useMemo(() => {
    const map = new Map<string, ProductionSkuSummary>()
    for (const stage of stages) {
      for (const sku of stage.skus) map.set(sku.id, sku)
    }
    for (const line of usage) {
      if (line.sku && !map.has(line.sku.id)) map.set(line.sku.id, line.sku)
    }
    return map
  }, [stages, usage])

  const parentByComponent = React.useMemo(() => {
    const map = new Map<string, ProductionSkuSummary>()
    for (const sku of skuIndex.values()) {
      for (const component of sku.components ?? []) {
        if (!map.has(component.componentSkuId)) {
          map.set(component.componentSkuId, sku)
        }
      }
    }
    return map
  }, [skuIndex])

  const stageOptions = React.useMemo(() => {
    const relevant = pipelineId
      ? stages.filter((stage) => stage.pipeline_id === pipelineId)
      : stages
    return [...relevant].sort(
      (a, b) =>
        (a.pipeline?.name ?? "").localeCompare(b.pipeline?.name ?? "") ||
        a.sequence - b.sequence
    )
  }, [stages, pipelineId])

  const filtered = React.useMemo(() => {
    const skuNeedle = skuQuery.trim().toLowerCase()
    return usage
      .filter((line) => {
        const usageDate = line.usage_date.slice(0, 10)
        const skuCode = (
          line.sku?.sku_code ??
          (line.sku_id ? skuIndex.get(line.sku_id)?.sku_code : "") ??
          ""
        ).toLowerCase()
        return (
          (!pipelineId || line.pipeline_id === pipelineId) &&
          (!stageId || line.stage_id === stageId) &&
          (!skuNeedle || skuCode.includes(skuNeedle)) &&
          (!statusFilter || statusOf(line) === statusFilter) &&
          (!fromDate || usageDate >= fromDate) &&
          (!toDate || usageDate <= toDate)
        )
      })
      .sort(
        (a, b) =>
          b.usage_date.localeCompare(a.usage_date) ||
          b.recorded_at.localeCompare(a.recorded_at)
      )
  }, [
    usage,
    pipelineId,
    stageId,
    skuQuery,
    skuIndex,
    statusFilter,
    fromDate,
    toDate,
    statusOf,
  ])

  const hasFilters = Boolean(
    pipelineId || stageId || skuQuery.trim() || statusFilter || fromDate || toDate
  )
  const invalidDateRange = Boolean(fromDate && toDate && fromDate > toDate)
  const dirtyRows = Object.keys(drafts)

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePageIndex = Math.min(pageIndex, pageCount - 1)
  const pageStart = safePageIndex * pageSize
  const pageEnd = Math.min(pageStart + pageSize, filtered.length)
  const pagedRows = React.useMemo(
    () => filtered.slice(pageStart, pageStart + pageSize),
    [filtered, pageStart, pageSize]
  )

  const allVisibleSelected =
    pagedRows.length > 0 && pagedRows.every((row) => selected.has(row.id))
  const someVisibleSelected = pagedRows.some((row) => selected.has(row.id))

  const batchCount = new Set(
    filtered.map((line) => line.batch_id || line.id)
  ).size
  const skuCount = new Set(
    filtered
      .map((line) => line.sku_id)
      .filter((id): id is string => Boolean(id))
  ).size
  const stageCount = new Set(filtered.map((line) => line.stage_id)).size
  const cancelledCount = filtered.filter(
    (line) => statusOf(line) === "cancelled"
  ).length
  const completedCount = filtered.filter(
    (line) => statusOf(line) === "completed"
  ).length
  const submittedCount = filtered.filter(
    (line) => statusOf(line) === "submitted"
  ).length

  const selectedRows = React.useMemo(
    () => usage.filter((line) => selected.has(line.id)),
    [usage, selected]
  )
  const selectedCancelled = selectedRows.filter(
    (line) => statusOf(line) === "cancelled"
  ).length
  const selectedActive = selectedRows.length - selectedCancelled

  const cutoff = cutoffInstant(settings, nowDate)
  const isSubmitterOfSelection =
    Boolean(currentUserId) &&
    selectedRows.length > 0 &&
    selectedRows.every(
      (line) => (line.submitted_by ?? line.recorded_by) === currentUserId
    )

  function changePipeline(value: string) {
    setPipelineId(value)
    setStageId("")
    setPageIndex(0)
  }

  function changeStage(value: string) {
    setStageId(value)
    setPageIndex(0)
  }

  function clearFilters() {
    setPipelineId("")
    setStageId("")
    setSkuQuery("")
    setStatusFilter("")
    setFromDate("")
    setToDate("")
    setPageIndex(0)
  }

  function setField(
    row: ProductionUsageWithRelations,
    field: keyof DraftState,
    value: string
  ) {
    if (statusOf(row) === "cancelled") return
    setDrafts((current) => {
      const next = {
        ...(current[row.id] ?? originalDraft(row)),
        [field]: value,
      }
      const copy = { ...current }
      if (isDirtyDraft(next, row)) copy[row.id] = next
      else delete copy[row.id]
      return copy
    })
  }

  function toggleRow(id: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected((current) => {
      const next = new Set(current)
      if (allVisibleSelected) {
        pagedRows.forEach((row) => next.delete(row.id))
      } else {
        pagedRows.forEach((row) => next.add(row.id))
      }
      return next
    })
  }

  async function saveChanges() {
    const blankQuantity = dirtyRows.find(
      (id) => (drafts[id]?.quantity ?? "").trim() === ""
    )
    if (blankQuantity) {
      toast.add({
        type: "error",
        title: "Enter a quantity for every edited row",
      })
      return
    }

    const lines = dirtyRows
      .map((id) => {
        const row = usage.find((line) => line.id === id)
        const draft = drafts[id]
        if (!row || !draft) return null
        return {
          id,
          quantity: Number(draft.quantity),
          usageDate: draft.usageDate,
          notes: draft.notes.trim() || null,
        }
      })
      .filter((line): line is NonNullable<typeof line> => Boolean(line))

    if (lines.length === 0) return

    const invalid = lines.find(
      (line) => !Number.isFinite(line.quantity) || line.quantity < 0
    )
    if (invalid) {
      toast.add({
        type: "error",
        title: "Check the quantities",
        description: "Every quantity must be a number greater than or equal to 0.",
      })
      return
    }

    const missingDate = lines.find((line) => !line.usageDate)
    if (missingDate) {
      toast.add({ type: "error", title: "Select a usage date for every row" })
      return
    }

    setSaving(true)
    const result = await updateProductionUsageLines({ lines })
    setSaving(false)

    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not save changes",
        description: result.error,
      })
      return
    }

    setDrafts({})
    toast.add({
      type: "success",
      title: "Usage updated",
      description: `${result.data.updated} line(s) saved and added to the changelog.`,
    })
    router.refresh()
  }

  async function changeStatus(
    ids: string[],
    status: "submitted" | "cancelled",
    description: string
  ) {
    if (ids.length === 0) return

    const detail =
      status === "cancelled"
        ? "Cancelling a BOM parent also cancels its component lines in the same usage entry."
        : "Restoring a BOM parent also restores its component lines in the same usage entry."

    if (!window.confirm(`${description}\n\n${detail}`)) return

    setLifecycleBusy(status)
    const result = await setProductionUsageStatus({
      ids,
      status,
      reason:
        status === "cancelled"
          ? "Cancelled from the usage editor."
          : "Restored from the usage editor.",
    })
    setLifecycleBusy(null)

    if (!result.success) {
      toast.add({
        type: "error",
        title:
          status === "cancelled"
            ? "Could not mark the cancellation"
            : "Could not restore usage",
        description: result.error,
      })
      return
    }

    const affectedIds = new Set(ids)
    setDrafts((current) => {
      const next = { ...current }
      for (const id of affectedIds) delete next[id]
      return next
    })
    setSelected(new Set())
    toast.add({
      type: "success",
      title: status === "cancelled" ? "Usage cancelled" : "Usage restored",
      description: `${result.data.updated} line(s) updated${
        result.data.cascaded > 0
          ? ` (${result.data.cascaded} BOM component line(s) cascaded)`
          : ""
      }.`,
    })
    router.refresh()
  }

  async function openHistory(row: ProductionUsageWithRelations) {
    setHistoryRow(row)
    setHistoryEntries([])
    setHistoryError(null)
    setHistoryLoading(true)

    const result = await getProductionUsageChangelog(row.id)
    setHistoryLoading(false)

    if (!result.success) {
      setHistoryError(result.error)
      return
    }
    setHistoryEntries(result.data.entries)
  }

  async function handleExport() {
    setBusy("export")
    const response = await exportProductionUsage()
    setBusy(null)

    if (!response.success) {
      toast.add({
        type: "error",
        title: "Export failed",
        description: response.error,
      })
      return
    }

    downloadCsv(response.data.filename, response.data.csv)
    toast.add({
      type: "success",
      title: "Usage export ready",
      description: `${response.data.rowCount} line(s) downloaded as CSV.`,
    })
  }

  async function handleTemplate() {
    setBusy("template")
    const response = await downloadProductionUsageTemplate()
    setBusy(null)

    if (!response.success) {
      toast.add({
        type: "error",
        title: "Could not download the template",
        description: response.error,
      })
      return
    }

    downloadCsv(response.data.filename, response.data.csv)
    toast.add({
      type: "success",
      title: "Import template downloaded",
      description:
        "Fill in the columns and leave batch_id blank to add new usage rows.",
    })
  }

  async function readFile(file: File | undefined) {
    if (!file) {
      setCsv("")
      setFileName("")
      return
    }
    setCsv(await file.text())
    setFileName(file.name)
  }

  async function handleImport() {
    if (!csv.trim()) {
      toast.add({ type: "error", title: "Choose a CSV file to import" })
      return
    }

    setBusy("import")
    const response = await importProductionUsageUpdates({ csv })
    setBusy(null)

    if (!response.success) {
      toast.add({
        type: "error",
        title: "Import failed",
        description: response.error,
      })
      return
    }

    setImportResult(response.data)

    if (response.data.conflicts.length > 0) {
      toast.add({
        type: "warning",
        title: "Import needs review",
        description: `${response.data.updated} updated, ${response.data.created} added, ${response.data.conflicts.length} conflict(s) left for review.`,
      })
    } else {
      toast.add({
        type: "success",
        title: "Import finished",
        description: `${response.data.updated} line(s) updated, ${response.data.created} line(s) added.`,
      })
    }

    setDrafts({})
    router.refresh()
  }

  function openConflictEditor(conflict: ProductionUsageImportConflict) {
    setConflictForm({
      quantity: conflict.quantity === null ? "" : String(conflict.quantity),
      usageDate: conflict.usageDate?.slice(0, 10) ?? "",
      notes: conflict.notes ?? "",
    })
    setEditConflict(conflict)
  }

  function resolveConflict(conflict: ProductionUsageImportConflict) {
    setImportResult((current) =>
      current
        ? {
            ...current,
            conflicts: current.conflicts.filter(
              (item) =>
                !(
                  item.row === conflict.row &&
                  item.batchId === conflict.batchId &&
                  item.skuCode === conflict.skuCode
                )
            ),
            skipped: Math.max(0, current.skipped - 1),
          }
        : current
    )
  }

  async function cancelConflictLine(conflict: ProductionUsageImportConflict) {
    if (!conflict.usageId) {
      toast.add({
        type: "error",
        title: "This line cannot be cancelled",
        description:
          "The conflicting row does not match an existing usage line. Fix the CSV and import again.",
      })
      return
    }

    if (
      !window.confirm(
        "Mark the conflicting usage line as a cancellation? BOM components of this line in the same usage entry are cancelled too."
      )
    ) {
      return
    }

    setBusy(`cancel-${conflict.row}`)
    const result = await setProductionUsageStatus({
      ids: [conflict.usageId],
      status: "cancelled",
      reason: "Cancelled while reviewing an import conflict.",
    })
    setBusy(null)

    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not cancel the line",
        description: result.error,
      })
      return
    }

    resolveConflict(conflict)
    toast.add({
      type: "success",
      title: "Conflicting line cancelled",
      description: `${result.data.updated} line(s) updated.`,
    })
    router.refresh()
  }

  async function saveConflictEdit() {
    if (!editConflict?.usageId) return

    if (conflictForm.quantity.trim() === "") {
      toast.add({ type: "error", title: "Enter a valid quantity" })
      return
    }

    const quantity = Number(conflictForm.quantity)
    if (!Number.isFinite(quantity) || quantity < 0) {
      toast.add({
        type: "error",
        title: "Enter a valid quantity",
        description: "The quantity must be a number greater than or equal to 0.",
      })
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(conflictForm.usageDate)) {
      toast.add({ type: "error", title: "Select a valid usage date" })
      return
    }

    setBusy(`edit-${editConflict.row}`)
    const result = await updateProductionUsageLines({
      lines: [
        {
          id: editConflict.usageId,
          quantity,
          usageDate: conflictForm.usageDate,
          notes: conflictForm.notes.trim() || null,
        },
      ],
    })
    setBusy(null)

    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not save the line",
        description: result.error,
      })
      return
    }

    resolveConflict(editConflict)
    setEditConflict(null)
    toast.add({
      type: "success",
      title: "Conflicting line updated",
      description: "The line now holds the values from your review.",
    })
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-800 dark:text-amber-200">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <div className="space-y-1 text-xs">
          <p className="font-semibold">
            Critical module — changes affect production records
          </p>
          <p className="text-[0.6875rem] opacity-90">
            Usage lines dated on or before{" "}
            <span className="font-medium">{formatDate(cutoff)}</span> are
            completed at{" "}
            <span className="font-medium">{normalizeTime(settings.cutoffTime)}</span>{" "}
            and can no longer be edited by submitters. You are editing as a
            usage editor, so completed usage stays editable — but every change
            is recorded in the usage changelog.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Matching lines"
          value={filtered.length}
          hint={`of ${usage.length} recorded usage lines`}
          icon={ClipboardList}
          accent="primary"
        />
        <MetricCard
          label="Submissions"
          value={batchCount}
          hint="Grouped usage entries"
          icon={FlaskConical}
          accent="sky"
        />
        <MetricCard
          label="Distinct SKUs"
          value={skuCount}
          hint={`${skuCount} SKU${skuCount === 1 ? "" : "s"} across ${stageCount} stage${stageCount === 1 ? "" : "s"}`}
          icon={Tags}
          accent="emerald"
        />
        <MetricCard
          label="Cancellations"
          value={cancelledCount}
          hint={`${submittedCount} submitted · ${completedCount} completed`}
          icon={Ban}
          accent="amber"
        />
      </div>

      <Card size="sm">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <FilterX className="size-3.5 text-primary" />
            Editor filters
          </CardTitle>
          <CardDescription>
            Narrow the sheet by pipeline, stage, SKU code, status or date. Leave a
            filter on “All” to include every usage line.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <div className="space-y-1.5">
              <Label htmlFor="editor-pipeline">Pipeline</Label>
              <NativeSelect
                id="editor-pipeline"
                value={pipelineId}
                onChange={(event) => changePipeline(event.target.value)}
                className="w-full"
              >
                <NativeSelectOption value="">All pipelines</NativeSelectOption>
                {pipelines.map((pipeline) => (
                  <NativeSelectOption key={pipeline.id} value={pipeline.id}>
                    {pipeline.name} · {pipeline.code}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editor-stage">Stage</Label>
              <NativeSelect
                id="editor-stage"
                value={stageId}
                onChange={(event) => changeStage(event.target.value)}
                className="w-full"
                disabled={stageOptions.length === 0}
              >
                <NativeSelectOption value="">
                  {stageOptions.length === 0
                    ? "No stages available"
                    : "All stages"}
                </NativeSelectOption>
                {stageOptions.map((stage) => (
                  <NativeSelectOption key={stage.id} value={stage.id}>
                    {pipelineId
                      ? `${stage.sequence}. ${stage.name}`
                      : `${stage.pipeline?.name ?? "Pipeline"} · ${stage.sequence}. ${stage.name}`}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editor-sku">SKU code</Label>
              <Input
                id="editor-sku"
                type="text"
                value={skuQuery}
                onChange={(event) => {
                  setSkuQuery(event.target.value)
                  setPageIndex(0)
                }}
                placeholder="Filter by SKU code…"
                autoComplete="off"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editor-status">Status</Label>
              <NativeSelect
                id="editor-status"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as StatusFilter)
                  setPageIndex(0)
                }}
                className="w-full"
              >
                <NativeSelectOption value="">All statuses</NativeSelectOption>
                <NativeSelectOption value="submitted">Submitted</NativeSelectOption>
                <NativeSelectOption value="completed">Completed</NativeSelectOption>
                <NativeSelectOption value="cancelled">Cancellation</NativeSelectOption>
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editor-from">From date</Label>
              <Input
                id="editor-from"
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(event) => {
                  setFromDate(event.target.value)
                  setPageIndex(0)
                }}
                aria-invalid={invalidDateRange}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editor-to">To date</Label>
              <Input
                id="editor-to"
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(event) => {
                  setToDate(event.target.value)
                  setPageIndex(0)
                }}
                aria-invalid={invalidDateRange}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-0.5">
              <p className="text-[0.625rem] text-muted-foreground">
                Showing {filtered.length} usage line
                {filtered.length === 1 ? "" : "s"}
                {hasFilters ? " for the selected filters." : "."}
              </p>
              {invalidDateRange ? (
                <p className="text-[0.625rem] text-destructive">
                  The “from” date must be on or before the “to” date.
                </p>
              ) : null}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              disabled={!hasFilters}
            >
              <FilterX />
              Clear filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-2">
          <div className="flex flex-wrap items-center gap-2 text-[0.625rem] text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded border bg-background px-1.5 py-0.5">
              <Pencil className="size-3" />
              {dirtyRows.length} unsaved
            </span>
            <span className="inline-flex items-center gap-1 rounded border bg-background px-1.5 py-0.5">
              <Check className="size-3" />
              {selected.size} selected
            </span>
            {isSubmitterOfSelection ? (
              <span className="inline-flex items-center gap-1 rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-sky-700 dark:text-sky-300">
                <History className="size-3" />
                Your own submission
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={busy !== null}
            >
              {busy === "export" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Download />
              )}
              {busy === "export" ? "Exporting…" : "Export CSV"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportOpen(true)}
            >
              <Upload />
              Import update
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDrafts({})}
              disabled={dirtyRows.length === 0 || saving}
            >
              <RotateCcw />
              Reset
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() =>
                void changeStatus(
                  Array.from(selected),
                  "cancelled",
                  `Mark ${selected.size} selected usage line(s) as a cancellation?`
                )
              }
              disabled={
                selected.size === 0 ||
                selectedActive === 0 ||
                lifecycleBusy !== null
              }
            >
              {lifecycleBusy === "cancelled" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Ban />
              )}
              {lifecycleBusy === "cancelled"
                ? "Cancelling…"
                : `Mark cancellation (${selectedActive})`}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                void changeStatus(
                  Array.from(selected),
                  "submitted",
                  `Restore ${selectedCancelled} selected cancelled usage line(s) to submitted?`
                )
              }
              disabled={
                selectedCancelled === 0 || lifecycleBusy !== null
              }
            >
              {lifecycleBusy === "submitted" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Undo2 />
              )}
              {lifecycleBusy === "submitted"
                ? "Restoring…"
                : `Restore (${selectedCancelled})`}
            </Button>
            <Button
              size="sm"
              onClick={saveChanges}
              disabled={dirtyRows.length === 0 || saving}
            >
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              {saving ? "Saving…" : `Save changes (${dirtyRows.length})`}
            </Button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[1320px] border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-muted/95 text-[0.625rem] text-muted-foreground">
              <tr className="border-b">
                <th className="w-8 border-r px-2 py-2 text-right font-medium">
                  #
                </th>
                <th className="w-8 border-r px-2 py-2">
                  <input
                    type="checkbox"
                    className="size-3.5 accent-primary"
                    checked={allVisibleSelected}
                    ref={(element) => {
                      if (element) {
                        element.indeterminate =
                          !allVisibleSelected && someVisibleSelected
                      }
                    }}
                    onChange={toggleAll}
                    aria-label="Select every usage line on this page"
                  />
                </th>
                <th className="w-24 border-r px-2 py-2 text-left font-medium">
                  Status
                </th>
                <th className="w-36 border-r px-2 py-2 text-left font-medium">
                  Usage date
                </th>
                <th className="border-r px-2 py-2 text-left font-medium">
                  Pipeline
                </th>
                <th className="border-r px-2 py-2 text-left font-medium">
                  Stage
                </th>
                <th className="border-r px-2 py-2 text-left font-medium">
                  SKU
                </th>
                <th className="w-28 border-r px-2 py-2 text-left font-medium">
                  BOM
                </th>
                <th className="w-28 border-r px-2 py-2 text-right font-medium">
                  Quantity
                </th>
                <th className="w-16 border-r px-2 py-2 text-left font-medium">
                  Unit
                </th>
                <th className="w-48 border-r px-2 py-2 text-left font-medium">
                  Notes
                </th>
                <th className="w-36 border-r px-2 py-2 text-left font-medium">
                  Submitted by
                </th>
                <th className="w-20 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((row, index) => {
                const status = statusOf(row)
                const cancelled = status === "cancelled"
                const draft = drafts[row.id]
                const value = draft ?? originalDraft(row)
                const dirty = Boolean(draft)
                const checked = selected.has(row.id)
                const sku = row.sku_id ? skuIndex.get(row.sku_id) : null
                const parentSku = row.sku_id
                  ? parentByComponent.get(row.sku_id)
                  : null
                const isBomParent = (sku?.components?.length ?? 0) > 0

                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b last:border-b-0",
                      dirty && "bg-amber-500/[0.06]",
                      !dirty && checked && "bg-primary/[0.06]",
                      cancelled && "bg-rose-500/[0.05] text-muted-foreground"
                    )}
                  >
                    <td className="border-r px-2 py-1.5 text-right font-mono text-[0.625rem] text-muted-foreground tabular-nums">
                      {pageStart + index + 1}
                    </td>
                    <td className="border-r px-2 py-1.5 text-center">
                      <input
                        type="checkbox"
                        className="size-3.5 accent-primary"
                        checked={checked}
                        onChange={() => toggleRow(row.id)}
                        aria-label={`Select usage line ${pageStart + index + 1}`}
                      />
                    </td>
                    <td className="border-r px-2 py-1.5">
                      <StatusBadge
                        status={status}
                        label={usageStatusLabel(status)}
                        tone={
                          status === "cancelled"
                            ? "danger"
                            : status === "completed"
                              ? "info"
                              : "warning"
                        }
                      />
                    </td>
                    <td className="border-r px-1 py-1">
                      <Input
                        type="date"
                        value={value.usageDate}
                        disabled={cancelled}
                        onChange={(event) =>
                          setField(row, "usageDate", event.target.value)
                        }
                        className="h-7 rounded-none border-0 bg-transparent px-1 shadow-none focus-visible:ring-1"
                        aria-label="Usage date"
                      />
                    </td>
                    <td className="border-r px-2 py-1.5">
                      <p className="font-medium">
                        {row.pipeline?.name ?? "—"}
                      </p>
                      <p className="font-mono text-[0.625rem] text-muted-foreground">
                        {row.pipeline?.code ?? "—"}
                      </p>
                    </td>
                    <td className="border-r px-2 py-1.5">
                      <p>{row.stage?.name ?? "Stage removed"}</p>
                      <p className="text-[0.625rem] text-muted-foreground">
                        {row.stage ? `Sequence ${row.stage.sequence}` : "—"}
                      </p>
                    </td>
                    <td className="border-r px-2 py-1.5">
                      <p className="font-medium">
                        {parentSku ? (
                          <span className="mr-1 text-primary">└</span>
                        ) : null}
                        {sku?.name ?? "No SKU"}
                      </p>
                      <p className="font-mono text-[0.625rem] text-muted-foreground">
                        {sku?.sku_code ?? "Legacy run usage"}
                      </p>
                    </td>
                    <td className="border-r px-2 py-1.5 text-[0.625rem] text-muted-foreground">
                      {isBomParent
                        ? "BOM parent"
                        : parentSku
                          ? `Component of ${parentSku.sku_code}`
                          : "SKU"}
                    </td>
                    <td className="border-r px-1 py-1">
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={value.quantity}
                        disabled={cancelled}
                        onChange={(event) =>
                          setField(row, "quantity", event.target.value)
                        }
                        className="h-7 rounded-none border-0 bg-transparent px-1 text-right shadow-none tabular-nums focus-visible:ring-1"
                        aria-label="Usage quantity"
                      />
                    </td>
                    <td className="border-r px-2 py-1.5 text-muted-foreground">
                      {row.uom ?? sku?.uom ?? "—"}
                    </td>
                    <td className="border-r px-1 py-1">
                      <Input
                        value={value.notes}
                        disabled={cancelled}
                        onChange={(event) =>
                          setField(row, "notes", event.target.value)
                        }
                        placeholder="—"
                        className="h-7 rounded-none border-0 bg-transparent px-1 shadow-none focus-visible:ring-1"
                        aria-label="Usage notes"
                      />
                    </td>
                    <td className="border-r px-2 py-1.5">
                      <p>
                        {row.submitter
                          ? `${row.submitter.first_name} ${row.submitter.last_name}`
                          : row.submitted_by
                            ? `User ${row.submitted_by.slice(0, 8)}`
                            : "Unknown user"}
                      </p>
                      <p className="text-[0.625rem] text-muted-foreground">
                        {formatDate(row.recorded_at)}
                      </p>
                    </td>
                    <td className="px-1 py-1.5">
                      <div className="flex items-center justify-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label="View usage changelog"
                          onClick={() => void openHistory(row)}
                        >
                          <History />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={
                            cancelled
                              ? "Restore usage line"
                              : "Mark usage line as cancellation"
                          }
                          disabled={lifecycleBusy !== null}
                          onClick={() =>
                            void changeStatus(
                              [row.id],
                              cancelled ? "submitted" : "cancelled",
                              cancelled
                                ? `Restore this usage line (${sku?.sku_code ?? "legacy"})?`
                                : `Mark this usage line (${sku?.sku_code ?? "legacy"}) as a cancellation?`
                            )
                          }
                        >
                          {cancelled ? (
                            <Undo2 className="text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Ban className="text-destructive" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-1 px-4 py-12 text-center">
              <FileSpreadsheet className="size-6 text-muted-foreground" />
              <p className="text-xs font-medium">No usage matches these filters</p>
              <p className="max-w-sm text-[0.625rem] text-muted-foreground">
                Try a different pipeline, stage, SKU code, status or date range,
                or clear the filters to see all recorded usage.
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2 text-[0.625rem] text-muted-foreground">
          <span>
            {filtered.length === 0
              ? "No lines to show."
              : `Showing ${formatNumber(pageStart + 1)}–${formatNumber(
                  pageEnd
                )} of ${formatNumber(filtered.length)} line${
                  filtered.length === 1 ? "" : "s"
                }${hasFilters ? " after filters" : ""}`}
            {" · "}edit the date, quantity or notes cells directly. Cancelled
            lines are read-only.
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1">
              Rows
              <NativeSelect
                value={String(pageSize)}
                onChange={(event) => {
                  setPageSize(Number(event.target.value))
                  setPageIndex(0)
                }}
                className="h-6 w-16"
                aria-label="Rows per page"
              >
                {[10, 25, 50, 100].map((size) => (
                  <NativeSelectOption key={size} value={String(size)}>
                    {size}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setPageIndex(Math.max(0, safePageIndex - 1))}
              disabled={safePageIndex === 0}
              aria-label="Previous page"
            >
              <ChevronLeft />
            </Button>
            <span className="tabular-nums">
              Page {safePageIndex + 1} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() =>
                setPageIndex(Math.min(pageCount - 1, safePageIndex + 1))
              }
              disabled={safePageIndex >= pageCount - 1}
              aria-label="Next page"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </div>

      <Modal
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open)
          if (!open) {
            setCsv("")
            setFileName("")
            setImportResult(null)
            setEditConflict(null)
          }
        }}
        title="Mass import usage updates"
        description="Export the current usage, edit quantities, dates, notes or status in your spreadsheet, then import the CSV back. Existing lines are updated and rows that do not exist yet are added, subject to the usage settings. Rows whose baseline changed are returned for review."
        size="xl"
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTemplate}
              disabled={busy !== null}
            >
              {busy === "template" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <FileSpreadsheet />
              )}
              {busy === "template" ? "Preparing…" : "Download template"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={busy !== null}
            >
              {busy === "export" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Download />
              )}
              {busy === "export" ? "Exporting…" : "Export current usage"}
            </Button>
            <Button
              size="sm"
              onClick={handleImport}
              disabled={busy !== null || !csv}
            >
              {busy === "import" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Upload />
              )}
              {busy === "import" ? "Importing…" : "Apply import"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="space-y-2 rounded-md border border-dashed p-3">
            <Input
              type="file"
              accept=".csv,text/csv"
              disabled={busy !== null}
              onChange={(event) => readFile(event.target.files?.[0])}
            />
            <p className="text-[0.625rem] text-muted-foreground">
              {fileName
                ? `Selected: ${fileName}`
                : "Select a CSV exported from here, or download the template. Leave batch_id blank to add a new usage row; keep previous_quantity and updated_at intact so conflicts can be detected. Set status to cancelled to cancel a line, or submitted to restore it."}
            </p>
          </div>

          {importResult ? (
            <div className="space-y-2 rounded-md border bg-muted/20 p-3">
              <p className="text-xs font-medium">
                {importResult.updated} updated · {importResult.created} added ·{" "}
                {importResult.skipped} skipped ·{" "}
                {importResult.conflicts.length} conflict
                {importResult.conflicts.length === 1 ? "" : "s"}
              </p>

              {importResult.conflicts.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-start gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[0.625rem] text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                    <p>
                      These rows were not applied. Mark the affected usage line
                      as a cancellation or correct it manually, then review the
                      remaining conflicts.
                    </p>
                  </div>

                  <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                    {importResult.conflicts.map((conflict) => (
                      <div
                        key={`${conflict.row}-${conflict.batchId}-${conflict.skuCode}`}
                        className="rounded border bg-background px-2 py-1.5 text-[0.625rem]"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <p className="font-medium">
                              Row {conflict.row}
                              {conflict.skuCode
                                ? ` · ${conflict.skuCode}`
                                : ""}
                            </p>
                            <p className="text-muted-foreground">
                              {conflict.reason}
                            </p>
                            <p className="font-mono text-[0.5625rem] text-muted-foreground">
                              batch {conflict.batchId || "—"} · qty{" "}
                              {conflict.quantity ?? "—"} · date{" "}
                              {conflict.usageDate || "—"}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-1">
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => openConflictEditor(conflict)}
                              disabled={
                                !conflict.usageId || busy !== null
                              }
                            >
                              <Pencil />
                              Manual edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="xs"
                              onClick={() => void cancelConflictLine(conflict)}
                              disabled={
                                !conflict.usageId ||
                                busy === `cancel-${conflict.row}`
                              }
                            >
                              {busy === `cancel-${conflict.row}` ? (
                                <Loader2 className="animate-spin" />
                              ) : (
                                <Ban />
                              )}
                              Mark cancellation
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[0.625rem] text-muted-foreground">
                  All rows in the file were applied. No review is needed.
                </p>
              )}
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={editConflict !== null}
        onOpenChange={(open) => {
          if (!open) setEditConflict(null)
        }}
        title="Manually edit conflicting usage"
        description={
          editConflict
            ? `Row ${editConflict.row}${editConflict.skuCode ? ` · ${editConflict.skuCode}` : ""}. Saving writes these values to the current usage line.`
            : undefined
        }
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditConflict(null)}
              disabled={busy !== null}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={saveConflictEdit}
              disabled={busy !== null}
            >
              {busy?.startsWith("edit-") ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Save />
              )}
              Save line
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="conflict-quantity">Quantity</Label>
            <Input
              id="conflict-quantity"
              type="number"
              min={0}
              step="any"
              value={conflictForm.quantity}
              onChange={(event) =>
                setConflictForm((current) => ({
                  ...current,
                  quantity: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="conflict-date">Usage date</Label>
            <Input
              id="conflict-date"
              type="date"
              value={conflictForm.usageDate}
              onChange={(event) =>
                setConflictForm((current) => ({
                  ...current,
                  usageDate: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="conflict-notes">Notes</Label>
            <Input
              id="conflict-notes"
              value={conflictForm.notes}
              onChange={(event) =>
                setConflictForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              placeholder="Optional"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={historyRow !== null}
        onOpenChange={(open) => {
          if (!open) {
            setHistoryRow(null)
            setHistoryEntries([])
            setHistoryError(null)
          }
        }}
        title="Usage changelog"
        description={
          historyRow
            ? `${historyRow.sku?.sku_code ?? "Legacy usage"} · ${formatDate(
                historyRow.usage_date
              )} · batch ${historyRow.batch_id?.slice(0, 8) ?? "—"}`
            : undefined
        }
        size="lg"
        footer={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHistoryRow(null)}
          >
            Close
          </Button>
        }
      >
        {historyLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Loading changelog…
          </div>
        ) : historyError ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
            {historyError}
          </p>
        ) : historyEntries.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            No changelog entries have been recorded for this usage line yet.
          </p>
        ) : (
          <ol className="space-y-2">
            {historyEntries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-md border bg-muted/20 p-2.5 text-xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{humanize(entry.action)}</p>
                    <p className="text-[0.625rem] text-muted-foreground">
                      {formatDateTime(entry.changedAt)}
                      {" · "}
                      {entry.actorName ??
                        (entry.changedBy
                          ? `User ${entry.changedBy.slice(0, 8)}`
                          : "System")}
                      {entry.employeeNo ? ` (${entry.employeeNo})` : ""}
                    </p>
                  </div>
                </div>
                {entry.reason ? (
                  <p className="mt-1 text-[0.625rem] text-muted-foreground">
                    {entry.reason}
                  </p>
                ) : null}
                {entry.newValues || entry.previousValues ? (
                  <dl className="mt-1.5 grid gap-0.5 text-[0.625rem] sm:grid-cols-2">
                    {Object.keys({
                      ...(entry.previousValues ?? {}),
                      ...(entry.newValues ?? {}),
                    }).map((key) => (
                      <div key={key} className="flex gap-1">
                        <dt className="font-medium text-muted-foreground">
                          {humanize(key)}:
                        </dt>
                        <dd>
                          {changelogValue(entry.previousValues?.[key])}
                          {" → "}
                          {changelogValue(entry.newValues?.[key])}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </Modal>
    </div>
  )
}
