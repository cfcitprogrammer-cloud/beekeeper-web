"use client"

import * as React from "react"
import { useActionState } from "react"
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react"

import { login, type LoginState } from "@/actions/auth.action"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {}
  )
  const [showPassword, setShowPassword] = React.useState(false)

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      {state.error && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Authentication failed</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="email">Work email</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            defaultValue={state.email}
            aria-invalid={Boolean(state.error)}
            className="pl-8"
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <span className="text-[0.625rem] text-muted-foreground">
            Contact your administrator for a reset
          </span>
        </div>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            aria-invalid={Boolean(state.error)}
            className="px-8"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="size-3.5" />
            ) : (
              <Eye className="size-3.5" />
            )}
          </button>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
        {pending ? "Signing in…" : "Sign in"}
        {!pending && <ArrowRight className="ml-auto" />}
      </Button>

      <p className="text-center text-[0.625rem] text-muted-foreground">
        Access is granted through your company role. Ask an administrator if you
        need an account.
      </p>
    </form>
  )
}
