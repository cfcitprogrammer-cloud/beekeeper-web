import { requireSuperAdmin } from "@/lib/auth/guards"
import { WorkspaceForm } from "@/db/forms/workspace.form"

export default async function NewWorkspacePage() {
  await requireSuperAdmin()
  return <WorkspaceForm />
}
