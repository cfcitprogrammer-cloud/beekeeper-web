"use client"

import * as React from "react"

import { setActiveWorkspace } from "@/actions/workspace.action"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { toast } from "@/components/ui/toast"
import type { MyPendingApproval, Workspace } from "@/types/database"

import { AppSidebar } from "./app-sidebar"
import { NavigationLoader } from "./navigation-loader"
import { Topbar } from "./topbar"
import { WorkspaceSwitchOverlay } from "./workspace-switch-overlay"

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
  const [switchingTo, setSwitchingTo] = React.useState<Workspace | null>(null)

  async function handleWorkspaceChange(workspaceId: string) {
    if (workspaceId === activeWorkspaceId) return

    const target =
      workspaces.find((workspace) => workspace.id === workspaceId) ?? null
    setSwitchingTo(target)
    setActiveWorkspaceId(workspaceId)

    try {
      const result = await setActiveWorkspace(workspaceId)
      if (!result.success) {
        // Revert on failure.
        setSwitchingTo(null)
        setActiveWorkspaceId(activeWorkspace?.id ?? workspaces[0]?.id ?? "")
        toast.add({
          type: "error",
          title: "Could not switch workspace",
          description: result.error,
        })
        return
      }

      // Keep the overlay visible while the page reloads with the new data.
      window.location.reload()
    } catch (error) {
      setSwitchingTo(null)
      setActiveWorkspaceId(activeWorkspace?.id ?? workspaces[0]?.id ?? "")
      toast.add({
        type: "error",
        title: "Could not switch workspace",
        description:
          error instanceof Error ? error.message : "Please try again.",
      })
    }
  }

  return (
    <>
      <NavigationLoader />
      {switchingTo ? (
        <WorkspaceSwitchOverlay workspaceName={switchingTo.name} />
      ) : null}
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
    </>
  )
}
