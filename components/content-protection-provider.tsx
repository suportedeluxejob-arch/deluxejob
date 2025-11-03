"use client"

import type React from "react"
import { useEffect, memo } from "react"
import { useContentProtection } from "@/lib/content-protection"
import { useAuth } from "@/lib/firebase/auth"

/**
 * Provider que ativa a proteção de conteúdo automaticamente
 * para usuários não-assinantes
 */
export const ContentProtectionProvider = memo(function ContentProtectionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { activate, deactivate } = useContentProtection()
  const { user } = useAuth()

  useEffect(() => {
    activate()
    return () => deactivate()
  }, [activate, deactivate])

  return <>{children}</>
})
