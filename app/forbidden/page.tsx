import Link from "next/link"
import { ArrowLeft, ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getAccessContext } from "@/lib/auth/access"
import { defaultRouteFor } from "@/lib/auth/permissions"

export default async function ForbiddenPage() {
  const access = await getAccessContext()
  const home = access.user
    ? access.companyId
      ? defaultRouteFor(access.permissions)
      : "/dashboard"
    : "/login"

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="border-b pb-4">
          <span className="mb-2 flex size-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <ShieldAlert className="size-5" />
          </span>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>
            Your role does not include permission to open this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <p className="text-xs/relaxed text-muted-foreground">
            {access.user ? (
              <>
                You are signed in as{" "}
                <span className="font-medium text-foreground">
                  {access.user.email}
                </span>{" "}
                with the{" "}
                <span className="font-medium text-foreground">
                  {access.user.role}
                </span>{" "}
                role. Ask an administrator to update your role permissions in{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[0.625rem]">
                  role_permissions
                </code>
                .
              </>
            ) : (
              "Sign in to continue."
            )}
          </p>

          <Button
            variant="outline"
            className="w-full"
            render={<Link href={home} />}
          >
            <ArrowLeft />
            {access.user ? "Back to workspace" : "Go to sign in"}
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
