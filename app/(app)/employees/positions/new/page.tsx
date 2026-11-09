import { Plus } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { PositionForm } from "@/components/employees/position-form"
import { PageHeader } from "@/components/shared/page-header"

export default async function NewPositionPage() {
  await requirePermission(PERMISSIONS.EMPLOYEES_CREATE)
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="People" title="New position" description="Define a job position for the company." icon={Plus} />
      <PositionForm />
    </div>
  )
}
