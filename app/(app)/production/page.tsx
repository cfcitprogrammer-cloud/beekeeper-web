import Link from "next/link"
import {
  ArrowRight,
  Factory,
  FlaskConical,
  Layers,
  Plus,
  Tags,
  UserRound,
} from "lucide-react"

import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { requirePermission } from "@/lib/auth/guards"
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions"
import {
  getProductionPipelines,
  getProductionStages,
  getProductionUsage,
} from "@/lib/data/operations"
import { groupProductionUsage } from "@/lib/production/usage"
import { formatDate } from "@/lib/format"

const sections = [
  {
    title: "Pipelines",
    description: "Create and edit production pipelines.",
    href: "/production/pipelines",
    icon: Factory,
  },
  {
    title: "Stages",
    description: "Order stages and assign the SKUs each one uses.",
    href: "/production/stages",
    icon: Layers,
  },
  {
    title: "My usage",
    description: "See the usage entries you submitted.",
    href: "/production/usage/my",
    icon: UserRound,
  },
  {
    title: "All usage",
    description: "Review SKU-level usage submitted by your team.",
    href: "/production/usage",
    icon: FlaskConical,
  },
]

export default async function ProductionPage() {
  const access = await requirePermission(PERMISSIONS.PRODUCTION_VIEW)

  const [pipelinesResult, stagesResult, usageResult] = await Promise.all([
    getProductionPipelines(),
    getProductionStages(),
    getProductionUsage(),
  ])

  const pipelines = pipelinesResult.data
  const stages = stagesResult.data
  const usage = usageResult.data
  const canRecord = hasAnyPermission(access.permissions, [
    PERMISSIONS.PRODUCTION_CREATE,
    PERMISSIONS.PRODUCTION_UPDATE,
  ])
  const assignedSkus = new Set(
    stages.flatMap((stage) => stage.skus.map((sku) => sku.id))
  ).size
  const usageBatches = groupProductionUsage(usage)

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="Production"
        description="Pipelines, stages and SKU-level usage in one place."
        icon={Factory}
        actions={
          canRecord ? (
            <Button size="sm" render={<Link href="/production/usage/new" />}>
              <Plus />
              Record usage
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Pipelines"
          value={pipelines.length}
          hint={`${pipelines.filter((pipeline) => pipeline.is_active).length} active`}
          icon={Factory}
          accent="primary"
        />
        <MetricCard
          label="Stages"
          value={stages.length}
          hint="Across all pipelines"
          icon={Layers}
          accent="amber"
        />
        <MetricCard
          label="Assigned SKUs"
          value={assignedSkus}
          hint="Available for stage usage"
          icon={Tags}
          accent="emerald"
        />
        <MetricCard
          label="Usage entries"
          value={usageBatches.length}
          hint={`${usage.length} SKU lines`}
          icon={FlaskConical}
          accent="primary"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group rounded-xl border bg-card p-4 transition-colors hover:border-primary/40"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <section.icon className="size-4" />
              </span>
              <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="mt-3 text-sm font-semibold">{section.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {section.description}
            </p>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <div>
            <p className="text-[0.625rem] font-semibold tracking-wider text-muted-foreground uppercase">
              Recent usage
            </p>
            <p className="font-heading text-sm font-semibold">
              Latest submissions
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/production/usage" />}
          >
            View all
            <ArrowRight />
          </Button>
        </div>
        <div className="divide-y">
          {usageBatches.length === 0 ? (
            <p className="px-4 py-6 text-xs text-muted-foreground">
              No production usage has been recorded yet.
            </p>
          ) : (
            usageBatches.slice(0, 5).map((batch) => (
              <div
                key={batch.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">
                    {batch.items
                      .map((item) => item.sku?.name ?? "Legacy run usage")
                      .join(", ")}{" "}
                    · {batch.stage?.name ?? "Stage"}
                  </p>
                  <p className="text-[0.625rem] text-muted-foreground">
                    {batch.pipeline?.name ?? "Pipeline"} ·{" "}
                    {batch.submitter
                      ? `${batch.submitter.first_name} ${batch.submitter.last_name}`
                      : batch.submittedBy
                        ? `User ${batch.submittedBy.slice(0, 8)}`
                        : "Unknown user"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs tabular-nums">
                    {batch.items.length} SKU line
                    {batch.items.length === 1 ? "" : "s"}
                  </p>
                  <p className="text-[0.625rem] text-muted-foreground">
                    {formatDate(batch.usageDate)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
