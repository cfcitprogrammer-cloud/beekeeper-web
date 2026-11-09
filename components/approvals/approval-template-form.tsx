"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, GitBranch } from "lucide-react"

import { createApprovalTemplate } from "@/actions/approval.action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"

export function ApprovalTemplateForm() {
  const router = useRouter()
  const [saving, setSaving] = React.useState(false)
  const [draft, setDraft] = React.useState({ name: "", description: "", documentType: "BOOKING" as "BOOKING" | "OUTLET" })

  async function save() {
    if (!draft.name.trim()) { toast.add({ type: "error", title: "Name is required" }); return }
    setSaving(true)
    const result = await createApprovalTemplate({ name: draft.name, description: draft.description, documentType: draft.documentType })
    setSaving(false)
    if (!result.success) { toast.add({ type: "error", title: "Could not create template", description: result.error }); return }
    toast.add({ type: "success", title: "Template created", description: "Configure stages, approvers, conditions and originators." })
    router.push(`/approvals/templates/${result.data.id}`)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" onClick={() => router.push("/approvals/templates")}><ArrowLeft />Back to templates</Button>
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="grid gap-3">
          <div className="space-y-1.5"><Label htmlFor="tpl-name">Name</Label><Input id="tpl-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Booking approval" /></div>
          <div className="space-y-1.5"><Label htmlFor="tpl-desc">Description</Label><Input id="tpl-desc" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Optional" /></div>
          <div className="space-y-1.5"><Label htmlFor="tpl-doc">Document type</Label><NativeSelect id="tpl-doc" value={draft.documentType} onChange={(e) => setDraft({ ...draft, documentType: e.target.value as "BOOKING" | "OUTLET" })} className="w-full"><option value="BOOKING">Booking</option><option value="OUTLET">Outlet</option></NativeSelect></div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => router.push("/approvals/templates")} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}><GitBranch />{saving ? "Creating…" : "Create template"}</Button>
        </div>
      </div>
    </div>
  )
}
