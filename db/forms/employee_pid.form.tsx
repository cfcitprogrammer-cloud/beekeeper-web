// components/user-form.tsx
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { userSchema, UserFormValues } from "../schema/sample"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
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

export function EmployeePIDForm() {
  const [isPending, startTransition] = React.useTransition()

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      age: 18,
      title: "",
    },
  })

  function onSubmit(data: UserFormValues) {
    alert("SUBMIT")
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Create New Employee</CardTitle>
          <CardDescription>
            Enter employee details to register them to the database.
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
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="user-name">Name</FieldLabel>
                    <Input
                      {...field}
                      id="user-name"
                      aria-invalid={fieldState.invalid}
                      placeholder="John Doe"
                      autoComplete="off"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              {/* Age Field */}
              <Controller
                name="age"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="user-age">Age</FieldLabel>
                    <Input
                      {...field}
                      type="number"
                      id="user-age"
                      aria-invalid={fieldState.invalid}
                      placeholder="18"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              {/* Title Field */}
              <Controller
                name="title"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="user-title">Title</FieldLabel>
                    <Input
                      {...field}
                      id="user-title"
                      aria-invalid={fieldState.invalid}
                      placeholder="a"
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
