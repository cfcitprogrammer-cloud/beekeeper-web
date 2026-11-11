"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Play } from "lucide-react"

import { createProductionRun } from "@/actions/production.action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import type { ProductionPipelineWithRelations } from "@/lib/data/operations"

export function RunForm({ pipelines, defaultPipelineId }: { pipelines: ProductionPipelineWithRelations[]; defaultPipelineId?: string }) {
  const router = useRouter()
  const [saving, setSaving] = React.useState(false)
  const activePipelines = pipelines.filter((p) => p.is_active)
  const [draft, setDraft] = React.useState({ pipelineId: defaultPipelineId || activePipelines[0]?.id || "", notes: "" })

  async function save() {
    if (!draft.pipelineId) { toast.add({ type: "error", title: "Select a pipeline" }); return }
    setSaving(true)
    const result = await createProductionRun({ pipelineId: draft.pipelineId, notes: draft.notes })
    setSaving(false)
    if (!result.success) { toast.add({ type: "error", title: "Could not create run", description: result.error }); return }
    toast.add({ type: "success", title: `Run ${result.data.run_no} created` })
    router.push(`/production/pipelines/${draft.pipelineId}`)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" onClick={() => router.push(defaultPipelineId ? `/production/pipelines/${defaultPipelineId}` : "/production")}><ArrowLeft />Back</Button>
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="run-pipeline">Pipeline</Label><NativeSelect id="run-pipeline" value={draft.pipelineId} onChange={(e) => setDraft({ ...draft, pipelineId: e.target.value })} className="w-full"><option value="">Select pipeline</option>{activePipelines.map((p) => (<option key={p.id} value={p.id}>{p.name} · {p.code}</option>))}</NativeSelect></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="run-notes">Notes</Label><Input id="run-notes" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Batch notes" /></div>
        </div>
        <p className="mt-3 text-[0.625rem] text-muted-foreground">New runs start with the database default status (planned).</p>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => router.push("/production")} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}><Play />{saving ? "Creating…" : "Create run"}</Button>
        </div>
      </div>
    </div>
  )
}
