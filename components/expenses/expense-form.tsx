"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Download,
  Paperclip,
  Receipt,
  Save,
  Trash2,
  X,
} from "lucide-react"

import {
  createExpense,
  updateExpense,
} from "@/actions/expense.action"
import {
  deleteExpenseAttachment,
  getExpenseAttachmentUrl,
  uploadExpenseAttachment,
} from "@/actions/expense-attachment.action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import {
  EXPENSE_STATUSES,
  type ExpenseCategory,
} from "@/types/database"
import { humanize } from "@/lib/format"
import type { ExpensePlanWithRelations, ExpenseWithRelations } from "@/lib/data/operations"

const today = () => new Date().toISOString().slice(0, 10)

export function ExpenseForm({
  plans,
  categories,
  expense,
  initialPlanId,
}: {
  plans: ExpensePlanWithRelations[]
  categories: ExpenseCategory[]
  expense?: ExpenseWithRelations | null
  initialPlanId?: string
}) {
  const router = useRouter()
  const editingId = expense?.id ?? null
  const [saving, setSaving] = React.useState(false)
  const [removedAttachmentIds, setRemovedAttachmentIds] = React.useState<string[]>([])
  const [files, setFiles] = React.useState<File[]>([])
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const startingPlanId = expense?.plan_id ?? initialPlanId ?? ""
  const startingPlan = plans.find((plan) => plan.id === startingPlanId) ?? null
  const startingCategory = expense
    ? (categories.find((category) => category.id === expense.category_id) ??
      categories.find(
        (category) =>
          category.name.toLowerCase() === expense.category?.toLowerCase() ||
          category.code.toLowerCase() === expense.category?.toLowerCase()
      ) ??
      null)
    : null

  const [draft, setDraft] = React.useState({
    planId: startingPlanId,
    expenseDate: expense?.expense_date ?? startingPlan?.start_date ?? today(),
    categoryId: startingCategory?.id ?? "",
    description: expense?.description ?? "",
    amount: expense ? String(expense.amount) : "0",
    currency: expense?.currency ?? "PHP",
    isReimbursable: expense?.is_reimbursable ?? false,
    status: (expense?.status ?? "pending").toUpperCase(),
    notes: expense?.notes ?? "",
  })

  const selectedPlan =
    plans.find((plan) => plan.id === draft.planId) ?? null

  function changePlan(planId: string) {
    const plan = plans.find((value) => value.id === planId) ?? null
    setDraft((current) => ({
      ...current,
      planId,
      expenseDate:
        plan && (current.expenseDate < plan.start_date || current.expenseDate > plan.end_date)
          ? plan.start_date
          : current.expenseDate,
    }))
  }

  function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return
    setFiles((current) => [...current, ...Array.from(list)])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function downloadAttachment(storagePath: string) {
    const result = await getExpenseAttachmentUrl(storagePath)
    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not open attachment",
        description: result.error,
      })
      return
    }
    window.open(result.data.url, "_blank", "noopener,noreferrer")
  }

  async function saveExpense() {
    if (!draft.description.trim()) {
      toast.add({ type: "error", title: "Description is required" })
      return
    }

    setSaving(true)
    const payload = {
      planId: draft.planId || undefined,
      expenseDate: draft.expenseDate,
      categoryId: draft.categoryId || undefined,
      description: draft.description,
      amount: Number(draft.amount),
      currency: draft.currency,
      isReimbursable: draft.isReimbursable,
      notes: draft.notes,
      ...(editingId ? { status: draft.status } : {}),
    }
    const result = editingId
      ? await updateExpense({ ...payload, id: editingId })
      : await createExpense(payload)

    if (!result.success) {
      setSaving(false)
      toast.add({
        type: "error",
        title: "Could not save expense",
        description: result.error,
      })
      return
    }

    const expenseId = editingId ?? result.data.id
    let uploadFailures = 0

    for (const attachmentId of removedAttachmentIds) {
      const removal = await deleteExpenseAttachment(attachmentId)
      if (!removal.success) uploadFailures += 1
    }

    for (const file of files) {
      const formData = new FormData()
      formData.set("expenseId", expenseId)
      formData.set("file", file)
      const upload = await uploadExpenseAttachment(formData)
      if (!upload.success) uploadFailures += 1
    }

    setSaving(false)
    toast.add({
      type: "success",
      title: editingId ? "Expense updated" : "Expense created",
      description:
        uploadFailures > 0
          ? `${uploadFailures} attachment operation(s) failed. You can retry from the edit screen.`
          : undefined,
    })
    router.push("/expenses/items")
    router.refresh()
  }

  const existingAttachments = (expense?.attachments ?? []).filter(
    (attachment) => !removedAttachmentIds.includes(attachment.id)
  )

  return (
    <div className="space-y-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push("/expenses/items")}
      >
        <ArrowLeft />
        Back to expense items
      </Button>

      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="expense-plan">Expense plan (optional)</Label>
            <NativeSelect
              id="expense-plan"
              value={draft.planId}
              onChange={(event) => changePlan(event.target.value)}
              className="w-full"
            >
              <option value="">No plan — standalone expense</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.title} · {plan.start_date} → {plan.end_date}
                </option>
              ))}
            </NativeSelect>
            <p className="text-[0.625rem] text-muted-foreground">
              {selectedPlan
                ? `Dates must fall between ${selectedPlan.start_date} and ${selectedPlan.end_date}.`
                : "Standalone items do not need an expense plan."}
            </p>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <p className="rounded-md border bg-muted/30 p-2 text-[0.625rem] text-muted-foreground">
              This expense is recorded for the signed-in employee. No employee
              selection is required.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="expense-date">Expense date</Label>
            <Input
              id="expense-date"
              type="date"
              value={draft.expenseDate}
              min={selectedPlan?.start_date}
              max={selectedPlan?.end_date}
              onChange={(event) =>
                setDraft({ ...draft, expenseDate: event.target.value })
              }
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="expense-description">Description</Label>
            <Input
              id="expense-description"
              value={draft.description}
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value })
              }
              placeholder="Taxi to outlet, client meal, supplies…"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="expense-amount">Amount</Label>
            <Input
              id="expense-amount"
              type="number"
              min={0}
              step="0.01"
              value={draft.amount}
              onChange={(event) =>
                setDraft({ ...draft, amount: event.target.value })
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="expense-category">Category</Label>
            <NativeSelect
              id="expense-category"
              value={draft.categoryId}
              onChange={(event) =>
                setDraft({ ...draft, categoryId: event.target.value })
              }
              className="w-full"
            >
              <option value="">Use default category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {category.is_active ? "" : " (inactive)"}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="expense-currency">Currency</Label>
            <Input
              id="expense-currency"
              value={draft.currency}
              onChange={(event) =>
                setDraft({ ...draft, currency: event.target.value })
              }
            />
          </div>

          {editingId ? (
            <div className="space-y-1.5">
              <Label htmlFor="expense-status">Status</Label>
              <NativeSelect
                id="expense-status"
                value={draft.status}
                onChange={(event) =>
                  setDraft({ ...draft, status: event.target.value })
                }
                className="w-full"
              >
                {EXPENSE_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {humanize(value)}
                  </option>
                ))}
              </NativeSelect>
            </div>
          ) : null}

          <label className="flex items-start gap-2 rounded-md border p-3 text-xs sm:col-span-2">
            <input
              type="checkbox"
              className="mt-0.5 size-3.5 accent-primary"
              checked={draft.isReimbursable}
              onChange={(event) =>
                setDraft({ ...draft, isReimbursable: event.target.checked })
              }
            />
            <span>
              <span className="block font-medium">Reimbursable</span>
              <span className="block text-[0.625rem] text-muted-foreground">
                Mark this item when the employee should be reimbursed.
              </span>
            </span>
          </label>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="expense-notes">Notes</Label>
            <Input
              id="expense-notes"
              value={draft.notes}
              onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
              placeholder="Optional notes"
            />
          </div>

          <div className="space-y-2 rounded-md border p-3 sm:col-span-2">
            <div className="flex items-center gap-2 text-xs font-medium">
              <Paperclip className="size-3.5" />
              Attachments
            </div>
            <p className="text-[0.625rem] text-muted-foreground">
              Add one or more receipts or supporting files. Files are uploaded when
              you save.
            </p>

            {existingAttachments.length > 0 ? (
              <div className="space-y-1">
                {existingAttachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5"
                  >
                    <span className="min-w-0 truncate text-xs">
                      {attachment.file_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Download ${attachment.file_name}`}
                        onClick={() => downloadAttachment(attachment.storage_path)}
                      >
                        <Download className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${attachment.file_name}`}
                        onClick={() =>
                          setRemovedAttachmentIds((current) => [
                            ...current,
                            attachment.id,
                          ])
                        }
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            {files.length > 0 ? (
              <div className="space-y-1">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${file.lastModified}-${index}`}
                    className="flex items-center justify-between gap-2 rounded-md border border-dashed px-2 py-1.5"
                  >
                    <span className="min-w-0 truncate text-xs">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${file.name}`}
                      onClick={() =>
                        setFiles((current) =>
                          current.filter((_, fileIndex) => fileIndex !== index)
                        )
                      }
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}

            <Input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(event) => addFiles(event.target.files)}
              aria-label="Add expense attachments"
            />
          </div>
        </div>

        {!editingId ? (
          <p className="mt-3 text-[0.625rem] text-muted-foreground">
            New expenses start with the database default status. Status can be
            changed after the expense is created.
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={() => router.push("/expenses/items")}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={saveExpense} disabled={saving}>
            {editingId ? <Save /> : <Receipt />}
            {saving ? "Saving…" : "Save expense"}
          </Button>
        </div>
      </div>
    </div>
  )
}
