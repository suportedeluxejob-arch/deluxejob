"use client"

import { useState, useEffect } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/config"
import { getUserProfile, getUserActiveSubscriptions } from "@/lib/firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Crown, Loader2, AlertCircle, Calendar, DollarSign } from "lucide-react"
import Link from "next/link"
import { TopNavigation } from "@/components/top-navigation"
import { BottomNavigation } from "@/components/bottom-navigation"
import { SUBSCRIPTION_TIERS, type CreatorSubscription } from "@/lib/types"

export default function MySubscriptionsPage() {
  const [user] = useAuthState(auth)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [subscriptions, setSubscriptions] = useState<CreatorSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const profile = await getUserProfile(user.uid)
        setUserProfile(profile)

        const activeSubs = await getUserActiveSubscriptions(user.uid)
        setSubscriptions(activeSubs)
        setError(null)
      } catch (error) {
        console.error("Error loading data:", error)
        setError("Erro ao carregar assinaturas. Tente novamente mais tarde.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  const totalMonthly = subscriptions.reduce((total, sub) => {
    return total + (SUBSCRIPTION_TIERS[sub.tier]?.monthlyPrice || 0)
  }, 0)

  const formatDate = (date: any) => {
    if (!date) return "N/A"
    try {
      // Handle Firestore Timestamp
      if (date?.toDate && typeof date.toDate === "function") {
        return date.toDate().toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
      }
      // Handle Date object
      if (date instanceof Date) {
        return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
      }
      // Handle timestamp number
      if (typeof date === "number") {
        return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
      }
      // Handle string date
      if (typeof date === "string") {
        return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
      }
      return "N/A"
    } catch (err) {
      console.error("Error formatting date:", err)
      return "N/A"
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case "prata":
        return "bg-gray-400/20 text-gray-300"
      case "gold":
        return "bg-amber-500/20 text-amber-400"
      case "platinum":
        return "bg-purple-600/20 text-purple-400"
      case "diamante":
        return "bg-cyan-500/20 text-cyan-400"
      default:
        return "bg-blue-500/20 text-blue-400"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavigation userProfile={userProfile} />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">Carregando assinaturas...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavigation userProfile={userProfile} />
        <div className="flex items-center justify-center min-h-[50vh] px-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Login Necessário</h2>
              <p className="text-sm text-muted-foreground mb-4">Você precisa estar logado para ver suas assinaturas</p>
              <Button asChild>
                <Link href="/login">Fazer Login</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavigation userProfile={userProfile} />
        <div className="flex items-center justify-center min-h-[50vh] px-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Erro ao Carregar</h2>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>Tentar Novamente</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation userProfile={userProfile} />

      <main className="pb-20 max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Minhas Assinaturas</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas assinaturas de criadoras</p>
        </div>

        {subscriptions.length > 0 && (
          <Card className="mb-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Mensal</p>
                  <p className="text-3xl font-bold">R$ {totalMonthly.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Assinaturas Ativas</p>
                  <p className="text-3xl font-bold">{subscriptions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {subscriptions.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <Crown className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Nenhuma Assinatura Ativa</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Você ainda não assinou nenhuma criadora. Explore o catálogo de criadoras e escolha seus conteúdos
                favoritos!
              </p>
              <Button asChild>
                <Link href="/creators">
                  <Crown className="h-4 w-4 mr-2" />
                  Explorar Criadoras
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {subscriptions.map((sub) => (
              <Card key={sub.creatorId}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                        <AvatarImage src="/beautiful-woman-profile.png" alt={sub.creatorDisplayName} />
                        <AvatarFallback>{sub.creatorDisplayName?.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-lg">{sub.creatorDisplayName}</h3>
                        <p className="text-sm text-muted-foreground">@{sub.creatorUsername}</p>
                        <Badge className={`mt-2 ${getTierColor(sub.tier)}`}>
                          {SUBSCRIPTION_TIERS[sub.tier]?.name || sub.tier}
                        </Badge>
                      </div>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/creator/${sub.creatorUsername}`}>Ver Perfil</Link>
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Valor Mensal</p>
                        <p className="text-sm font-semibold">
                          R$ {SUBSCRIPTION_TIERS[sub.tier]?.monthlyPrice.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Próxima Renovação</p>
                        <p className="text-sm font-semibold">{formatDate(sub.currentPeriodEnd)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      <strong>Status:</strong>{" "}
                      <Badge variant="secondary" className="ml-1">
                        {sub.status === "active" ? "Ativo" : sub.status}
                      </Badge>
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card className="bg-muted/30">
              <CardHeader>
                <CardTitle className="text-lg">Como Funciona</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">💡</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Assinaturas Independentes</p>
                    <p className="text-xs text-muted-foreground">
                      Cada criadora tem sua própria assinatura. Você pode assinar quantas quiser!
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">🔒</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Acesso Exclusivo</p>
                    <p className="text-xs text-muted-foreground">
                      Sua assinatura libera conteúdo premium apenas daquela criadora específica
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">💳</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Renovação Automática</p>
                    <p className="text-xs text-muted-foreground">
                      Suas assinaturas renovam automaticamente todo mês. Cancele quando quiser!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="text-center">
              <Button asChild variant="outline">
                <Link href="/creators">
                  <Crown className="h-4 w-4 mr-2" />
                  Assinar Mais Criadoras
                </Link>
              </Button>
            </div>
          </div>
        )}
      </main>

      <BottomNavigation userProfile={userProfile} />
    </div>
  )
}
