"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Save } from "lucide-react"

import { createSkuCategory, updateSkuCategory } from "@/actions/sku-category.action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import type { SkuCategory } from "@/types/database"

export function SkuCategoryForm({
  category,
  categories,
}: {
  category?: SkuCategory | null
  categories: SkuCategory[]
}) {
  const router = useRouter()
  const editingId = category?.id ?? null
  const [saving, setSaving] = React.useState(false)
  const [draft, setDraft] = React.useState({
    name: category?.name ?? "",
    parent_id: category?.parent_id ?? "",
  })

  async function saveHandler() {
    if (!draft.name.trim()) {
      toast.add({
        type: "error",
        title: "Missing details",
        description: "Name is required.",
      })
      return
    }
    setSaving(true)
    const payload = { name: draft.name, parentId: draft.parent_id || undefined }
    const result = editingId
      ? await updateSkuCategory({ ...payload, id: editingId })
      : await createSkuCategory(payload)
    setSaving(false)
    if (!result.success) {
      toast.add({
        type: "error",
        title: editingId ? "Could not update category" : "Could not create category",
        description: result.error,
      })
      return
    }
    toast.add({
      type: "success",
      title: editingId ? "Category updated" : "Category created",
      description: `${draft.name.trim()} saved.`,
    })
    router.push("/inventory/categories")
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push("/inventory/categories")}
      >
        <ArrowLeft />
        Back to categories
      </Button>

      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-parent">Parent category</Label>
            <NativeSelect
              id="cat-parent"
              value={draft.parent_id}
              onChange={(e) => setDraft({ ...draft, parent_id: e.target.value })}
            >
              <option value="">None</option>
              {categories
                .filter((c) => c.id !== editingId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </NativeSelect>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={() => router.push("/inventory/categories")}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={saveHandler} disabled={saving}>
            {editingId ? <Save /> : <Plus />}
            {saving ? "Saving…" : editingId ? "Save changes" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  )
}
