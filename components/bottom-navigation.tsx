"use client"
import { Button } from "@/components/ui/button"
import { Home, User, MessageCircle, Users, Crown } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUserContext } from "@/lib/contexts/user-context"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/config"
import { useState, useEffect } from "react"

interface BottomNavigationProps {
  userProfile?: {
    uid: string
    username: string
  } | null
}

export function BottomNavigation({ userProfile }: BottomNavigationProps) {
  const [user] = useAuthState(auth)
  const { isCreator, userLevel, currentUserData, mounted } = useUserContext()
  const [hasNewChatMessages, setHasNewChatMessages] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    if (!mounted || !user || (!isCreator && userLevel !== "platinum" && userLevel !== "diamante")) return

    const checkNewMessages = () => {
      if (typeof window === "undefined") return

      const hasNewMessages = localStorage.getItem(`hasNewChatMessages_${user.uid}`)
      if (hasNewMessages === "true") {
        setHasNewChatMessages(true)
      }
    }

    checkNewMessages()
    const interval = setInterval(checkNewMessages, 30000)
    return () => clearInterval(interval)
  }, [user, userLevel, isCreator, mounted])

  if (!mounted) {
    return null
  }

  const handleChatClick = () => {
    if (user && typeof window !== "undefined") {
      setHasNewChatMessages(false)
      localStorage.removeItem(`hasNewChatMessages_${user.uid}`)
      localStorage.setItem(`lastChatRead_${user.uid}`, Date.now().toString())
    }
  }

  const isActive = (path: string) => {
    if (path === "/feed") return pathname === "/feed" || pathname === "/"
    if (path === "/profile") {
      return (
        pathname.startsWith("/user/") ||
        (pathname.startsWith("/creator/") && !pathname.startsWith("/creator-dashboard"))
      )
    }
    if (path === "/chat") return pathname.startsWith("/chat")
    if (path === "/creators") return pathname.startsWith("/creators")
    if (path === "/creator-dashboard") return pathname.startsWith("/creator-dashboard")
    return pathname === path
  }

  const canAccessChat = isCreator || userLevel === "platinum" || userLevel === "diamante"

  const getProfileUrl = () => {
    if (!currentUserData && userProfile) {
      return `/user/${encodeURIComponent(userProfile.username)}`
    }

    if (!currentUserData) return "/profile"

    if (currentUserData.userType === "creator") {
      return `/creator/${encodeURIComponent(currentUserData.username)}`
    } else {
      return `/user/${encodeURIComponent(currentUserData.username)}`
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-md border-t border-border z-40">
      <div className={`grid ${isCreator ? "grid-cols-5" : "grid-cols-4"} gap-1 p-2 sm:p-4 max-w-md mx-auto`}>
        <Link href="/feed">
          <Button
            variant="ghost"
            size="sm"
            className={`rounded-full w-full ${isActive("/feed") ? "text-primary" : "text-muted-foreground"}`}
          >
            <div className="flex flex-col items-center space-y-1">
              <Home className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs">Feed</span>
            </div>
          </Button>
        </Link>

        <Link href="/creators">
          <Button
            variant="ghost"
            size="sm"
            className={`rounded-full w-full ${isActive("/creators") ? "text-primary glow-pink" : "text-muted-foreground"}`}
          >
            <div className="flex flex-col items-center space-y-1">
              <Users className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs">Criadoras</span>
            </div>
          </Button>
        </Link>

        {canAccessChat ? (
          <Link href="/chat" onClick={handleChatClick}>
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-full relative w-full ${isActive("/chat") ? "text-primary" : "text-muted-foreground"}`}
            >
              <div className="flex flex-col items-center space-y-1">
                <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-xs">Chat</span>
                {hasNewChatMessages && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-medium">!</span>
                  </div>
                )}
              </div>
            </Button>
          </Link>
        ) : (
          <Button variant="ghost" size="sm" className="rounded-full text-muted-foreground opacity-50 w-full" disabled>
            <div className="flex flex-col items-center space-y-1">
              <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs">Chat</span>
            </div>
          </Button>
        )}

        {isCreator && (
          <Link href="/creator-dashboard">
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-full w-full ${isActive("/creator-dashboard") ? "text-primary glow-pink" : "text-muted-foreground"}`}
            >
              <div className="flex flex-col items-center space-y-1">
                <Crown className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-xs">Dashboard</span>
              </div>
            </Button>
          </Link>
        )}

        <Link href={getProfileUrl()}>
          <Button
            variant="ghost"
            size="sm"
            className={`rounded-full w-full ${isActive("/profile") ? "text-primary" : "text-muted-foreground"}`}
          >
            <div className="flex flex-col items-center space-y-1">
              <User className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs">Perfil</span>
            </div>
          </Button>
        </Link>
      </div>
    </nav>
  )
}
