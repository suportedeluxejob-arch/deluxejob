"use client"
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Heart, MessageCircle, MoreHorizontal, RefreshCw, Crown, Verified, Info, Loader2, Sparkles } from "lucide-react"
import Link from "next/link"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/config"
import {
  getPostsPaginatedImproved,
  loadMorePosts,
  checkUserLikedBatch,
  toggleLike,
  toggleRetweet,
  getUserProfile,
  checkUserRetweetedBatch,
  isUserCreator,
  type Post,
  getCreatorActiveStories,
  type TemporaryStory,
  hasUnviewedStories, // Added hasUnviewedStories import
} from "@/lib/firebase/firestore"
import { canAccessCreatorContent, type CreatorSubscription } from "@/lib/types"
import { CommentModal } from "@/components/comment-modal"
import { PremiumContentOverlay } from "@/components/premium-content-overlay"
import { useRealTime } from "@/components/real-time-provider"
import { useToast } from "@/components/toast-provider"
import { BottomNavigation } from "@/components/bottom-navigation"
import { TopNavigation } from "@/components/top-navigation"
import { XPNotification } from "@/components/xp-notification"
import { CreatorPostComposer } from "@/components/creator-post-composer"
import { TipModal } from "@/components/tip-modal"
import { StoryViewer } from "@/components/story-viewer"
import { StoryRingAvatar } from "@/components/story-ring-avatar" // Added import for StoryRingAvatar

