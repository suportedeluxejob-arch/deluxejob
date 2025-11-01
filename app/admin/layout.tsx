"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { getAdminSession, clearAdminSession } from "@/lib/admin-session"
import {
  Loader2,
  LogOut,
  LayoutDashboard,
  Users,
  UserCog,
  Bell,
  DollarSign,
  Network,
  Menu,
  X,
  UserPlus,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const isLoginPage = pathname === "/admin/login"
    const hasSession = getAdminSession()

    if (!isLoginPage && !hasSession) {
      router.push("/admin/login")
      return
    }

    if (isLoginPage && hasSession) {
      router.push("/admin")
      return
    }

    setIsAuthorized(hasSession || isLoginPage)
    setIsChecking(false)
  }, [pathname, router])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  const handleLogout = () => {
    clearAdminSession()
    router.push("/admin/login")
  }

  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (pathname === "/admin/login") {
    return <>{children}</>
  }

  if (!isAuthorized) {
    return null
  }

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/users", label: "Usuários", icon: Users },
    { href: "/admin/creators", label: "Criadoras", icon: UserCog },
    { href: "/admin/creators/create-first", label: "Criar 1ª Criadora", icon: UserPlus }, // Added link to create first creator
    { href: "/admin/financials", label: "Financeiro", icon: DollarSign },
    { href: "/admin/mlm", label: "MLM", icon: Network },
    { href: "/admin/notifications", label: "Notificações", icon: Bell },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden rounded-lg p-2 hover:bg-muted"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Painel Admin</h1>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="hidden lg:block border-b border-border bg-card/50">
        <div className="container mx-auto px-4">
          <nav className="flex gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-border bg-card">
          <nav className="container mx-auto px-4 py-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      )}

      <div className="container mx-auto px-4 py-6 sm:py-8">{children}</div>
    </div>
  )
}
