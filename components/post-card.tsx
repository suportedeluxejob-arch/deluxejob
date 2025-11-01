"use client"

import { useState, useEffect, memo } from "react"
import { Heart, MessageCircle, Repeat2, Share, MoreHorizontal, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  toggleRetweet,
  checkUserLiked,
  checkUserRetweeted,
  checkContentAccess,
  getCurrentUserLevel,
  getUserById,
  getCreatorActiveStories,
  hasUnviewedStories, // Added hasUnviewedStories import
} from "@/lib/firebase/firestore"
import { toggleLikeAction } from "@/app/actions/likes"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/config"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { PremiumContentOverlay } from "./premium-content-overlay"
import { useToast } from "@/components/toast-provider"
import { TipModal } from "./tip-modal"
import { StoryRingAvatar } from "./story-ring-avatar"
import { StoryViewer } from "./story-viewer"

interface PostCardProps {
  post: {
    id?: string
    authorId: string
    authorUsername: string
    authorDisplayName: string
    authorProfileImage: string
    content: string
    images: string[]
    videos: string[]
    likes: number
    comments: number
    retweets: number
    requiredLevel?: "Gold" | "Premium" | "Diamante" | "Platinum" | "Bronze"
    createdAt: any
  }
  onLike?: (postId: string, newCount: number) => void
  onRetweet?: (postId: string, newCount: number) => void
}

