import type { Metadata } from 'next'

const appName = process.env.NEXT_PUBLIC_APP_NAME!

export const metadata: Metadata = {
  title: `Sign In - ${appName}`,
  description: `Sign in to ${appName}`,
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">{children}</div>
    </div>
  )
}
