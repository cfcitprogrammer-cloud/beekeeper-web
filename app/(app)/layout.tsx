import { redirect } from "next/navigation"

import { AppShell } from "@/components/app-shell/app-shell"
import { getAccessContext } from "@/lib/auth/access"
import { getPendingApprovals } from "@/lib/data/queries"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const access = await getAccessContext()

  if (!access.user) {
    redirect("/login")
  }

  const approvals = await getPendingApprovals()

  return (
    <AppShell
      companyName={access.company?.name ?? "Beekeeper"}
      workspaces={access.workspaces}
      user={access.user}
      permissions={access.permissions}
      pendingApprovals={approvals.data}
    >
      {children}
    </AppShell>
  )
}
