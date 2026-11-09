import { notFound } from "next/navigation"
import { FlaskConical } from "lucide-react"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { UsageForm } from "@/components/production/usage-form"
import { PageHeader } from "@/components/shared/page-header"
import { getProductionRun } from "@/lib/data/operations"

export default async function NewUsagePage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params
  await requirePermission(PERMISSIONS.PRODUCTION_UPDATE)
  const result = await getProductionRun(runId)
  if (!result.data) notFound()
  return (<div className="space-y-5"><PageHeader eyebrow="Operations" title="Record production usage" description={`Run ${result.data.run_no}`} icon={FlaskConical} /><UsageForm run={result.data} /></div>)
}
