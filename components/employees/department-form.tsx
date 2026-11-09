"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Save } from "lucide-react"

import { createDepartment, updateDepartment } from "@/actions/department.action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import type { Department } from "@/types/database"

export function DepartmentForm({
  department,
  departments,
}: {
  department?: Department | null
  departments: Department[]
}) {
  const router = useRouter()
  const editingId = department?.id ?? null
  const [saving, setSaving] = React.useState(false)
  const [draft, setDraft] = React.useState({
    name: department?.name ?? "",
    code: department?.code ?? "",
    parent_id: department?.parent_id ?? "",
  })

  async function saveHandler() {
    if (!draft.name.trim()) {
      toast.add({ type: "error", title: "Missing details", description: "Name is required." })
      return
    }
    setSaving(true)
    const payload = { name: draft.name, code: draft.code, parentId: draft.parent_id || undefined }
    const result = editingId
      ? await updateDepartment({ ...payload, id: editingId })
      : await createDepartment(payload)
    setSaving(false)
    if (!result.success) {
      toast.add({ type: "error", title: editingId ? "Could not update department" : "Could not create department", description: result.error })
      return
    }
    toast.add({ type: "success", title: editingId ? "Department updated" : "Department created", description: `${draft.name.trim()} saved.` })
    router.push("/employees/departments")
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" onClick={() => router.push("/employees/departments")}>
        <ArrowLeft />
        Back to departments
      </Button>
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="dep-name">Name</Label>
            <Input id="dep-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dep-code">Code</Label>
            <Input id="dep-code" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dep-parent">Parent department</Label>
            <NativeSelect id="dep-parent" value={draft.parent_id} onChange={(e) => setDraft({ ...draft, parent_id: e.target.value })}>
              <option value="">None</option>
              {departments.filter((d) => d.id !== editingId).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </NativeSelect>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => router.push("/employees/departments")} disabled={saving}>Cancel</Button>
          <Button onClick={saveHandler} disabled={saving}>
            {editingId ? <Save /> : <Plus />}
            {saving ? "Saving…" : editingId ? "Save changes" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  )
}
