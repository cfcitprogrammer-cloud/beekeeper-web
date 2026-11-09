import { Plus } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { DepartmentForm } from "@/components/employees/department-form"
import { PageHeader } from "@/components/shared/page-header"
import { getDepartments } from "@/lib/data/queries"

export default async function NewDepartmentPage() {
  await requirePermission(PERMISSIONS.EMPLOYEES_CREATE)
  const result = await getDepartments()
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="People" title="New department" description="Define a department for the company." icon={Plus} />
      <DepartmentForm departments={result.data} />
    </div>
  )
}
