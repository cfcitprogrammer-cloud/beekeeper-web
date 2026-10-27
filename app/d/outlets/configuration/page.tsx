import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import SalesGroupPage from "./sales-group"

export default function Page() {
  return (
    <section>
      <Tabs defaultValue="account" className="w-full" orientation="vertical">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="sales-group">Sales Group</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          Make changes to your account here.
        </TabsContent>
        <TabsContent value="sales-group" className="w-[1200px]">
          <SalesGroupPage />
        </TabsContent>
      </Tabs>
    </section>
  )
}
