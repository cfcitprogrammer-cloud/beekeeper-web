// components/workspace-form.tsx
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
  WorkspaceFormValues,
  workspaceSchema,
} from "../schema/workspace.schema"
import { createWorkspace } from "@/actions/workspace.action"
import { toast } from "@/components/ui/toast"
import { useRouter } from "next/navigation"

export function WorkspaceForm() {
  const router = useRouter()
  const form = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
    },
  })

  async function onSubmit(data: WorkspaceFormValues) {
    const result = await createWorkspace(data)

    if (!result.success) {
      toast.add({
        type: "error",
        title: "Failed to create workspace",
        description: result.error
          ? result.message
          : "Server error. Please contact administrator",
      })

      return
    } else {
      toast.add({
        type: "success",
        title: "Workspace created",
        description: "Workspace is created successfully",
      })

      router.push("/d/configuration/workspaces/all")
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-t-4 border-t-primary">
        <CardHeader>
          <CardTitle>Create New Workspace</CardTitle>
          <CardDescription>
            Enter workspace details to register them to the database.
          </CardDescription>
          <CardAction>
            <Field orientation="horizontal">
              <Button
                type="submit"
                form="workspace-form"
                disabled={form.formState.isLoading}
              >
                {form.formState.isLoading ? "Saving..." : "Submit"}
              </Button>
            </Field>
          </CardAction>
        </CardHeader>
      </Card>

      <Card>
        <CardContent>
          <form id="workspace-form" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              {/* Code Field */}
              <Controller
                name="code"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="workspace-code">
                      Workspace Code
                    </FieldLabel>
                    <Input
                      {...field}
                      id="workspace-code"
                      aria-invalid={fieldState.invalid}
                      placeholder="WS-1001"
                      autoComplete="off"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              {/* Name Field */}
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="workspace-name">
                      Workspace Name
                    </FieldLabel>
                    <Input
                      {...field}
                      id="workspace-name"
                      aria-invalid={fieldState.invalid}
                      placeholder="Engineering Hub"
                      autoComplete="off"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              {/* Description Field */}
              <Controller
                name="description"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="workspace-description">
                      Description
                    </FieldLabel>
                    <Input
                      {...field}
                      id="workspace-description"
                      aria-invalid={fieldState.invalid}
                      placeholder="Main engineering workspace for core services"
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
