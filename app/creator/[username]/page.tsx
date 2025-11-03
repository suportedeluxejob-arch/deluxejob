"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TopNavigation } from "@/components/top-navigation"
import { BottomNavigation } from "@/components/bottom-navigation"
import { PremiumContentOverlay } from "@/components/premium-content-overlay"
import { PaywallToast } from "@/components/paywall-toast"
import { PaywallModal } from "@/components/paywall-modal"
import { TipModal } from "@/components/tip-modal"
import { CommentModal } from "@/components/comment-modal"
import { XPNotification } from "@/components/xp-notification"
import { StoryCreatorButton } from "@/components/story-creator-button"
import { StoryRingAvatar } from "@/components/story-ring-avatar"
import { StoryViewer } from "@/components/story-viewer"
import { ShareProfileModal } from "@/components/share-profile-modal"
import Image from "next/image"
import {
  Heart,
  MessageCircle,
  Star,
  Camera,
  MoreHorizontal,
  Sparkles,
  ImageIcon,
  Video,
  Play,
  Lock,
  Gift,
  Verified,
  RefreshCw,
  Crown,
  Share2,
} from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import {
  getUserByUsername,
  type CreatorProfile,
  checkUserLiked,
  toggleLike,
  toggleRetweet,
  checkUserRetweeted,
  getCurrentUserLevel,
  getUserProfile,
  getCreatorHighlights,
  type CreatorHighlight,
  getCreatorServices,
  type CreatorService,
  getPostsByAuthor, // Use getPostsByAuthor instead of getPostsByAuthorPaginated
} from "@/lib/firebase/firestore"
import { getServiceProduct } from "@/lib/service-products"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/config"
import { useToast } from "@/components/toast-provider"
import { detectSocialPlatform } from "@/lib/social-media-utils"
import { canAccessCreatorContent, type CreatorSubscription } from "@/lib/types"

// Define TemporaryStory type
interface TemporaryStory {
  id: string
  mediaUrl: string
  mediaType: "image" | "video"
  createdAt: any
  expiresAt: any
}

interface FirebasePost {
  id: string
  content: string
  images: string[]
  videos: string[]
  likes: number
  comments: number
  retweets: number
  createdAt: any
  requiredLevel?: string
}

const serviceIcons = {
  "chamada-video": Video,
  "chat-privado": MessageCircle,
  "conteudo-exclusivo": ImageIcon,
  "pack-fotos": Play,
  "encontro-virtual": Gift,
  default: Star,
}

// Helper functions to fix linting errors
const getLevelBadge = (level?: string) => {
  switch (level) {
    case "Bronze":
      return "B"
    case "Prata":
      return "S"
    case "Gold":
      return "G"
    case "Platinum":
      return "P"
    case "Diamante":
      return "D"
    default:
      return ""
  }
}

