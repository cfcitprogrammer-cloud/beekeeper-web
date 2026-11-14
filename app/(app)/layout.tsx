import { redirect } from "next/navigation"

import { AppShell } from "@/components/app-shell/app-shell"
import { getAccessContext } from "@/lib/auth/access"
import { getPendingApprovals } from "@/lib/data/queries"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Start both requests together. `getPendingApprovals` is request-cached, so
  // pages such as the dashboard and approval inbox reuse this result instead of
  // querying again.
  const [access, approvals] = await Promise.all([
    getAccessContext(),
    getPendingApprovals(),
  ])

  if (!access.user) {
    redirect("/login")
  }

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
