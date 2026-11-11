"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, Factory, Layers, Pencil, Plus, Trash2 } from "lucide-react"

import { deleteProductionPipeline } from "@/actions/production.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import type { ProductionPipelineWithRelations } from "@/lib/data/operations"

export function ProductionManager({
  pipelines,
}: {
  pipelines: ProductionPipelineWithRelations[]
}) {
  const router = useRouter()

  async function removePipeline(pipeline: ProductionPipelineWithRelations) {
    if (!window.confirm(`Delete pipeline "${pipeline.name}"?`)) return
    const result = await deleteProductionPipeline(pipeline.id)
    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not delete pipeline",
        description: result.error,
      })
      return
    }
    toast.add({ type: "success", title: "Pipeline deleted" })
    router.refresh()
  }

  const columns: DataTableColumn<ProductionPipelineWithRelations>[] = [
    {
      id: "pipeline",
      header: "Pipeline",
      sortValue: (row) => row.name,
      cell: (row) => (
        <div>
          <Link
            href={`/production/pipelines/${row.id}`}
            className="text-xs font-medium text-foreground hover:underline"
          >
            {row.name}
          </Link>
          <p className="font-mono text-[0.625rem] text-muted-foreground">
            {row.code}
          </p>
        </div>
      ),
    },
    {
      id: "description",
      header: "Description",
      hideBelow: "md",
      cell: (row) => (
        <span className="line-clamp-1 max-w-72 text-xs text-muted-foreground">
          {row.description || "—"}
        </span>
      ),
    },
    {
      id: "stages",
      header: "Stages",
      align: "right",
      sortValue: (row) => row.stages.length,
      cell: (row) => (
        <span className="text-xs tabular-nums">{row.stages.length}</span>
      ),
    },
    {
      id: "runs",
      header: "Runs",
      align: "right",
      hideBelow: "sm",
      sortValue: (row) => row.runs.length,
      cell: (row) => (
        <span className="text-xs tabular-nums">{row.runs.length}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <StatusBadge status={row.is_active ? "APPROVED" : "REJECTED"} />
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="View pipeline"
            render={<Link href={`/production/pipelines/${row.id}`} />}
          >
            <Eye className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={
              <Link href={`/production/stages?pipelineId=${row.id}`} />
            }
          >
            <Layers />
            Stages
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Edit pipeline"
            render={<Link href={`/production/pipelines/${row.id}/edit`} />}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => removePipeline(row)}
            aria-label="Delete pipeline"
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <DataTable
      data={pipelines}
      columns={columns}
      getRowId={(row) => row.id}
      searchable={(row) => `${row.name} ${row.code} ${row.description ?? ""}`}
      searchPlaceholder="Search pipelines…"
      pageSize={8}
      emptyTitle="No production pipelines"
      emptyDescription="Create a pipeline to define production stages."
      emptyIcon={Factory}
      onRowClick={(row) => router.push(`/production/pipelines/${row.id}`)}
      toolbar={
        <Button size="sm" render={<Link href="/production/pipelines/new" />}>
          <Plus />
          New pipeline
        </Button>
      }
    />
  )
}
