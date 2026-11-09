"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Pencil, ShieldCheck, Trash2 } from "lucide-react"

import { removeStageApprover } from "@/actions/approval-template-config.action"
import { StatusBadge } from "@/components/shared/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import type { ApprovalStage, ApprovalStageApprover } from "@/types/database"

export function ApprovalStageDetail({
  stage,
  approvers,
  employees,
  roles,
}: {
  stage: ApprovalStage
  approvers: ApprovalStageApprover[]
  employees: { id: string; name: string }[]
  roles: { id: string; name: string }[]
}) {
  const router = useRouter()

  const employeeNames = React.useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee.name])),
    [employees]
  )
  const roleNames = React.useMemo(
    () => new Map(roles.map((role) => [role.id, role.name])),
    [roles]
  )

  async function removeApprover(id: string) {
    if (!window.confirm("Remove this approver from the stage?")) return
    const result = await removeStageApprover(id)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not remove approver", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Approver removed" })
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" render={<Link href="/approvals/stages" />}><ArrowLeft />Back to stages</Button>
        <Button size="sm" render={<Link href={`/approvals/stages/${stage.id}/edit`} />}><Pencil />Edit stage</Button>
      </div>
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><ShieldCheck className="size-5" /></span>
          <div><h2 className="text-lg font-semibold">{stage.name}</h2><p className="text-sm text-muted-foreground">Required approvals: {stage.required_approvals}</p><div className="mt-2"><StatusBadge status={stage.is_active ? "APPROVED" : "REJECTED"} /></div></div>
        </div>
        {stage.description ? <p className="mt-4 text-sm">{stage.description}</p> : <p className="mt-4 text-sm text-muted-foreground">No description.</p>}

        <div className="mt-6 border-t pt-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">Approvers</h3>
              <p className="text-xs text-muted-foreground">Used by every approval template that includes this stage.</p>
            </div>
            <Button size="sm" variant="outline" render={<Link href={`/approvals/stages/${stage.id}/edit`} />}><Pencil />Manage</Button>
          </div>

          {approvers.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No approvers assigned yet. Edit the stage to add users or roles.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {approvers.map((approver) => {
                const label = approver.user_id
                  ? (employeeNames.get(approver.user_id) ?? `User ${approver.user_id.slice(0, 8)}`)
                  : approver.role_id
                    ? (roleNames.get(approver.role_id) ?? `Role ${approver.role_id.slice(0, 8)}`)
                    : "Unknown approver"
                return (
                  <Badge key={approver.id} variant="outline" className="gap-1 text-xs">
                    <span className="text-muted-foreground">{approver.user_id ? "User:" : "Role:"}</span>
                    {label}
                    <button
                      type="button"
                      onClick={() => removeApprover(approver.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Remove approver"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </Badge>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
