"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react"

import { deleteApprovalStage, toggleApprovalStage } from "@/actions/approval-stage.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import type { ApprovalStage } from "@/types/database"

export function ApprovalStagesManager({ stages }: { stages: ApprovalStage[] }) {
  const router = useRouter()

  async function remove(id: string) {
    if (!window.confirm("Delete this stage? Templates using it will be affected.")) return
    const result = await deleteApprovalStage(id)
    if (!result.success) { toast.add({ type: "error", title: "Could not delete stage", description: result.error }); return }
    toast.add({ type: "success", title: "Stage deleted" })
    router.refresh()
  }

  async function toggle(id: string, isActive: boolean) {
    const result = await toggleApprovalStage(id, isActive)
    if (!result.success) { toast.add({ type: "error", title: "Could not update stage", description: result.error }); return }
    toast.add({ type: "success", title: isActive ? "Stage activated" : "Stage deactivated" })
    router.refresh()
  }

  const columns: DataTableColumn<ApprovalStage>[] = [
    { id: "name", header: "Stage", sortValue: (row) => row.name, cell: (row) => (<div><Link href={`/approvals/stages/${row.id}`} className="text-xs font-medium text-foreground hover:underline">{row.name}</Link><p className="text-[0.625rem] text-muted-foreground">{row.description || "No description"}</p></div>) },
    { id: "approvals", header: "Required", align: "right", sortValue: (row) => row.required_approvals, cell: (row) => <span className="text-xs">{row.required_approvals}</span> },
    { id: "status", header: "Status", cell: (row) => <StatusBadge status={row.is_active ? "APPROVED" : "REJECTED"} /> },
    { id: "actions", header: "", align: "right", cell: (row) => (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="icon-sm" aria-label="View stage" render={<Link href={`/approvals/stages/${row.id}`} />}><Eye className="size-3.5" /></Button>
        <Button variant="outline" size="sm" onClick={() => toggle(row.id, !row.is_active)}>{row.is_active ? "Disable" : "Enable"}</Button>
        <Button variant="ghost" size="icon-sm" aria-label="Edit stage" render={<Link href={`/approvals/stages/${row.id}/edit`} />}><Pencil className="size-3.5" /></Button>
        <Button variant="ghost" size="icon-sm" onClick={() => remove(row.id)} aria-label="Delete stage"><Trash2 className="size-3.5 text-destructive" /></Button>
      </div>
    )},
  ]

  return (
    <DataTable data={stages} columns={columns} getRowId={(row) => row.id} searchable={(row) => `${row.name} ${row.description ?? ""}`} searchPlaceholder="Search stages…" pageSize={10} emptyTitle="No approval stages yet" emptyDescription="Create stages, then assign them to templates." emptyIcon={ShieldCheck} onRowClick={(row) => router.push(`/approvals/stages/${row.id}`)} toolbar={<Button size="sm" render={<Link href="/approvals/stages/new" />}><Plus />New stage</Button>} />
  )
}
