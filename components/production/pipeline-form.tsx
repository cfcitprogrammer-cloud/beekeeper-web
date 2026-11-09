"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Factory, Save } from "lucide-react"

import { createProductionPipeline, updateProductionPipeline } from "@/actions/production.action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import type { ProductionPipelineWithRelations } from "@/lib/data/operations"

export function PipelineForm({ pipeline }: { pipeline?: ProductionPipelineWithRelations | null }) {
  const router = useRouter()
  const editingId = pipeline?.id ?? null
  const [saving, setSaving] = React.useState(false)
  const [draft, setDraft] = React.useState({
    name: pipeline?.name ?? "",
    code: pipeline?.code ?? "",
    description: pipeline?.description ?? "",
    isActive: pipeline?.is_active ?? true,
  })

  async function save() {
    if (!draft.name.trim() || !draft.code.trim()) { toast.add({ type: "error", title: "Name and code are required" }); return }
    setSaving(true)
    const payload = { name: draft.name, code: draft.code, description: draft.description, isActive: draft.isActive }
    const result = editingId ? await updateProductionPipeline({ ...payload, id: editingId }) : await createProductionPipeline(payload)
    setSaving(false)
    if (!result.success) { toast.add({ type: "error", title: "Could not save pipeline", description: result.error }); return }
    toast.add({ type: "success", title: editingId ? "Pipeline updated" : "Pipeline created" })
    router.push(editingId ? `/production/pipelines/${editingId}` : "/production")
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" onClick={() => router.push("/production")}><ArrowLeft />Back to production</Button>
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="pl-name">Name</Label><Input id="pl-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Honey extraction" /></div>
          <div className="space-y-1.5"><Label htmlFor="pl-code">Code</Label><Input id="pl-code" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} placeholder="HONEY-EXT" /></div>
          <div className="space-y-1.5"><Label htmlFor="pl-active">Status</Label><NativeSelect id="pl-active" value={draft.isActive ? "active" : "inactive"} onChange={(e) => setDraft({ ...draft, isActive: e.target.value === "active" })} className="w-full"><option value="active">Active</option><option value="inactive">Inactive</option></NativeSelect></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="pl-desc">Description</Label><Input id="pl-desc" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Optional" /></div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => router.push("/production")} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{editingId ? <Save /> : <Factory />}{saving ? "Saving…" : "Save pipeline"}</Button>
        </div>
      </div>
    </div>
  )
}
