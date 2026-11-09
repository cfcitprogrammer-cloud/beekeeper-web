import { notFound } from "next/navigation"
import { Pencil } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { DepartmentForm } from "@/components/employees/department-form"
import { PageHeader } from "@/components/shared/page-header"
import { getDepartment, getDepartments } from "@/lib/data/queries"

export default async function EditDepartmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requirePermission(PERMISSIONS.EMPLOYEES_UPDATE)
  const [deptResult, allResult] = await Promise.all([getDepartment(id), getDepartments()])
  if (!deptResult.data) notFound()
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="People" title="Edit department" description={`Update ${deptResult.data.name}.`} icon={Pencil} />
      <DepartmentForm department={deptResult.data} departments={allResult.data} />
    </div>
  )
}
