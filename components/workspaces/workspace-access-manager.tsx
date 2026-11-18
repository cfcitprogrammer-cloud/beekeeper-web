"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  Check,
  Globe2,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react"

import { setWorkspaceVisibility } from "@/actions/workspace.action"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"
import type { WorkspaceAccessUser } from "@/lib/data/workspace-access"
import type { Workspace } from "@/types/database"

export function WorkspaceAccessManager({
  workspaces,
  users,
  currentUserId,
}: {
  workspaces: Workspace[]
  users: WorkspaceAccessUser[]
  currentUserId: string
}) {
  const router = useRouter()
  const [search, setSearch] = React.useState("")
  const [pendingUserId, setPendingUserId] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState<Record<string, string[]>>(() =>
    Object.fromEntries(users.map((user) => [user.userId, user.workspaceIds]))
  )

  const allWorkspaceIds = React.useMemo(
    () => workspaces.map((workspace) => workspace.id),
    [workspaces]
  )

  const filteredUsers = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return users
    return users.filter((user) =>
      [user.name, user.email, user.employeeNo, user.roleName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    )
  }, [search, users])

  const explicitIds = React.useCallback(
    (user: WorkspaceAccessUser) => draft[user.userId] ?? user.workspaceIds,
    [draft]
  )

  /** Effective selection: empty assignments mean every workspace. */
  const effectiveIds = React.useCallback(
    (user: WorkspaceAccessUser) => {
      const ids = explicitIds(user)
      return ids.length === 0 ? allWorkspaceIds : ids
    },
    [allWorkspaceIds, explicitIds]
  )

  async function save(user: WorkspaceAccessUser, nextIds: string[]) {
    if (user.isSuperAdmin) return
    if (!user.hasCompanyRole) {
      toast.add({
        type: "error",
        title: "Company role required",
        description:
          "Assign a company role to this user on the Roles page before choosing workspaces.",
      })
      return
    }

    const previous = explicitIds(user)
    // An explicit selection of every workspace is equivalent to the default
    // "all workspaces" state, so store it as an empty assignment.
    const normalized =
      nextIds.length === allWorkspaceIds.length ? [] : nextIds

    setDraft((current) => ({ ...current, [user.userId]: normalized }))
    setPendingUserId(user.userId)

    const toastId = toast.add({
      type: "loading",
      title: "Saving workspace access",
      description: `Updating ${user.name}…`,
    })

    try {
      const result = await setWorkspaceVisibility({
        userId: user.userId,
        workspaceIds: normalized,
      })
      toast.close(toastId)

      if (!result.success) {
        setDraft((current) => ({ ...current, [user.userId]: previous }))
        toast.add({
          type: "error",
          title: "Could not save workspace access",
          description: result.error,
        })
        return
      }

      toast.add({
        type: "success",
        title: "Workspace access updated",
        description:
          normalized.length === 0
            ? `${user.name} can see all workspaces.`
            : `${user.name} can see ${normalized.length} workspace${
                normalized.length === 1 ? "" : "s"
              }.`,
      })
      router.refresh()
    } catch (error) {
      toast.close(toastId)
      setDraft((current) => ({ ...current, [user.userId]: previous }))
      toast.add({
        type: "error",
        title: "Could not save workspace access",
        description:
          error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setPendingUserId(null)
    }
  }

  function toggleWorkspace(user: WorkspaceAccessUser, workspaceId: string) {
    if (pendingUserId === user.userId) return
    const current = effectiveIds(user)
    const isRemoving = current.includes(workspaceId)

    if (isRemoving && current.length === 1) {
      toast.add({
        type: "warning",
        title: "Keep at least one workspace",
        description:
          "A user with no explicit selection sees every workspace. Use “All workspaces” if you want to grant full visibility.",
      })
      return
    }

    const next = isRemoving
      ? current.filter((id) => id !== workspaceId)
      : [...current, workspaceId]
    void save(user, next)
  }

  function showAll(user: WorkspaceAccessUser) {
    if (pendingUserId === user.userId) return
    void save(user, allWorkspaceIds)
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-3.5 text-primary" />
          Workspace visibility
          <Badge variant="outline">{users.length}</Badge>
        </CardTitle>
        <CardDescription>
          Choose which workspaces each user can see and switch to. Super Admins
          always see every workspace. Users with no explicit selection see all
          workspaces by default.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search users…"
            className="pl-8"
          />
        </div>

        {workspaces.length === 0 ? (
          <p className="py-10 text-center text-xs text-muted-foreground">
            Create a workspace before assigning visibility.
          </p>
        ) : filteredUsers.length === 0 ? (
          <p className="py-10 text-center text-xs text-muted-foreground">
            No users match “{search}”.
          </p>
        ) : (
          <div className="space-y-2">
            {filteredUsers.map((user) => {
              const isSelf = user.userId === currentUserId
              const pending = pendingUserId === user.userId
              const selected = effectiveIds(user)
              const explicit = explicitIds(user)
              const isDefaultAll = explicit.length === 0

              return (
                <div
                  key={user.userId}
                  className={cn(
                    "rounded-md border px-3 py-2.5 transition-opacity",
                    pending && "opacity-60"
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <UserRound className="size-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">
                          {user.name}
                          {isSelf ? (
                            <span className="ml-1 text-[0.625rem] text-muted-foreground">
                              (you)
                            </span>
                          ) : null}
                        </p>
                        <p className="truncate text-[0.625rem] text-muted-foreground">
                          {user.email ?? "No email"}
                          {user.employeeNo ? ` · ${user.employeeNo}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {user.roleName ? (
                        <Badge variant="secondary">{user.roleName}</Badge>
                      ) : (
                        <Badge variant="outline">No company role</Badge>
                      )}
                      {user.isSuperAdmin ? (
                        <Badge variant="outline" className="gap-1">
                          <Globe2 className="size-3" />
                          Full access
                        </Badge>
                      ) : isDefaultAll ? (
                        <Badge variant="outline" className="gap-1">
                          <Globe2 className="size-3" />
                          All (default)
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          {selected.length} of {workspaces.length}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {workspaces.map((workspace) => {
                      const active =
                        user.isSuperAdmin || selected.includes(workspace.id)
                      return (
                        <button
                          key={workspace.id}
                          type="button"
                          disabled={user.isSuperAdmin || pending}
                          onClick={() =>
                            toggleWorkspace(user, workspace.id)
                          }
                          aria-pressed={active}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[0.625rem] font-medium transition-colors",
                            active
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border bg-background text-muted-foreground hover:bg-muted/60",
                            user.isSuperAdmin
                              ? "cursor-default"
                              : "cursor-pointer"
                          )}
                        >
                          <Building2 className="size-3" />
                          {workspace.name}
                          {active ? <Check className="size-3" /> : null}
                        </button>
                      )
                    })}

                    {!user.isSuperAdmin && !isDefaultAll ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 rounded-full px-2 text-[0.625rem]"
                        disabled={pending}
                        onClick={() => showAll(user)}
                      >
                        <Globe2 className="size-3" />
                        All workspaces
                      </Button>
                    ) : null}
                  </div>

                  {!user.hasCompanyRole ? (
                    <p className="mt-2 text-[0.625rem] text-amber-600 dark:text-amber-400">
                      Give this user a company role on the Roles page before
                      assigning workspace access.
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
