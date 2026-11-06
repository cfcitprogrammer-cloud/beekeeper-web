"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Download, Plus, ShieldCheck, Trash2 } from "lucide-react"

import {
  addStageApprover,
  addTemplateCondition,
  addTemplateOriginator,
  addTemplateStage,
  removeStageApprover,
  removeTemplateCondition,
  removeTemplateOriginator,
  removeTemplateStage,
} from "@/actions/approval-template-config.action"
import { Modal } from "@/components/shared/modal"
import { StatusBadge } from "@/components/shared/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import type {
  ApprovalStage,
  ApprovalTemplateWithConfig,
} from "@/types/database"

const OPERATORS = ["=", "<>", ">", ">=", "<", "<="] as const

export function ApprovalTemplateConfigManager({
  template,
  stages,
  employees,
  roles,
}: {
  template: ApprovalTemplateWithConfig
  stages: ApprovalStage[]
  employees: { id: string; name: string }[]
  roles: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [saving, setSaving] = React.useState(false)

  const stageById = React.useMemo(() => new Map(stages.map((s) => [s.id, s])), [stages])
  const usedStageIds = React.useMemo(
    () => new Set(template.stages.map((ts) => ts.stage_id)),
    [template.stages]
  )
  const availableStages = stages.filter((s) => !usedStageIds.has(s.id))

  const [addStageId, setAddStageId] = React.useState(availableStages[0]?.id ?? "")
  const [addStageSeq, setAddStageSeq] = React.useState(String(template.stages.length + 1))

  const [approverStageId, setApproverStageId] = React.useState(template.stages[0]?.stage_id ?? "")
  const [approverType, setApproverType] = React.useState<"user" | "role">("role")
  const [approverValue, setApproverValue] = React.useState(roles[0]?.id ?? "")

  const [condField, setCondField] = React.useState("")
  const [condOp, setCondOp] = React.useState<(typeof OPERATORS)[number]>("=")
  const [condValue, setCondValue] = React.useState("")
  const [condNumeric, setCondNumeric] = React.useState(false)

  const [originatorValue, setOriginatorValue] = React.useState(employees[0]?.id ?? "")

  async function handleAddStage() {
    if (!addStageId) {
      toast.add({ type: "error", title: "Missing stage", description: "Select a stage." })
      return
    }
    setSaving(true)
    const result = await addTemplateStage({
      templateId: template.id,
      stageId: addStageId,
      seq: Number(addStageSeq) || template.stages.length + 1,
    })
    setSaving(false)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not add stage", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Stage added" })
    router.refresh()
  }

  async function handleRemoveStage(id: string) {
    if (!window.confirm("Remove this stage from the template?")) return
    const result = await removeTemplateStage(id, template.id)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not remove stage", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Stage removed" })
    router.refresh()
  }

  async function handleAddApprover() {
    if (!approverStageId) {
      toast.add({ type: "error", title: "Missing stage", description: "Select a stage." })
      return
    }
    setSaving(true)
    const result = await addStageApprover({
      stageId: approverStageId,
      userId: approverType === "user" ? approverValue : undefined,
      roleId: approverType === "role" ? approverValue : undefined,
    })
    setSaving(false)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not add approver", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Approver added" })
    router.refresh()
  }

  async function handleRemoveApprover(id: string) {
    const result = await removeStageApprover(id)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not remove approver", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Approver removed" })
    router.refresh()
  }

  async function handleAddCondition() {
    if (!condField.trim()) {
      toast.add({ type: "error", title: "Missing field", description: "Field is required." })
      return
    }
    setSaving(true)
    const result = await addTemplateCondition({
      templateId: template.id,
      field: condField,
      operator: condOp,
      valueNumeric: condNumeric ? Number(condValue) || 0 : undefined,
      valueText: condNumeric ? undefined : condValue,
    })
    setSaving(false)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not add condition", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Condition added" })
    setCondField("")
    setCondValue("")
    router.refresh()
  }

  async function handleRemoveCondition(id: string) {
    const result = await removeTemplateCondition(id, template.id)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not remove condition", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Condition removed" })
    router.refresh()
  }

  async function handleAddOriginator() {
    if (!originatorValue) {
      toast.add({ type: "error", title: "Missing user", description: "Select a user." })
      return
    }
    setSaving(true)
    const result = await addTemplateOriginator({ templateId: template.id, userId: originatorValue })
    setSaving(false)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not add originator", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Originator added" })
    router.refresh()
  }

  async function handleRemoveOriginator(userId: string) {
    const result = await removeTemplateOriginator(template.id, userId)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not remove originator", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Originator removed" })
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Stages */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Stages</h2>
        <div className="space-y-2">
          {template.stages.length === 0 ? (
            <p className="text-xs text-muted-foreground">No stages configured yet.</p>
          ) : (
            template.stages.map((ts) => {
              const stage = ts.stage ?? stageById.get(ts.stage_id)
              const approvers = ts.approvers ?? []
              return (
                <div key={ts.id} className="rounded-lg border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium">
                        {ts.sequence}. {stage?.name ?? ts.stage_id}
                      </p>
                      <p className="text-[0.625rem] text-muted-foreground">
                        Required approvals: {stage?.required_approvals ?? 1}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveStage(ts.id)}
                      aria-label="Remove stage"
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                  <div className="mt-2 space-y-1">
                    <p className="text-[0.625rem] font-medium text-muted-foreground">Approvers</p>
                    {approvers.length === 0 ? (
                      <p className="text-[0.625rem] text-muted-foreground">None assigned.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {approvers.map((a) => (
                          <Badge key={a.id} variant="outline" className="gap-1 text-[0.625rem]">
                            {a.user_id ? `User ${a.user_id.slice(0, 8)}` : a.role_id ? `Role ${a.role_id.slice(0, 8)}` : "—"}
                            <button
                              type="button"
                              onClick={() => handleRemoveApprover(a.id)}
                              className="text-muted-foreground hover:text-destructive"
                              aria-label="Remove approver"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {availableStages.length > 0 && (
          <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/20 p-3">
            <div className="space-y-1">
              <Label className="text-[0.625rem]">Stage</Label>
              <NativeSelect
                value={addStageId}
                onChange={(e) => setAddStageId(e.target.value)}
                className="h-8"
              >
                {availableStages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label className="text-[0.625rem]">Sequence</Label>
              <Input
                type="number"
                min={1}
                value={addStageSeq}
                onChange={(e) => setAddStageSeq(e.target.value)}
                className="h-8 w-20"
              />
            </div>
            <Button size="sm" onClick={handleAddStage} disabled={saving}>
              <Plus />
              Add stage
            </Button>
          </div>
        )}

        {template.stages.length > 0 && (
          <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/20 p-3">
            <div className="space-y-1">
              <Label className="text-[0.625rem]">Stage</Label>
              <NativeSelect
                value={approverStageId}
                onChange={(e) => setApproverStageId(e.target.value)}
                className="h-8"
              >
                {template.stages.map((ts) => {
                  const stage = ts.stage ?? stageById.get(ts.stage_id)
                  return (
                    <option key={ts.stage_id} value={ts.stage_id}>
                      {stage?.name ?? ts.stage_id}
                    </option>
                  )
                })}
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label className="text-[0.625rem]">Type</Label>
              <NativeSelect
                value={approverType}
                onChange={(e) => {
                  setApproverType(e.target.value as "user" | "role")
                  setApproverValue(e.target.value === "user" ? (employees[0]?.id ?? "") : (roles[0]?.id ?? ""))
                }}
                className="h-8"
              >
                <option value="role">Role</option>
                <option value="user">User</option>
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
                  ? roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))
                  : employees.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
              </NativeSelect>
            </div>
            <Button size="sm" onClick={handleAddApprover} disabled={saving}>
              <Plus />
              Add approver
            </Button>
          </div>
        )}
      </section>

      {/* Conditions */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Conditions</h2>
        <div className="space-y-2">
          {template.conditions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No conditions configured.</p>
          ) : (
            template.conditions.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                <p className="text-xs">
                  {c.field} {c.operator} {c.value}
                </p>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleRemoveCondition(c.id)}
                  aria-label="Remove condition"
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>
        <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/20 p-3">
          <div className="space-y-1">
            <Label className="text-[0.625rem]">Field</Label>
            <Input value={condField} onChange={(e) => setCondField(e.target.value)} className="h-8 w-32" placeholder="amount" />
          </div>
          <div className="space-y-1">
            <Label className="text-[0.625rem]">Operator</Label>
            <NativeSelect value={condOp} onChange={(e) => setCondOp(e.target.value as (typeof OPERATORS)[number])} className="h-8">
              {OPERATORS.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <Label className="text-[0.625rem]">Value</Label>
            <Input
              value={condValue}
              onChange={(e) => setCondValue(e.target.value)}
              className="h-8 w-32"
              placeholder="1000"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={condNumeric}
              onChange={(e) => setCondNumeric(e.target.checked)}
              id="cond-numeric"
            />
            <Label htmlFor="cond-numeric" className="text-[0.625rem]">
              Numeric
            </Label>
          </div>
          <Button size="sm" onClick={handleAddCondition} disabled={saving}>
            <Plus />
            Add condition
          </Button>
        </div>
      </section>

      {/* Originators */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Originators (who can submit)</h2>
        <p className="text-xs text-muted-foreground">
          Leave empty to allow any authenticated company member to submit.
        </p>
        {template.originators.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {template.originators.map((o) => (
              <Badge key={o.user_id} variant="outline" className="gap-1 text-[0.625rem]">
                {employees.find((e) => e.id === o.user_id)?.name ?? o.user_id.slice(0, 8)}
                <button
                  type="button"
                  onClick={() => handleRemoveOriginator(o.user_id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Remove originator"
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/20 p-3">
          <div className="space-y-1">
            <Label className="text-[0.625rem]">User</Label>
            <NativeSelect
              value={originatorValue}
              onChange={(e) => setOriginatorValue(e.target.value)}
              className="h-8"
            >
              {employees.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Button size="sm" onClick={handleAddOriginator} disabled={saving}>
            <Plus />
            Add originator
          </Button>
        </div>
      </section>
    </div>
  )
}