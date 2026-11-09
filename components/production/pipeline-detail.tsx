"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Factory, Pencil, Play, Plus, Trash2 } from "lucide-react"

import { deleteProductionRun, deleteProductionStage, updateProductionRunStatus } from "@/actions/production.action"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { formatDateTime, humanize } from "@/lib/format"
import type { ProductionPipelineWithRelations } from "@/lib/data/operations"
import type { ProductionRun, ProductionStage } from "@/db/models/models"

export function PipelineDetail({ pipeline }: { pipeline: ProductionPipelineWithRelations }) {
  const router = useRouter()

  async function removeStage(stage: ProductionStage) {
    if (!window.confirm(`Delete stage "${stage.name}"?`)) return
    const result = await deleteProductionStage(stage.id)
    if (!result.success) { toast.add({ type: "error", title: "Could not delete stage", description: result.error }); return }
    toast.add({ type: "success", title: "Stage deleted" }); router.refresh()
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" render={<Link href="/production" />}><ArrowLeft />Back to production</Button>
        <Button size="sm" render={<Link href={`/production/pipelines/${pipeline.id}/edit`} />}><Pencil />Edit pipeline</Button>
        <Button size="sm" render={<Link href={`/production/pipelines/${pipeline.id}/stages/new`} />}><Plus />Add stage</Button>
        <Button variant="outline" size="sm" render={<Link href={`/production/runs/new?pipelineId=${pipeline.id}`} />}><Play />New run</Button>
      </div>
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Factory className="size-5" /></span><div><h2 className="text-lg font-semibold">{pipeline.name}</h2><p className="text-sm text-muted-foreground font-mono">{pipeline.code}</p><div className="mt-2"><StatusBadge status={pipeline.is_active ? "APPROVED" : "REJECTED"} /></div></div></div>
        {pipeline.description ? <p className="mt-4 text-sm">{pipeline.description}</p> : null}
      </div>
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <h3 className="mb-3 text-sm font-semibold">Stages ({pipeline.stages.length})</h3>
        <div className="space-y-2">{pipeline.stages.length === 0 ? <p className="text-xs text-muted-foreground">No stages yet.</p> : pipeline.stages.map((stage) => (<div key={stage.id} className="flex items-center justify-between rounded-md border p-2.5"><div><p className="text-xs font-medium">{stage.sequence}. {stage.name}</p><p className="text-[0.625rem] text-muted-foreground">{humanize(stage.stage_type)} · in {stage.input_uom || "—"} / out {stage.output_uom || "—"}</p></div><Button variant="ghost" size="icon-sm" onClick={() => removeStage(stage)} aria-label="Delete stage"><Trash2 className="size-3.5 text-destructive" /></Button></div>))}</div>
      </div>
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <h3 className="mb-3 text-sm font-semibold">Runs ({pipeline.runs.length})</h3>
        <div className="space-y-2">{pipeline.runs.length === 0 ? <p className="text-xs text-muted-foreground">No runs yet.</p> : pipeline.runs.map((run) => (<div key={run.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2.5"><div><p className="text-xs font-medium">{run.run_no}</p><p className="text-[0.625rem] text-muted-foreground">{formatDateTime(run.created_at)}</p></div><div className="flex items-center gap-1"><StatusBadge status={run.status} /><Button variant="outline" size="sm" render={<Link href={`/production/runs/${run.id}/usage/new`} />}>Record usage</Button>{run.status === "planned" ? <Button variant="outline" size="sm" onClick={() => setRunStatus(run, "in_progress")}>Start</Button> : null}{run.status === "in_progress" ? <Button variant="outline" size="sm" onClick={() => setRunStatus(run, "completed")}>Complete</Button> : null}{run.status !== "completed" && run.status !== "cancelled" ? <Button variant="ghost" size="sm" onClick={() => setRunStatus(run, "cancelled")}>Cancel</Button> : null}<Button variant="ghost" size="icon-sm" onClick={() => removeRun(run)} aria-label="Delete run"><Trash2 className="size-3.5 text-destructive" /></Button></div></div>))}</div>
      </div>
    </div>
  )
}
