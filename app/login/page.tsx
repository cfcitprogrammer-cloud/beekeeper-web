import { redirect } from "next/navigation"
import {
  Fingerprint,
  Hexagon,
  ShieldCheck,
  ShoppingCart,
  Users,
} from "lucide-react"

import { LoginForm } from "@/components/auth/login-form"
import { getAccessContext } from "@/lib/auth/access"
import { defaultRouteFor } from "@/lib/auth/permissions"

const features = [
  {
    icon: Users,
    title: "People operations",
    description: "Employees, attendance, shifts and leave in one place.",
  },
  {
    icon: ShoppingCart,
    title: "Field execution",
    description: "Outlets, SKU catalog and bookings captured in the field.",
  },
  {
    icon: ShieldCheck,
    title: "Governed approvals",
    description: "Role-based permissions and multi-stage approval routing.",
  },
]

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const access = await getAccessContext()

  if (access.user) {
    redirect(
      access.companyId ? defaultRouteFor(access.permissions) : "/dashboard"
    )
  }

  const { next } = await searchParams
  const destination =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? next
      : ""

  return (
    <main className="grid min-h-svh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div
          aria-hidden
          className="absolute -top-24 -right-24 size-72 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -left-16 size-80 rounded-full bg-black/15 blur-3xl"
        />

        <div className="relative flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-white/15">
            <Hexagon className="size-5 fill-current" strokeWidth={1.5} />
          </span>
          <div className="leading-tight">
            <p className="font-heading text-sm font-semibold">Beekeeper</p>
            <p className="text-[0.625rem] text-primary-foreground/70">
              ERP · HR · Field Ops
            </p>
          </div>
        </div>

        <div className="relative max-w-md space-y-6">
          <div className="space-y-3">
            <p className="text-[0.625rem] font-semibold tracking-[0.2em] text-primary-foreground/70 uppercase">
              Operations workspace
            </p>
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance">
              Sign in to run the day across people, outlets and approvals.
            </h1>
            <p className="text-sm/relaxed text-primary-foreground/75">
              Every write is recorded against your account, so attendance,
              bookings and approval decisions stay auditable.
            </p>
          </div>

          <ul className="space-y-3">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <li key={feature.title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/12">
                    <Icon className="size-3.5" />
                  </span>
                  <span>
                    <span className="block text-xs font-medium">
                      {feature.title}
                    </span>
                    <span className="block text-[0.6875rem] text-primary-foreground/70">
                      {feature.description}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        <p className="relative flex items-center gap-1.5 text-[0.625rem] text-primary-foreground/60">
          <Fingerprint className="size-3" />
          Sessions are secured by Supabase authentication.
        </p>
      </section>

      <section className="flex items-center justify-center bg-background p-5 sm:p-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex items-center gap-2.5 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Hexagon className="size-5 fill-current" strokeWidth={1.5} />
            </span>
            <div className="leading-tight">
              <p className="font-heading text-sm font-semibold">Beekeeper</p>
              <p className="text-[0.625rem] text-muted-foreground">
                ERP · HR · Field Ops
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="font-heading text-xl font-semibold tracking-tight">
              Welcome back
            </h2>
            <p className="text-xs text-muted-foreground">
              Sign in with your company account to continue.
            </p>
          </div>

          <LoginForm next={destination} />

          <div className="rounded-lg border bg-muted/20 px-3 py-2.5 text-[0.625rem]/relaxed text-muted-foreground">
            <p className="font-medium text-foreground">First time here?</p>
            <p>
              Your account needs a company membership and role before the
              workspace unlocks. Contact your Beekeeper administrator.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
