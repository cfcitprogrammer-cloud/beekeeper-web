// lib/schemas/user.ts
import { z } from "zod"

export const departmentSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  code: z.string().min(2, { message: "Name must be at least 2 characters." }),
  department_head_id: z.string(),
})

export type DepartmentFormValues = z.infer<typeof departmentSchema>
