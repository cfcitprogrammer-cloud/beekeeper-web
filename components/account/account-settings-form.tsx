"use client"

import * as React from "react"
import { KeyRound, Moon, Palette, Save, Sun } from "lucide-react"

import { changePassword } from "@/actions/account.action"
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
import { toast } from "@/components/ui/toast"
import { useTheme } from "next-themes"

export function AccountSettingsForm() {
  const { theme, setTheme } = useTheme()
  const [saving, setSaving] = React.useState(false)
  const [password, setPassword] = React.useState("")
  const [confirm, setConfirm] = React.useState("")

  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  async function submitPassword(event: React.FormEvent) {
    event.preventDefault()
    if (password.length < 8) {
      toast.add({
        type: "error",
        title: "Password too short",
        description: "Use at least 8 characters.",
      })
      return
    }
    if (password !== confirm) {
      toast.add({
        type: "error",
        title: "Passwords do not match",
        description: "Re-enter the new password to confirm it.",
      })
      return
    }

    setSaving(true)
    const result = await changePassword({ newPassword: password })
    setSaving(false)

    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not change password",
        description: result.error,
      })
      return
    }

    setPassword("")
    setConfirm("")
    toast.add({
      type: "success",
      title: "Password updated",
      description: "Your password has been changed.",
    })
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-3.5 text-primary" />
            Change password
          </CardTitle>
          <CardDescription>
            Choose a strong password of at least 8 characters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitPassword} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Save className="animate-spin" />
                ) : (
                  <Save />
                )}
                {saving ? "Saving…" : "Update password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Palette className="size-3.5 text-primary" />
            Theme
          </CardTitle>
          <CardDescription>
            Pick how the interface looks. The choice is saved in your browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "light", label: "Light", icon: Sun },
              { value: "dark", label: "Dark", icon: Moon },
              { value: "system", label: "System", icon: Palette },
            ].map((option) => {
              const Icon = option.icon
              const active = mounted && theme === option.value
              return (
                <Button
                  key={option.value}
                  variant={active ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme(option.value)}
                  className="flex-col gap-1 h-16"
                >
                  <Icon className="size-4" />
                  {option.label}
                </Button>
              )
            })}
          </div>
          <p className="text-[0.625rem] text-muted-foreground">
            You can also press “D” anywhere to toggle between light and dark.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
