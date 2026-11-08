"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Banknote,
  BriefcaseBusiness,
  Check,
  CircleUserRound,
  UserPlus,
} from "lucide-react"

import { createEmployee } from "@/actions/employee.action"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"
import { formatCurrency, formatDate, humanize } from "@/lib/format"
import {
  CIVIL_STATUSES,
  EMPLOYMENT_STATUSES,
  EMPLOYMENT_TYPES,
  GENDERS,
  PAY_FREQUENCIES,
  type Department,
  type EmployeeWithRelations,
  type Position,
} from "@/types/database"

const schema = z
  .object({
  employeeNo: z.string().optional(),
  sssNo: z.string().optional(),
  philhealthNo: z.string().optional(),
  tinNo: z.string().optional(),
  pagibigNo: z.string().optional(),
  createAccount: z.boolean(),
  password: z.string().optional(),
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  email: z.email("Enter a valid work email"),
  phone: z.string().min(7, "Enter a contact number"),
  birthDate: z.string().optional(),
  gender: z.enum(GENDERS),
  civilStatus: z.enum(CIVIL_STATUSES),
  address: z.string().optional(),
  departmentId: z.string().min(1, "Select a department"),
  positionId: z.string().min(1, "Select a position"),
  managerId: z.string().optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  employmentStatus: z.enum(EMPLOYMENT_STATUSES),
  hireDate: z.string().min(1, "Select a start date"),
  baseSalary: z.number().min(1, "Enter a base salary"),
  payFrequency: z.enum(PAY_FREQUENCIES),
  })
  .superRefine((values, context) => {
    if (values.createAccount && !values.password) {
      context.addIssue({
        code: "custom",
        path: ["password"],
        message: "Set a password for the employee login.",
      })
    } else if (values.createAccount && (values.password?.length ?? 0) < 8) {
      context.addIssue({
        code: "custom",
        path: ["password"],
        message: "The password must be at least 8 characters.",
      })
    }
  })

type FormValues = z.infer<typeof schema>

const steps = [
  {
    id: "personal",
    title: "Personal details",
    description: "Identity and contact information",
    icon: CircleUserRound,
    fields: [
      "firstName",
      "middleName",
      "lastName",
      "email",
      "phone",
      "birthDate",
      "gender",
      "civilStatus",
      "address",
    ] as (keyof FormValues)[],
  },
  {
    id: "government",
    title: "Government IDs & access",
    description: "Statutory numbers and employee login",
    icon: BadgeCheck,
    fields: [
      "employeeNo",
      "sssNo",
      "philhealthNo",
      "tinNo",
      "pagibigNo",
      "createAccount",
      "password",
    ] as (keyof FormValues)[],
  },
  {
    id: "employment",
    title: "Employment",
    description: "Team, role and reporting line",
    icon: BriefcaseBusiness,
    fields: [
      "departmentId",
      "positionId",
      "managerId",
      "employmentType",
      "employmentStatus",
      "hireDate",
    ] as (keyof FormValues)[],
  },
  {
    id: "compensation",
    title: "Compensation",
    description: "Pay and payroll frequency",
    icon: Banknote,
    fields: ["baseSalary", "payFrequency"] as (keyof FormValues)[],
  },
  {
    id: "review",
    title: "Review",
    description: "Confirm and create the employee record",
    icon: BadgeCheck,
    fields: [] as (keyof FormValues)[],
  },
]

const defaultValues: FormValues = {
  employeeNo: "",
  sssNo: "",
  philhealthNo: "",
  tinNo: "",
  pagibigNo: "",
  createAccount: false,
  password: "",
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  phone: "",
  birthDate: "",
  gender: "PREFER_NOT_TO_SAY",
  civilStatus: "Single",
  address: "",
  departmentId: "",
  positionId: "",
  managerId: "",
  employmentType: "FULL_TIME",
  employmentStatus: "PROBATION",
  hireDate: new Date().toISOString().slice(0, 10),
  baseSalary: 0,
  payFrequency: "SEMI_MONTHLY",
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-[0.625rem] text-destructive">{message}</p>
}

