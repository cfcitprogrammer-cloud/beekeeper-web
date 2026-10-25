// lib/schemas/workspace.ts
import { z } from "zod"

export const workspaceSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  code: z.string().min(2, { message: "Code must be at least 2 characters." }),
  description: z
    .string()
    .min(2, { message: "Description must be at least 2 characters." }),
})

export type WorkspaceFormValues = z.infer<typeof workspaceSchema>
