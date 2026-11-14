import { redirect } from "next/navigation"
import {
  Fingerprint,
  Hexagon,
  ShieldCheck,
  ShoppingCart,
  Users,
} from "lucide-react"

import { LoginForm } from "@/components/auth/login-form"
import { AsciiBee, AsciiComb } from "@/components/shared/ascii-art"
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
    redirect(defaultRouteFor())
  }

  const { next } = await searchParams
  const destination =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? next
      : ""

  return (
    <main className="grid min-h-svh lg:grid-cols-[1.08fr_1fr]">
      <section className="relative hidden flex-col overflow-hidden border-r border-border bg-card p-10 lg:flex">
        <div className="field-grid absolute inset-0 opacity-30" aria-hidden />
        <div
          aria-hidden
          className="absolute -top-32 -right-24 size-96 bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-40 -left-24 size-96 bg-primary/5 blur-3xl"
        />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center border border-primary/40 bg-primary/10 text-primary">
              <Hexagon className="size-5 fill-current" strokeWidth={1.5} />
            </span>
            <div className="leading-tight">
              <p className="font-heading text-base">Beekeeper</p>
              <p className="font-mono text-[0.5rem] tracking-[0.18em] text-muted-foreground uppercase">
                Hive · ERP · Field ops
              </p>
            </div>
          </div>
          <p className="micro-label text-right">
            Est. apiary
            <br />
            2026 // 01
          </p>
        </div>

        <div className="relative my-auto max-w-xl space-y-5 py-10">
          <p className="micro-label flex items-center gap-2">
            <span className="h-px w-5 bg-primary" aria-hidden />
            00 // The hive
          </p>
          <h1 className="font-heading text-5xl leading-[0.92] tracking-tight text-balance">
            For the sake of honey and order.
          </h1>
          <p className="font-heading text-lg text-primary">蜂と蜜のために</p>
          <p className="max-w-md text-sm/relaxed text-muted-foreground">
            Sign in to run the day across people, outlets and approvals. Every
            write is recorded against your account, so the hive stays
            auditable.
          </p>

          <div className="flex items-end justify-between gap-6 border-y border-border py-4">
            <AsciiBee className="text-[0.7rem] text-primary" />
            <div className="hidden shrink-0 sm:block">
              <AsciiComb className="text-[0.5rem] text-muted-foreground/25" />
            </div>
          </div>

          <ul className="border-t border-border">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <li
                  key={feature.title}
                  className="grid grid-cols-[2rem_1fr_auto] items-baseline gap-3 border-b border-border py-3"
                >
                  <span className="font-mono text-[0.5625rem] text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <span className="block text-xs font-medium">
                      {feature.title}
                    </span>
                    <span className="block text-[0.6875rem] text-muted-foreground">
                      {feature.description}
                    </span>
                  </span>
                  <Icon className="size-3.5 text-muted-foreground/60" />
                </li>
              )
            })}
          </ul>
        </div>

        <p className="micro-label relative flex items-center gap-2">
          <Fingerprint className="size-3" />
          Sessions secured by Supabase
        </p>
      </section>

      <section className="relative flex items-center justify-center p-5 sm:p-8">
        <div
          className="field-grid absolute inset-0 opacity-20 lg:hidden"
          aria-hidden
        />
        <div className="relative w-full max-w-sm space-y-6">
          <div className="flex items-center gap-2.5 lg:hidden">
            <span className="flex size-9 items-center justify-center border border-primary/40 bg-primary/10 text-primary">
              <Hexagon className="size-5 fill-current" strokeWidth={1.5} />
            </span>
            <div className="leading-tight">
              <p className="font-heading text-base">Beekeeper</p>
              <p className="font-mono text-[0.5rem] tracking-[0.18em] text-muted-foreground uppercase">
                Hive · ERP · Field ops
              </p>
            </div>
          </div>

          <div className="space-y-2 border-b border-border pb-5">
            <p className="micro-label">Secure access // 01</p>
            <h2 className="font-heading text-4xl leading-none">
              Welcome back.
            </h2>
            <p className="text-xs text-muted-foreground">
              Sign in with your company account to continue.
            </p>
          </div>

          <LoginForm next={destination} />

          <div className="border border-border bg-card px-3 py-3">
            <p className="micro-label text-primary">First time here?</p>
            <p className="mt-1.5 text-[0.6875rem]/relaxed text-muted-foreground">
              Your account needs a company membership and role before the
              workspace unlocks. Contact your Beekeeper administrator.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
            <span className="font-mono text-[0.5rem] tracking-[0.18em] text-muted-foreground/60 uppercase">
              Beekeeper // hive ops
            </span>
            <AsciiBee className="text-[0.4rem] text-primary/60" />
          </div>
        </div>
      </section>
    </main>
  )
}
