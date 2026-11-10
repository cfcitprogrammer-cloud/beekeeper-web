import Link from "next/link"
import { ArrowRight, Banknote, Receipt, Tags, Wallet } from "lucide-react"

import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { requirePermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"
import {
  getExpenseCategories,
  getExpensePlans,
  getExpenses,
} from "@/lib/data/operations"
import { formatCurrency } from "@/lib/format"

export default async function ExpensesPage() {
  await requirePermission(PERMISSIONS.EXPENSES_VIEW)

  const [plansResult, expensesResult, categoriesResult] = await Promise.all([
    getExpensePlans(),
    getExpenses(),
    getExpenseCategories(),
  ])

  const plans = plansResult.data ?? []
  const expenses = expensesResult.data ?? []
  const categories = categoriesResult.data ?? []
  const total = expenses.reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0)
  const pending = expenses.filter((expense) => expense.status === "pending")
  const reimbursable = expenses.filter((expense) => expense.is_reimbursable)

  const sections = [
    {
      title: "Expense items",
      description: "Every expense item, including standalone items without a plan.",
      href: "/expenses/items",
      icon: Receipt,
      count: `${expenses.length} items`,
      action: "Open items",
    },
    {
      title: "Expense plans",
      description: "Dated plans that group expense items for an employee.",
      href: "/expenses/plans",
      icon: Wallet,
      count: `${plans.length} plans`,
      action: "Open plans",
    },
    {
      title: "Expense categories",
      description: "Configurable master data used to classify expense items.",
      href: "/expenses/categories",
      icon: Tags,
      count: `${categories.length} categories`,
      action: "Manage categories",
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="Expenses"
        description="Manage expense items, optional expense plans, categories and attachments."
        icon={Wallet}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Expense plans"
          value={plans.length}
          hint={`${plans.filter((plan) => plan.status === "draft" || plan.status === "submitted").length} open`}
          icon={Wallet}
          accent="primary"
        />
        <MetricCard
          label="Expense items"
          value={expenses.length}
          hint={`${pending.length} pending review`}
          icon={Receipt}
          accent="amber"
        />
        <MetricCard
          label="Total value"
          value={formatCurrency(total)}
          hint="Across all expense items"
          icon={Banknote}
          accent="emerald"
        />
        <MetricCard
          label="Reimbursable"
          value={reimbursable.length}
          hint={`${formatCurrency(reimbursable.reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0))} to reimburse`}
          icon={Banknote}
          accent="sky"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <div key={section.href} className="rounded-xl border bg-card p-4">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4.5" />
              </span>
              <h2 className="mt-3 font-heading text-sm font-semibold">{section.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{section.description}</p>
              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="text-[0.625rem] text-muted-foreground">
                  {section.count}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  render={<Link href={section.href} />}
                >
                  {section.action}
                  <ArrowRight />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
