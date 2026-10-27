import { login } from "@/actions/auth.action"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <section className="flex h-screen w-screen items-center justify-center">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error === "invalid-credentials" && (
            <Alert className="mb-4" variant={"destructive"}>
              <HugeiconsIcon icon={AlertIcon} />
              <AlertTitle>Authentication Failed</AlertTitle>
              <AlertDescription>
                <p role="alert">Invalid email or password. Please try again.</p>
              </AlertDescription>
            </Alert>
          )}

          <form action={login}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2 text-left">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="grid gap-2 text-left">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <a
                    href="/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>

                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>

              <Button type="submit" className="w-full">
                Login
              </Button>
            </div>
          </form>
        </CardContent>

        <CardFooter className="flex-col gap-2" />
      </Card>
    </section>
  )
}
