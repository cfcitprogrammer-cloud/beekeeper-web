import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Plus } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"

export default function Page() {
  return (
    <section>
      <Card className="border-t-4 border-t-primary">
        <CardHeader>
          <CardTitle>My Workspaces</CardTitle>
          <CardDescription>Manage your workspaces here.</CardDescription>
          <CardAction>
            <Link href={"/d/configuration/workspaces/new"}>
              <Button>
                <HugeiconsIcon icon={Plus} /> Create New
              </Button>
            </Link>
          </CardAction>
        </CardHeader>
      </Card>
    </section>
  )
}
