// components/sales-group-form.tsx
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  SalesGroupFormValues,
  salesGroupSchema,
} from "@/db/schema/sales_group.schema"
import { createSalesGroup } from "@/actions/sales_group.action"
import { toast } from "@/components/ui/toast"
import { useRouter } from "next/navigation"

export function SalesGroupForm() {
  const router = useRouter()
  const form = useForm<SalesGroupFormValues>({
    resolver: zodResolver(salesGroupSchema),
    defaultValues: {
      group_name: "",
    },
  })

  async function onSubmit(data: SalesGroupFormValues) {
    const result = await createSalesGroup(data)

    if (!result.success) {
      toast.add({
        type: "error",
        title: "Failed to create sales group",
        description: result.error
          ? result.message
          : "Server error. Please contact administrator",
      })

      return
    } else {
      toast.add({
        type: "success",
        title: "Sales group created",
        description: "Sales group is created successfully",
      })

      router.push("/d/configuration/sales-groups/all")
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-t-4 border-t-primary">
        <CardHeader>
          <CardTitle>Create New Sales Group</CardTitle>
          <CardDescription>
            Enter sales group details to register them to the database.
          </CardDescription>
          <CardAction>
            <Field orientation="horizontal">
              <Button
                type="submit"
                form="sales-group-form"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Saving..." : "Submit"}
              </Button>
            </Field>
          </CardAction>
        </CardHeader>
      </Card>

      <Card>
        <CardContent>
          <form id="sales-group-form" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              {/* Group Name Field */}
              <Controller
                name="group_name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="group-name">Group Name</FieldLabel>
                    <Input
                      {...field}
                      id="group-name"
                      aria-invalid={fieldState.invalid}
                      placeholder="Enterprise Sales"
                      autoComplete="off"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
