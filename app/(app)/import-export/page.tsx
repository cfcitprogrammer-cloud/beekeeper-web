import { ArrowLeftRight, Database, FileSpreadsheet, Upload } from "lucide-react"

import { ImportExportPanel } from "@/components/import-export/import-export-panel"
import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { getActionContext } from "@/actions/helpers/context"
import { requirePermission } from "@/lib/auth/guards"
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions"
import { getEmployees, getOutlets } from "@/lib/data/queries"

export default async function ImportExportPage() {
  await requirePermission(PERMISSIONS.IMPORTS_VIEW)

  const [employeesResult, outletsResult, context] = await Promise.all([
    getEmployees(),
    getOutlets(),
    getActionContext(),
  ])

  const canExecute = hasPermission(
    context.permissions,
    PERMISSIONS.IMPORTS_EXECUTE
  )

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Data"
        title="Import & export"
        description="Round-trip employees and outlets through CSV with per-row validation and error reporting."
        icon={ArrowLeftRight}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Employees available"
          value={employeesResult.data.length}
          hint="Included in employee exports"
          icon={Upload}
          accent="primary"
        />
        <MetricCard
          label="Outlets available"
          value={outletsResult.data.length}
          hint="Included in outlet exports"
          icon={Database}
          accent="emerald"
        />
        <MetricCard
          label="Import access"
          value={canExecute ? "Enabled" : "Read only"}
          hint={
            canExecute
              ? "You can run imports and exports"
              : "imports.execute is required"
          }
          icon={FileSpreadsheet}
          accent={canExecute ? "sky" : "amber"}
        />
      </div>

      <ImportExportPanel
        canExecute={canExecute}
        employeeCount={employeesResult.data.length}
        outletCount={outletsResult.data.length}
      />
    </div>
  )
}
