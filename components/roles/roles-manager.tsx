"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle2,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react"
import { cn } from "cn"

import {
  assignCompanyRole,
  createRole,
  deleteRole,
  removeCompanyMember,
  setRolePermissions,
  updateRole,
} from "@/actions/role.action"
import {
  PERMISSION_CATALOG,
  type PermissionDefinition,
} from "@/lib/auth/permissions"
import type {
  AccessCandidate,
  ManagedRole,
  RoleMember,
} from "@/lib/data/access-control"
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
import { Label } from "@/components/ui/label"
import { Modal } from "@/components/shared/modal"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"

type PermissionGroup = {
  name: string
  permissions: PermissionDefinition[]
}

function groupPermissions() {
  const groups = new Map<string, PermissionDefinition[]>()
  for (const permission of PERMISSION_CATALOG) {
    const group = groups.get(permission.group) ?? []
    group.push(permission)
    groups.set(permission.group, group)
  }
  return Array.from(groups, ([name, permissions]) => ({ name, permissions }))
}

function signatureOf(keys: readonly string[]) {
  return [...keys].sort().join("|")
}

function RolePermissionEditor({ role }: { role: ManagedRole }) {
  const router = useRouter()
  const groups = React.useMemo(() => groupPermissions(), [])
  const [draft, setDraft] = React.useState<string[]>(role.permissionKeys)
  const [saving, setSaving] = React.useState(false)

  const savedSignature = signatureOf(role.permissionKeys)
  const isDirty = savedSignature !== signatureOf(draft)

  function togglePermission(key: string) {
    setDraft((current) =>
      current.includes(key)
        ? current.filter((permission) => permission !== key)
        : [...current, key]
    )
  }

  function toggleGroup(group: PermissionGroup) {
    const keys = group.permissions.map((permission): string => permission.key)
    const allSelected = keys.every((key) => draft.includes(key))
    setDraft((current) =>
      allSelected
        ? current.filter((key) => !keys.includes(key))
        : Array.from(new Set([...current, ...keys]))
    )
  }

  async function savePermissions() {
    if (role.isSystem) return
    setSaving(true)
    const result = await setRolePermissions({
      roleId: role.id,
      permissionKeys: draft,
    })
    setSaving(false)
    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not save permissions",
        description: result.error,
      })
      return
    }
    toast.add({
      type: "success",
      title: "Permissions saved",
      description: `${role.name} now has ${draft.length} permission${draft.length === 1 ? "" : "s"}.`,
    })
    router.refresh()
  }

  return (
    <CardContent className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {role.isSystem
            ? `${PERMISSION_CATALOG.length} permissions granted`
            : `${draft.length} of ${PERMISSION_CATALOG.length} permissions selected`}
        </p>
        {!role.isSystem ? (
          <div className="flex items-center gap-2">
            {isDirty ? (
              <span className="text-[0.625rem] font-medium text-amber-500">
                Unsaved changes
              </span>
            ) : null}
            <Button
              size="sm"
              onClick={() => void savePermissions()}
              disabled={!isDirty || saving}
            >
              {saving ? (
                <CheckCircle2 className="animate-pulse" />
              ) : (
                <Save />
              )}
              Save permissions
            </Button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {groups.map((group) => {
          const keys = group.permissions.map(
            (permission) => permission.key
          )
          const allSelected = keys.every(
            (key) => role.isSystem || draft.includes(key)
          )
          return (
            <div
              key={group.name}
              className="rounded-md border border-border/70"
            >
              <label className="flex cursor-pointer items-center gap-2 border-b border-border/60 px-3 py-2">
                <input
                  type="checkbox"
                  className="size-3.5 accent-primary"
                  checked={allSelected}
                  disabled={role.isSystem}
                  onChange={() => toggleGroup(group)}
                />
                <span className="text-xs font-medium">{group.name}</span>
                <span className="ml-auto font-mono text-[0.5625rem] text-muted-foreground">
                  {
                    group.permissions.filter(
                      (permission) =>
                        role.isSystem || draft.includes(permission.key)
                    ).length
                  }
                  /{group.permissions.length}
                </span>
              </label>
              <div className="space-y-1 p-2">
                {group.permissions.map((permission) => {
                  const checked =
                    role.isSystem || draft.includes(permission.key)
                  return (
                    <label
                      key={permission.key}
                      className={cn(
                        "flex items-start gap-2 rounded px-1.5 py-1",
                        role.isSystem
                          ? "opacity-70"
                          : "cursor-pointer hover:bg-muted/60"
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 size-3.5 accent-primary"
                        checked={checked}
                        disabled={role.isSystem}
                        onChange={() => togglePermission(permission.key)}
                      />
                      <span>
                        <span className="block text-[0.6875rem] leading-tight">
                          {permission.description}
                        </span>
                        <span className="block font-mono text-[0.5625rem] text-muted-foreground">
                          {permission.key}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </CardContent>
  )
}

export function RolesManager({
  roles,
  members,
  candidates,
  currentUserId,
}: {
  roles: ManagedRole[]
  members: RoleMember[]
  candidates: AccessCandidate[]
  currentUserId: string
}) {
  const router = useRouter()
  const [selectedRoleId, setSelectedRoleId] = React.useState<string | null>(
    roles[0]?.id ?? null
  )
  const activeRole =
    roles.find((role) => role.id === selectedRoleId) ?? roles[0] ?? null

  const savedSignature = signatureOf(activeRole?.permissionKeys ?? [])

  const [pendingMember, setPendingMember] = React.useState<string | null>(null)

  const [createOpen, setCreateOpen] = React.useState(false)
  const [createName, setCreateName] = React.useState("")
  const [createDescription, setCreateDescription] = React.useState("")
  const [creating, setCreating] = React.useState(false)

  const [editOpen, setEditOpen] = React.useState(false)
  const [editName, setEditName] = React.useState("")
  const [editDescription, setEditDescription] = React.useState("")
  const [editing, setEditing] = React.useState(false)

  async function submitCreate(event: React.FormEvent) {
    event.preventDefault()
    setCreating(true)
    const result = await createRole({
      name: createName,
      description: createDescription,
    })
    setCreating(false)
    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not create role",
        description: result.error,
      })
      return
    }
    setCreateOpen(false)
    setCreateName("")
    setCreateDescription("")
    setSelectedRoleId(result.data.id)
    toast.add({
      type: "success",
      title: "Role created",
      description: "Assign permissions to the new role next.",
    })
    router.refresh()
  }

  function openEdit() {
    if (!activeRole || activeRole.isSystem) return
    setEditName(activeRole.name)
    setEditDescription(activeRole.description ?? "")
    setEditOpen(true)
  }

  async function submitEdit(event: React.FormEvent) {
    event.preventDefault()
    if (!activeRole) return
    setEditing(true)
    const result = await updateRole({
      id: activeRole.id,
      name: editName,
      description: editDescription,
    })
    setEditing(false)
    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not update role",
        description: result.error,
      })
      return
    }
    setEditOpen(false)
    toast.add({ type: "success", title: "Role updated" })
    router.refresh()
  }

  async function removeRole() {
    if (!activeRole || activeRole.isSystem) return
    if (
      !window.confirm(
        `Delete role "${activeRole.name}"? This cannot be undone.`
      )
    ) {
      return
    }
    const result = await deleteRole(activeRole.id)
    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not delete role",
        description: result.error,
      })
      return
    }
    setSelectedRoleId(null)
    toast.add({
      type: "success",
      title: "Role deleted",
      description: `${activeRole.name} was removed.`,
    })
    router.refresh()
  }

  async function handleAssign(userId: string, roleId: string) {
    setPendingMember(userId)
    const result = await assignCompanyRole({ userId, roleId })
    setPendingMember(null)
    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not assign role",
        description: result.error,
      })
      return
    }
    toast.add({ type: "success", title: "Role assigned" })
    router.refresh()
  }

  async function handleRemoveAccess(member: RoleMember) {
    if (
      !window.confirm(
        `Remove ${member.name}'s company access? They will lose all permissions.`
      )
    ) {
      return
    }
    setPendingMember(member.userId)
    const result = await removeCompanyMember(member.userId)
    setPendingMember(null)
    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not remove access",
        description: result.error,
      })
      return
    }
    toast.add({
      type: "success",
      title: "Access removed",
      description: `${member.name} no longer has company access.`,
    })
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[19rem_minmax(0,1fr)]">
        <Card size="sm" className="h-fit">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-3.5 text-primary" />
              Roles
            </CardTitle>
            <CardDescription>
              System roles are locked. Custom roles can be tuned per permission.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {roles.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                No roles yet. Create your first custom role.
              </p>
            ) : (
              roles.map((role) => {
                const selected = activeRole?.id === role.id
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRoleId(role.id)}
                    className={cn(
                      "flex w-full items-start justify-between gap-2 rounded-md border px-2.5 py-2 text-left transition-colors",
                      selected
                        ? "border-primary/40 bg-primary/10"
                        : "border-transparent hover:bg-muted/60"
                    )}
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-medium">
                          {role.name}
                        </span>
                        {role.isSystem ? (
                          <Lock className="size-3 shrink-0 text-muted-foreground" />
                        ) : null}
                      </span>
                      <span className="mt-0.5 block truncate text-[0.625rem] text-muted-foreground">
                        {role.description ?? "No description"}
                      </span>
                    </span>
                    <Badge variant={selected ? "default" : "outline"}>
                      {role.permissionKeys.length}
                    </Badge>
                  </button>
                )
              })
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={() => setCreateOpen(true)}
            >
              <Plus />
              New role
            </Button>
          </CardContent>
        </Card>

        <Card size="sm">
          {activeRole ? (
            <>
              <CardHeader className="border-b">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <KeyRound className="size-3.5 text-primary" />
                      {activeRole.name}
                      {activeRole.isSystem ? (
                        <Badge variant="secondary">System</Badge>
                      ) : (
                        <Badge variant="outline">Custom</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {activeRole.isSystem
                        ? "System roles always receive the full permission catalog and cannot be edited."
                        : activeRole.description ??
                          "Choose the permissions this role should grant."}
                    </CardDescription>
                  </div>
                  {!activeRole.isSystem ? (
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" onClick={openEdit}>
                        <Pencil />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => void removeRole()}
                      >
                        <Trash2 />
                        Delete
                      </Button>
                    </div>
                  ) : null}
                </div>
              </CardHeader>
              <RolePermissionEditor
                key={`${activeRole.id}:${savedSignature}`}
                role={activeRole}
              />
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <ShieldCheck className="size-6 text-muted-foreground" />
              <p className="text-xs font-medium">Select a role</p>
              <p className="text-[0.625rem] text-muted-foreground">
                Pick a role on the left to review and edit its permissions.
              </p>
            </CardContent>
          )}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card size="sm">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Users className="size-3.5 text-primary" />
              Member access
              <Badge variant="outline">{members.length}</Badge>
            </CardTitle>
            <CardDescription>
              Assign a company role to each member with a login account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {members.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No company members yet.
              </p>
            ) : (
              members.map((member) => {
                const isSelf = member.userId === currentUserId
                return (
                  <div
                    key={member.userId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-2.5 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">
                        {member.name}
                        {isSelf ? (
                          <span className="ml-1 text-[0.625rem] text-muted-foreground">
                            (you)
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-[0.625rem] text-muted-foreground">
                        {member.email ?? "No employee profile"}
                        {member.employeeNo ? ` · ${member.employeeNo}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Select
                        value={member.roleId}
                        onValueChange={(value) => {
                          if (value && value !== member.roleId) {
                            void handleAssign(member.userId, value)
                          }
                        }}
                        disabled={isSelf || pendingMember === member.userId}
                      >
                        <SelectTrigger size="sm" className="w-36">
                          <SelectValue placeholder={member.roleName} />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!isSelf ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${member.name}'s access`}
                          disabled={pendingMember === member.userId}
                          onClick={() => void handleRemoveAccess(member)}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="size-3.5 text-primary" />
              Awaiting access
              <Badge variant="outline">{candidates.length}</Badge>
            </CardTitle>
            <CardDescription>
              These employees have a login account but no company role yet.
              Choosing a role grants access immediately.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {candidates.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Every employee with a login account already has a role.
              </p>
            ) : (
              candidates.map((candidate) => (
                <div
                  key={candidate.userId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-2.5 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">
                      {candidate.name}
                    </p>
                    <p className="truncate text-[0.625rem] text-muted-foreground">
                      {candidate.email ?? "No email"}
                      {candidate.employeeNo ? ` · ${candidate.employeeNo}` : ""}
                    </p>
                  </div>
                  <Select
                    value={null}
                    onValueChange={(value) => {
                      if (value) {
                        void handleAssign(candidate.userId, value)
                      }
                    }}
                    disabled={pendingMember === candidate.userId}
                  >
                    <SelectTrigger size="sm" className="w-36">
                      <SelectValue placeholder="Assign role…" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create role"
        description="Give the role a clear name. You can choose its permissions after creating it."
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              form="create-role-form"
              type="submit"
              disabled={creating || !createName.trim()}
            >
              {creating ? "Creating…" : "Create role"}
            </Button>
          </>
        }
      >
        <form
          id="create-role-form"
          className="space-y-3"
          onSubmit={(event) => void submitCreate(event)}
        >
          <div className="space-y-1.5">
            <Label htmlFor="role-name">Name</Label>
            <Input
              id="role-name"
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              placeholder="e.g. Field supervisor"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role-description">Description</Label>
            <Textarea
              id="role-description"
              value={createDescription}
              onChange={(event) => setCreateDescription(event.target.value)}
              placeholder="What is this role responsible for?"
              rows={3}
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit role"
        description="Update the role name and description. Permissions are edited separately."
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              form="edit-role-form"
              type="submit"
              disabled={editing || !editName.trim()}
            >
              {editing ? "Saving…" : "Save changes"}
            </Button>
          </>
        }
      >
        <form
          id="edit-role-form"
          className="space-y-3"
          onSubmit={(event) => void submitEdit(event)}
        >
          <div className="space-y-1.5">
            <Label htmlFor="edit-role-name">Name</Label>
            <Input
              id="edit-role-name"
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-role-description">Description</Label>
            <Textarea
              id="edit-role-description"
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
              rows={3}
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}
