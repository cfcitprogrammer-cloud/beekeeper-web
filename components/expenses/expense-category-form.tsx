"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"

import {
  createExpenseCategory,
  updateExpenseCategory,
} from "@/actions/expense-category.action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/toast"
import type { ExpenseCategory } from "@/types/database"

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function ExpenseCategoryForm({ category }: { category?: ExpenseCategory | null }) {
  const router = useRouter()
  const editingId = category?.id ?? null
  const [saving, setSaving] = React.useState(false)
  const [draft, setDraft] = React.useState({
    name: category?.name ?? "",
    code: category?.code ?? "",
    description: category?.description ?? "",
    isActive: category?.is_active ?? true,
  })

  async function saveCategory() {
    if (!draft.name.trim()) {
      toast.add({ type: "error", title: "Category name is required" })
      return
    }
    setSaving(true)
    const payload = {
      name: draft.name,
      code: draft.code.trim() || slugify(draft.name),
      description: draft.description,
      isActive: draft.isActive,
    }
    const result = editingId
      ? await updateExpenseCategory({ ...payload, id: editingId })
      : await createExpenseCategory(payload)
    setSaving(false)
    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not save category",
        description: result.error,
      })
      return
    }
    toast.add({
      type: "success",
      title: editingId ? "Category updated" : "Category created",
    })
    router.push("/expenses/categories")
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push("/expenses/categories")}
      >
        <ArrowLeft />
        Back to categories
      </Button>
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              value={draft.name}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  name: event.target.value,
                  code:
                    editingId || draft.code.trim()
                      ? draft.code
                      : slugify(event.target.value),
                })
              }
              placeholder="Meals"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category-code">Code</Label>
            <Input
              id="category-code"
              value={draft.code}
              onChange={(event) => setDraft({ ...draft, code: event.target.value })}
              placeholder="meals"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="category-description">Description</Label>
            <Input
              id="category-description"
              value={draft.description}
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value })
              }
              placeholder="Optional description"
            />
          </div>
          <label className="flex items-start gap-2 rounded-md border p-3 text-xs sm:col-span-2">
            <input
              type="checkbox"
              className="mt-0.5 size-3.5 accent-primary"
              checked={draft.isActive}
              onChange={(event) =>
                setDraft({ ...draft, isActive: event.target.checked })
              }
            />
            <span>
              <span className="block font-medium">Active</span>
              <span className="block text-[0.625rem] text-muted-foreground">
                Inactive categories stay on existing expenses but are not offered
                for new ones.
              </span>
            </span>
          </label>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={() => router.push("/expenses/categories")}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={saveCategory} disabled={saving}>
            <Save />
            {saving ? "Saving…" : "Save category"}
          </Button>
        </div>
      </div>
    </div>
  )
}
