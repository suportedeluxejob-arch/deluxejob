"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserLevelBadge } from "@/components/user-level-badge"
import { Settings, MessageCircle, Repeat2 } from "lucide-react"
import Link from "next/link"
import { TopNavigation } from "@/components/top-navigation"
import { BottomNavigation } from "@/components/bottom-navigation"
import { getCurrentUser, syncUserLevel, type TemporaryStory } from "@/lib/firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { UserProgressSection } from "@/components/user-progress-section"
import { doc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { useUserProfile, useUserProfileByUid } from "@/hooks/use-user-profile"
import { StoryRingAvatar } from "@/components/story-ring-avatar"
import { StoryViewer } from "@/components/story-viewer"
import { StoryCreatorButton } from "@/components/story-creator-button"

interface Retweet {
  id: string
  postId: string
  originalPost: {
    id: string
    content: string
    images: string[]
    videos: string[]
    authorDisplayName: string
    authorUsername: string
    authorProfileImage: string
    requiredLevel?: string
    createdAt: any
    likes: number
    comments: number
    retweets: number
  }
  createdAt: any
}

export default function UserProfile() {
  const router = useRouter()
  const params = useParams()
  const username = params.username as string
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [userRetweets, setUserRetweets] = useState<Retweet[]>([])
  const [retweetsLoading, setRetweetsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"progress" | "retweets">("progress")
  const { toast } = useToast()

  const [activeStories, setActiveStories] = useState<TemporaryStory[]>([])
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false)
  const [storiesLoading, setStoriesLoading] = useState(true)
  const [hasUnviewed, setHasUnviewed] = useState(false)

  const { user: profileUser, isLoading, isError } = useUserProfile(username)
  const { user: currentProfile } = useUserProfileByUid(currentUser?.uid)

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await getCurrentUser()
        if (!user) {
          router.push("/")
          return
        }
        setCurrentUser(user)
      } catch (error) {
        console.error("Error loading current user:", error)
        router.push("/")
      }
    }

    loadCurrentUser()
  }, [router])

  useEffect(() => {
    if (currentProfile) {
      setCurrentUserProfile(currentProfile)
    }
  }, [currentProfile])

  useEffect(() => {
    if (isError) {
      toast({
        title: "Usuário não encontrado",
        description: "Este perfil não existe ou foi removido",
        variant: "destructive",
      })
      router.push("/feed")
    }
  }, [isError, router, toast])

  useEffect(() => {
    if (currentUser && profileUser) {
      setIsOwnProfile(currentUser.uid === profileUser.uid)

      if (currentUser.uid === profileUser.uid) {
        syncUserLevel(currentUser.uid)
      }
    }
  }, [currentUser, profileUser])

  useEffect(() => {
    if (!profileUser) return

    const userDocRef = doc(db, "users", profileUser.uid)
    const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const updatedData = docSnapshot.data()

        if (currentUser?.uid === profileUser.uid) {
          setCurrentUserProfile((prev: any) => ({
            ...prev,
            level: updatedData.level || prev?.level,
            subscription: updatedData.subscription,
          }))
        }
      }
    })

    return () => unsubscribe()
  }, [profileUser, currentUser])

  useEffect(() => {
    const loadStories = async () => {
      if (!profileUser) return

      try {
        setStoriesLoading(true)
        if (profileUser.userType === "creator") {
          const { getCreatorActiveStories, hasUnviewedStories } = await import("@/lib/firebase/firestore")
          const stories = await getCreatorActiveStories(profileUser.uid)
          setActiveStories(stories)

          if (currentUser) {
            const unviewed = await hasUnviewedStories(profileUser.uid, currentUser.uid)
            setHasUnviewed(unviewed)
          }
        }
      } catch (error) {
        console.error("Error loading stories:", error)
      } finally {
        setStoriesLoading(false)
      }
    }

    loadStories()

    // Refresh stories every minute
    const interval = setInterval(loadStories, 60000)
    return () => clearInterval(interval)
  }, [profileUser, currentUser])

  const canUserRetweet = (postRequiredLevel?: string) => {
    if (!currentUserProfile) return false

    const userLevel = currentUserProfile.level.toLowerCase()

    const levelHierarchy = {
      bronze: 1,
      prata: 2,
      gold: 3,
      platinum: 4,
      diamante: 5,
    }

    const userLevelValue = levelHierarchy[userLevel as keyof typeof levelHierarchy] || 1
    const requiredLevelValue = levelHierarchy[postRequiredLevel?.toLowerCase() as keyof typeof levelHierarchy] || 1

    return userLevelValue >= requiredLevelValue
  }

  const canUserComment = () => {
    if (!currentUserProfile) return false

    const userLevel = currentUserProfile.level.toLowerCase()
    return ["gold", "platinum", "diamante"].includes(userLevel)
  }

  const canUserUseChat = () => {
    if (!currentUserProfile) return false

    const userLevel = currentUserProfile.level.toLowerCase()
    return ["platinum", "diamante"].includes(userLevel)
  }

  const handleMessage = () => {
    if (!profileUser) return

    if (!canUserUseChat()) {
      toast({
        title: "Acesso Platinum necessário",
        description: "Você precisa ser Platinum ou Diamante para enviar mensagens",
        variant: "destructive",
      })
      return
    }

    router.push(`/chat/${profileUser.username}`)
  }

  const getLevelBadgeColor = (level: string) => {
    if (!level) {
      return "bg-gradient-to-r from-gray-300/20 to-gray-500/20 text-gray-300 border-gray-400/40 shadow-lg shadow-gray-400/20"
    }

    switch (level.toLowerCase()) {
      case "gold":
        return "bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 text-yellow-400 border-yellow-500/40 shadow-lg shadow-yellow-500/20"
      case "platinum":
        return "bg-gradient-to-r from-purple-400/20 to-purple-600/20 text-purple-300 border-purple-500/40 shadow-lg shadow-purple-500/20"
      case "diamante":
        return "bg-gradient-to-r from-blue-400/20 to-cyan-400/20 text-cyan-300 border-cyan-500/40 shadow-lg shadow-cyan-500/20"
      case "bronze":
        return "bg-gradient-to-r from-amber-600/20 to-amber-800/20 text-amber-400 border-amber-600/40 shadow-lg shadow-amber-600/20"
      case "prata":
        return "bg-gradient-to-r from-gray-300/20 to-gray-500/20 text-gray-300 border-gray-400/40 shadow-lg shadow-gray-400/20"
      default:
        return "bg-gradient-to-r from-gray-300/20 to-gray-500/20 text-gray-300 border-gray-400/40 shadow-lg shadow-gray-400/20"
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando perfil...</p>
        </div>
      </div>
    )
  }

  if (!profileUser) {
    return null
  }

  const hasStories = activeStories.length > 0

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation
        title={`@${profileUser.username}`}
        showBackButton={true}
        backHref="/feed"
        userProfile={currentUserProfile}
      />

      <main className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto pb-20 md:pb-24">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 rounded-b-3xl" />

          <div className="relative p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
            <div className="flex flex-col items-center sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-4 md:space-x-6">
              <div className="relative">
                {isOwnProfile && profileUser.userType === "creator" ? (
                  <StoryCreatorButton
                    userId={profileUser.uid}
                    username={profileUser.username}
                    onStoryCreated={() => {
                      // Reload stories after creation
                      import("@/lib/firebase/firestore").then(({ getCreatorActiveStories }) => {
                        getCreatorActiveStories(profileUser.uid).then(setActiveStories)
                      })
                    }}
                  >
                    <StoryRingAvatar
                      src={
                        profileUser.profileImage ||
                        `/placeholder.svg?height=112&width=112&query=user profile ${profileUser.username}`
                      }
                      alt={profileUser.displayName || profileUser.username}
                      fallback={(profileUser.displayName || profileUser.username).charAt(0).toUpperCase()}
                      hasActiveStory={hasStories}
                      hasUnviewedStory={hasUnviewed}
                      isOwner={isOwnProfile}
                      size="xl"
                      onClick={() => hasStories && setIsStoryViewerOpen(true)}
                    />
                  </StoryCreatorButton>
                ) : (
                  <StoryRingAvatar
                    src={
                      profileUser.profileImage ||
                      `/placeholder.svg?height=112&width=112&query=user profile ${profileUser.username}`
                    }
                    alt={profileUser.displayName || profileUser.username}
                    fallback={(profileUser.displayName || profileUser.username).charAt(0).toUpperCase()}
                    hasActiveStory={hasStories}
                    hasUnviewedStory={hasUnviewed}
                    isOwner={isOwnProfile}
                    size="xl"
                    onClick={() => hasStories && setIsStoryViewerOpen(true)}
                  />
                )}
                <div className="absolute -bottom-1 -right-1 h-4 w-4 md:h-5 md:w-5 bg-green-500 rounded-full border-2 border-background" />
              </div>

              <div className="flex-1 space-y-2 sm:space-y-3 w-full sm:w-auto text-center sm:text-left">
                <div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
                    {profileUser.displayName || profileUser.username}
                  </h1>
                  <p className="text-muted-foreground text-sm md:text-base">@{profileUser.username}</p>
                </div>

                <div className="flex justify-center sm:justify-start">
                  <UserLevelBadge
                    level={
                      (profileUser.level?.toLowerCase() || "bronze") as
                        | "bronze"
                        | "prata"
                        | "gold"
                        | "platinum"
                        | "diamante"
                    }
                    size="md"
                    className="max-w-[200px]"
                  />
                </div>
              </div>
            </div>

            {profileUser.bio && (
              <div className="bg-background/30 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-border/50">
                <p className="text-sm md:text-base text-foreground/90">{profileUser.bio}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center justify-center sm:justify-start space-x-2 bg-background/30 backdrop-blur-sm rounded-xl px-4 py-2 md:py-3 border border-border/50">
                <Repeat2 className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                <span className="text-sm md:text-base font-semibold">{userRetweets.length}</span>
                <span className="text-xs md:text-sm text-muted-foreground">Retweets</span>
              </div>

              {isOwnProfile ? (
                <Link href="/settings" className="flex-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl bg-background/50 backdrop-blur-sm border-primary/30 hover:bg-primary/10 h-10 md:h-11"
                  >
                    <Settings className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                    <span className="text-sm md:text-base">Editar perfil</span>
                  </Button>
                </Link>
              ) : (
                <Button
                  onClick={handleMessage}
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-xl bg-background/50 backdrop-blur-sm border-primary/30 hover:bg-primary/10 h-10 md:h-11"
                >
                  <MessageCircle className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                  <span className="text-sm md:text-base">Mensagem</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-4">
          {isOwnProfile && currentUserProfile && (
            <div className="bg-background/30 backdrop-blur-sm rounded-xl border border-border/50">
              <div className="flex border-b border-border/30">
                <button
                  onClick={() => setActiveTab("progress")}
                  className={`flex-1 px-3 sm:px-4 py-3 text-xs sm:text-sm md:text-base font-medium rounded-t-xl transition-colors ${
                    activeTab === "progress"
                      ? "bg-primary/10 text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/20"
                  }`}
                >
                  <span className="hidden sm:inline">⭐ </span>Progresso XP
                </button>
                <button
                  onClick={() => setActiveTab("retweets")}
                  className={`flex-1 px-3 sm:px-4 py-3 text-xs sm:text-sm md:text-base font-medium rounded-t-xl transition-colors ${
                    activeTab === "retweets"
                      ? "bg-primary/10 text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/20"
                  }`}
                >
                  <Repeat2 className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
                  <span className="hidden sm:inline">Retweets </span>({userRetweets.length})
                </button>
              </div>

              <div className="p-3 sm:p-4 md:p-6">
                {activeTab === "progress" &&
                  (currentUserProfile.level ? (
                    <UserProgressSection
                      user={{
                        xp: currentUserProfile.xp || 0,
                        level: currentUserProfile.level,
                        username: currentUserProfile.username,
                        displayName: currentUserProfile.displayName,
                      }}
                      showTips={true}
                    />
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-muted-foreground text-sm md:text-base">Nível do usuário não definido</div>
                    </div>
                  ))}

                {activeTab === "retweets" && (
                  <div>
                    {retweetsLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                        <p className="text-muted-foreground mt-2 text-sm">Carregando...</p>
                      </div>
                    ) : userRetweets.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="mx-auto w-12 h-12 bg-muted/20 rounded-full flex items-center justify-center mb-3">
                          <Repeat2 className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                        <p className="text-muted-foreground text-sm mb-1">Nenhum retweet ainda</p>
                        <p className="text-xs text-muted-foreground/70">Os retweets aparecerão aqui</p>
                      </div>
                    ) : (
                      <div className="space-y-3 md:space-y-4">
                        {userRetweets.map((retweet) => (
                          <div key={retweet.id} className="space-y-2">
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground/70 px-2">
                              <Repeat2 className="h-3 w-3" />
                              <span>Retweetado por @{profileUser.username}</span>
                            </div>

                            {retweet.originalPost ? (
                              <div className="bg-background/50 border border-border/30 rounded-xl overflow-hidden">
                                <div className="p-3 sm:p-4 md:p-5 space-y-3">
                                  <div className="flex items-center space-x-3">
                                    <Avatar className="h-10 w-10 md:h-12 md:w-12">
                                      <AvatarImage
                                        src={retweet.originalPost.authorProfileImage || "/placeholder.svg"}
                                        alt={retweet.originalPost.authorDisplayName}
                                      />
                                      <AvatarFallback>
                                        {retweet.originalPost.authorDisplayName?.charAt(0).toUpperCase() || "U"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-semibold text-sm md:text-base">
                                        {retweet.originalPost.authorDisplayName}
                                      </p>
                                      <p className="text-xs md:text-sm text-muted-foreground">
                                        @{retweet.originalPost.authorUsername}
                                      </p>
                                    </div>
                                  </div>

                                  <p className="text-sm md:text-base">{retweet.originalPost.content}</p>

                                  {retweet.originalPost.images && retweet.originalPost.images.length > 0 && (
                                    <div
                                      className={`grid gap-2 ${retweet.originalPost.images.length > 1 ? "md:grid-cols-2" : "grid-cols-1"}`}
                                    >
                                      {retweet.originalPost.images.map((image, index) => (
                                        <div key={index} className="w-full">
                                          <img
                                            src={image || "/placeholder.svg"}
                                            alt={`Imagem ${index + 1}`}
                                            className="w-full h-auto rounded-lg object-cover"
                                            style={{ maxHeight: "400px" }}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  <div className="flex items-center space-x-4 sm:space-x-6 text-xs md:text-sm text-muted-foreground pt-2">
                                    <span>{retweet.originalPost.likes || 0} curtidas</span>
                                    <span>{retweet.originalPost.comments || 0} comentários</span>
                                    <span>{retweet.originalPost.retweets || 0} retweets</span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-background/50 border border-border/30 rounded-xl p-4">
                                <p className="text-sm text-muted-foreground">Post original não disponível</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {!isOwnProfile && (
            <div className="bg-background/30 backdrop-blur-sm rounded-xl border border-border/50">
              <div className="p-3 sm:p-4 md:p-6">
                <h2 className="text-base sm:text-lg md:text-xl font-bold mb-4 flex items-center space-x-2">
                  <Repeat2 className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  <span>Retweets</span>
                </h2>

                {retweetsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground mt-2 text-sm">Carregando...</p>
                  </div>
                ) : userRetweets.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="mx-auto w-12 h-12 bg-muted/20 rounded-full flex items-center justify-center mb-3">
                      <Repeat2 className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground text-sm mb-1">@{profileUser?.username} não fez retweets</p>
                    <p className="text-xs text-muted-foreground/70">Os retweets aparecerão aqui</p>
                  </div>
                ) : (
                  <div className="space-y-3 md:space-y-4">
                    {userRetweets.map((retweet) => (
                      <div key={retweet.id} className="space-y-2">
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground/70 px-2">
                          <Repeat2 className="h-3 w-3" />
                          <span>Retweetado por @{profileUser?.username}</span>
                        </div>

                        {retweet.originalPost ? (
                          <div className="bg-background/50 border border-border/30 rounded-xl overflow-hidden">
                            <div className="p-3 sm:p-4 md:p-5 space-y-3">
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-10 w-10 md:h-12 md:w-12">
                                  <AvatarImage
                                    src={retweet.originalPost.authorProfileImage || "/placeholder.svg"}
                                    alt={retweet.originalPost.authorDisplayName}
                                  />
                                  <AvatarFallback>
                                    {retweet.originalPost.authorDisplayName?.charAt(0).toUpperCase() || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-semibold text-sm md:text-base">
                                    {retweet.originalPost.authorDisplayName}
                                  </p>
                                  <p className="text-xs md:text-sm text-muted-foreground">
                                    @{retweet.originalPost.authorUsername}
                                  </p>
                                </div>
                              </div>

                              <p className="text-sm md:text-base">{retweet.originalPost.content}</p>

                              {retweet.originalPost.images && retweet.originalPost.images.length > 0 && (
                                <div
                                  className={`grid gap-2 ${retweet.originalPost.images.length > 1 ? "md:grid-cols-2" : "grid-cols-1"}`}
                                >
                                  {retweet.originalPost.images.map((image, index) => (
                                    <div key={index} className="w-full">
                                      <img
                                        src={image || "/placeholder.svg"}
                                        alt={`Imagem ${index + 1}`}
                                        className="w-full h-auto rounded-lg object-cover"
                                        style={{ maxHeight: "400px" }}
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="flex items-center space-x-4 sm:space-x-6 text-xs md:text-sm text-muted-foreground pt-2">
                                <span>{retweet.originalPost.likes || 0} curtidas</span>
                                <span>{retweet.originalPost.comments || 0} comentários</span>
                                <span>{retweet.originalPost.retweets || 0} retweets</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-background/50 border border-border/30 rounded-xl p-4">
                            <p className="text-sm text-muted-foreground">Post original não disponível</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {hasStories && (
        <StoryViewer
          isOpen={isStoryViewerOpen}
          onClose={() => setIsStoryViewerOpen(false)}
          stories={activeStories}
          initialStoryIndex={0}
          creatorName={profileUser.displayName || profileUser.username}
          creatorUsername={profileUser.username}
          creatorAvatar={profileUser.profileImage || "/placeholder.svg"}
          currentUserId={currentUser?.uid}
          isOwner={isOwnProfile}
          onStoryDeleted={() => {
            // Reload stories after deletion
            import("@/lib/firebase/firestore").then(({ getCreatorActiveStories }) => {
              getCreatorActiveStories(profileUser.uid).then(setActiveStories)
            })
          }}
        />
      )}

      <BottomNavigation userProfile={currentUserProfile} />
    </div>
  )
}
