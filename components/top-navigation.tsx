"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Search, ArrowLeft, LogOut } from "lucide-react"
import Link from "next/link"
import { getIsabelleProfile } from "@/lib/firebase/firestore"
import { useIsMobile } from "@/hooks/use-mobile"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/config"
import { signOut } from "firebase/auth"
import { NotificationSystem } from "@/components/notification-system"
import { useRouter } from "next/navigation"

interface TopNavigationProps {
  title?: string
  showBackButton?: boolean
  backHref?: string
  userProfile?: any
}

export function TopNavigation({
  title = "DeLuxe Job",
  showBackButton = false,
  backHref = "/feed",
  userProfile,
}: TopNavigationProps) {
  const [user] = useAuthState(auth)
  const [showSearch, setShowSearch] = useState(false)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [isabelleProfile, setIsabelleProfile] = useState<any>(null)
  const isMobile = useIsMobile()
  const router = useRouter()

  useEffect(() => {
    const loadIsabelleProfile = async () => {
      try {
        const profile = await getIsabelleProfile()
        setIsabelleProfile(profile)
      } catch (error) {
        console.error("Error loading Isabelle profile:", error)
      }
    }
    loadIsabelleProfile()
  }, [])

  const isabelleAvatar = isabelleProfile?.profileImage || "/beautiful-woman-profile.png"

  const handleSearchClick = () => {
    router.push("/explore")
  }

  const closeModals = () => {
    setShowSearch(false)
  }

  const handleLogoutClick = () => {
    setShowLogoutDialog(true)
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between p-3 sm:p-4 max-w-md mx-auto">
          <div className="flex items-center space-x-2 sm:space-x-4">
            {showBackButton && (
              <Link href={backHref}>
                <Button variant="ghost" size="sm" className="rounded-full p-2">
                  <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </Link>
            )}
            <h1 className="text-lg sm:text-2xl font-bold text-primary truncate">{title}</h1>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-3">
            <Button variant="ghost" size="sm" className="rounded-full p-2" onClick={handleSearchClick}>
              <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <NotificationSystem />
            {user && (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full p-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={handleLogoutClick}
                title="Sair da plataforma"
              >
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair da plataforma?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja sair da sua conta? Você precisará fazer login novamente para acessar a plataforma.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white">
              Sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Search modal is removed as per the update */}
    </>
  )
}
