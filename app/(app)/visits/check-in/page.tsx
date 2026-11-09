import { LogIn } from "lucide-react"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { CheckInForm } from "@/components/visits/check-in-form"
import { PageHeader } from "@/components/shared/page-header"
import { getEmployees, getOutlets } from "@/lib/data/queries"

export default async function VisitCheckInPage() {
  await requirePermission(PERMISSIONS.VISITS_CREATE)
  const [employeesResult, outletsResult] = await Promise.all([getEmployees(), getOutlets()])
  return (<div className="space-y-5"><PageHeader eyebrow="Field operations" title="Check in to an outlet" description="Record a visit. It is automatically matched to an active plan target when possible." icon={LogIn} /><CheckInForm employees={employeesResult.data} outlets={outletsResult.data} /></div>)
}
