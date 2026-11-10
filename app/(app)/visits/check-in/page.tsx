import { LogIn } from "lucide-react"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { CheckInForm } from "@/components/visits/check-in-form"
import { PageHeader } from "@/components/shared/page-header"
import { getOutlets } from "@/lib/data/queries"

export default async function VisitCheckInPage() {
  await requirePermission(PERMISSIONS.VISITS_CREATE)
  const outletsResult = await getOutlets()
  return (<div className="space-y-5"><PageHeader eyebrow="Field operations" title="Check in to an outlet" description="Record a visit at an outlet for the signed-in employee. It is classified as planned when you have a plan covering the visit date." icon={LogIn} /><CheckInForm outlets={outletsResult.data} /></div>)
}
