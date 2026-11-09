import { Plus } from "lucide-react"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { ExpensePlanForm } from "@/components/expenses/expense-plan-form"
import { PageHeader } from "@/components/shared/page-header"
import { getEmployees } from "@/lib/data/queries"

export default async function NewExpensePlanPage() {
  await requirePermission(PERMISSIONS.EXPENSES_CREATE)
  const employees = await getEmployees()
  return (<div className="space-y-5"><PageHeader eyebrow="Operations" title="New expense plan" description="Plans belong to one employee and define the date range for expenses." icon={Plus} /><ExpensePlanForm employees={employees.data} /></div>)
}
