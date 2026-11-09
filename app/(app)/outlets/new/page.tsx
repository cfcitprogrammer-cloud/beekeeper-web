import { Plus } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { OutletForm } from "@/components/outlets/outlet-form"
import { PageHeader } from "@/components/shared/page-header"
import { getOutlets } from "@/lib/data/queries"

export default async function NewOutletPage() {
  await requirePermission(PERMISSIONS.OUTLETS_CREATE)

  const result = await getOutlets()

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Field operations"
        title="Add outlet"
        description="New outlets are routed through the onboarding approval template."
        icon={Plus}
      />
      <OutletForm outlets={result.data} />
    </div>
  )
}
