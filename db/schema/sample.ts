// lib/schemas/user.ts
import { z } from "zod"

export const userSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  age: z.number(),
  title: z.string().min(1, { message: "Title is required." }),
})

export type UserFormValues = z.infer<typeof userSchema>
