"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Save, ShieldCheck, X } from "lucide-react"

import {
  createApprovalStage,
  updateApprovalStage,
  type StageApproverInput,
} from "@/actions/approval-stage.action"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import type { ApprovalStage, ApprovalStageApprover } from "@/types/database"

export function ApprovalStageForm({
  stage,
  initialApprovers = [],
  employees,
  roles,
}: {
  stage?: ApprovalStage | null
  initialApprovers?: ApprovalStageApprover[]
  employees: { id: string; name: string }[]
  roles: { id: string; name: string }[]
}) {
  const router = useRouter()
  const editingId = stage?.id ?? null
  const [saving, setSaving] = React.useState(false)
  const [draft, setDraft] = React.useState({
    name: stage?.name ?? "",
    description: stage?.description ?? "",
    requiredApprovals: String(stage?.required_approvals ?? 1),
  })
  const [approvers, setApprovers] = React.useState<StageApproverInput[]>(
    initialApprovers.map((approver) => ({
      userId: approver.user_id ?? undefined,
      roleId: approver.role_id ?? undefined,
    }))
  )

  const defaultType: "user" | "role" = roles.length > 0 ? "role" : "user"
  const [approverType, setApproverType] = React.useState<"user" | "role">(defaultType)
  const [approverValue, setApproverValue] = React.useState(
    defaultType === "role" ? (roles[0]?.id ?? "") : (employees[0]?.id ?? "")
  )

  const employeeNames = React.useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee.name])),
    [employees]
  )
  const roleNames = React.useMemo(
    () => new Map(roles.map((role) => [role.id, role.name])),
    [roles]
  )

  function approverKey(approver: StageApproverInput) {
    return approver.userId ? `user:${approver.userId}` : `role:${approver.roleId}`
  }

  function approverLabel(approver: StageApproverInput) {
    if (approver.userId) {
      return employeeNames.get(approver.userId) ?? `User ${approver.userId.slice(0, 8)}`
    }
    return roleNames.get(approver.roleId ?? "") ?? `Role ${(approver.roleId ?? "").slice(0, 8)}`
  }

  function addApprover() {
    if (!approverValue) {
      toast.add({
        type: "error",
        title: "No approver selected",
        description:
          approverType === "role"
            ? "Create a role first, or switch the type to user."
            : "Select an employee.",
      })
      return
    }

    const candidate: StageApproverInput =
      approverType === "role" ? { roleId: approverValue } : { userId: approverValue }

    if (approvers.some((approver) => approverKey(approver) === approverKey(candidate))) {
      toast.add({ type: "error", title: "Already assigned", description: "That approver is already on this stage." })
      return
    }

    setApprovers((current) => [...current, candidate])
  }

  function removeApprover(key: string) {
    setApprovers((current) => current.filter((approver) => approverKey(approver) !== key))
  }

  async function save() {
    if (!draft.name.trim()) { toast.add({ type: "error", title: "Name is required" }); return }
    setSaving(true)
    const payload = {
      name: draft.name,
      description: draft.description,
      requiredApprovals: Number(draft.requiredApprovals) || 1,
      approvers,
    }
    const result = editingId
      ? await updateApprovalStage({ ...payload, id: editingId })
      : await createApprovalStage(payload)
    setSaving(false)
    if (!result.success) { toast.add({ type: "error", title: "Could not save stage", description: result.error }); return }
    toast.add({ type: "success", title: editingId ? "Stage updated" : "Stage created" })
    const stageId = editingId ?? result.data?.id
    router.push(stageId ? `/approvals/stages/${stageId}` : "/approvals/stages")
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" onClick={() => router.push("/approvals/stages")}><ArrowLeft />Back to stages</Button>
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="grid gap-3">
          <div className="space-y-1.5"><Label htmlFor="stage-name">Name</Label><Input id="stage-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Manager approval" /></div>
          <div className="space-y-1.5"><Label htmlFor="stage-desc">Description</Label><Textarea id="stage-desc" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Optional notes for approvers" /></div>
          <div className="space-y-1.5"><Label htmlFor="stage-required">Required approvals</Label><Input id="stage-required" type="number" min={1} value={draft.requiredApprovals} onChange={(e) => setDraft({ ...draft, requiredApprovals: e.target.value })} /></div>

          <div className="space-y-2 border-t pt-3">
            <div>
              <Label>Approvers</Label>
              <p className="text-xs text-muted-foreground">
                Assign the people or roles that approve this stage. Approval templates that use this stage inherit these approvers.
              </p>
            </div>

            {approvers.length === 0 ? (
              <p className="text-xs text-muted-foreground">No approvers assigned yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {approvers.map((approver) => {
                  const key = approverKey(approver)
                  return (
                    <Badge key={key} variant="outline" className="gap-1 text-xs">
                      {approver.userId ? "User: " : "Role: "}
                      {approverLabel(approver)}
                      <button
                        type="button"
                        onClick={() => removeApprover(key)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Remove approver"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  )
                })}
              </div>
            )}

            <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/20 p-3">
              <div className="space-y-1">
                <Label className="text-[0.625rem]">Type</Label>
                <NativeSelect
                  value={approverType}
                  onChange={(e) => {
                    const type = e.target.value as "user" | "role"
                    setApproverType(type)
                    setApproverValue(type === "role" ? (roles[0]?.id ?? "") : (employees[0]?.id ?? ""))
                  }}
                  className="h-8"
                >
                  <option value="role" disabled={roles.length === 0}>Role</option>
                  <option value="user" disabled={employees.length === 0}>User</option>
                </NativeSelect>
              </div>
              <div className="space-y-1">
                <Label className="text-[0.625rem]">Approver</Label>
                <NativeSelect
                  value={approverValue}
                  onChange={(e) => setApproverValue(e.target.value)}
                  className="h-8"
                >
                  {approverType === "role"
                    ? roles.map((role) => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))
                    : employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>{employee.name}</option>
                      ))}
                </NativeSelect>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addApprover} disabled={saving}>
                <Plus />
                Add approver
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => router.push("/approvals/stages")} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{editingId ? <Save /> : <ShieldCheck />}{saving ? "Saving…" : "Save stage"}</Button>
        </div>
      </div>
    </div>
  )
}
