"use client"

import * as React from "react"

import { NavMain } from "@/components/sidebar/nav-main"
import { NavSecondary } from "@/components/sidebar/nav-secondary"
import { NavUser } from "@/components/sidebar/nav-user"
import { TeamSwitcher } from "@/components/sidebar/teams-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  BriefcaseIcon,
  CalendarIcon,
  ClockIcon,
  FoldersIcon,
  Frame,
  GalleryVerticalEndIcon,
  PresentationLineChartIcon,
  SquareTerminalIcon,
  UsersIcon,
} from "@hugeicons/core-free-icons"
import FrameIcon from "@hugeicons/core-free-icons/FrameIcon"
import { NavEmployeeManagement } from "./nav-employee-management"

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: Frame,
      plan: "Enterprise",
    },
  ],
  navEmployeeManagement: [
    {
      title: "Employees",
      url: "#",
      icon: UsersIcon,
      isActive: true,
      items: [
        {
          title: "Dashboard",
          url: "#",
        },
        {
          title: "Employee Directory",
          url: "#",
        },
        {
          title: "Organization Chart",
          url: "#",
        },
        {
          title: "Policies",
          url: "#",
        },
        {
          title: "Disciplinary Actions",
          url: "#",
        },
        {
          title: "Configuration",
          url: "#",
        },
      ],
    },
    {
      title: "Attendances",
      url: "#",
      icon: ClockIcon,
      isActive: true,
      items: [
        {
          title: "Dashboard",
          url: "#",
        },
        {
          title: "My Attendance",
          url: "#",
        },
        {
          title: "Attendance Logs",
          url: "#",
        },
      ],
    },
    {
      title: "Leaves",
      url: "#",
      icon: CalendarIcon,
      isActive: true,
      items: [
        {
          title: "Dashboard",
          url: "#",
        },
        {
          title: "Request Leave",
          url: "#",
        },
        {
          title: "My Leave Requests",
          url: "#",
        },
        {
          title: "Leave Requests",
          url: "#",
        },
        {
          title: "Leave Balances",
          url: "#",
        },
      ],
    },
    {
      title: "Recruitment",
      url: "#",
      icon: BriefcaseIcon,
      isActive: true,
      items: [
        {
          title: "Dashboard",
          url: "#",
        },
        {
          title: "Recruitment Pipeline",
          url: "#",
        },
        {
          title: "Candidates",
          url: "#",
        },
        {
          title: "Interviews",
          url: "#",
        },
        {
          title: "Job Openings",
          url: "#",
        },
        {
          title: "Configuration",
          url: "#",
        },
      ],
    },
    {
      title: "Assets",
      url: "#",
      icon: FoldersIcon,
      isActive: true,
      items: [
        {
          title: "Dashboard",
          url: "#",
        },
        {
          title: "Assets Management",
          url: "#",
        },
      ],
    },
    {
      title: "Performance",
      url: "#",
      icon: PresentationLineChartIcon,
      isActive: true,
      items: [
        {
          title: "KPI Tracking",
          url: "#",
        },
      ],
    },
  ],
  navMain: [
    {
      title: "Human Resources",
      url: "#",
      icon: UsersIcon,
      isActive: true,
      items: [
        {
          title: "Employee Directory",
          url: "#",
        },
        {
          title: "Starred",
          url: "#",
        },
        {
          title: "Settings",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      name: "Design Engineering",
      url: "#",
      icon: Frame,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavEmployeeManagement items={data.navEmployeeManagement} />
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
