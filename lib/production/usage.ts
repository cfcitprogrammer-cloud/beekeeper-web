import type { ProductionUsageWithRelations } from "@/lib/data/operations"

export type ProductionUsageBatch = {
  id: string
  pipeline: ProductionUsageWithRelations["pipeline"]
  stage: ProductionUsageWithRelations["stage"]
  submitter: ProductionUsageWithRelations["submitter"]
  submittedBy: string | null
  usageDate: string
  recordedAt: string
  notes: string | null
  items: ProductionUsageWithRelations[]
}

/**
 * Groups the SKU lines that were submitted together into one usage entry.
 */
export function groupProductionUsage(
  usage: ProductionUsageWithRelations[]
): ProductionUsageBatch[] {
  const batches = new Map<string, ProductionUsageBatch>()

  for (const line of usage) {
    const id = line.batch_id ?? line.id
    const existing = batches.get(id)

    if (existing) {
      existing.items.push(line)
      if (!existing.notes) existing.notes = line.notes
      continue
    }

    batches.set(id, {
      id,
      pipeline: line.pipeline,
      stage: line.stage,
      submitter: line.submitter,
      submittedBy: line.submitted_by ?? line.recorded_by,
      usageDate: line.usage_date,
      recordedAt: line.recorded_at,
      notes: line.notes,
      items: [line],
    })
  }

  return Array.from(batches.values())
}
