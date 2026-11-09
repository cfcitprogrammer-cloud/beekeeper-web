import { Plus } from "lucide-react"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { VisitPlanForm } from "@/components/visits/visit-plan-form"
import { PageHeader } from "@/components/shared/page-header"
import { getEmployees } from "@/lib/data/queries"

export default async function NewVisitPlanPage() {
  await requirePermission(PERMISSIONS.VISITS_CREATE)
  const employees = await getEmployees()
  return (<div className="space-y-5"><PageHeader eyebrow="Field operations" title="New visit plan" description="A plan belongs to one employee and contains target outlets for a date range." icon={Plus} /><VisitPlanForm employees={employees.data} /></div>)
}