export default function FeedPage() {
  const [user] = useAuthState(auth)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [lastDoc, setLastDoc] = useState<any>(null)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [retweetedPosts, setRetweetedPosts] = useState<Set<string>>(new Set())
  const [commentModalOpen, setCommentModalOpen] = useState(false)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [userSubscriptions, setUserSubscriptions] = useState<CreatorSubscription[]>([])
  const [isCreator, setIsCreator] = useState(false)

  const [tipModalOpen, setTipModalOpen] = useState(false)
  const [selectedTipPost, setSelectedTipPost] = useState<Post | null>(null)

  const [showNewPostsNotification, setShowNewPostsNotification] = useState(false)
  const hasSetupListener = useRef(false)

  const [xpNotification, setXpNotification] = useState({
    show: false,
    xpGained: 0,
    action: "",
  })

  const [creatorsWithStories, setCreatorsWithStories] = useState<
    Array<{
      creatorId: string
      creatorName: string
      creatorUsername: string
      creatorAvatar: string
      stories: TemporaryStory[]
      hasUnviewed: boolean // Added hasUnviewed flag
    }>
  >([])
  const [selectedCreatorStories, setSelectedCreatorStories] = useState<{
    stories: TemporaryStory[]
    creatorName: string
    creatorUsername: string
    creatorAvatar: string
  } | null>(null)
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false)

  const { newPostsCount, hasNewNotifications, markPostsAsRead, markNotificationsAsRead } = useRealTime()
  const { showWarning, showError, showSuccess } = useToast()

  const getLevelBadgeColor = (level: string) => {
    const normalizedLevel = level.toLowerCase()
    switch (normalizedLevel) {
      case "bronze":
        return "bg-orange-600/20 text-orange-400"
      case "prata":
      case "silver":
        return "bg-gray-400/20 text-gray-300"
      case "gold":
        return "bg-amber-500/20 text-amber-400"
      case "premium":
      case "platinum":
        return "bg-purple-600/20 text-purple-400"
      case "diamante":
      case "diamond":
        return "bg-cyan-500/20 text-cyan-400"
      default:
        return "bg-blue-500/20 text-blue-400"
    }
  }

  useEffect(() => {
    if (newPostsCount > 0) {
      setShowNewPostsNotification(true)
    } else {
      setShowNewPostsNotification(false)
    }
  }, [newPostsCount])

  useEffect(() => {
    if (hasSetupListener.current) return

    hasSetupListener.current = true

    const unsubscribe = getPostsPaginatedImproved(
      (fetchedPosts, hasMorePosts, lastVisible) => {
        setPosts(fetchedPosts)
        setHasMore(hasMorePosts)
        setLastDoc(lastVisible)
        setLoading(false)
      },
      undefined,
      15,
    )

    return () => {
      hasSetupListener.current = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    const checkLikedPostsOptimized = async () => {
      if (!user || posts.length === 0) return

      const postIds = posts.map((post) => post.id).filter(Boolean) as string[]
      if (postIds.length === 0) return

      try {
        const likedSet = await checkUserLikedBatch(user.uid, postIds)
        setLikedPosts(likedSet)
      } catch (error) {
        // Silent error handling
      }
    }

    checkLikedPostsOptimized()
  }, [user, posts])

  useEffect(() => {
    const checkRetweetedPostsOptimized = async () => {
      if (!user || posts.length === 0) return

      const postIds = posts.map((post) => post.id).filter(Boolean) as string[]
      if (postIds.length === 0) return

      try {
        const retweetedSet = await checkUserRetweetedBatch(user.uid, postIds)
        setRetweetedPosts(retweetedSet)
      } catch (error) {
        console.error("Error checking retweeted posts:", error)
      }
    }

    checkRetweetedPostsOptimized()
  }, [user, posts])

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return

      try {
        const profile = await getUserProfile(user.uid)
        setUserProfile(profile)
        setUserSubscriptions(profile?.subscriptions || [])

        const creatorStatus = await isUserCreator(user.uid)
        setIsCreator(creatorStatus)
      } catch (error) {
        // Silent error handling
      }
    }

    fetchUserProfile()
  }, [user])

  useEffect(() => {
    const loadCreatorsWithStories = async () => {
      if (!user) return

      try {
        const uniqueCreatorIds = Array.from(new Set(posts.map((post) => post.authorId)))

        const batchSize = 5
        const creatorsData: Array<{
          creatorId: string
          creatorName: string
          creatorUsername: string
          creatorAvatar: string
          stories: TemporaryStory[]
          hasUnviewed: boolean
        }> = []

        for (let i = 0; i < uniqueCreatorIds.length; i += batchSize) {
          const batch = uniqueCreatorIds.slice(i, i + batchSize)

          const batchResults = await Promise.all(
            batch.map(async (creatorId) => {
              try {
                const stories = await getCreatorActiveStories(creatorId)

                if (stories.length > 0) {
                  const post = posts.find((p) => p.authorId === creatorId)
                  const hasUnviewed = await hasUnviewedStories(creatorId, user.uid)

                  return {
                    creatorId,
                    creatorName: post?.authorDisplayName || "",
                    creatorUsername: post?.authorUsername || "",
                    creatorAvatar: post?.authorProfileImage || "/placeholder.svg",
                    stories,
                    hasUnviewed,
                  }
                }
                return null
              } catch (error) {
                console.error(`[v0] Error loading stories for ${creatorId}:`, error)
                return null
              }
            }),
          )

          batchResults.forEach((result) => {
            if (result) {
              creatorsData.push(result)
            }
          })
        }

        setCreatorsWithStories(creatorsData)
      } catch (error) {
        console.error("Error loading creators with stories:", error)
      }
    }

    if (posts.length > 0 && user) {
      loadCreatorsWithStories()
    }
  }, [posts, user])

  const handleLike = async (postId: string) => {
    if (!user) {
      showWarning("Login necessário", "Você precisa estar logado para curtir posts")
      return
    }

    if (!userProfile) {
      showError("Erro", "Perfil do usuário não carregado")
      return
    }

    console.log("[v0] handleLike called for postId:", postId)
    console.log("[v0] Current user:", user.uid)
    console.log("[v0] Auth current user:", auth.currentUser?.uid)

    try {
      const result = await toggleLike(user.uid, postId)

      if (result.liked) {
        setLikedPosts((prev) => {
          const newSet = new Set(prev)
          newSet.add(postId)
          return newSet
        })

        setPosts((prevPosts) =>
          prevPosts.map((post) => (post.id === postId ? { ...post, likes: result.likeCount } : post)),
        )

        if (result.xpGained > 0) {
          setXpNotification({
            show: true,
            xpGained: result.xpGained,
            action: "like",
          })
        }
      } else {
        setLikedPosts((prev) => {
          const newSet = new Set(prev)
          newSet.delete(postId)
          return newSet
        })

        setPosts((prevPosts) =>
          prevPosts.map((post) => (post.id === postId ? { ...post, likes: result.likeCount } : post)),
        )
      }
    } catch (error) {
      console.error("[v0] Error in handleLike:", error)
      const errorMessage = error instanceof Error ? error.message : "Não foi possível curtir o post"
      showError("Erro ao curtir", errorMessage)
    }
  }

  const handleComment = (postId: string) => {
    if (!user) {
      showWarning("Login necessário", "Você precisa estar logado para comentar")
      return
    }

    if (!userProfile) {
      showError("Erro", "Perfil do usuário não carregado")
      return
    }

    const userLevel = userProfile.level || "bronze"
    const levelHierarchy = ["bronze", "prata", "gold", "platinum", "diamante"]
    const userLevelIndex = levelHierarchy.indexOf(userLevel.toLowerCase())

    if (userLevelIndex < 2) {
      showWarning(
        "Nível insuficiente",
        "Você precisa ser nível Gold ou superior para comentar. Curta mais posts para subir de nível!",
      )
      return
    }

    setSelectedPostId(postId)
    setCommentModalOpen(true)
  }

  const handleTip = (post: Post) => {
    if (!user) {
      showWarning("Login necessário", "Você precisa estar logado para enviar gorjetas")
      return
    }

    if (!userProfile) {
      showError("Erro", "Perfil do usuário não carregado")
      return
    }

    // Não permitir enviar tip para si mesmo
    if (user.uid === post.authorId) {
      showWarning("Ação não permitida", "Você não pode enviar gorjeta para si mesmo")
      return
    }

    setSelectedTipPost(post)
    setTipModalOpen(true)
  }

  const handleShare = async (postId: string) => {
    if (!user) {
      showWarning("Login necessário", "Você precisa estar logado para retuitar")
      return
    }

    if (!userProfile) {
      showError("Erro", "Perfil do usuário não carregado")
      return
    }

    try {
      const post = posts.find((p) => p.id === postId)
      if (!post) return

      const result = await toggleRetweet(user.uid, postId, post.authorId)

      if (result.retweeted) {
        setRetweetedPosts((prev) => {
          const newSet = new Set(prev)
          newSet.add(postId)
          return newSet
        })

        showSuccess("Post retuitado!", "O post foi adicionado ao seu perfil")

        if (result.xpGained > 0) {
          setXpNotification({
            show: true,
            xpGained: result.xpGained,
            action: "retweet",
          })
        }
      } else {
        setRetweetedPosts((prev) => {
          const newSet = new Set(prev)
          newSet.delete(postId)
          return newSet
        })

        showSuccess("Retweet removido", "O post foi removido do seu perfil")
      }
    } catch (error) {
      console.error("Error toggling retweet:", error)
      const errorMessage = error instanceof Error ? error.message : "Não foi possível retuitar o post"
      showError("Erro ao retuitar", errorMessage)
    }
  }

  const handleCommentAdded = (postId: string) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => (post.id === postId ? { ...post, comments: (post.comments || 0) + 1 } : post)),
    )
  }

  const handleRefresh = useCallback(() => {
    markPostsAsRead()
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [markPostsAsRead])

  const handlePostCreated = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const formatNumber = useMemo(
    () => (num: number) => {
      if (num >= 1000000) {
        return `${(num / 1000000).toFixed(1)}M`
      }
      if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}K`
      }
      return num.toString()
    },
    [],
  )

  const formatTimestamp = useMemo(
    () => (timestamp: any) => {
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
    },
    [],
  )

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !lastDoc) return

    setLoadingMore(true)

    try {
      const { posts: newPosts, hasMore: moreAvailable, lastVisible } = await loadMorePosts(lastDoc, 15)

      setPosts((prevPosts) => [...prevPosts, ...newPosts])
      setHasMore(moreAvailable)
      setLastDoc(lastVisible)
    } catch (error) {
      showError("Erro", "Não foi possível carregar mais posts")
    } finally {
      setLoadingMore(false)
    }
  }, [hasMore, loadingMore, lastDoc, showError])

  const hasContentAccess = (requiredLevel?: string, postAuthorId?: string) => {
    // Se o usuário é o autor do post, sempre tem acesso
    if (user && postAuthorId && user.uid === postAuthorId) {
      return true
    }

    // Se não requer nível ou é Bronze (gratuito), todos têm acesso
    if (!requiredLevel || requiredLevel === "Bronze") return true

    // Se não tem o ID do autor, não pode verificar assinatura específica
    if (!postAuthorId) return false

    // Verifica se o usuário tem assinatura ativa para essa criadora específica
    return canAccessCreatorContent(
      userSubscriptions,
      postAuthorId,
      requiredLevel as "bronze" | "prata" | "gold" | "platinum" | "diamante",
    )
  }

  const getProfileLink = (username: string, authorUserType?: string) => {
    if (username === "isabellelua") {
      return "/profile/isabellelua"
    }

    if (authorUserType === "creator") {
      return `/creator/${username}`
    }

    return `/user/${username}`
  }

  const handleStoryClick = (creator: any) => {
    setSelectedCreatorStories({
      stories: creator.stories,
      creatorName: creator.creatorName,
      creatorUsername: creator.creatorUsername,
      creatorAvatar: creator.creatorAvatar,
    })
    setIsStoryViewerOpen(true)
  }

  const handleStoryViewerClose = async () => {
    setIsStoryViewerOpen(false)
    setSelectedCreatorStories(null)

    if (user && posts.length > 0) {
      try {
        const uniqueCreatorIds = Array.from(new Set(posts.map((post) => post.authorId)))

        const creatorsData = await Promise.all(
          uniqueCreatorIds.map(async (creatorId) => {
            const stories = await getCreatorActiveStories(creatorId)
            if (stories.length > 0) {
              const post = posts.find((p) => p.authorId === creatorId)
              const hasUnviewed = await hasUnviewedStories(creatorId, user.uid)

              return {
                creatorId,
                creatorName: post?.authorDisplayName || "",
                creatorUsername: post?.authorUsername || "",
                creatorAvatar: post?.authorProfileImage || "/placeholder.svg",
                stories,
                hasUnviewed,
              }
            }
            return null
          }),
        )

        setCreatorsWithStories(creatorsData.filter((c) => c !== null) as any)
      } catch (error) {
        console.error("Error reloading creators with stories:", error)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavigation userProfile={userProfile} />

        <div className="flex items-center justify-center min-h-[50vh] px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Carregando posts...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation userProfile={userProfile} />

      {showNewPostsNotification && newPostsCount > 0 && (
        <div className="sticky top-14 sm:top-16 z-40 bg-primary/10 border-b border-primary/20">
          <div className="max-w-2xl mx-auto p-2 px-3 sm:px-4">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs sm:text-sm text-primary hover:bg-primary/20"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              {newPostsCount} novo{newPostsCount > 1 ? "s" : ""} post{newPostsCount > 1 ? "s" : ""} • Clique para ver
            </Button>
          </div>
        </div>
      )}

      <XPNotification
        show={xpNotification.show}
        xpGained={xpNotification.xpGained}
        action={xpNotification.action}
        onClose={() => setXpNotification({ show: false, xpGained: 0, action: "" })}
      />

      <main className="pb-20 max-w-2xl mx-auto">
        {creatorsWithStories.length > 0 && (
          <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm">
            <div className="flex items-start gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 overflow-x-auto scrollbar-hide">
              {creatorsWithStories.map((creator) => (
                <button
                  key={creator.creatorId}
                  onClick={() => handleStoryClick(creator)}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0 min-w-[56px] sm:min-w-[64px]"
                >
                  <StoryRingAvatar
                    src={creator.creatorAvatar || "/placeholder.svg"}
                    alt={creator.creatorName}
                    fallback={creator.creatorName.charAt(0).toUpperCase()}
                    hasActiveStory={true}
                    hasUnviewedStory={creator.hasUnviewed}
                    size="md"
                    className="flex-shrink-0"
                  />

                  <span className="text-[10px] sm:text-xs text-muted-foreground max-w-[56px] sm:max-w-[64px] truncate text-center leading-tight">
                    {creator.creatorName}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {userProfile?.userType === "creator" && (
          <div className="w-full px-3 sm:px-4 py-3 sm:py-4">
            <CreatorPostComposer userProfile={userProfile} onPostCreated={handlePostCreated} />
          </div>
        )}

        <div className="">
          {posts.length === 0 ? (
            <div className="flex items-center justify-center min-h-[50vh] px-4">
              <div className="text-center">
                <p className="text-sm sm:text-base text-muted-foreground">Nenhum post encontrado</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Os posts das criadoras aparecerão aqui quando forem publicados
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4 px-3 sm:px-4 py-3 sm:py-4">
              {posts.map((post) => (
                <Card key={post.id} className="border-border/50 fade-in">
                  <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 pt-3 sm:pt-4">
                    <div className="flex items-center justify-between">
                      <Link
                        href={getProfileLink(post.authorUsername, post.authorUserType)}
                        className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-opacity min-w-0 flex-1"
                      >
                        <Avatar className="h-10 w-10 sm:h-11 sm:w-11 ring-2 ring-primary/20 flex-shrink-0">
                          <AvatarImage
                            src={post.authorProfileImage || "/beautiful-woman-profile.png"}
                            alt={post.authorDisplayName}
                            className="object-cover"
                          />
                          <AvatarFallback className="text-xs sm:text-sm">
                            {post.authorDisplayName?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-1.5 flex-wrap">
                            <h3 className="font-semibold text-sm sm:text-base truncate">{post.authorDisplayName}</h3>
                            {(post.authorUsername === "isabellelua" || post.authorUserType === "creator") && (
                              <div className="w-5 h-5 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0 ring-1 ring-primary/20 shadow-md">
                                <Verified className="h-3 w-3 text-primary-foreground" />
                              </div>
                            )}
                            {post.authorUserType === "creator" && (
                              <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0.5 flex-shrink-0">
                                <Crown className="h-2.5 w-2.5 mr-0.5" />
                                <span className="hidden xs:inline">Criadora</span>
                              </Badge>
                            )}
                            {post.requiredLevel && post.requiredLevel !== "Gold" && (
                              <span
                                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-full flex-shrink-0 ${getLevelBadgeColor(post.requiredLevel)}`}
                              >
                                {post.requiredLevel}
                              </span>
                            )}
                          </div>
                          <p className="text-muted-foreground text-xs sm:text-sm truncate">
                            @{post.authorUsername} • {formatTimestamp(post.createdAt)}
                          </p>
                        </div>
                      </Link>
                      <Button variant="ghost" size="sm" className="rounded-full p-1 sm:p-2 flex-shrink-0">
                        <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 px-3 sm:px-4 pb-3 sm:pb-4">
                    <div className="relative">
                      <div className={!hasContentAccess(post.requiredLevel, post.authorId) ? "filter blur-md" : ""}>
                        <p className="text-xs sm:text-sm mb-2 sm:mb-3 leading-relaxed break-words">{post.content}</p>

                        {post.images && post.images.length > 0 && (
                          <div className="mb-3 sm:mb-4 space-y-2">
                            {post.images.map((image, index) => (
                              <div key={index} className="rounded-lg overflow-hidden">
                                <img
                                  src={image || "/placeholder.svg"}
                                  alt={`Post content ${index + 1}`}
                                  className="w-full h-auto object-cover"
                                  loading="lazy"
                                  decoding="async"
                                  onError={(e) => {
                                    e.currentTarget.src = "/placeholder.svg"
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {post.videos && post.videos.length > 0 && (
                          <div className="mb-3 sm:mb-4 space-y-2">
                            {post.videos.map((video, index) => (
                              <div key={index} className="rounded-lg overflow-hidden">
                                <video
                                  src={video}
                                  controls
                                  preload="metadata"
                                  className="w-full h-auto object-cover rounded-lg"
                                  onError={(e) => {
                                    console.log("Video failed to load:", video)
                                  }}
                                >
                                  Seu navegador não suporta vídeos.
                                </video>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {!hasContentAccess(post.requiredLevel, post.authorId) && post.requiredLevel && (
                        <PremiumContentOverlay
                          requiredLevel={post.requiredLevel as "Gold" | "Premium" | "Diamante"}
                          creatorId={post.authorId}
                          creatorUsername={post.authorUsername}
                          userSubscriptions={userSubscriptions}
                        />
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center space-x-2 sm:space-x-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`rounded-full p-1.5 sm:p-2 ${
                            post.id && likedPosts.has(post.id) ? "text-red-500" : "text-muted-foreground"
                          } hover:text-red-500 transition-colors`}
                          onClick={() => post.id && handleLike(post.id)}
                        >
                          <Heart
                            className={`h-4 w-4 sm:h-5 sm:w-5 ${post.id && likedPosts.has(post.id) ? "fill-current" : ""}`}
                          />
                          <span className="ml-1 text-[10px] sm:text-xs">{formatNumber(post.likes || 0)}</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className={`rounded-full p-1.5 sm:p-2 transition-colors ${
                            userProfile &&
                            userProfile.level &&
                            canAccessCreatorContent(
                              userSubscriptions,
                              post.authorId,
                              userProfile.level as "bronze" | "prata" | "gold" | "platinum" | "diamante",
                            )
                              ? "text-muted-foreground hover:text-primary"
                              : "text-muted-foreground/50 cursor-not-allowed"
                          }`}
                          onClick={() => post.id && handleComment(post.id)}
                          disabled={
                            !userProfile ||
                            !userProfile.level ||
                            !canAccessCreatorContent(
                              userSubscriptions,
                              post.authorId,
                              userProfile.level as "bronze" | "prata" | "gold" | "platinum" | "diamante",
                            )
                          }
                        >
                          <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                          <span className="ml-1 text-[10px] sm:text-xs">{formatNumber(post.comments || 0)}</span>
                        </Button>

                        {userProfile && userProfile.userType === "user" && user && user.uid !== post.authorId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-full p-1.5 sm:p-2 text-muted-foreground hover:text-yellow-400 transition-colors"
                            onClick={() => handleTip(post)}
                            title="Enviar gorjeta"
                          >
                            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                          </Button>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className={`rounded-full p-1.5 sm:p-2 transition-colors ${
                          userProfile && userProfile.level
                            ? post.id && retweetedPosts.has(post.id)
                              ? "text-green-500"
                              : "text-muted-foreground hover:text-green-500"
                            : "text-muted-foreground/50 cursor-not-allowed"
                        }`}
                        onClick={() => post.id && handleShare(post.id)}
                      >
                        <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {posts.length > 0 && hasMore && (
            <div className="px-3 sm:px-4 pb-4">
              <Button
                variant="outline"
                className="w-full rounded-full border-border hover:bg-secondary bg-transparent text-xs sm:text-sm h-9 sm:h-10"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin" />
                    Carregando mais posts...
                  </>
                ) : (
                  "Carregar mais posts"
                )}
              </Button>
            </div>
          )}

          {posts.length > 0 && !hasMore && (
            <div className="px-3 sm:px-4 pb-4">
              <div className="text-center py-6 sm:py-8">
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-muted mb-3">
                  <Info className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Você chegou ao final! Todos os posts disponíveis foram carregados.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      <CommentModal
        isOpen={commentModalOpen}
        onClose={() => {
          setCommentModalOpen(false)
          setSelectedPostId(null)
        }}
        postId={selectedPostId}
        onCommentAdded={handleCommentAdded}
      />

      {selectedTipPost && userProfile && (
        <TipModal
          open={tipModalOpen}
          onOpenChange={setTipModalOpen}
          creatorId={selectedTipPost.authorId}
          creatorUsername={selectedTipPost.authorUsername}
          creatorAvatar={selectedTipPost.authorProfileImage}
          postId={selectedTipPost.id}
          currentUserId={userProfile.uid}
          userSubscriptions={userSubscriptions}
        />
      )}

      {selectedCreatorStories && (
        <StoryViewer
          isOpen={isStoryViewerOpen}
          onClose={handleStoryViewerClose}
          stories={selectedCreatorStories.stories}
          initialStoryIndex={0}
          creatorName={selectedCreatorStories.creatorName}
          creatorUsername={selectedCreatorStories.creatorUsername}
          creatorAvatar={selectedCreatorStories.creatorAvatar}
          currentUserId={user?.uid}
          onStoryDeleted={handleStoryViewerClose}
        />
      )}

      <BottomNavigation userProfile={userProfile} />
    </div>
  )
}
