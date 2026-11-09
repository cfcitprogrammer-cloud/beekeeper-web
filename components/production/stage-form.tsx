"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus } from "lucide-react"

import { addProductionStage } from "@/actions/production.action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/toast"
import type { ProductionPipelineWithRelations } from "@/lib/data/operations"

export function StageForm({ pipeline }: { pipeline: ProductionPipelineWithRelations }) {
  const router = useRouter()
  const [saving, setSaving] = React.useState(false)
  const [draft, setDraft] = React.useState({ name: "", stageType: "processing", inputUom: "", outputUom: "", description: "" })

  async function save() {
    if (!draft.name.trim()) { toast.add({ type: "error", title: "Stage name is required" }); return }
    setSaving(true)
    const result = await addProductionStage({ pipelineId: pipeline.id, name: draft.name, stageType: draft.stageType, inputUom: draft.inputUom, outputUom: draft.outputUom, description: draft.description })
    setSaving(false)
    if (!result.success) { toast.add({ type: "error", title: "Could not add stage", description: result.error }); return }
    toast.add({ type: "success", title: "Stage added" })
    router.push(`/production/pipelines/${pipeline.id}`)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" onClick={() => router.push(`/production/pipelines/${pipeline.id}`)}><ArrowLeft />Back to pipeline</Button>
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <p className="mb-4 text-sm text-muted-foreground">Pipeline: {pipeline.name} ({pipeline.code}) · next sequence {pipeline.stages.length + 1}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="st-name">Stage name</Label><Input id="st-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Extraction" /></div>
          <div className="space-y-1.5"><Label htmlFor="st-type">Stage type</Label><Input id="st-type" value={draft.stageType} onChange={(e) => setDraft({ ...draft, stageType: e.target.value })} placeholder="processing" /></div>
          <div className="space-y-1.5"><Label htmlFor="st-desc">Description</Label><Input id="st-desc" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Optional" /></div>
          <div className="space-y-1.5"><Label htmlFor="st-in">Input UOM</Label><Input id="st-in" value={draft.inputUom} onChange={(e) => setDraft({ ...draft, inputUom: e.target.value })} placeholder="kg" /></div>
          <div className="space-y-1.5"><Label htmlFor="st-out">Output UOM</Label><Input id="st-out" value={draft.outputUom} onChange={(e) => setDraft({ ...draft, outputUom: e.target.value })} placeholder="L" /></div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => router.push(`/production/pipelines/${pipeline.id}`)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}><Plus />{saving ? "Adding…" : "Add stage"}</Button>
        </div>
      </div>
    </div>
  )
}
