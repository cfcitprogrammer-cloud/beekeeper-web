import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { getPositions } from "@/lib/data/queries"
import { PositionsManager } from "@/components/employees/positions-manager"
import { PageHeader } from "@/components/shared/page-header"

export default async function PositionsPage() {
  await requirePermission(PERMISSIONS.EMPLOYEES_VIEW)

  const result = await getPositions()
  const positions = result.data

  return (
    <>
      <PageHeader title="Positions" description="Define job positions for the company." />
      <PositionsManager positions={positions} />
    </>
  )
}