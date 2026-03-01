import { LucideIcon } from "lucide-react"

export interface HeaderLink {
  href: string
  label: string
  icon?: LucideIcon
  description?: string
}

export interface HeaderConfig {
  brand: {
    title: string
    icon: string
  }
  navigationLinks: HeaderLink[]
}

export const headerConfig: HeaderConfig = {
  brand: {
    title: "Tabby",
    icon: "/logos/tabby-logo.png"
  },
  navigationLinks: [
    {
      href: "/#features",
      label: "Features"
    },
    {
      href: "/dashboard",
      label: "Dashboard"
    },
    {
      href: "/analytics",
      label: "Analytics"
    }
  ]
}