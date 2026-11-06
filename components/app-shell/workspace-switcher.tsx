"use client"

import * as React from "react"
import { Building2, Check, ChevronsUpDown, Plus, Settings2 } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function SidebarWorkspaceSwitcher({
  companyName,
  workspaces,
  activeWorkspaceId,
  onWorkspaceChange,
}: {
  companyName: string
  workspaces: { id: string; name: string; code: string | null }[]
  activeWorkspaceId: string
  onWorkspaceChange: (id: string) => void
}) {
  const { isMobile } = useSidebar()
  const active =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
    workspaces[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex w-full items-center gap-2 rounded-lg border bg-card px-2 py-1.5 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
          "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0"
        )}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Building2 className="size-3.5" />
        </span>
        <span className="grid min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
          <span className="truncate text-[0.6875rem] font-medium">
            {active?.name ?? "Workspace"}
          </span>
          <span className="truncate text-[0.625rem] text-muted-foreground">
            {companyName}
          </span>
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side={isMobile ? "bottom" : "right"}
        sideOffset={8}
        className="w-64"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-[0.625rem] tracking-wide text-muted-foreground uppercase">
            Workspaces
          </DropdownMenuLabel>
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => onWorkspaceChange(workspace.id)}
              className="gap-2"
            >
              <span className="flex size-6 items-center justify-center rounded-md border bg-muted/50 text-[0.5625rem] font-semibold">
                {(workspace.code ?? workspace.name).slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium">
                  {workspace.name}
                </span>
                <span className="block text-[0.625rem] text-muted-foreground">
                  {workspace.code ?? "No code"}
                </span>
              </span>
              {workspace.id === active?.id && (
                <Check className="size-3.5 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="gap-2">
            <Plus className="size-3.5" />
            Create workspace
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2">
            <Settings2 className="size-3.5" />
            Workspace settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