export const PostCard = memo(function PostCard({ post, onLike, onRetweet }: PostCardProps) {
  const [user] = useAuthState(auth)
  const [liked, setLiked] = useState(false)
  const [retweeted, setRetweeted] = useState(false)
  const [userLevel, setUserLevel] = useState<string>("bronze")
  const [hasAccess, setHasAccess] = useState(true)
  const [isPostAuthor, setIsPostAuthor] = useState(false)
  const [likesCount, setLikesCount] = useState(post.likes || 0)
  const [showTipModal, setShowTipModal] = useState(false)
  const [userSubscriptions, setUserSubscriptions] = useState<any[]>([])
  const { showXP } = useToast()
  const [hasActiveStory, setHasActiveStory] = useState(false)
  const [hasUnviewedStory, setHasUnviewedStory] = useState(false) // Added hasUnviewedStory state
  const [showStoryViewer, setShowStoryViewer] = useState(false)

  useEffect(() => {
    async function checkUserAccess() {
      if (user) {
        const level = await getCurrentUserLevel(user.uid)
        setUserLevel(level)

        const isOwner = user.uid === post.authorId
        setIsPostAuthor(isOwner)

        try {
          const { userData } = await getUserById(user.uid)
          setUserSubscriptions(userData?.subscriptions || [])
        } catch (error) {
          console.error("Error getting user data:", error)
        }

        if (post.requiredLevel) {
          if (isOwner) {
            setHasAccess(true)
          } else {
            const access = checkContentAccess(level, post.requiredLevel)
            setHasAccess(access)
          }
        }
      }
    }

    checkUserAccess()
  }, [user, post.requiredLevel, post.authorId])

  useEffect(() => {
    setLikesCount(post.likes || 0)
  }, [post.likes])

  useEffect(() => {
    const checkInteractions = async () => {
      if (user && post.id) {
        const [userLiked, userRetweeted] = await Promise.all([
          checkUserLiked(user.uid, post.id),
          checkUserRetweeted(user.uid, post.id),
        ])
        setLiked(userLiked)
        setRetweeted(userRetweeted)
      }
    }

    checkInteractions()
  }, [user, post.id])

  useEffect(() => {
    const checkStories = async () => {
      if (post.authorId && user) {
        // Need user to check viewed status
        const stories = await getCreatorActiveStories(post.authorId)
        setHasActiveStory(stories.length > 0)

        if (stories.length > 0) {
          const hasUnviewed = await hasUnviewedStories(post.authorId, user.uid)
          setHasUnviewedStory(hasUnviewed)
        }
      }
    }
    checkStories()
  }, [post.authorId, user]) // Added user dependency

  const handleLike = async () => {
    if (!user || !post.id) return

    try {
      const wasLiked = liked
      const previousCount = likesCount

      setLiked(!wasLiked)
      setLikesCount((prev) => {
        const currentCount = prev || 0
        return wasLiked ? Math.max(0, currentCount - 1) : currentCount + 1
      })

      const result = await toggleLikeAction({ postId: post.id })

      if (!result.success) {
        console.error("Error toggling like:", result.error)
        setLiked(wasLiked)
        setLikesCount(previousCount)
        return
      }

      setLiked(result.liked || false)
      setLikesCount(result.likeCount || 0)

      if (result.xpGained && result.xpGained > 0) {
        showXP(result.xpGained, "Você ganhou XP por curtir este post!")
      }
    } catch (error) {
      console.error("Error toggling like:", error)
      setLiked(liked)
      setLikesCount(post.likes || 0)
    }
  }

  const handleRetweet = async () => {
    if (!user || !post.id) return

    try {
      const result = await toggleRetweet(user.uid, post.id, post.authorId)
      setRetweeted(result.retweeted)

      const newCount = result.retweeted ? post.retweets + 1 : post.retweets - 1
      onRetweet?.(post.id, newCount)
    } catch (error) {
      console.error("Error toggling retweet:", error)
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return ""

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return formatDistanceToNow(date, {
        addSuffix: true,
        locale: ptBR,
      })
    } catch (error) {
      return ""
    }
  }

  const getLevelBadgeColor = (level: string) => {
    if (!level) {
      return "bg-gray-500 text-white"
    }

    const normalizedLevel = level.toLowerCase()

    switch (normalizedLevel) {
      case "bronze":
        return "bg-orange-600 text-white"
      case "gold":
        return "bg-amber-500 text-white"
      case "premium":
      case "platinum":
        return "bg-purple-600 text-white"
      case "diamante":
        return "bg-cyan-500 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  return (
    <Card className="border-gray-800 bg-black">
      <CardContent className="p-4">
        <div className="flex space-x-3">
          <StoryRingAvatar
            src={post.authorProfileImage || "/placeholder.svg"}
            alt={post.authorDisplayName}
            fallback={post.authorDisplayName[0]}
            hasActiveStory={hasActiveStory}
            hasUnviewedStory={hasUnviewedStory}
            size="md"
            onClick={() => hasActiveStory && setShowStoryViewer(true)}
            className="h-10 w-10"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-white text-sm">{post.authorDisplayName}</h3>
              <span className="text-gray-500 text-xs">@{post.authorUsername}</span>
              <span className="text-gray-500 text-xs">·</span>
              <span className="text-gray-500 text-xs">{formatDate(post.createdAt)}</span>

              {post.requiredLevel && post.requiredLevel.toLowerCase() !== "gold" && (
                <Badge className={getLevelBadgeColor(post.requiredLevel)}>{post.requiredLevel}</Badge>
              )}
            </div>

            <div className="mt-2">
              <p className="text-white whitespace-pre-wrap text-sm">{post.content}</p>

              <div className="relative">
                {post.images.length > 0 && (
                  <div className="mt-3 grid gap-2 grid-cols-1">
                    {post.images.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={image || "/placeholder.svg"}
                          alt={`Post image ${index + 1}`}
                          className="rounded-lg max-w-full h-auto"
                          draggable="false"
                          onContextMenu={(e) => e.preventDefault()}
                          style={{
                            userSelect: "none",
                            WebkitUserSelect: "none",
                            MozUserSelect: "none",
                            msUserSelect: "none",
                            WebkitTouchCallout: "none",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {post.videos.length > 0 && (
                  <div className="mt-3 grid gap-2 grid-cols-1">
                    {post.videos.map((video, index) => (
                      <div key={index} className="relative">
                        <video
                          src={video}
                          controls
                          className="rounded-lg max-w-full h-auto"
                          controlsList="nodownload"
                          onContextMenu={(e) => e.preventDefault()}
                          style={{
                            userSelect: "none",
                            WebkitUserSelect: "none",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {!hasAccess && post.requiredLevel && post.requiredLevel.toLowerCase() !== "gold" && (
                  <PremiumContentOverlay
                    requiredLevel={post.requiredLevel}
                    userLevel={userLevel}
                    creatorId={post.authorId}
                    creatorName={post.authorDisplayName}
                  />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 max-w-md">
              <Button variant="ghost" size="sm" className="text-gray-500 hover:text-blue-400 hover:bg-blue-400/10">
                <MessageCircle className="h-4 w-4 mr-1" />
                <span className="text-sm">{post.comments}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleRetweet}
                className={`text-gray-500 hover:text-green-400 hover:bg-green-400/10 ${
                  retweeted ? "text-green-400" : ""
                }`}
              >
                <Repeat2 className="h-4 w-4 mr-1" />
                <span className="text-sm">{post.retweets}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={`text-gray-500 hover:text-red-400 hover:bg-red-400/10 ${liked ? "text-red-400" : ""}`}
              >
                <Heart className={`h-4 w-4 mr-1 ${liked ? "fill-current" : ""}`} />
                <span className="text-sm">{likesCount}</span>
              </Button>

              {!isPostAuthor && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTipModal(true)}
                  className="text-gray-500 hover:text-yellow-400 hover:bg-yellow-400/10"
                  title="Enviar gorjeta"
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              )}

              <Button variant="ghost" size="sm" className="text-gray-500 hover:text-blue-400 hover:bg-blue-400/10">
                <Share className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button variant="ghost" size="sm" className="text-gray-500 hover:text-white">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>

      {showStoryViewer && (
        <StoryViewer
          creatorId={post.authorId}
          creatorUsername={post.authorUsername}
          creatorDisplayName={post.authorDisplayName}
          creatorAvatar={post.authorProfileImage}
          onClose={() => setShowStoryViewer(false)}
        />
      )}

      {user && !isPostAuthor && (
        <TipModal
          open={showTipModal}
          onOpenChange={setShowTipModal}
          creatorId={post.authorId}
          creatorUsername={post.authorUsername}
          creatorAvatar={post.authorProfileImage}
          postId={post.id}
          currentUserId={user.uid}
          userSubscriptions={userSubscriptions}
        />
      )}
    </Card>
  )
})
