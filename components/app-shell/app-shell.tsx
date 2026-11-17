"use client"

import * as React from "react"

import { setActiveWorkspace } from "@/actions/workspace.action"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import type { MyPendingApproval, Workspace } from "@/types/database"

import { AppSidebar } from "./app-sidebar"
import { Topbar } from "./topbar"

export function AppShell({
  companyName,
  workspaces,
  activeWorkspaceId: initialActiveWorkspaceId,
  user,
  permissions,
  pendingApprovals,
  children,
}: {
  companyName: string
  workspaces: Workspace[]
  activeWorkspaceId?: string
  user: {
    name: string
    email: string
    role: string
    initials: string
    permissions: string[]
  }
  permissions: string[]
  pendingApprovals: MyPendingApproval[]
  children: React.ReactNode
}) {
  const [activeWorkspaceId, setActiveWorkspaceId] = React.useState(
    initialActiveWorkspaceId || workspaces[0]?.id || ""
  )

  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
    workspaces[0]

  async function handleWorkspaceChange(workspaceId: string) {
    setActiveWorkspaceId(workspaceId)
    const result = await setActiveWorkspace(workspaceId)
    if (!result.success) {
      // revert on failure
      setActiveWorkspaceId(activeWorkspace?.id ?? workspaces[0]?.id ?? "")
      return
    }

    window.location.reload()
  }

  return (
    <SidebarProvider>
      <AppSidebar
        companyName={companyName}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onWorkspaceChange={handleWorkspaceChange}
        user={user}
        permissions={permissions}
        pendingCount={pendingApprovals.length}
      />
      <SidebarInset className="min-w-0">
        <Topbar
          companyName={companyName}
          workspaceName={activeWorkspace?.name ?? "Workspace"}
          user={user}
          permissions={permissions}
          pendingApprovals={pendingApprovals}
        />
        <div className="flex-1 p-3 sm:p-4 lg:p-5">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
