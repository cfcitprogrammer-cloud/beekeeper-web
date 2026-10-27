// lib/schemas/salesGroup.ts
import { z } from "zod"

export const salesGroupSchema = z.object({
  group_name: z
    .string()
    .min(2, { message: "Name must be at least 2 characters." }),
})

export type SalesGroupFormValues = z.infer<typeof salesGroupSchema>
