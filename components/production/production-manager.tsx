"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, Factory, FlaskConical, Pencil, Play, Plus, Trash2 } from "lucide-react"

import { deleteProductionPipeline, deleteProductionRun, updateProductionRunStatus } from "@/actions/production.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { formatDateTime, humanize } from "@/lib/format"
import type { ProductionPipelineWithRelations } from "@/lib/data/operations"
import type { ProductionRun } from "@/db/models/models"

export function ProductionManager({ pipelines }: { pipelines: ProductionPipelineWithRelations[] }) {
  const router = useRouter()
  const runs = React.useMemo(() => pipelines.flatMap((p) => p.runs.map((r) => ({ ...r, pipelineName: p.name, pipelineCode: p.code }))), [pipelines])

  async function removePipeline(pipeline: ProductionPipelineWithRelations) {
    if (!window.confirm(`Delete pipeline "${pipeline.name}"?`)) return
    const result = await deleteProductionPipeline(pipeline.id)
    if (!result.success) { toast.add({ type: "error", title: "Could not delete pipeline", description: result.error }); return }
    toast.add({ type: "success", title: "Pipeline deleted" }); router.refresh()
  }
  async function setRunStatus(run: ProductionRun, status: string) {
    const result = await updateProductionRunStatus(run.id, status)
    if (!result.success) { toast.add({ type: "error", title: "Could not update run", description: result.error }); return }
    toast.add({ type: "success", title: `Run marked ${humanize(status)}` }); router.refresh()
  }
  async function removeRun(run: ProductionRun) {
    if (!window.confirm(`Delete run ${run.run_no}?`)) return
    const result = await deleteProductionRun(run.id)
    if (!result.success) { toast.add({ type: "error", title: "Could not delete run", description: result.error }); return }
    toast.add({ type: "success", title: "Run deleted" }); router.refresh()
  }

  const pipelineColumns: DataTableColumn<ProductionPipelineWithRelations>[] = [
    { id: "pipeline", header: "Pipeline", sortValue: (row) => row.name, cell: (row) => (<div><Link href={`/production/pipelines/${row.id}`} className="text-xs font-medium text-foreground hover:underline">{row.name}</Link><p className="text-[0.625rem] text-muted-foreground font-mono">{row.code} · {row.stages.length} stage{row.stages.length === 1 ? "" : "s"}</p></div>) },
    { id: "runs", header: "Runs", align: "right", sortValue: (row) => row.runs.length, cell: (row) => <span className="text-xs tabular-nums">{row.runs.length}</span> },
    { id: "status", header: "Status", cell: (row) => <StatusBadge status={row.is_active ? "APPROVED" : "REJECTED"} /> },
    { id: "actions", header: "", align: "right", cell: (row) => (<div className="flex justify-end gap-1"><Button variant="ghost" size="icon-sm" aria-label="View pipeline" render={<Link href={`/production/pipelines/${row.id}`} />}><Eye className="size-3.5" /></Button><Button variant="outline" size="sm" render={<Link href={`/production/pipelines/${row.id}/stages/new`} />}><Plus />Stage</Button><Button variant="outline" size="sm" render={<Link href={`/production/runs/new?pipelineId=${row.id}`} />}><Play />Run</Button><Button variant="ghost" size="icon-sm" aria-label="Edit pipeline" render={<Link href={`/production/pipelines/${row.id}/edit`} />}><Pencil className="size-3.5" /></Button><Button variant="ghost" size="icon-sm" onClick={() => removePipeline(row)} aria-label="Delete pipeline"><Trash2 className="size-3.5 text-destructive" /></Button></div>) },
  ]

  type RunRow = ProductionRun & { pipelineName: string; pipelineCode: string }
  const runColumns: DataTableColumn<RunRow>[] = [
    { id: "run", header: "Run", sortValue: (row) => row.run_no, cell: (row) => (<div><p className="text-xs font-medium">{row.run_no}</p><p className="text-[0.625rem] text-muted-foreground">{row.pipelineName} · {row.pipelineCode}</p></div>) },
    { id: "created", header: "Created", hideBelow: "md", sortValue: (row) => row.created_at, cell: (row) => <span className="text-[0.625rem] text-muted-foreground">{formatDateTime(row.created_at)}</span> },
    { id: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    { id: "actions", header: "", align: "right", cell: (row) => (<div className="flex justify-end gap-1"><Button variant="outline" size="sm" render={<Link href={`/production/runs/${row.id}/usage/new`} />}><FlaskConical />Usage</Button>{row.status === "planned" ? <Button variant="outline" size="sm" onClick={() => setRunStatus(row, "in_progress")}>Start</Button> : null}{row.status === "in_progress" ? <Button variant="outline" size="sm" onClick={() => setRunStatus(row, "completed")}>Complete</Button> : null}{row.status !== "completed" && row.status !== "cancelled" ? <Button variant="ghost" size="sm" onClick={() => setRunStatus(row, "cancelled")}>Cancel</Button> : null}<Button variant="ghost" size="icon-sm" onClick={() => removeRun(row)} aria-label="Delete run"><Trash2 className="size-3.5 text-destructive" /></Button></div>) },
  ]

  return (
    <div className="space-y-5">
      <DataTable data={pipelines} columns={pipelineColumns} getRowId={(row) => row.id} searchable={(row) => `${row.name} ${row.code} ${row.description ?? ""}`} searchPlaceholder="Search pipelines…" pageSize={8} emptyTitle="No production pipelines" emptyDescription="Create a pipeline to define stages and start runs." emptyIcon={Factory} onRowClick={(row) => router.push(`/production/pipelines/${row.id}`)} toolbar={<><Button variant="outline" size="sm" render={<Link href="/production/runs/new" />}><Play />New run</Button><Button size="sm" render={<Link href="/production/pipelines/new" />}><Plus />New pipeline</Button></>} />
      <div className="rounded-xl border bg-card"><div className="border-b px-4 py-3"><p className="text-[0.625rem] font-semibold tracking-wider text-muted-foreground uppercase">Production runs</p><p className="font-heading text-sm font-semibold">{runs.length} runs</p></div><div className="p-3"><DataTable data={runs} columns={runColumns} getRowId={(row) => row.id} searchable={(row) => `${row.run_no} ${row.pipelineName} ${row.pipelineCode} ${row.status}`} searchPlaceholder="Search runs…" pageSize={10} emptyTitle="No runs yet" emptyDescription="Create a run for a pipeline." emptyIcon={Play} /></div></div>
    </div>
  )
}