export function EmployeeOnboardingForm({
  departments,
  positions,
  employees,
}: {
  departments: Department[]
  positions: Position[]
  employees: EmployeeWithRelations[]
}) {
  const router = useRouter()
  const [step, setStep] = React.useState(0)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onTouched",
  })

  const {
    register,
    control,
    handleSubmit,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = form

  const values = watch()
  const currentStep = steps[step]

  async function next() {
    const valid = await trigger(currentStep.fields, { shouldFocus: true })
    if (!valid) return
    setStep((value) => Math.min(steps.length - 1, value + 1))
  }

  function back() {
    setStep((value) => Math.max(0, value - 1))
  }

  async function onSubmit(data: FormValues) {
    const result = await createEmployee({
      employeeNo: data.employeeNo || undefined,
      sssNo: data.sssNo || undefined,
      philhealthNo: data.philhealthNo || undefined,
      tinNo: data.tinNo || undefined,
      pagibigNo: data.pagibigNo || undefined,
      createAccount: data.createAccount,
      password: data.createAccount ? data.password : undefined,
      firstName: data.firstName,
      middleName: data.middleName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      birthDate: data.birthDate || undefined,
      gender: data.gender,
      civilStatus: data.civilStatus,
      address: data.address,
      departmentId: data.departmentId,
      positionId: data.positionId,
      managerId: data.managerId || undefined,
      employmentType: data.employmentType,
      status: data.employmentStatus,
      hireDate: data.hireDate,
      baseSalary: data.baseSalary,
      payFrequency: data.payFrequency,
    })

    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not create employee",
        description: result.error,
      })
      return
    }

    toast.add({
      type: "success",
      title: "Employee record created",
      description: `${data.firstName} ${data.lastName} was added as ${result.data.employee_no}.`,
    })
    router.push("/employees")
    router.refresh()
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="People"
        title="Onboard a new employee"
        description="Capture personal, employment and compensation details in a guided four-step flow."
        icon={UserPlus}
        actions={
          <Button variant="outline" render={<Link href="/employees" />}>
            <ArrowLeft />
            Back to directory
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[16rem_1fr]">
        <Card className="h-fit">
          <CardHeader className="border-b pb-3">
            <CardTitle>Onboarding progress</CardTitle>
            <CardDescription>Step {step + 1} of {steps.length}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            {steps.map((item, index) => {
              const Icon = item.icon
              const complete = index < step
              const active = index === step
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (index <= step) setStep(index)
                  }}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left transition-colors",
                    active && "bg-primary/8",
                    index <= step ? "cursor-pointer hover:bg-muted" : "cursor-default"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-[0.625rem] font-semibold",
                      complete && "border-emerald-500 bg-emerald-500 text-white",
                      active && "border-primary bg-primary text-primary-foreground",
                      !complete && !active && "border-border text-muted-foreground"
                    )}
                  >
                    {complete ? <Check className="size-3" /> : <Icon className="size-3" />}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block text-xs font-medium",
                        !active && !complete && "text-muted-foreground"
                      )}
                    >
                      {item.title}
                    </span>
                    <span className="block text-[0.625rem] text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </button>
              )
            })}
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Card>
            <CardHeader className="border-b pb-3">
              <CardTitle>{currentStep.title}</CardTitle>
              <CardDescription>{currentStep.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {step === 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">First name</Label>
                    <Input id="firstName" placeholder="Juan" {...register("firstName")} aria-invalid={Boolean(errors.firstName)} />
                    <FieldError message={errors.firstName?.message} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="middleName">Middle name</Label>
                    <Input id="middleName" placeholder="Santos" {...register("middleName")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input id="lastName" placeholder="Dela Cruz" {...register("lastName")} aria-invalid={Boolean(errors.lastName)} />
                    <FieldError message={errors.lastName?.message} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Work email</Label>
                    <Input id="email" type="email" placeholder="juan.delacruz@beekeeper.ph" {...register("email")} aria-invalid={Boolean(errors.email)} />
                    <FieldError message={errors.email?.message} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Mobile number</Label>
                    <Input id="phone" placeholder="+63 917 000 0000" {...register("phone")} aria-invalid={Boolean(errors.phone)} />
                    <FieldError message={errors.phone?.message} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="birthDate">Date of birth</Label>
                    <Input id="birthDate" type="date" {...register("birthDate")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gender">Gender</Label>
                    <Controller
                      control={control}
                      name="gender"
                      render={({ field }) => (
                        <NativeSelect id="gender" value={field.value} onChange={field.onChange} className="w-full">
                          {GENDERS.map((value) => (
                            <option key={value} value={value}>
                              {humanize(value)}
                            </option>
                          ))}
                        </NativeSelect>
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="civilStatus">Civil status</Label>
                    <Controller
                      control={control}
                      name="civilStatus"
                      render={({ field }) => (
                        <NativeSelect id="civilStatus" value={field.value} onChange={field.onChange} className="w-full">
                          {CIVIL_STATUSES.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </NativeSelect>
                      )}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="address">Home address</Label>
                    <Input id="address" placeholder="House / unit, street, barangay, city" {...register("address")} />
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="employeeNo">Employee No.</Label>
                    <Input
                      id="employeeNo"
                      placeholder="Auto-generated when blank"
                      {...register("employeeNo")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sssNo">SSS No.</Label>
                    <Input id="sssNo" placeholder="34-1234567-8" {...register("sssNo")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="philhealthNo">PhilHealth No.</Label>
                    <Input
                      id="philhealthNo"
                      placeholder="12-345678901-2"
                      {...register("philhealthNo")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tinNo">TIN No.</Label>
                    <Input id="tinNo" placeholder="123-456-789-000" {...register("tinNo")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pagibigNo">Pag-IBIG No.</Label>
                    <Input
                      id="pagibigNo"
                      placeholder="1234-5678-9012"
                      {...register("pagibigNo")}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2 rounded-lg border p-3">
                    <label className="flex items-start gap-2 text-xs">
                      <input
                        type="checkbox"
                        className="mt-0.5 size-3.5 accent-primary"
                        {...register("createAccount")}
                      />
                      <span>
                        <span className="block font-medium">
                          Create a Supabase Auth login
                        </span>
                        <span className="block text-[0.625rem] text-muted-foreground">
                          Uses the work email above. The account is confirmed immediately
                          when the service role key is configured.
                        </span>
                      </span>
                    </label>
                    {values.createAccount && (
                      <div className="mt-3 space-y-1.5">
                        <Label htmlFor="password">Initial password</Label>
                        <Input
                          id="password"
                          type="password"
                          autoComplete="new-password"
                          placeholder="At least 8 characters"
                          {...register("password")}
                          aria-invalid={Boolean(errors.password)}
                        />
                        <FieldError message={errors.password?.message} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="departmentId">Department</Label>
                    <Controller
                      control={control}
                      name="departmentId"
                      render={({ field }) => (
                        <NativeSelect
                          id="departmentId"
                          value={field.value}
                          onChange={(event) => {
                            field.onChange(event.target.value)
                            form.setValue("positionId", "")
                          }}
                          className="w-full"
                          aria-invalid={Boolean(errors.departmentId)}
                        >
                          <option value="">Select a department</option>
                          {departments.map((department) => (
                            <option key={department.id} value={department.id}>
                              {department.name}
                            </option>
                          ))}
                        </NativeSelect>
                      )}
                    />
                    <FieldError message={errors.departmentId?.message} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="positionId">Position</Label>
                    <Controller
                      control={control}
                      name="positionId"
                      render={({ field }) => (
                        <NativeSelect
                          id="positionId"
                          value={field.value}
                          onChange={field.onChange}
                          className="w-full"
                          aria-invalid={Boolean(errors.positionId)}
                        >
                          <option value="">Select a position</option>
                          {positions.map((position) => (
                            <option key={position.id} value={position.id}>
                              {position.title}
                            </option>
                          ))}
                        </NativeSelect>
                      )}
                    />
                    <FieldError message={errors.positionId?.message} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="managerId">Reporting manager</Label>
                    <Controller
                      control={control}
                      name="managerId"
                      render={({ field }) => (
                        <NativeSelect id="managerId" value={field.value} onChange={field.onChange} className="w-full">
                          <option value="">No direct manager</option>
                          {employees.map((manager) => (
                            <option key={manager.id} value={manager.id}>
                              {manager.first_name} {manager.last_name} · {manager.position?.title ?? "—"}
                            </option>
                          ))}
                        </NativeSelect>
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="employmentType">Employment type</Label>
                    <Controller
                      control={control}
                      name="employmentType"
                      render={({ field }) => (
                        <NativeSelect id="employmentType" value={field.value} onChange={field.onChange} className="w-full">
                          {EMPLOYMENT_TYPES.map((value) => (
                            <option key={value} value={value}>
                              {humanize(value)}
                            </option>
                          ))}
                        </NativeSelect>
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="employmentStatus">Initial status</Label>
                    <Controller
                      control={control}
                      name="employmentStatus"
                      render={({ field }) => (
                        <NativeSelect id="employmentStatus" value={field.value} onChange={field.onChange} className="w-full">
                          {EMPLOYMENT_STATUSES.map((value) => (
                            <option key={value} value={value}>
                              {humanize(value)}
                            </option>
                          ))}
                        </NativeSelect>
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="hireDate">Start date</Label>
                    <Input id="hireDate" type="date" {...register("hireDate")} aria-invalid={Boolean(errors.hireDate)} />
                    <FieldError message={errors.hireDate?.message} />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="baseSalary">Base salary (PHP)</Label>
                    <Input
                      id="baseSalary"
                      type="number"
                      min={0}
                      step={1000}
                      {...register("baseSalary", { valueAsNumber: true })}
                      aria-invalid={Boolean(errors.baseSalary)}
                    />
                    <FieldError message={errors.baseSalary?.message} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="payFrequency">Pay frequency</Label>
                    <Controller
                      control={control}
                      name="payFrequency"
                      render={({ field }) => (
                        <NativeSelect id="payFrequency" value={field.value} onChange={field.onChange} className="w-full">
                          {PAY_FREQUENCIES.map((value) => (
                            <option key={value} value={value}>
                              {humanize(value)}
                            </option>
                          ))}
                        </NativeSelect>
                      )}
                    />
                  </div>
                  <Separator className="sm:col-span-2" />
                  <p className="text-[0.6875rem] text-muted-foreground sm:col-span-2">
                    Statutory IDs, bank accounts and payroll profiles can be added
                    from the employee profile after onboarding.
                  </p>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-[0.625rem] font-semibold tracking-wider text-muted-foreground uppercase">
                      Employee
                    </p>
                    <p className="mt-1 font-heading text-sm font-semibold">
                      {values.firstName} {values.middleName} {values.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {values.email} · {values.phone}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ReviewItem
                      label="Department"
                      value={
                        departments.find((item) => item.id === values.departmentId)?.name ??
                        "Not selected"
                      }
                    />
                    <ReviewItem
                      label="Position"
                      value={
                        positions.find((item) => item.id === values.positionId)?.title ??
                        "Not selected"
                      }
                    />
                    <ReviewItem
                      label="Employment type"
                      value={humanize(values.employmentType)}
                    />
                    <ReviewItem
                      label="Initial status"
                      value={humanize(values.employmentStatus)}
                    />
                    <ReviewItem label="Start date" value={formatDate(values.hireDate)} />
                    <ReviewItem
                      label="Base salary"
                      value={formatCurrency(values.baseSalary)}
                    />
                    <ReviewItem
                      label="Pay frequency"
                      value={humanize(values.payFrequency)}
                    />
                    <ReviewItem
                      label="Reporting manager"
                      value={
                        employees.find((item) => item.id === values.managerId)
                          ? `${employees.find((item) => item.id === values.managerId)?.first_name} ${employees.find((item) => item.id === values.managerId)?.last_name}`
                          : "No direct manager"
                      }
                    />
                    <ReviewItem
                      label="Employee No."
                      value={values.employeeNo || "Auto-generated"}
                    />
                    <ReviewItem label="SSS No." value={values.sssNo || "Not provided"} />
                    <ReviewItem
                      label="PhilHealth No."
                      value={values.philhealthNo || "Not provided"}
                    />
                    <ReviewItem label="TIN No." value={values.tinNo || "Not provided"} />
                    <ReviewItem
                      label="Pag-IBIG No."
                      value={values.pagibigNo || "Not provided"}
                    />
                    <ReviewItem
                      label="Login account"
                      value={values.createAccount ? `Enabled · ${values.email}` : "Not created"}
                    />
                  </div>
                  <div className="rounded-lg border border-amber-500/25 bg-amber-500/8 p-3 text-[0.6875rem] text-amber-800 dark:text-amber-300">
                    Creating the record generates an employee number and adds the
                    employee to the directory. Payroll profiles can be completed
                    afterwards.
                  </div>
                </div>
              )}
            </CardContent>
            <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
              <Button
                type="button"
                variant="ghost"
                onClick={back}
                disabled={step === 0}
              >
                <ArrowLeft />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <span className="hidden text-[0.625rem] text-muted-foreground sm:block">
                  {step + 1} / {steps.length}
                </span>
                {step < steps.length - 1 ? (
                  <Button type="button" onClick={next}>
                    Continue
                    <ArrowRight />
                  </Button>
                ) : (
                  <Button type="submit" disabled={isSubmitting}>
                    <UserPlus />
                    {isSubmitting ? "Creating…" : "Create employee"}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </form>
      </div>
    </div>
  )
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border px-3 py-2">
      <p className="text-[0.625rem] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xs font-medium">{value}</p>
    </div>
  )
}
