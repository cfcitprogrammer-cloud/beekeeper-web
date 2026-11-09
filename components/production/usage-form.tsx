"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, FlaskConical } from "lucide-react"

import { recordProductionUsage } from "@/actions/production.action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import type { ProductionPipeline, ProductionRun, ProductionStage } from "@/db/models/models"

export function UsageForm({ run }: { run: ProductionRun & { pipeline: ProductionPipeline | null; stages: ProductionStage[] } }) {
  const router = useRouter()
  const [saving, setSaving] = React.useState(false)
  const [draft, setDraft] = React.useState({ stageId: run.stages[0]?.id || "", inputQuantity: "0", outputQuantity: "0", wasteQuantity: "0", uom: run.stages[0]?.output_uom || "", notes: "" })

  async function save() {
    if (!draft.stageId) { toast.add({ type: "error", title: "Select a stage" }); return }
    setSaving(true)
    const result = await recordProductionUsage({ runId: run.id, stageId: draft.stageId, inputQuantity: Number(draft.inputQuantity), outputQuantity: Number(draft.outputQuantity), wasteQuantity: Number(draft.wasteQuantity), uom: draft.uom, notes: draft.notes })
    setSaving(false)
    if (!result.success) { toast.add({ type: "error", title: "Could not record usage", description: result.error }); return }
    toast.add({ type: "success", title: "Usage recorded", description: result.data.flowedToStageId ? "Output was flowed to the next stage." : "No next stage; output was recorded on this stage." })
    router.push(`/production/pipelines/${run.pipeline_id}`)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" onClick={() => router.push(`/production/pipelines/${run.pipeline_id}`)}><ArrowLeft />Back to pipeline</Button>
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <p className="mb-4 text-sm text-muted-foreground">Run {run.run_no} · {run.pipeline?.name ?? "Pipeline"} · Output flows to the next connected stage automatically.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="u-stage">Stage</Label><NativeSelect id="u-stage" value={draft.stageId} onChange={(e) => { const stage = run.stages.find((s) => s.id === e.target.value); setDraft({ ...draft, stageId: e.target.value, uom: stage?.output_uom || draft.uom }) }} className="w-full"><option value="">Select stage</option>{run.stages.map((s) => (<option key={s.id} value={s.id}>{s.sequence}. {s.name}</option>))}</NativeSelect></div>
          <div className="space-y-1.5"><Label htmlFor="u-in">Input quantity</Label><Input id="u-in" type="number" min={0} step="0.01" value={draft.inputQuantity} onChange={(e) => setDraft({ ...draft, inputQuantity: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="u-out">Output quantity</Label><Input id="u-out" type="number" min={0} step="0.01" value={draft.outputQuantity} onChange={(e) => setDraft({ ...draft, outputQuantity: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="u-waste">Waste quantity</Label><Input id="u-waste" type="number" min={0} step="0.01" value={draft.wasteQuantity} onChange={(e) => setDraft({ ...draft, wasteQuantity: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="u-uom">UOM</Label><Input id="u-uom" value={draft.uom} onChange={(e) => setDraft({ ...draft, uom: e.target.value })} placeholder="kg, L, pcs" /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="u-notes">Notes</Label><Input id="u-notes" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Optional" /></div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => router.push(`/production/pipelines/${run.pipeline_id}`)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}><FlaskConical />{saving ? "Recording…" : "Record usage"}</Button>
        </div>
      </div>
    </div>
  )
}
