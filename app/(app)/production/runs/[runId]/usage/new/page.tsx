import { redirect } from "next/navigation"

import { requireAnyPermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { getProductionRun } from "@/lib/data/operations"

export default async function LegacyRunUsagePage({
  params,
}: {
  params: Promise<{ runId: string }>
}) {
  await requireAnyPermission([
    PERMISSIONS.PRODUCTION_CREATE,
    PERMISSIONS.PRODUCTION_UPDATE,
  ])

  const { runId } = await params
  const result = await getProductionRun(runId)

  redirect(
    result.data
      ? `/production/usage/new?pipelineId=${result.data.pipeline_id}`
      : "/production/usage/new"
  )
}
