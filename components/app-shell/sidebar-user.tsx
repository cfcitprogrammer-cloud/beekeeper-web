"use client"

import Link from "next/link"
import {
  ChevronsUpDown,
  LogOut,
  Settings2,
  ShieldCheck,
  UserRound,
} from "lucide-react"

import { logout } from "@/actions/auth.action"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function SidebarUser({
  user,
  permissions,
}: {
  user: { name: string; email: string; role: string; initials: string }
  permissions: string[]
}) {
  const { isMobile } = useSidebar()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarMenuButton size="lg" tooltip={user.name} />}
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarFallback className="rounded-lg bg-primary/10 text-[0.625rem] font-semibold text-primary">
                {user.initials}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-xs leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-[0.625rem] text-muted-foreground">
                {user.role}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={8}
            className="w-60"
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 p-1.5">
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-primary/10 text-[0.625rem] font-semibold text-primary">
                    {user.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid min-w-0 flex-1 leading-tight">
                  <span className="truncate text-xs font-medium">
                    {user.name}
                  </span>
                  <span className="truncate text-[0.625rem] text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {hasPermission(permissions, PERMISSIONS.EMPLOYEES_VIEW) && (
                <DropdownMenuItem
                  render={<Link href="/employees" />}
                  className="gap-2"
                >
                  <UserRound className="size-3.5" />
                  My profile
                </DropdownMenuItem>
              )}
              {hasPermission(permissions, PERMISSIONS.APPROVALS_VIEW) && (
                <DropdownMenuItem
                  render={<Link href="/approvals/inbox" />}
                  className="gap-2"
                >
                  <ShieldCheck className="size-3.5" />
                  My approvals
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="gap-2">
                <Settings2 className="size-3.5" />
                Account settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="gap-2"
              onClick={() => void logout()}
            >
              <LogOut className="size-3.5" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
