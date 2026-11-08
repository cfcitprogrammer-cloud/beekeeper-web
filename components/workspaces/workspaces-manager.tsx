"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Building2, Plus, Trash2 } from "lucide-react"
import Link from "next/link"

import { deleteWorkspace } from "@/actions/workspace.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import type { Workspace } from "@/types/database"

export function WorkspacesManager({ workspaces }: { workspaces: Workspace[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = React.useState<string | null>(null)

  async function remove(workspace: Workspace) {
    if (!window.confirm(`Deactivate workspace "${workspace.name}"?`)) return
    setBusyId(workspace.id)
    const result = await deleteWorkspace(workspace.id)
    setBusyId(null)

    if (!result.success) {
      toast.add({ type: "error", title: "Could not deactivate workspace", description: result.error })
      return
    }

    toast.add({ type: "success", title: "Workspace deactivated" })
    router.refresh()
  }

  const columns: DataTableColumn<Workspace>[] = [
    {
      id: "code",
      header: "Code",
      sortValue: (row) => row.code ?? "",
      cell: (row) => (
        <span className="rounded bg-muted px-2 py-1 font-mono text-xs font-semibold">
          {row.code ?? "—"}
        </span>
      ),
    },
    {
      id: "name",
      header: "Name",
      sortValue: (row) => row.name,
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      id: "description",
      header: "Description",
      hideBelow: "md",
      cell: (row) => (
        <span className="truncate text-muted-foreground">
          {row.address ?? "—"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <span
          className={
            row.is_active
              ? "inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[0.625rem] font-medium text-emerald-700 dark:text-emerald-300"
              : "inline-flex items-center rounded-full bg-zinc-500/10 px-2 py-0.5 text-[0.625rem] font-medium text-zinc-600 dark:text-zinc-400"
          }
        >
          {row.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (row) => (
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={busyId === row.id}
          onClick={() => remove(row)}
          aria-label="Deactivate workspace"
        >
          <Trash2 className="size-3.5 text-destructive" />
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="System"
        title="Workspaces"
        description="Create and manage workspaces for your company. Super Admin access only."
        icon={Building2}
        actions={
          <Button render={<Link href="/workspaces/new" />}>
            <Plus />
            New workspace
          </Button>
        }
      />

      <DataTable
        data={workspaces}
        columns={columns}
        getRowId={(row) => row.id}
        searchable={(row) => [row.name, row.code, row.address].filter(Boolean).join(" ")}
        searchPlaceholder="Search workspaces…"
        pageSize={10}
        emptyTitle="No workspaces yet"
        emptyDescription="Create your first workspace to get started."
        emptyIcon={Building2}
      />
    </div>
  )
}
