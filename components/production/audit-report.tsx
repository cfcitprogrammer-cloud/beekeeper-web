"use client"

import * as React from "react"
import { ClipboardList, FilterX, FlaskConical, Layers, Tags } from "lucide-react"

import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { MetricCard } from "@/components/shared/metric-card"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select"
import { formatDate, formatNumber, formatTime } from "@/lib/format"
import type {
  ProductionSkuSummary,
  ProductionStageWithRelations,
  ProductionUsageWithRelations,
} from "@/lib/data/operations"
import type { ProductionPipeline } from "@/types/database"

type PipelineOption = Pick<
  ProductionPipeline,
  "id" | "name" | "code" | "is_active"
>

function addSku(
  map: Map<string, ProductionSkuSummary>,
  sku: ProductionSkuSummary | null
) {
  if (sku) map.set(sku.id, sku)
}

export function ProductionAuditReport({
  pipelines,
  stages,
  usage,
}: {
  pipelines: PipelineOption[]
  stages: ProductionStageWithRelations[]
  usage: ProductionUsageWithRelations[]
}) {
  const [pipelineId, setPipelineId] = React.useState("")
  const [stageId, setStageId] = React.useState("")
  const [skuId, setSkuId] = React.useState("")
  const [fromDate, setFromDate] = React.useState("")
  const [toDate, setToDate] = React.useState("")

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

  const skuOptions = React.useMemo(() => {
    const skus = new Map<string, ProductionSkuSummary>()
    const relevantStages = stageId
      ? stages.filter((stage) => stage.id === stageId)
      : pipelineId
        ? stages.filter((stage) => stage.pipeline_id === pipelineId)
        : stages

    for (const stage of relevantStages) {
      for (const sku of stage.skus) addSku(skus, sku)
    }

    // Include SKUs that appear in recorded usage even if they are no longer
    // assigned to the stage, so historical audits stay complete.
    for (const line of usage) {
      if (stageId && line.stage_id !== stageId) continue
      if (!stageId && pipelineId && line.pipeline_id !== pipelineId) continue
      addSku(skus, line.sku)
    }

    return Array.from(skus.values()).sort((a, b) =>
      `${a.name} ${a.sku_code}`.localeCompare(`${b.name} ${b.sku_code}`)
    )
  }, [stages, usage, pipelineId, stageId])

  const filtered = React.useMemo(() => {
    return usage
      .filter((line) => {
        const usageDate = line.usage_date.slice(0, 10)
        return (
          (!pipelineId || line.pipeline_id === pipelineId) &&
          (!stageId || line.stage_id === stageId) &&
          (!skuId || line.sku_id === skuId) &&
          (!fromDate || usageDate >= fromDate) &&
          (!toDate || usageDate <= toDate)
        )
      })
      .sort(
        (a, b) =>
          b.usage_date.localeCompare(a.usage_date) ||
          b.recorded_at.localeCompare(a.recorded_at)
      )
  }, [usage, pipelineId, stageId, skuId, fromDate, toDate])

  const batchCount = new Set(
    filtered.map((line) => line.batch_id || line.id)
  ).size
  const skuCount = new Set(
    filtered
      .map((line) => line.sku_id)
      .filter((id): id is string => Boolean(id))
  ).size
  const stageCount = new Set(filtered.map((line) => line.stage_id)).size
  const hasFilters = Boolean(
    pipelineId || stageId || skuId || fromDate || toDate
  )
  const invalidDateRange = Boolean(fromDate && toDate && fromDate > toDate)

  function changePipeline(value: string) {
    setPipelineId(value)
    setStageId("")
    setSkuId("")
  }

  function changeStage(value: string) {
    setStageId(value)
    setSkuId("")
  }

  function clearFilters() {
    setPipelineId("")
    setStageId("")
    setSkuId("")
    setFromDate("")
    setToDate("")
  }

  const columns: DataTableColumn<ProductionUsageWithRelations>[] = [
    {
      id: "date",
      header: "Usage date",
      sortValue: (row) => row.usage_date,
      cell: (row) => (
        <div>
          <p className="text-xs tabular-nums">{formatDate(row.usage_date)}</p>
          <p className="text-[0.625rem] text-muted-foreground">
            Recorded {formatTime(row.recorded_at)}
          </p>
        </div>
      ),
    },
    {
      id: "pipeline",
      header: "Pipeline",
      sortValue: (row) => row.pipeline?.name ?? "",
      cell: (row) => (
        <div>
          <p className="text-xs font-medium">{row.pipeline?.name ?? "—"}</p>
          <p className="font-mono text-[0.625rem] text-muted-foreground">
            {row.pipeline?.code ?? "—"}
          </p>
        </div>
      ),
    },
    {
      id: "stage",
      header: "Stage",
      sortValue: (row) => row.stage?.sequence ?? 0,
      cell: (row) => (
        <div>
          <p className="text-xs">{row.stage?.name ?? "Stage removed"}</p>
          <p className="text-[0.625rem] text-muted-foreground">
            {row.stage ? `Sequence ${row.stage.sequence}` : "—"}
          </p>
        </div>
      ),
    },
    {
      id: "sku",
      header: "SKU",
      sortValue: (row) => row.sku?.sku_code ?? "",
      cell: (row) => (
        <div>
          <p className="text-xs font-medium">{row.sku?.name ?? "No SKU"}</p>
          <p className="font-mono text-[0.625rem] text-muted-foreground">
            {row.sku?.sku_code ?? "Legacy run usage"}
          </p>
        </div>
      ),
    },
    {
      id: "quantity",
      header: "Quantity",
      align: "right",
      sortValue: (row) => row.quantity,
      cell: (row) => (
        <span className="text-xs tabular-nums">
          {formatNumber(row.quantity)}{" "}
          <span className="text-muted-foreground">
            {row.uom ?? row.sku?.uom ?? ""}
          </span>
        </span>
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
              : row.submitted_by
                ? `User ${row.submitted_by.slice(0, 8)}`
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
        <span className="line-clamp-2 max-w-64 text-[0.625rem] text-muted-foreground">
          {row.notes || "—"}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-4">
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
          hint="SKUs in this result"
          icon={Tags}
          accent="emerald"
        />
        <MetricCard
          label="Stages covered"
          value={stageCount}
          hint="Stages in this result"
          icon={Layers}
          accent="amber"
        />
      </div>

      <Card size="sm">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <FilterX className="size-3.5 text-primary" />
            Report filters
          </CardTitle>
          <CardDescription>
            Choose a pipeline, stage, SKU or date range to narrow the audit
            table. Leave a filter on “All” to include everything.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-1.5">
              <Label htmlFor="audit-pipeline">Pipeline</Label>
              <NativeSelect
                id="audit-pipeline"
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
              <Label htmlFor="audit-stage">Stage</Label>
              <NativeSelect
                id="audit-stage"
                value={stageId}
                onChange={(event) => changeStage(event.target.value)}
                className="w-full"
                disabled={stageOptions.length === 0}
              >
                <NativeSelectOption value="">
                  {stageOptions.length === 0 ? "No stages available" : "All stages"}
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
              <Label htmlFor="audit-sku">SKU</Label>
              <NativeSelect
                id="audit-sku"
                value={skuId}
                onChange={(event) => setSkuId(event.target.value)}
                className="w-full"
                disabled={skuOptions.length === 0}
              >
                <NativeSelectOption value="">
                  {skuOptions.length === 0 ? "No SKUs available" : "All SKUs"}
                </NativeSelectOption>
                {skuOptions.map((sku) => (
                  <NativeSelectOption key={sku.id} value={sku.id}>
                    {sku.sku_code} · {sku.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="audit-from">From date</Label>
              <Input
                id="audit-from"
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(event) => setFromDate(event.target.value)}
                className="w-full"
                aria-invalid={invalidDateRange}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="audit-to">To date</Label>
              <Input
                id="audit-to"
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(event) => setToDate(event.target.value)}
                className="w-full"
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

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(row) => row.id}
        searchable={(row) =>
          [
            row.pipeline?.name,
            row.pipeline?.code,
            row.stage?.name,
            row.stage?.sequence,
            row.sku?.name,
            row.sku?.sku_code,
            row.submitter?.first_name,
            row.submitter?.last_name,
            row.submitter?.employee_no,
            row.notes,
            row.batch_id,
          ]
            .filter(Boolean)
            .join(" ")
        }
        searchPlaceholder="Search the audit result…"
        pageSize={15}
        emptyTitle="No usage matches these filters"
        emptyDescription="Try a different pipeline, stage, SKU or date range, or clear the filters to see all recorded usage."
        emptyIcon={ClipboardList}
        initialSort={{ id: "date", desc: true }}
      />
    </div>
  )
}
