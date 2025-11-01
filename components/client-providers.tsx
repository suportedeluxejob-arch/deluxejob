"use client"

import dynamic from "next/dynamic"
import type { ReactNode } from "react"

const NotificationProvider = dynamic(
  () => import("@/components/notification-provider").then((mod) => ({ default: mod.NotificationProvider })),
  { ssr: false },
)

const ContentProtectionProvider = dynamic(
  () => import("@/components/content-protection-provider").then((mod) => ({ default: mod.ContentProtectionProvider })),
  { ssr: false },
)

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <NotificationProvider>
      <ContentProtectionProvider>{children}</ContentProtectionProvider>
    </NotificationProvider>
  )
}
