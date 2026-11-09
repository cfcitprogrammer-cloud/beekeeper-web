import Link from "next/link"
import { ArrowLeft, GitBranch, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { Department } from "@/types/database"

export function DepartmentDetail({ department, parentName }: { department: Department; parentName?: string | null }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" render={<Link href="/employees/departments" />}><ArrowLeft />Back to departments</Button>
        <Button size="sm" render={<Link href={`/employees/departments/${department.id}/edit`} />}><Pencil />Edit department</Button>
      </div>
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><GitBranch className="size-5" /></span>
          <div>
            <h2 className="text-lg font-semibold">{department.name}</h2>
            <p className="text-sm text-muted-foreground">{department.code ?? "No code"} · Parent: {parentName ?? "None"}</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-0.5"><p className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">Created</p><p className="text-sm">{department.created_at ? new Date(department.created_at).toLocaleString() : "—"}</p></div>
          <div className="space-y-0.5"><p className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">Updated</p><p className="text-sm">{department.updated_at ? new Date(department.updated_at).toLocaleString() : "—"}</p></div>
        </div>
      </div>
    </div>
  )
}
