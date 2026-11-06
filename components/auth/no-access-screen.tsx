"use client"

import { Building2, LogOut, ShieldAlert } from "lucide-react"

import { logout } from "@/actions/auth.action"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function NoAccessScreen({
  user,
}: {
  user: { name: string; email: string; initials: string }
}) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="border-b pb-4">
          <span className="mb-2 flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="size-5" />
          </span>
          <CardTitle>Workspace access pending</CardTitle>
          <CardDescription>
            Your account is signed in, but it is not linked to a company yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
            <Avatar className="size-9">
              <AvatarFallback className="bg-primary/10 text-[0.625rem] font-semibold text-primary">
                {user.initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{user.name}</p>
              <p className="truncate text-[0.625rem] text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs text-muted-foreground">
            <p className="flex items-start gap-2">
              <Building2 className="mt-0.5 size-3.5 shrink-0" />
              Ask a company administrator to add your user to{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[0.625rem]">
                company_members
              </code>{" "}
              with a role.
            </p>
            <p>
              Once your membership and role permissions are configured, refresh
              this page to continue.
            </p>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => void logout()}
          >
            <LogOut />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
