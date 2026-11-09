"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Save } from "lucide-react"

import { createLeaveType, updateLeaveType } from "@/actions/leave-type.action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"
import type { LeaveType } from "@/types/database"

const emptyDraft = {
  name: "",
  code: "",
  is_paid: true,
  default_days_per_year: "12",
  requires_approval: true,
  carry_over_days: "0",
}

export function LeaveTypeForm({ leaveType }: { leaveType?: LeaveType | null }) {
  const router = useRouter()
  const editingId = leaveType?.id ?? null
  const [saving, setSaving] = React.useState(false)
  const [draft, setDraft] = React.useState(() =>
    leaveType
      ? {
          name: leaveType.name,
          code: leaveType.code,
          is_paid: leaveType.is_paid,
          default_days_per_year: String(leaveType.default_days_per_year),
          requires_approval: leaveType.requires_approval,
          carry_over_days: String(leaveType.carry_over_days),
        }
      : emptyDraft
  )

  async function saveHandler() {
    if (!draft.name.trim() || !draft.code.trim()) {
      toast.add({
        type: "error",
        title: "Missing details",
        description: "Name and code are required.",
      })
      return
    }
    setSaving(true)
    const payload = {
      name: draft.name,
      code: draft.code,
      isPaid: draft.is_paid,
      defaultDaysPerYear: Number(draft.default_days_per_year) || 0,
      requiresApproval: draft.requires_approval,
      carryOverDays: Number(draft.carry_over_days) || 0,
    }
    const result = editingId
      ? await updateLeaveType({ ...payload, id: editingId })
      : await createLeaveType(payload)
    setSaving(false)
    if (!result.success) {
      toast.add({
        type: "error",
        title: editingId ? "Could not update leave type" : "Could not create leave type",
        description: result.error,
      })
      return
    }
    toast.add({
      type: "success",
      title: editingId ? "Leave type updated" : "Leave type created",
      description: `${draft.name.trim()} saved.`,
    })
    router.push("/leave/types")
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" onClick={() => router.push("/leave/types")}>
        <ArrowLeft />
        Back to leave types
      </Button>

      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="lt-name">Name</Label>
            <Input
              id="lt-name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lt-code">Code</Label>
            <Input
              id="lt-code"
              value={draft.code}
              onChange={(e) => setDraft({ ...draft, code: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lt-days">Default days per year</Label>
            <Input
              id="lt-days"
              type="number"
              min={0}
              value={draft.default_days_per_year}
              onChange={(e) => setDraft({ ...draft, default_days_per_year: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lt-carry">Carry over days</Label>
            <Input
              id="lt-carry"
              type="number"
              min={0}
              value={draft.carry_over_days}
              onChange={(e) => setDraft({ ...draft, carry_over_days: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={draft.is_paid}
              onCheckedChange={(v) => setDraft({ ...draft, is_paid: v })}
            />
            <Label>Paid leave</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={draft.requires_approval}
              onCheckedChange={(v) => setDraft({ ...draft, requires_approval: v })}
            />
            <Label>Requires approval</Label>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => router.push("/leave/types")} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={saveHandler} disabled={saving}>
            {editingId ? <Save /> : <Plus />}
            {saving ? "Saving…" : editingId ? "Save changes" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  )
}
