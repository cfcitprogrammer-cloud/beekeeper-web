// components/user-form.tsx
"use client"

import * as React from "react"
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
  DepartmentFormValues,
  departmentSchema,
} from "../schema/department.schema"

export function DepartmentForm() {
  const [isPending, startTransition] = React.useTransition()

  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: "",
      code: "",
      department_head_id: "",
    },
  })

  function onSubmit(data: DepartmentFormValues) {
    alert("SUBMIT")
  }

  return (
    <div className="space-y-4">
      <Card className="border-t-4 border-t-primary">
        <CardHeader>
          <CardTitle>Create New Department</CardTitle>
          <CardDescription>
            Enter department details to register them to the database.
          </CardDescription>
          <CardAction>
            <Field orientation="horizontal">
              <Button type="submit" form="user-form" disabled={isPending}>
                {isPending ? "Saving..." : "Submit"}
              </Button>
            </Field>
          </CardAction>
        </CardHeader>
      </Card>

      <Card>
        <CardContent>
          <form id="user-form" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              {/* Name Field */}
              <Controller
                name="code"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="user-name">Department Code</FieldLabel>
                    <Input
                      {...field}
                      id="code"
                      aria-invalid={fieldState.invalid}
                      placeholder="DPT-1001"
                      autoComplete="off"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="user-title">
                      Department Name
                    </FieldLabel>
                    <Input
                      {...field}
                      id="user-title"
                      aria-invalid={fieldState.invalid}
                      placeholder="Human Resources"
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
