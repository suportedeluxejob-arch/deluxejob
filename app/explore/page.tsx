"use client"

import { useState, useEffect } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/config"
import { getAllBronzeHighlights, getAllBronzePosts } from "@/lib/firebase/firestore"
import { TopNavigation } from "@/components/top-navigation"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Heart, MessageCircle, Lock, Sparkles } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function ExplorePage() {
  const [user] = useAuthState(auth)
  const router = useRouter()
  const [bronzeHighlights, setBronzeHighlights] = useState<any[]>([])
  const [bronzePosts, setBronzePosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStory, setSelectedStory] = useState<any>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    loadExploreContent()
  }, [user, router])

  const loadExploreContent = async () => {
    try {
      setLoading(true)
      const [highlights, posts] = await Promise.all([getAllBronzeHighlights(), getAllBronzePosts()])

      setBronzeHighlights(highlights)
      setBronzePosts(posts)
    } catch (error) {
      console.error("Error loading explore content:", error)
    } finally {
      setLoading(false)
    }
  }

  const openStory = (story: any) => {
    setSelectedStory(story)
    setCurrentImageIndex(0)
  }

  const closeStory = () => {
    setSelectedStory(null)
    setCurrentImageIndex(0)
  }

  const nextImage = () => {
    if (selectedStory && currentImageIndex < selectedStory.images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1)
    } else {
      closeStory()
    }
  }

  const prevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-purple-950/10">
        <TopNavigation title="Explorar" showBackButton backHref="/feed" />
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando conteúdo...</p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-purple-950/10 pb-20">
      <TopNavigation title="Explorar" showBackButton backHref="/feed" />

      <div className="max-w-md mx-auto">
        {/* Prominent banner explaining Bronze content */}
        <div className="mx-4 mt-4 mb-6">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/20 via-purple-600/20 to-pink-600/20 border border-amber-500/30 p-4 backdrop-blur-sm">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-amber-500/20 to-purple-600/20 rounded-full blur-2xl" />

            <div className="relative flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="p-2 rounded-xl bg-amber-500/20 backdrop-blur-sm">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
                  Conteúdo Gratuito
                  <Badge variant="secondary" className="bg-amber-500/30 text-amber-600 border-amber-500/40 text-xs">
                    Bronze
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Aqui você encontra apenas conteúdos Bronze gratuitos. Assine para acessar conteúdos exclusivos Prata,
                  Gold, Platinum e Diamante.
                </p>
              </div>
              <Link href="/creators" className="flex-shrink-0">
                <div className="p-2 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all">
                  <Lock className="h-4 w-4 text-white" />
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Stories Bronze Section */}
        {bronzeHighlights.length > 0 && (
          <div className="px-4 mb-6">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Stories
              </span>
            </h2>

            <div className="flex gap-2.5 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
              {bronzeHighlights.map((story) => (
                <div key={story.id} onClick={() => openStory(story)} className="flex-shrink-0 cursor-pointer group">
                  <div className="relative w-[100px] h-[180px] rounded-xl overflow-hidden shadow-lg ring-2 ring-purple-600/20 group-hover:ring-purple-600/40 transition-all">
                    <img
                      src={story.coverImage || story.images[0]}
                      alt={story.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

                    <div className="absolute top-2 left-2">
                      <div className="relative">
                        <div className="absolute -inset-0.5 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 blur-sm opacity-75" />
                        <Avatar className="relative h-8 w-8 ring-2 ring-background">
                          <AvatarImage src={story.creatorProfile?.profileImage || "/placeholder.svg"} />
                          <AvatarFallback className="text-xs">{story.creatorProfile?.displayName?.[0]}</AvatarFallback>
                        </Avatar>
                      </div>
                    </div>

                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-white text-xs font-bold truncate drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                        {story.creatorProfile?.displayName}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Posts Bronze Section */}
        <div className="px-4">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Posts Gratuitos
            </span>
          </h2>

          {bronzePosts.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">Nenhum post Bronze disponível no momento</p>
              <Link href="/creators" className="inline-block mt-4">
                <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold hover:from-purple-500 hover:to-pink-500 transition-all">
                  Ver Criadoras
                </button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {bronzePosts.map((post) => (
                <Link key={post.id} href={`/creator/${post.authorUsername}`}>
                  <div className="aspect-square relative overflow-hidden rounded-lg cursor-pointer group ring-1 ring-border hover:ring-2 hover:ring-purple-600/50 transition-all">
                    {post.images && post.images.length > 0 ? (
                      <>
                        <img
                          src={post.images[0] || "/placeholder.svg"}
                          alt="Post"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300 flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-4 text-white">
                            <div className="flex items-center gap-1.5">
                              <Heart className="h-4 w-4 fill-white drop-shadow-lg" />
                              <span className="text-sm font-bold drop-shadow-lg">{post.likes || 0}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MessageCircle className="h-4 w-4 fill-white drop-shadow-lg" />
                              <span className="text-sm font-bold drop-shadow-lg">{post.comments || 0}</span>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center p-2">
                        <p className="text-xs text-muted-foreground line-clamp-4 text-center">{post.content}</p>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Story Viewer Modal */}
      {selectedStory && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          {/* Progress Bars */}
          <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
            {selectedStory.images.map((_: any, index: number) => (
              <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-white transition-all duration-300 ${
                    index === currentImageIndex ? "w-full" : index < currentImageIndex ? "w-full" : "w-0"
                  }`}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4 z-10">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-white/20">
                <AvatarImage src={selectedStory.creatorProfile?.profileImage || "/placeholder.svg"} />
                <AvatarFallback>{selectedStory.creatorProfile?.displayName?.[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-white font-semibold text-sm drop-shadow-lg">
                  {selectedStory.creatorProfile?.displayName}
                </p>
                <p className="text-white/80 text-xs drop-shadow-lg">@{selectedStory.creatorProfile?.username}</p>
              </div>
            </div>
            <button onClick={closeStory} className="text-white hover:bg-white/20 rounded-full p-2 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Story Image Container */}
          <div className="relative w-full max-w-md h-full flex items-center justify-center">
            <img
              src={selectedStory.images[currentImageIndex] || "/placeholder.svg"}
              alt="Story"
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Navigation Areas */}
          <div className="absolute inset-0 flex">
            <div className="flex-1" onClick={prevImage} />
            <div className="flex-1" onClick={nextImage} />
          </div>

          {/* Story Info */}
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-4">
              <p className="text-white font-semibold mb-1">{selectedStory.name}</p>
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Bronze - Gratuito</Badge>
            </div>
          </div>
        </div>
      )}

      <BottomNavigation />
    </div>
  )
}
