import Icons from "@/components/global/icons";
import { SidebarConfig } from "@/components/global/app-sidebar";

const sidebarConfig: SidebarConfig = {
  brand: {
    title: "Tabby",
    icon: Icons.bot,
    href: "/"
  },
  sections: [
    {
      label: "Overview",
      items: [
        {
          title: "Dashboard",
          href: "/dashboard",
          icon: Icons.layoutDashboard
        },
        {
          title: "Analytics",
          href: "/analytics",
          icon: Icons.barChart3
        },
      ]
    },
    {
      label: "Configuration",
      items: [
        {
          title: "Preferences",
          href: "/preferences",
          icon: Icons.slidersHorizontal
        },
        {
          title: "Settings",
          href: "/settings",
          icon: Icons.settings
        },
      ]
    },
  ]
}

export default sidebarConfig