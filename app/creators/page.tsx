"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TopNavigation } from "@/components/top-navigation"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Search, Verified, Eye, Crown, TrendingUp } from "lucide-react"
import { useRouter } from "next/navigation"
import { getAllCreators, type CreatorProfile } from "@/lib/firebase/firestore"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/config"

export default function CreatorsPage() {
  const [user] = useAuthState(auth)
  const [creators, setCreators] = useState<CreatorProfile[]>([])
  const [filteredCreators, setFilteredCreators] = useState<CreatorProfile[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFilter, setSelectedFilter] = useState<"todos" | "gratuitos" | "em-alta">("todos")
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loadCreators = async () => {
      try {
        setIsLoading(true)
        const creatorsData = await getAllCreators()
        setCreators(creatorsData)
        setFilteredCreators(creatorsData)
      } catch (error) {
        console.error("Error loading creators:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadCreators()
  }, [selectedFilter])

  useEffect(() => {
    let filtered = creators

    if (searchTerm) {
      filtered = filtered.filter(
        (creator) =>
          creator.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          creator.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          creator.bio.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (selectedFilter === "gratuitos") {
      filtered = filtered.filter((creator) => !creator.subscriptionPrice || creator.subscriptionPrice === 0)
    } else if (selectedFilter === "em-alta") {
      filtered = filtered
        .sort((a, b) => {
          const aScore = (a.followersCount || 0) + (a.postsCount || 0) * 2 + (a.totalXp || 0) * 0.1
          const bScore = (b.followersCount || 0) + (b.postsCount || 0) * 2 + (b.totalXp || 0) * 0.1
          return bScore - aScore
        })
        .slice(0, 12)
    }

    setFilteredCreators(filtered)
  }, [creators, searchTerm, selectedFilter])

  const getClassicVerificationBadge = (creator: CreatorProfile) => {
    if (creator.isVerified || creator.totalXp > 500) {
      return (
        <div className="bg-blue-500 rounded-full p-0.5 ml-1">
          <Verified className="h-3 w-3 text-white fill-white" />
        </div>
      )
    }
    return null
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 text-white">Acesso Restrito</h2>
          <p className="text-sm sm:text-base text-gray-400 mb-4">Você precisa estar logado para ver as criadoras.</p>
          <Button onClick={() => router.push("/")} className="w-full sm:w-auto">
            Fazer Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation title="Criadoras" showBackButton backHref="/feed" />

      <main className="max-w-2xl mx-auto pb-20 px-3 sm:px-4">
        <div className="py-3 sm:py-4 space-y-3 sm:space-y-4">
          <div className="relative">
            <div className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2">
              <Search className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            </div>
            <Input
              placeholder="Pesquisar"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 sm:pl-12 h-10 sm:h-12 bg-card border-border rounded-full text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
            <Button
              variant={selectedFilter === "todos" ? "default" : "ghost"}
              className={`rounded-full px-4 sm:px-6 whitespace-nowrap text-xs sm:text-sm flex-shrink-0 ${
                selectedFilter === "todos"
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
              onClick={() => setSelectedFilter("todos")}
            >
              Todos
            </Button>
            <Button
              variant={selectedFilter === "em-alta" ? "default" : "ghost"}
              className={`rounded-full px-4 sm:px-6 whitespace-nowrap text-xs sm:text-sm flex-shrink-0 ${
                selectedFilter === "em-alta"
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
              onClick={() => setSelectedFilter("em-alta")}
            >
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Em Alta
            </Button>
            <Button
              variant={selectedFilter === "gratuitos" ? "default" : "ghost"}
              className={`rounded-full px-4 sm:px-6 whitespace-nowrap text-xs sm:text-sm flex-shrink-0 ${
                selectedFilter === "gratuitos"
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
              onClick={() => setSelectedFilter("gratuitos")}
            >
              Gratuitos
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse bg-card border-border">
                  <div className="h-20 sm:h-24 bg-muted" />
                  <div className="p-3">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredCreators.length === 0 ? (
            <div className="text-center py-12 px-4">
              <h3 className="text-base sm:text-lg font-semibold mb-2 text-foreground">Nenhuma criadora encontrada</h3>
              <p className="text-muted-foreground text-xs sm:text-sm">
                {searchTerm || selectedFilter === "gratuitos"
                  ? "Tente ajustar seus filtros de busca"
                  : "Ainda não temos criadoras cadastradas"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCreators.map((creator, index) => (
                <Card
                  key={creator.uid}
                  className="overflow-hidden bg-card border-border hover:scale-[1.01] transition-all duration-200 glow-pink-hover p-0"
                >
                  <div className="relative h-20 sm:h-24">
                    <div
                      className="absolute inset-0 w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5"
                      style={{
                        backgroundImage: creator.coverImage ? `url(${creator.coverImage})` : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                      }}
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    <div className="absolute bottom-2 left-2 sm:left-3">
                      <Avatar className="h-12 w-12 sm:h-14 sm:w-14 ring-2 ring-primary/50 border-2 border-background">
                        <AvatarImage
                          src={creator.profileImage || "/placeholder.svg"}
                          alt={creator.displayName}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-secondary text-secondary-foreground text-xs sm:text-sm font-semibold">
                          {creator.displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    {selectedFilter === "em-alta" && index < 3 && (
                      <div className="absolute top-2 right-2">
                        <div className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-primary-foreground px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold flex items-center space-x-0.5 sm:space-x-1 shadow-lg border border-primary/20">
                          <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          <span>#{index + 1}</span>
                        </div>
                      </div>
                    )}

                    {creator.subscriptionPrice && creator.subscriptionPrice > 0 && (
                      <div className="absolute top-2 left-2">
                        <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold flex items-center space-x-0.5 sm:space-x-1 shadow-lg">
                          <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          <span>Premium</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-2.5 sm:p-3 bg-card">
                    <div className="flex items-start justify-between mb-2 sm:mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-1 mb-0.5 sm:mb-1">
                          <h3 className="font-bold text-xs sm:text-sm text-foreground truncate">
                            {creator.displayName}
                          </h3>
                          {getClassicVerificationBadge(creator)}
                        </div>
                        <p className="text-muted-foreground text-[10px] sm:text-xs mb-0.5 sm:mb-1 truncate">
                          @{creator.username}
                        </p>
                        {creator.bio && (
                          <p className="text-muted-foreground text-[10px] sm:text-xs line-clamp-1 sm:line-clamp-2">
                            {creator.bio}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-[10px] sm:text-xs border-border text-muted-foreground hover:bg-secondary hover:text-foreground bg-transparent h-7 sm:h-8 px-2 sm:px-3"
                        onClick={() => router.push(`/creator/${creator.username}`)}
                      >
                        <Eye className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                        <span className="hidden xs:inline">Ver Perfil</span>
                        <span className="xs:hidden">Perfil</span>
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 text-[10px] sm:text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-7 sm:h-8 px-2 sm:px-3"
                        onClick={() => router.push(`/subscribe/${creator.uid}`)}
                      >
                        <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                        <span className="hidden xs:inline">Assinar</span>
                        <span className="xs:hidden">Assinar</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNavigation />
    </div>
  )
}
