import { notFound } from "next/navigation"
import { GitBranch } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { DepartmentDetail } from "@/components/employees/department-detail"
import { PageHeader } from "@/components/shared/page-header"
import { getDepartment, getDepartments } from "@/lib/data/queries"

export default async function DepartmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requirePermission(PERMISSIONS.EMPLOYEES_VIEW)
  const [deptResult, allResult] = await Promise.all([getDepartment(id), getDepartments()])
  if (!deptResult.data) notFound()
  const parentName = deptResult.data.parent_id ? allResult.data.find((d) => d.id === deptResult.data!.parent_id)?.name ?? null : null
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="People" title={deptResult.data.name} description="Department details." icon={GitBranch} />
      <DepartmentDetail department={deptResult.data} parentName={parentName} />
    </div>
  )
}
