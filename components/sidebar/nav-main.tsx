"use client"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { ChevronsRight } from "@hugeicons/core-free-icons"
import type { IconSvgObject } from "@hugeicons/core-free-icons/types"
import { HugeiconsIcon } from "@hugeicons/react"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: IconSvgObject
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Main Directory</SidebarGroupLabel>

      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.title}
            defaultOpen={item.isActive}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger
                render={
                  <SidebarMenuButton tooltip={item.title}>
                    {item.icon && <HugeiconsIcon icon={item.icon} />}

                    <span>{item.title}</span>

                    <HugeiconsIcon
                      icon={ChevronsRight}
                      className="ml-auto transition-transform group-data-[panel-open]/collapsible:rotate-90"
                    />
                  </SidebarMenuButton>
                }
              />

              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items?.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton>
                        <span>{subItem.title}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
