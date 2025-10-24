"use client"

import type React from "react"
import { useEffect } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/config"
import { useRouter, usePathname } from "next/navigation"
import { saveAuthToken, removeAuthToken } from "@/lib/firebase/auth-helpers"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, loading] = useAuthState(auth)
  const router = useRouter()
  const pathname = usePathname()

  const publicRoutes = ["/", "/login", "/signup", "/creator-access"]
  const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith("/creator-access")

  useEffect(() => {
    if (loading) return

    if (user) {
      // Usuário autenticado - salva token
      saveAuthToken()
    } else {
      // Usuário não autenticado - remove token
      removeAuthToken()

      // Se não está em rota pública, redireciona para login
      if (!isPublicRoute) {
        router.push(`/?redirect=${pathname}`)
      }
    }
  }, [user, loading, router, pathname, isPublicRoute])

  // Mostra loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  // Se não está autenticado e não é rota pública, não renderiza nada
  if (!user && !isPublicRoute) {
    return null
  }

  return <>{children}</>
}
