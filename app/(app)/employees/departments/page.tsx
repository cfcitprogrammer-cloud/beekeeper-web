import { Users } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { getDepartments } from "@/lib/data/queries"
import { DepartmentsManager } from "@/components/employees/departments-manager"
import { PageHeader } from "@/components/shared/page-header"

export default async function DepartmentsPage() {
  await requirePermission(PERMISSIONS.EMPLOYEES_VIEW)

  const result = await getDepartments()
  const departments = result.data

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Departments"
        description="Organize the company into departments."
        icon={Users}
      />
      <DepartmentsManager departments={departments} />
    </>
  )
}