const getTimeRemaining = (expiresAt: any) => {
  if (!expiresAt) return ""

  try {
    const date = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt)
    const now = new Date()
    const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000)

    if (diffInSeconds < 0) return "Expirado"
    if (diffInSeconds < 60) return `${diffInSeconds}s`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`
    return `${Math.floor(diffInSeconds / 86400)}d`
  } catch (error) {
    return ""
  }
}

const getLevelBadgeColor = (level?: string) => {
  switch (level) {
    case "Prata":
      return "bg-secondary text-secondary-foreground"
    case "Gold":
      return "bg-yellow-400 text-yellow-900"
    case "Platinum":
      return "bg-blue-400 text-blue-900"
    case "Diamante":
      return "bg-indigo-500 text-white"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export default function CreatorProfilePage() {
  const params = useParams()
  const router = useRouter()
  const username = params.username as string
  const [user] = useAuthState(auth)
  const [creator, setCreator] = useState<CreatorProfile | null>(null)
  const [allPosts, setAllPosts] = useState<FirebasePost[]>([])
  const [displayedPosts, setDisplayedPosts] = useState<FirebasePost[]>([])
  const [postsPerPage] = useState(15)
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const [userSubscriptions, setUserSubscriptions] = useState<CreatorSubscription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [activeTab, setActiveTab] = useState<"posts" | "services" | "gallery">("posts")
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [retweetedPosts, setRetweetedPosts] = useState<Set<string>>(new Set())
  const [userLevel, setUserLevel] = useState<"Gold" | "Platinum" | "Diamante">("Gold")
  const [commentModalOpen, setCommentModalOpen] = useState(false)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [highlights, setHighlights] = useState<CreatorHighlight[]>([])
  const [selectedHighlight, setSelectedHighlight] = useState<CreatorHighlight | null>(null)
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)
  const [storyViewerOpen, setStoryViewerOpen] = useState(false)
  const [services, setServices] = useState<CreatorService[]>([])
  const [isOwner, setIsOwner] = useState(false)
  const [activeStories, setActiveStories] = useState<TemporaryStory[]>([])
  const [hasUnviewed, setHasUnviewed] = useState(false)
  const { showSuccess, showWarning, showError } = useToast()

  const [paywallToast, setPaywallToast] = useState({
    isOpen: false,
    featureName: "",
    requiredTier: "",
  })

  const [paywallModal, setPaywallModal] = useState({
    isOpen: false,
    featureName: "",
    requiredTier: "",
    benefits: [] as string[],
  })

  const [showTipModal, setShowTipModal] = useState(false)
  const [selectedTipPost, setSelectedTipPost] = useState<FirebasePost | null>(null)

  const [xpNotification, setXpNotification] = useState({
    show: false,
    xpGained: 0,
    action: "",
  })

  const [showStoryCreator, setShowStoryCreator] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)

  const [viewingTemporaryStories, setViewingTemporaryStories] = useState(false)

  // Add state for preview modal
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  const loadCreatorProfile = async () => {
    if (!username) return

    try {
      setIsLoading(true)

      const creatorProfile = await getUserByUsername(username)
      if (creatorProfile && creatorProfile.userType === "creator") {
        setCreator(creatorProfile as CreatorProfile)

        const creatorPosts = await getPostsByAuthor(creatorProfile.username)
        setAllPosts(creatorPosts)
        setDisplayedPosts(creatorPosts.slice(0, postsPerPage))

        const creatorHighlights = await getCreatorHighlights(creatorProfile.uid)
        setHighlights(creatorHighlights)

        const creatorServices = await getCreatorServices(creatorProfile.uid)
        setServices(creatorServices.filter((s) => s.isActive))

        const { getCreatorActiveStories, hasUnviewedStories } = await import("@/lib/firebase/firestore")
        const stories = await getCreatorActiveStories(creatorProfile.uid)
        setActiveStories(stories)

        if (user) {
          const unviewed = await hasUnviewedStories(creatorProfile.uid, user.uid)
          setHasUnviewed(unviewed)
        }
      }

      if (user) {
        const currentProfile = await getUserProfile(user.uid)
        setCurrentUserProfile(currentProfile)

        setUserSubscriptions(currentProfile?.subscriptions || [])

        if (creatorProfile && currentProfile) {
          setIsOwner(currentProfile.uid === creatorProfile.uid)
        }

        if (currentProfile) {
          const level = await getCurrentUserLevel(user.uid)
          setUserLevel(level)
        }
      }
    } catch (error) {
      console.error("Error loading creator profile:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCreatorProfile()
  }, [username, user])

  useEffect(() => {
    const checkLikedPosts = async () => {
      if (!user || displayedPosts.length === 0) return

      const likedSet = new Set<string>()
      for (const post of displayedPosts) {
        if (post.id) {
          const isLiked = await checkUserLiked(user.uid, post.id)
          if (isLiked) {
            likedSet.add(post.id)
          }
        }
      }
      setLikedPosts(likedSet)
    }

    checkLikedPosts()
  }, [user, displayedPosts]) // Depend on displayedPosts

  useEffect(() => {
    const checkRetweetedPosts = async () => {
      if (!user || displayedPosts.length === 0) return

      const retweetedSet = new Set<string>()
      for (const post of displayedPosts) {
        if (post.id) {
          const isRetweeted = await checkUserRetweeted(user.uid, post.id)
          if (isRetweeted) {
            retweetedSet.add(post.id)
          }
        }
      }
      setRetweetedPosts(retweetedSet)
    }

    checkRetweetedPosts()
  }, [user, displayedPosts]) // Depend on displayedPosts

  useEffect(() => {
    if (!user && creator && !isLoading) {
      const timer = setTimeout(() => {
        setShowPreviewModal(true)
      }, 5000) // Show modal after 5 seconds of viewing

      return () => clearTimeout(timer)
    }
  }, [user, creator, isLoading])

  const handleLike = async (postId: string) => {
    if (!user) {
      showWarning("Cadastro necessário", "Crie sua conta grátis para curtir posts e interagir com criadoras!")
      setTimeout(() => router.push("/signup"), 2000)
      return
    }

    try {
      const result = await toggleLike(user.uid, postId)

      setLikedPosts((prev) => {
        const newSet = new Set(prev)
        if (result.liked) {
          newSet.add(postId)
        } else {
          newSet.delete(postId)
        }
        return newSet
      })

      setAllPosts((prevPosts) =>
        prevPosts.map((post) => (post.id === postId ? { ...post, likes: result.likeCount } : post)),
      )
      setDisplayedPosts((prevPosts) =>
        prevPosts.map((post) => (post.id === postId ? { ...post, likes: result.likeCount } : post)),
      )

      if (result.liked && result.xpGained > 0) {
        setXpNotification({
          show: true,
          xpGained: result.xpGained,
          action: "like",
        })
      }
    } catch (error) {
      console.error("Error toggling like:", error)
      const errorMessage = error instanceof Error ? error.message : "Não foi possível curtir o post"
      showError("Erro ao curtir", errorMessage)
    }
  }

  const handleComment = (postId: string) => {
    if (!user) {
      showWarning("Cadastro necessário", "Crie sua conta grátis para comentar e conversar com criadoras!")
      setTimeout(() => router.push("/signup"), 2000)
      return
    }

    if (!currentUserProfile || !creator) {
      showError("Erro", "Não foi possível verificar seu perfil")
      return
    }

    const hasSubscription = canAccessCreatorContent(
      userSubscriptions,
      creator.uid,
      "gold", // Gold tier required for comments
    )

    if (!hasSubscription) {
      showWarning(
        "Assinatura Necessária",
        `Você precisa assinar ${creator.displayName} no nível Gold ou superior para comentar em seus posts.`,
      )
      return
    }

    setSelectedPostId(postId)
    setCommentModalOpen(true)
  }

  const handleShare = async (postId: string) => {
    if (!user) {
      showWarning("Cadastro necessário", "Crie sua conta grátis para retuitar posts!")
      setTimeout(() => router.push("/signup"), 2000)
      return
    }

    if (!currentUserProfile || !creator) {
      showError("Erro", "Não foi possível verificar seu perfil")
      return
    }

    try {
      const result = await toggleRetweet(user.uid, postId, creator.uid)

      setRetweetedPosts((prev) => {
        const newSet = new Set(prev)
        if (result.retweeted) {
          newSet.add(postId)
        } else {
          newSet.delete(postId)
        }
        return newSet
      })

      setAllPosts((prevPosts) =>
        prevPosts.map((post) => (post.id === postId ? { ...post, retweets: result.retweetCount } : post)),
      )
      setDisplayedPosts((prevPosts) =>
        prevPosts.map((post) => (post.id === postId ? { ...post, retweets: result.retweetCount } : post)),
      )

      if (result.retweeted) {
        showSuccess("Post retuitado!", "O post foi adicionado ao seu perfil")

        if (result.xpGained > 0) {
          setXpNotification({
            show: true,
            xpGained: result.xpGained,
            action: "retweet",
          })
        }
      } else {
        showSuccess("Retweet removido", "O post foi removido do seu perfil")
      }
    } catch (error) {
      console.error("Error toggling retweet:", error)
      const errorMessage = error instanceof Error ? error.message : "Não foi possível retuitar o post"
      showError("Erro ao retuitar", errorMessage)
    }
  }

  const canComment = () => {
    if (!currentUserProfile || !creator) return false
    return canAccessCreatorContent(userSubscriptions, creator.uid, "gold")
  }

  const hasContentAccess = (requiredLevel?: string) => {
    // Se é o dono do perfil, sempre tem acesso
    if (isOwner) return true

    // Se não requer nível ou é Bronze (gratuito), todos têm acesso
    if (!requiredLevel || requiredLevel === "Bronze") return true

    // Verifica se o usuário tem assinatura ativa para essa criadora específica
    if (!creator) return false

    return canAccessCreatorContent(
      userSubscriptions,
      creator.uid,
      requiredLevel.toLowerCase() as "bronze" | "prata" | "gold" | "platinum" | "diamante",
    )
  }

  const handleCommentAdded = (postId: string) => {
    setAllPosts((prevPosts) =>
      prevPosts.map((post) => (post.id === postId ? { ...post, comments: (post.comments || 0) + 1 } : post)),
    )
    setDisplayedPosts((prevPosts) =>
      prevPosts.map((post) => (post.id === postId ? { ...post, comments: (post.comments || 0) + 1 } : post)),
    )
  }

  const handleLoadMorePosts = async () => {
    if (loadingMore) return

    const currentLength = displayedPosts.length
    const hasMore = currentLength < allPosts.length

    if (!hasMore) return

    try {
      setLoadingMore(true)
      const nextPosts = allPosts.slice(0, currentLength + postsPerPage)
      setDisplayedPosts(nextPosts)
    } catch (error) {
      console.error("Error loading more posts:", error)
      showError("Erro", "Não foi possível carregar mais posts")
    } finally {
      setLoadingMore(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return "agora"

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      const now = new Date()
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

      if (diffInMinutes < 1) return "agora"
      if (diffInMinutes < 60) return `${diffInMinutes}m`
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`
      return `${Math.floor(diffInMinutes / 1440)}d`
    } catch (error) {
      return "agora"
    }
  }

  const getServiceIcon = (serviceId: string) => {
    return serviceIcons[serviceId] || serviceIcons.default
  }

  const openStoryViewer = (highlight: CreatorHighlight, event?: React.MouseEvent) => {
    // Prevent default behavior and stop propagation to avoid page scroll
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }

    if (!hasContentAccess(highlight.requiredLevel)) {
      setPaywallToast({
        isOpen: true,
        featureName: `Story: ${highlight.name}`,
        requiredTier: highlight.requiredLevel,
      })
      return
    }

    setSelectedHighlight(highlight)
    setCurrentStoryIndex(0)
    setViewingTemporaryStories(false)
    setStoryViewerOpen(true)
  }

  const closeStoryViewer = () => {
    setStoryViewerOpen(false)
    setSelectedHighlight(null)
    setCurrentStoryIndex(0)
    setViewingTemporaryStories(false)
  }

  const openTemporaryStoriesViewer = (event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }

    if (activeStories.length > 0) {
      setSelectedHighlight(null)
      setViewingTemporaryStories(true)
      setStoryViewerOpen(true)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavigation title="Carregando..." showBackButton />
        <div className="max-w-md mx-auto p-4 space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavigation title="Perfil não encontrado" showBackButton />
        <div className="max-w-md mx-auto p-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Criadora não encontrada</h2>
          <p className="text-muted-foreground mb-4">Esta criadora não existe ou foi removida.</p>
          <Button onClick={() => router.push("/creators")}>Ver outras criadoras</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation
        title={`@${creator.username}`}
        showBackButton={true}
        backHref="/feed"
        userProfile={currentUserProfile}
      />

      {!user && creator && (
        <div className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 border-b border-primary/30 sticky top-0 z-20 shadow-lg">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Lock className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">Modo Preview - Perfil de {creator.displayName}</p>
                  <p className="text-xs text-white/90">Cadastre-se grátis para curtir, comentar e assinar</p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full text-xs px-4 py-1.5 h-8 bg-white/10 hover:bg-white/20 text-white border-white/30"
                  onClick={() => router.push("/login")}
                >
                  Entrar
                </Button>
                <Button
                  size="sm"
                  className="rounded-full bg-white hover:bg-white/90 text-primary text-xs px-4 py-1.5 h-8 font-semibold shadow-lg"
                  onClick={() => router.push("/signup")}
                >
                  Cadastrar Grátis
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <XPNotification
        show={xpNotification.show}
        xpGained={xpNotification.xpGained}
        action={xpNotification.action}
        onClose={() => setXpNotification({ show: false, xpGained: 0, action: "" })}
      />

      <main className="w-full max-w-4xl mx-auto">
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {creator.coverImage ? (
            <div className="relative rounded-2xl overflow-hidden -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-12 sm:mb-16">
              <img
                src={creator.coverImage || "/placeholder.svg?height=160&width=400&query=creator cover"}
                alt="Capa do perfil"
                className="w-full h-32 sm:h-40 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              {currentUserProfile?.username === creator.username && (
                <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full bg-black/50 hover:bg-black/70 text-white border-0 text-xs sm:text-sm"
                    onClick={() => router.push("/creator-settings")}
                  >
                    <Camera className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    Editar
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="h-4 sm:h-6" />
          )}

          <div
            className={`flex items-start justify-between relative z-10 gap-3 mb-4 ${creator.coverImage ? "-mt-20 sm:-mt-24" : ""}`}
          >
            <div className="flex items-start space-x-2 sm:space-x-3 flex-1 min-w-0">
              {isOwner ? (
                <StoryCreatorButton
                  userId={creator.uid}
                  username={creator.username}
                  onStoryCreated={loadCreatorProfile}
                >
                  <StoryRingAvatar
                    src={creator.profileImage || "/placeholder.svg"}
                    alt={creator.displayName}
                    fallback={creator.displayName.charAt(0).toUpperCase()}
                    hasActiveStory={activeStories.length > 0}
                    hasUnviewedStory={hasUnviewed}
                    isOwner={isOwner}
                    size="xl"
                    onClick={(e) => openTemporaryStoriesViewer(e as any)}
                  />
                </StoryCreatorButton>
              ) : (
                <StoryRingAvatar
                  src={creator.profileImage || "/placeholder.svg"}
                  alt={creator.displayName}
                  fallback={creator.displayName.charAt(0).toUpperCase()}
                  hasActiveStory={activeStories.length > 0}
                  hasUnviewedStory={hasUnviewed}
                  isOwner={isOwner}
                  size="xl"
                  onClick={(e) => openTemporaryStoriesViewer(e as any)}
                />
              )}

              <div className={`flex-1 min-w-0 ${creator.coverImage ? "pt-10 sm:pt-12" : ""}`}>
                <div className="flex flex-col space-y-1 mb-1">
                  <h2 className="text-base sm:text-lg font-bold text-foreground truncate pr-2">
                    {creator.displayName}
                  </h2>
                  <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap gap-y-1">
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">@{creator.username}</p>
                    <Badge
                      variant="secondary"
                      className="bg-primary text-primary-foreground border-0 text-xs px-2 py-0.5"
                    >
                      <Star className="h-3 w-3 mr-1" />
                      Criadora
                    </Badge>
                    {creator.isVerified && <Verified className="h-3 w-3 text-primary" />}
                  </div>
                </div>
              </div>
            </div>

            {currentUserProfile?.username !== creator.username && (
              <div
                className={`flex-shrink-0 gap-2 flex flex-col-reverse ${creator.coverImage ? "pt-10 sm:pt-12" : ""}`}
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full bg-transparent hover:bg-primary/10 border-primary/50 text-primary text-xs px-3 py-1.5 h-8"
                  onClick={() => setShowShareModal(true)}
                >
                  <Share2 className="h-3 w-3 mr-1" />
                  Compartilhar
                </Button>
                <Button
                  size="sm"
                  className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-lg font-semibold text-xs px-3 py-1.5 h-8"
                  onClick={() => router.push(`/chat/${creator.username}`)}
                >
                  <MessageCircle className="h-3 w-3 mr-1" />
                  Chat
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-foreground/90">
              {creator.bio || "Criadora de conteúdo exclusivo"}
            </p>

            {creator.socialLinks && Array.isArray(creator.socialLinks) && creator.socialLinks.length > 0 && (
              <div className="flex items-center justify-center space-x-3 py-2">
                {creator.socialLinks.map((link, index) => {
                  const platform = detectSocialPlatform(link)
                  const Icon = platform.icon
                  return (
                    <a
                      key={index}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-9 h-9 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                      title={platform.name}
                    >
                      <Icon className="h-4 w-4" style={{ color: platform.color }} />
                    </a>
                  )
                })}
              </div>
            )}

            <div className="flex justify-around py-3 sm:py-4 bg-card rounded-xl border border-border shadow-sm">
              <div className="text-center">
                <div className="text-lg sm:text-xl font-bold text-primary">{allPosts.length}</div> {/* Use allPosts */}
                <div className="text-xs text-muted-foreground">Posts</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-xl font-bold text-primary">
                  {creator.followerCount
                    ? creator.followerCount >= 1000000
                      ? `${(creator.followerCount / 1000000).toFixed(1)}M`
                      : creator.followerCount >= 1000
                        ? `${(creator.followerCount / 1000).toFixed(1)}K`
                        : creator.followerCount
                    : "0"}
                </div>
                <div className="text-xs text-muted-foreground">Seguidores</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-xl font-bold text-primary">{creator.satisfaction || 98}%</div>
                <div className="text-xs text-muted-foreground">Satisfação</div>
              </div>
            </div>
          </div>

          {currentUserProfile?.username !== creator.username && (
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 sm:py-4 rounded-xl shadow-lg transform hover:scale-[1.02] transition-all duration-200 text-sm sm:text-base"
              onClick={() => router.push(`/subscribe/${creator.uid}`)}
            >
              <div className="flex items-center justify-center space-x-2">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="truncate">Assinar Prata - R$ 19,90/mês</span>
              </div>
            </Button>
          )}

          <div className="space-y-3">
            <h3 className="text-base sm:text-lg font-semibold">Destaques</h3>
            <div className="flex space-x-3 sm:space-x-4 py-2 overflow-x-auto -mx-2 px-2">
              {highlights.length === 0 ? (
                <div className="text-center py-8 w-full">
                  <div className="text-4xl mb-2">✨</div>
                  <div className="text-sm text-muted-foreground">Nenhum destaque ainda</div>
                </div>
              ) : (
                highlights.map((highlight) => (
                  <div
                    key={highlight.id}
                    className="flex flex-col items-center space-y-2 flex-shrink-0 cursor-pointer group"
                    onClick={(e) => openStoryViewer(highlight, e)}
                  >
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 p-1 relative transform group-hover:scale-105 transition-transform duration-200">
                      <div className="w-full h-full rounded-full overflow-hidden">
                        <Image
                          src={highlight.coverImage || "/placeholder.svg?height=80&width=80"}
                          alt={highlight.name}
                          width={80}
                          height={80}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          placeholder="blur"
                          blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjZTVlN2ViIi8+PC9zdmc+"
                        />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-xs font-bold shadow-lg border-2 border-background">
                        {getLevelBadge(highlight.requiredLevel)}
                      </div>
                      {!hasContentAccess(highlight.requiredLevel) && (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                          <Lock className="text-white text-sm h-3 w-3 sm:h-4 sm:w-4" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground max-w-[60px] sm:max-w-[70px] truncate text-center">
                      {highlight.name}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-border bg-background/80 backdrop-blur-sm sticky top-0 z-[5]">
          <div className="flex overflow-x-auto">
            {[
              { key: "posts", label: "Posts", icon: MessageCircle },
              { key: "services", label: "Serviços", icon: Gift },
              { key: "gallery", label: "Galeria", icon: Camera },
            ].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant="ghost"
                className={`flex-1 min-w-[70px] sm:min-w-[80px] py-2 sm:py-3 rounded-none border-b-2 text-xs font-medium ${
                  activeTab === key
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab(key as any)}
              >
                <Icon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">{label}</span>
              </Button>
            ))}
          </div>
        </div>

        <div className="pb-20">
          {activeTab === "posts" && (
            <div className="space-y-4 p-4">
              {displayedPosts.length === 0 ? ( // Use displayedPosts
                <div className="text-center py-12 space-y-2">
                  <div className="text-4xl">📝</div>
                  <div className="text-lg font-semibold">Nenhum post ainda</div>
                  <div className="text-sm text-muted-foreground">Os posts de {creator.displayName} aparecerão aqui</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayedPosts.map(
                    (
                      post, // Use displayedPosts
                    ) => (
                      <Card key={post.id} className="border-border/50 fade-in">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-10 w-10 sm:h-11 sm:w-11 ring-2 ring-primary/20 flex-shrink-0">
                                <AvatarImage
                                  src={creator.profileImage || "/placeholder.svg"}
                                  alt={creator.displayName}
                                />
                                <AvatarFallback>{creator.displayName.charAt(0).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center space-x-1.5">
                                  <h3 className="font-semibold text-sm sm:text-base">{creator.displayName}</h3>
                                  <div className="w-5 h-5 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0 ring-1 ring-primary/20 shadow-md">
                                    <Verified className="h-3 w-3 text-primary-foreground" />
                                  </div>
                                  {post.requiredLevel && post.requiredLevel !== "Gold" && (
                                    <span
                                      className={`px-2 py-1 text-xs rounded-full ${getLevelBadgeColor(post.requiredLevel)}`}
                                    >
                                      {post.requiredLevel}
                                    </span>
                                  )}
                                </div>
                                <p className="text-muted-foreground text-xs sm:text-sm">
                                  @{creator.username} • {formatTimestamp(post.createdAt)}
                                </p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" className="rounded-full">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>

                        <CardContent className="pt-0">
                          <div className="relative">
                            <div className={!hasContentAccess(post.requiredLevel) ? "filter blur-md" : ""}>
                              <p className="text-sm mb-3 leading-relaxed">{post.content}</p>

                              {post.images && post.images.length > 0 && (
                                <div className="mb-4 rounded-lg overflow-hidden">
                                  <img
                                    src={post.images[0] || "/placeholder.svg"}
                                    alt="Post content"
                                    className="w-full h-auto object-cover"
                                  />
                                </div>
                              )}

                              {post.videos && post.videos.length > 0 && (
                                <div className="mb-4 rounded-lg overflow-hidden">
                                  <video src={post.videos[0]} controls className="w-full h-auto object-cover" />
                                </div>
                              )}
                            </div>

                            {!hasContentAccess(post.requiredLevel) && post.requiredLevel && creator && (
                              <PremiumContentOverlay
                                requiredLevel={post.requiredLevel as "Gold" | "Premium" | "Diamante"}
                                creatorId={creator.uid}
                                creatorUsername={creator.username}
                                userSubscriptions={userSubscriptions}
                              />
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center space-x-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`rounded-full p-2 ${
                                  post.id && likedPosts.has(post.id) ? "text-red-500" : "text-muted-foreground"
                                } hover:text-red-500 transition-colors`}
                                onClick={() => post.id && handleLike(post.id)}
                              >
                                <Heart
                                  className={`h-5 w-5 ${post.id && likedPosts.has(post.id) ? "fill-current" : ""}`}
                                />
                                <span className="ml-1 text-xs">{formatNumber(post.likes || 0)}</span>
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                className={`rounded-full p-2 transition-colors ${
                                  canComment()
                                    ? "text-muted-foreground hover:text-primary"
                                    : "text-muted-foreground/50 cursor-not-allowed"
                                }`}
                                onClick={() => post.id && handleComment(post.id)}
                                disabled={!canComment()}
                              >
                                <MessageCircle className="h-5 w-5" />
                                <span className="ml-1 text-xs">{formatNumber(post.comments || 0)}</span>
                              </Button>

                              {!isOwner && user && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="rounded-full p-2 text-muted-foreground hover:text-yellow-400 transition-colors"
                                  onClick={() => {
                                    setSelectedTipPost(post)
                                    setShowTipModal(true)
                                  }}
                                  title="Enviar gorjeta"
                                >
                                  <Sparkles className="h-5 w-5" />
                                </Button>
                              )}
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              className={`rounded-full p-2 transition-colors ${
                                post.id && retweetedPosts.has(post.id)
                                  ? "text-green-500"
                                  : "text-muted-foreground hover:text-green-500"
                              }`}
                              onClick={() => post.id && handleShare(post.id)}
                            >
                              <RefreshCw className="h-5 w-5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ),
                  )}

                  {displayedPosts.length < allPosts.length && (
                    <div className="flex justify-center pt-4">
                      <Button
                        onClick={handleLoadMorePosts}
                        disabled={loadingMore}
                        variant="outline"
                        className="rounded-full px-8 bg-transparent"
                      >
                        {loadingMore ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Carregando...
                          </>
                        ) : (
                          "Carregar mais posts"
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "services" && (
            <div className="p-4 space-y-4">
              {services.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <div className="text-4xl">💎</div>
                  <div className="text-lg font-semibold">Nenhum serviço disponível</div>
                  <div className="text-sm text-muted-foreground">
                    {creator.displayName} ainda não oferece serviços personalizados
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:gap-6">
                  {services.map((service) => {
                    const serviceProduct = getServiceProduct(service.serviceProductId)
                    if (!serviceProduct) return null

                    const IconComponent = getServiceIcon(serviceProduct.category)
                    const originalPrice = serviceProduct.priceInCents / 100
                    const displayPrice = originalPrice

                    return (
                      <Card
                        key={service.id}
                        className="border-primary/30 hover:border-primary/60 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 overflow-hidden"
                      >
                        {service.coverImage && (
                          <div className="relative w-full h-40 sm:h-48 overflow-hidden">
                            <img
                              src={service.coverImage || "/placeholder.svg"}
                              alt={serviceProduct.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                              {service.isBestSeller && (
                                <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 shadow-lg text-xs font-bold">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  MAIS VENDIDO
                                </Badge>
                              )}
                              {service.isExclusive && (
                                <Badge className="bg-gradient-to-r from-pink-600 to-purple-600 text-white border-0 shadow-lg text-xs font-bold">
                                  <Crown className="h-3 w-3 mr-1" />
                                  EXCLUSIVO
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex items-start gap-3 sm:gap-4 mb-4">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 ring-2 ring-primary/20">
                              <IconComponent className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h3 className="font-bold text-base sm:text-lg leading-tight">{serviceProduct.name}</h3>
                                {!service.coverImage && (
                                  <div className="flex flex-wrap gap-1 flex-shrink-0">
                                    {service.isBestSeller && (
                                      <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 text-[10px] px-1.5 py-0.5">
                                        <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                                        TOP
                                      </Badge>
                                    )}
                                    {service.isExclusive && (
                                      <Badge className="bg-gradient-to-r from-pink-600 to-purple-600 text-white border-0 text-[10px] px-1.5 py-0.5">
                                        <Crown className="h-2.5 w-2.5 mr-0.5" />
                                        VIP
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-3">
                                {service.customDescription || serviceProduct.description}
                              </p>
                              <Badge
                                variant="outline"
                                className="text-[10px] sm:text-xs border-primary/30 text-primary/80"
                              >
                                {serviceProduct.category === "video"
                                  ? "Videochamada"
                                  : serviceProduct.category === "pack"
                                    ? "Pack de Fotos"
                                    : serviceProduct.category === "custom"
                                      ? "Personalizado"
                                      : "Encontro"}
                              </Badge>
                            </div>
                          </div>

                          <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-3 sm:p-4 mb-4 border border-primary/20">
                            <div className="flex items-center justify-center mb-2">
                              <div className="text-center">
                                <div className="flex items-baseline gap-1 justify-center">
                                  <span className="text-2xl sm:text-3xl font-bold text-primary">
                                    R$ {displayPrice.toFixed(2).replace(".", ",")}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <Button
                            size="lg"
                            className="w-full rounded-xl bg-gradient-to-r from-purple-900/60 to-pink-900/60 hover:from-purple-800/70 hover:to-pink-800/70 border border-purple-500/30 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200 h-12 sm:h-14 text-sm sm:text-base"
                            onClick={() => router.push(`/subscribe/${creator.uid}?tab=services`)}
                          >
                            <Gift className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                            Comprar Agora
                          </Button>

                          {/* Trust indicators */}
                          <div className="flex items-center justify-center gap-3 sm:gap-4 mt-3 text-[10px] sm:text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              <span>Pagamento Seguro</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              <span>Entrega Rápida</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "gallery" && (
            <div className="p-4">
              {displayedPosts.filter((post) => post.images?.length > 0 || post.videos?.length > 0).length === 0 ? ( // Use displayedPosts
                <div className="text-center py-12 space-y-2">
                  <div className="text-4xl">🖼️</div>
                  <div className="text-lg font-semibold">Nenhuma mídia ainda</div>
                  <div className="text-sm text-muted-foreground">
                    As fotos e vídeos de {creator.displayName} aparecerão aqui
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1 sm:gap-2">
                  {displayedPosts // Use displayedPosts
                    .filter((post) => post.images?.length > 0 || post.videos?.length > 0)
                    .flatMap((post) => {
                      const media = []

                      // Add images
                      if (post.images && post.images.length > 0) {
                        post.images.forEach((image) => {
                          media.push({
                            type: "image" as const,
                            url: image,
                            postId: post.id,
                            requiredLevel: post.requiredLevel,
                          })
                        })
                      }

                      // Add videos
                      if (post.videos && post.videos.length > 0) {
                        post.videos.forEach((video) => {
                          media.push({
                            type: "video" as const,
                            url: video,
                            postId: post.id,
                            requiredLevel: post.requiredLevel,
                          })
                        })
                      }

                      return media
                    })
                    .map((media, index) => (
                      <div
                        key={`${media.postId}-${index}`}
                        className="relative aspect-square bg-muted rounded-lg overflow-hidden group cursor-pointer"
                      >
                        <div className={!hasContentAccess(media.requiredLevel) ? "filter blur-md" : ""}>
                          {media.type === "image" ? (
                            <img
                              src={media.url || "/placeholder.svg"}
                              alt="Gallery item"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="relative w-full h-full">
                              <video src={media.url} className="w-full h-full object-cover" muted />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <Play className="h-8 w-8 text-white" />
                              </div>
                            </div>
                          )}
                        </div>

                        {!hasContentAccess(media.requiredLevel) && media.requiredLevel && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <div className="text-center space-y-1">
                              <Lock className="h-6 w-6 text-white mx-auto" />
                              <span className="text-xs text-white font-semibold">{media.requiredLevel}</span>
                            </div>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-xs">
                            <div className="flex items-center space-x-2">
                              {media.type === "video" && <Video className="h-3 w-3" />}
                              {media.type === "image" && <ImageIcon className="h-3 w-3" />}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {!user && creator && showPreviewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-background w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 sm:slide-in-from-bottom-0">
            <div className="relative">
              {/* Close button */}
              <button
                onClick={() => setShowPreviewModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors z-10"
              >
                <span className="text-lg">×</span>
              </button>

              {/* Header with creator info */}
              <div className="relative h-32 bg-gradient-to-br from-primary via-primary/90 to-primary/70 overflow-hidden">
                <div className="absolute inset-0 bg-[url('/abstract-geometric-flow.png')] opacity-10" />
                <div className="relative h-full flex flex-col items-center justify-center pt-6">
                  <div className="w-20 h-20 rounded-full border-4 border-background overflow-hidden shadow-xl">
                    <img
                      src={creator.profileImage || "/placeholder.svg"}
                      alt={creator.displayName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 pt-8 space-y-4">
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold">Gostou do perfil de {creator.displayName}?</h3>
                  <p className="text-muted-foreground text-sm">
                    Você está visualizando em modo preview. Crie sua conta grátis para desbloquear todas as
                    funcionalidades!
                  </p>
                </div>

                {/* Benefits */}
                <div className="space-y-3 py-4">
                  {[
                    { icon: Heart, text: "Curtir posts e interagir com criadoras" },
                    { icon: MessageCircle, text: "Comentar e conversar no chat privado" },
                    { icon: Sparkles, text: "Assinar e acessar conteúdo exclusivo" },
                    { icon: Gift, text: "Enviar gorjetas e comprar serviços" },
                  ].map((benefit, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <benefit.icon className="h-5 w-5 text-primary" />
                      </div>
                      <p className="text-sm text-foreground/90">{benefit.text}</p>
                    </div>
                  ))}
                </div>

                {/* CTA Buttons */}
                <div className="space-y-3 pt-2">
                  <Button
                    size="lg"
                    className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg h-12"
                    onClick={() => router.push("/signup")}
                  >
                    Criar Conta Grátis
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full rounded-xl font-medium h-12 bg-transparent"
                    onClick={() => router.push("/login")}
                  >
                    Já tenho conta
                  </Button>
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                  >
                    Continuar navegando
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <PaywallToast
        isOpen={paywallToast.isOpen}
        onClose={() => setPaywallToast({ ...paywallToast, isOpen: false })}
        featureName={paywallToast.featureName}
        requiredTier={paywallToast.requiredTier}
        creatorId={creator?.uid}
        creatorUsername={creator?.username}
        description="Assine para desbloquear este conteúdo exclusivo"
      />

      <PaywallModal
        isOpen={paywallModal.isOpen}
        onClose={() => setPaywallModal({ ...paywallModal, isOpen: false })}
        featureName={paywallModal.featureName}
        requiredTier={paywallModal.requiredTier}
        creatorId={creator?.uid}
        creatorUsername={creator?.username}
        benefits={paywallModal.benefits}
      />

      {storyViewerOpen && (
        <StoryViewer
          isOpen={storyViewerOpen}
          onClose={closeStoryViewer}
          stories={
            viewingTemporaryStories
              ? activeStories.map((story) => ({
                  id: story.id,
                  imageUrl: story.mediaUrl,
                  videoUrl: story.mediaType === "video" ? story.mediaUrl : undefined,
                  isTemporary: true,
                  expiresAt: story.expiresAt,
                  createdAt: story.createdAt,
                  creatorId: creator.uid,
                  duration: 24,
                }))
              : selectedHighlight
                ? [
                    {
                      id: selectedHighlight.id,
                      images: selectedHighlight.images,
                      name: selectedHighlight.name,
                      isTemporary: false,
                      creatorId: creator.uid,
                    },
                  ]
                : []
          }
          initialStoryIndex={0}
          creatorName={creator.displayName}
          creatorUsername={creator.username}
          creatorAvatar={creator.profileImage || "/placeholder.svg"}
          currentUserId={user?.uid}
          isOwner={isOwner}
          onStoryDeleted={loadCreatorProfile}
        />
      )}

      {creator && selectedTipPost && user && currentUserProfile && (
        <TipModal
          open={showTipModal}
          onOpenChange={setShowTipModal}
          creatorId={creator.uid}
          creatorUsername={creator.username}
          creatorAvatar={creator.profileImage}
          postId={selectedTipPost.id}
          currentUserId={user.uid}
          userSubscriptions={currentUserProfile.subscriptions || []}
        />
      )}

      <CommentModal
        isOpen={commentModalOpen}
        onClose={() => {
          setCommentModalOpen(false)
          setSelectedPostId(null)
        }}
        postId={selectedPostId}
        onCommentAdded={handleCommentAdded}
      />

      <ShareProfileModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        creatorUsername={creator.username}
        creatorDisplayName={creator.displayName}
        creatorImage={creator.profileImage}
      />

      <BottomNavigation userProfile={currentUserProfile} />
    </div>
  )
}
