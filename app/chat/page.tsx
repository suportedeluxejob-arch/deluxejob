"use client"
import { useState, useEffect } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/config"
import { getUserProfile, isUserCreator, type UserProfile } from "@/lib/firebase/firestore"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, MessageCircle, Crown, Users } from "lucide-react"
import { UsersListForCreators } from "@/components/users-list-for-creators"
import { CreatorsListForUsers } from "@/components/creators-list-for-users"

export default function ChatPage() {
  const [user] = useAuthState(auth)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isCreator, setIsCreator] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) {
        router.push("/")
        return
      }

      try {
        const profile = await getUserProfile(user.uid)
        setUserProfile(profile)

        const creatorStatus = await isUserCreator(user.uid)
        setIsCreator(creatorStatus)
      } catch (error) {
        console.error("Error loading user data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [user, router])

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold">Login Necessário</h2>
            <p className="text-muted-foreground">Você precisa estar logado para acessar o chat.</p>
            <Button className="w-full rounded-full glow-pink-hover" onClick={() => router.push("/")}>
              Fazer Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Carregando chats...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-background border-b border-border/50 p-4 sticky top-0 z-10 backdrop-blur-sm bg-background/95">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" className="rounded-full p-2" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex-1">
            <h1 className="font-semibold text-lg">Mensagens</h1>
            <p className="text-sm text-muted-foreground">
              {isCreator ? "Suas conversas com usuários" : "Suas conversas com criadoras"}
            </p>
          </div>

          {isCreator && (
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              <Crown className="h-3 w-3 mr-1" />
              Criadora
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {isCreator && (
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/20 rounded-full">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-primary">Área da Criadora</h3>
                  <p className="text-sm text-muted-foreground">
                    Aqui você pode ver e responder mensagens dos seus seguidores
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isCreator ? <UsersListForCreators /> : <CreatorsListForUsers />}

        {/* Info para usuários não premium */}
        {!isCreator && userProfile?.level !== "platinum" && userProfile?.level !== "diamante" && (
          <Card className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 border-rose-200/50 dark:border-rose-800/30">
            <CardContent className="p-4 text-center space-y-3">
              <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-full w-fit mx-auto">
                <MessageCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="font-semibold text-rose-700 dark:text-rose-300">Upgrade para Chat Premium 💎</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Faça upgrade para Platinum ou Diamante para conversar com as criadoras
                </p>
              </div>
              <Button
                className="w-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
                onClick={() => router.push("/subscription")}
              >
                Fazer Upgrade Agora
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
