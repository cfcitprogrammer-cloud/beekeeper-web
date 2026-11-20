"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { BarChart3, FilterX, Layers, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select"
import { formatDate, formatNumber } from "@/lib/format"
import type { ProductionUsageBreakdown } from "@/lib/data/operations"
import type { ProductionPipeline } from "@/types/database"

type PipelineOption = Pick<
  ProductionPipeline,
  "id" | "name" | "code" | "is_active"
>

export function UsageBreakdownReport({
  pipelines,
  initialPipelineId,
  initialDate,
  breakdown,
}: {
  pipelines: PipelineOption[]
  initialPipelineId: string
  initialDate: string
  breakdown: ProductionUsageBreakdown | null
}) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [pipelineId, setPipelineId] = React.useState(initialPipelineId)
  const [usageDate, setUsageDate] = React.useState(initialDate)

  const hasSelection = Boolean(initialPipelineId)

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const params = new URLSearchParams()
    if (pipelineId) params.set("pipelineId", pipelineId)
    if (usageDate) params.set("date", usageDate)

    startTransition(() => {
      router.push(
        params.size > 0
          ? `/production/usage-breakdown?${params.toString()}`
          : "/production/usage-breakdown"
      )
    })
  }

  function resetFilters() {
    setPipelineId("")
    setUsageDate(initialDate)
    startTransition(() => {
      router.push("/production/usage-breakdown")
    })
  }

  return (
    <div className="space-y-4">
      <Card size="sm">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <FilterX className="size-3.5 text-primary" />
            Breakdown filters
          </CardTitle>
          <CardDescription>
            Choose a pipeline and a usage date. Every stage in the pipeline is
            shown as a column, with the SKUs used on that date underneath.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={applyFilters}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="breakdown-pipeline">Pipeline</Label>
              <NativeSelect
                id="breakdown-pipeline"
                value={pipelineId}
                onChange={(event) => setPipelineId(event.target.value)}
                className="w-full"
              >
                <NativeSelectOption value="">
                  Select a pipeline
                </NativeSelectOption>
                {pipelines.map((pipeline) => (
                  <NativeSelectOption key={pipeline.id} value={pipeline.id}>
                    {pipeline.name} · {pipeline.code}
                    {pipeline.is_active ? "" : " (inactive)"}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5 sm:w-48">
              <Label htmlFor="breakdown-date">Usage date</Label>
              <Input
                id="breakdown-date"
                type="date"
                value={usageDate}
                onChange={(event) => setUsageDate(event.target.value)}
                className="w-full"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={pending || !pipelineId || !usageDate}
              >
                {pending ? <Loader2 className="animate-spin" /> : <BarChart3 />}
                View breakdown
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetFilters}
                disabled={pending || (!pipelineId && usageDate === initialDate)}
              >
                <FilterX />
                Clear
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {!hasSelection ? (
        <EmptyState
          title="Select a pipeline to begin"
          description="The breakdown shows each stage as a column and lists the SKUs used on the selected date."
        />
      ) : !breakdown ? (
        <EmptyState
          title="Breakdown unavailable"
          description="The selected pipeline could not be found in this workspace. Pick another pipeline and try again."
        />
      ) : breakdown.stages.length === 0 ? (
        <EmptyState
          title="This pipeline has no stages yet"
          description="Add stages to the pipeline, then record usage to see it in the breakdown."
        />
      ) : (
        <Card size="sm">
          <CardHeader className="border-b">
            <CardTitle className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Layers className="size-3.5 text-primary" />
              <span>{breakdown.pipeline.name}</span>
              <span className="font-mono text-[0.625rem] font-normal text-muted-foreground">
                {breakdown.pipeline.code}
              </span>
            </CardTitle>
            <CardDescription>
              {formatDate(breakdown.usageDate)} · {breakdown.stages.length}{" "}
              stage{breakdown.stages.length === 1 ? "" : "s"} ·{" "}
              {breakdown.totalRows} SKU line
              {breakdown.totalRows === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr>
                    {breakdown.stages.map((stage) => (
                      <th
                        key={stage.id}
                        scope="col"
                        className="min-w-60 border-b border-r bg-muted/40 p-3 align-top last:border-r-0"
                      >
                        <p className="font-mono text-[0.5rem] tracking-[0.18em] text-muted-foreground uppercase">
                          Stage {String(stage.sequence).padStart(2, "0")}
                        </p>
                        <p className="mt-1 text-xs font-semibold">
                          {stage.name}
                        </p>
                        <p className="text-[0.625rem] font-normal text-muted-foreground">
                          {stage.rows.length === 0
                            ? "No usage"
                            : `${stage.rows.length} SKU${
                                stage.rows.length === 1 ? "" : "s"
                              }`}
                        </p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {breakdown.stages.map((stage) => (
                      <td
                        key={stage.id}
                        className="min-w-60 border-r p-3 align-top last:border-r-0"
                      >
                        {stage.rows.length === 0 ? (
                          <p className="text-[0.625rem] text-muted-foreground">
                            No usage recorded
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {stage.rows.map((row) => (
                              <div
                                key={row.skuId ?? `${stage.id}-no-sku`}
                                className="rounded-md border bg-muted/20 px-2 py-1.5"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="font-mono text-[0.625rem] font-medium">
                                      {row.skuCode}
                                    </p>
                                    <p
                                      className="truncate text-[0.625rem] text-muted-foreground"
                                      title={row.description}
                                    >
                                      {row.description}
                                    </p>
                                  </div>
                                  <span className="shrink-0 text-right text-xs font-medium tabular-nums">
                                    {formatNumber(row.quantity)}
                                    {row.uom ? (
                                      <span className="ml-1 text-[0.625rem] font-normal text-muted-foreground">
                                        {row.uom}
                                      </span>
                                    ) : null}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <span className="flex size-9 items-center justify-center rounded-full border bg-muted/40 text-muted-foreground">
          <BarChart3 className="size-4" />
        </span>
        <p className="text-xs font-medium">{title}</p>
        <p className="max-w-md text-[0.625rem] text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  )
}
