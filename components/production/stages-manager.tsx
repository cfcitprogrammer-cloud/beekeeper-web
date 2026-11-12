"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Boxes, Layers, Plus, Tags, Trash2 } from "lucide-react"

import { deleteProductionStage } from "@/actions/production.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import { humanize } from "@/lib/format"
import type { ProductionStageWithRelations } from "@/lib/data/operations"

export function StagesManager({
  stages,
  pipelineOptions,
  initialPipelineId,
  canAssign,
  canCreate,
}: {
  stages: ProductionStageWithRelations[]
  pipelineOptions: { id: string; name: string; code: string }[]
  initialPipelineId?: string
  canAssign: boolean
  canCreate: boolean
}) {
  const router = useRouter()
  const [pipelineId, setPipelineId] = React.useState(initialPipelineId ?? "all")

  const filtered = React.useMemo(
    () =>
      pipelineId === "all"
        ? stages
        : stages.filter((stage) => stage.pipeline_id === pipelineId),
    [stages, pipelineId]
  )

  async function removeStage(stage: ProductionStageWithRelations) {
    if (!window.confirm(`Delete stage "${stage.name}"?`)) return
    const result = await deleteProductionStage(stage.id)
    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not delete stage",
        description: result.error,
      })
      return
    }
    toast.add({ type: "success", title: "Stage deleted" })
    router.refresh()
  }

  const columns: DataTableColumn<ProductionStageWithRelations>[] = [
    {
      id: "stage",
      header: "Stage",
      sortValue: (row) => `${row.pipeline?.name ?? ""} ${row.sequence}`,
      cell: (row) => (
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium">
            <Layers className="size-3 text-muted-foreground" />
            {row.sequence}. {row.name}
          </p>
          <p className="text-[0.625rem] text-muted-foreground">
            {humanize(row.stage_type)}
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
          <p className="text-xs">{row.pipeline?.name ?? "—"}</p>
          <p className="font-mono text-[0.625rem] text-muted-foreground">
            {row.pipeline?.code ?? ""}
          </p>
        </div>
      ),
    },
    {
      id: "skus",
      header: "Assigned SKUs",
      sortValue: (row) => row.skus.length,
      cell: (row) =>
        row.skus.length === 0 ? (
          <span className="text-[0.625rem] text-muted-foreground">
            No SKUs assigned
          </span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.skus.slice(0, 3).map((sku) => (
              <span
                key={sku.id}
                className="rounded border bg-muted/40 px-1.5 py-0.5 text-[0.625rem]"
              >
                {sku.sku_code}
              </span>
            ))}
            {row.skus.length > 3 ? (
              <span className="text-[0.625rem] text-muted-foreground">
                +{row.skus.length - 3}
              </span>
            ) : null}
          </div>
        ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (row) => (
        <div className="flex justify-end gap-1">
          {canAssign ? (
            <Button
              variant="outline"
              size="sm"
              render={<Link href={`/production/stages/${row.id}/assign`} />}
            >
              <Tags />
              Assign SKUs
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => removeStage(row)}
            aria-label="Delete stage"
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
        [
          row.name,
          row.stage_type,
          row.pipeline?.name,
          row.pipeline?.code,
          ...row.skus.map((sku) => `${sku.sku_code} ${sku.name}`),
        ]
          .filter(Boolean)
          .join(" ")
      }
      searchPlaceholder="Search stages or assigned SKUs…"
      pageSize={10}
      emptyTitle="No production stages"
      emptyDescription="Create a stage and assign the SKUs it processes."
      emptyIcon={Boxes}
      filters={
        <NativeSelect
          value={pipelineId}
          onChange={(event) => setPipelineId(event.target.value)}
          aria-label="Filter stages by pipeline"
          className="w-auto"
        >
          <option value="all">All pipelines</option>
          {pipelineOptions.map((pipeline) => (
            <option key={pipeline.id} value={pipeline.id}>
              {pipeline.name}
            </option>
          ))}
        </NativeSelect>
      }
      toolbar={
        canCreate ? (
          <Button
            size="sm"
            render={
              <Link
                href={
                  pipelineId === "all"
                    ? "/production/stages/new"
                    : `/production/stages/new?pipelineId=${pipelineId}`
                }
              />
            }
          >
            <Plus />
            New stage
          </Button>
        ) : null
      }
    />
  )
}
