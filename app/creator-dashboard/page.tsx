"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TopNavigation } from "@/components/top-navigation"
import { BottomNavigation } from "@/components/bottom-navigation"
import { PostCard } from "@/components/post-card"
import {
  Crown,
  Plus,
  Trash2,
  ImageIcon,
  VideoIcon,
  Upload,
  Loader2,
  Sparkles,
  Eye,
  EyeOff,
  Camera,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock,
  Settings,
  TrendingUp,
  Edit3,
  Landmark,
  Gift,
} from "lucide-react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/config"
import {
  getUserProfile,
  getPostsByAuthor,
  isUserCreator,
  createPost,
  updateCreatorContentCount,
  deletePost,
  createCreatorHighlight,
  getCreatorHighlights,
  updateCreatorHighlight,
  deleteCreatorHighlight,
  type CreatorHighlight,
  updateUserProfile, // Import added for updating user profile
  getCreatorServices,
  createCreatorService,
  updateCreatorService,
  type CreatorService,
} from "@/lib/firebase/firestore"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { SERVICE_PRODUCTS } from "@/lib/service-products"

export default function CreatorDashboardPage() {
  const [user] = useAuthState(auth)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const [followerCount, setFollowerCount] = useState<number>(0)
  const [satisfaction, setSatisfaction] = useState<number>(98)
  const [isEditingStats, setIsEditingStats] = useState(false)
  const [isSavingStats, setIsSavingStats] = useState(false)

  const [showPostComposer, setShowPostComposer] = useState(false)
  const [postContent, setPostContent] = useState("")
  const [imageLinks, setImageLinks] = useState<string[]>([""])
  const [videoLinks, setVideoLinks] = useState<string[]>([""])
  const [requiredLevel, setRequiredLevel] = useState<"Bronze" | "Gold" | "Platinum" | "Diamante" | "Prata">("Bronze")
  const [isCreatingPost, setIsCreatingPost] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const [highlights, setHighlights] = useState<CreatorHighlight[]>([])
  const [showHighlightManager, setShowHighlightManager] = useState(false)
  const [editingHighlight, setEditingHighlight] = useState<CreatorHighlight | null>(null)
  const [showStoryCreator, setShowStoryCreator] = useState(false)
  const [storyImages, setStoryImages] = useState<string[]>([""])
  const [storyName, setStoryName] = useState("")
  const [storyCoverImage, setStoryCoverImage] = useState("")
  const [storyRequiredLevel, setStoryRequiredLevel] = useState<"Bronze" | "Gold" | "Platinum" | "Diamante" | "Prata">(
    "Bronze",
  )
  const [isTemporaryStory, setIsTemporaryStory] = useState(false)
  const [storyDuration, setStoryDuration] = useState<number>(24)
  const [isCreatingStory, setIsCreatingStory] = useState(false)
  const [showStoryViewer, setShowStoryViewer] = useState(false)
  const [currentStory, setCurrentStory] = useState<CreatorHighlight | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const [services, setServices] = useState<CreatorService[]>([])
  const [showServiceManager, setShowServiceManager] = useState(false)
  const [isTogglingService, setIsTogglingService] = useState<string | null>(null)
  const [editingService, setEditingService] = useState<CreatorService | null>(null)
  const [serviceCustomDescription, setServiceCustomDescription] = useState("")
  const [serviceCoverImage, setServiceCoverImage] = useState("")
  const [isSavingService, setIsSavingService] = useState(false)

  const addImageLink = () => {
    if (imageLinks.length < 4) {
      setImageLinks([...imageLinks, ""])
    }
  }

  const updateImageLink = (index: number, value: string) => {
    const newLinks = [...imageLinks]
    newLinks[index] = value
    setImageLinks(newLinks)
  }

  const removeImageLink = (index: number) => {
    setImageLinks(imageLinks.filter((_, i) => i !== index))
  }

  const addVideoLink = () => {
    if (videoLinks.length < 2) {
      setVideoLinks([...videoLinks, ""])
    }
  }

  const updateVideoLink = (index: number, value: string) => {
    const newLinks = [...videoLinks]
    newLinks[index] = value
    setVideoLinks(newLinks)
  }

  const removeVideoLink = (index: number) => {
    setVideoLinks(videoLinks.filter((_, i) => i !== index))
  }

  const loadHighlights = async () => {
    if (!user) return

    try {
      const creatorHighlights = await getCreatorHighlights(user.uid)
      setHighlights(creatorHighlights)
    } catch (error) {
      console.error("Error loading creator highlights:", error)
      setHighlights([])
    }
  }

  const handleCreateStory = async () => {
    if (!storyName.trim() || !storyCoverImage.trim() || !user || !userProfile) return

    if (isTemporaryStory && storyRequiredLevel !== "Bronze") {
      alert("Stories temporários estão disponíveis apenas para o nível Bronze (grátis).")
      return
    }

    setIsCreatingStory(true)
    try {
      const validImages = storyImages.filter((img) => img.trim() !== "")

      let expiresAt = null
      if (isTemporaryStory) {
        expiresAt = new Date()
        expiresAt.setHours(expiresAt.getHours() + storyDuration)
      }

      const highlightData = {
        creatorId: user.uid,
        creatorUsername: userProfile.username,
        name: storyName.trim(),
        coverImage: storyCoverImage.trim(),
        requiredLevel: storyRequiredLevel,
        images: validImages,
        isTemporary: isTemporaryStory,
        ...(expiresAt && { expiresAt }),
      }

      await createCreatorHighlight(highlightData)

      setStoryName("")
      setStoryCoverImage("")
      setStoryImages([""])
      setStoryRequiredLevel("Bronze")
      setIsTemporaryStory(false)
      setStoryDuration(24)
      setShowStoryCreator(false)

      await loadHighlights()
    } catch (error) {
      console.error("Error creating creator highlight:", error)
      alert("Erro ao criar destaque. Tente novamente.")
    } finally {
      setIsCreatingStory(false)
    }
  }

  const handleDeleteHighlight = async (highlightId: string) => {
    if (!confirm("Tem certeza que deseja excluir este destaque? Esta ação não pode ser desfeita.")) {
      return
    }

    try {
      await deleteCreatorHighlight(highlightId)
      await loadHighlights()
    } catch (error) {
      console.error("Error deleting creator highlight:", error)
      alert("Erro ao excluir destaque. Tente novamente.")
    }
  }

  const handleEditHighlight = async () => {
    if (!editingHighlight || !user) return

    try {
      const updateData = {
        name: editingHighlight.name,
        coverImage: editingHighlight.coverImage,
        requiredLevel: editingHighlight.requiredLevel,
        images: editingHighlight.images,
      }

      await updateCreatorHighlight(editingHighlight.id!, updateData)
      setEditingHighlight(null)
      await loadHighlights()
    } catch (error) {
      console.error("Error updating creator highlight:", error)
      alert("Erro ao atualizar destaque. Tente novamente.")
    }
  }

  const addStoryImage = () => {
    if (storyImages.length < 10) {
      setStoryImages([...storyImages, ""])
    }
  }

  const updateStoryImage = (index: number, value: string) => {
    const newImages = [...storyImages]
    newImages[index] = value
    setStoryImages(newImages)
  }

  const removeStoryImage = (index: number) => {
    setStoryImages(storyImages.filter((_, i) => i !== index))
  }

  const openStoryViewer = (highlight: CreatorHighlight) => {
    setCurrentStory(highlight)
    setCurrentImageIndex(0)
    setShowStoryViewer(true)
  }

  const nextImage = () => {
    if (currentStory && currentImageIndex < currentStory.images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1)
    }
  }

  const prevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1)
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta publicação? Esta ação não pode ser desfeita.")) {
      return
    }

    setIsDeleting(postId)
    try {
      await deletePost(postId)
      setPosts(posts.filter((post) => post.id !== postId))
      await updateCreatorContentCount(user!.uid, -1)
    } catch (error) {
      console.error("Error deleting post:", error)
      alert("Erro ao excluir publicação. Tente novamente.")
    } finally {
      setIsDeleting(null)
    }
  }

  const handleCreatePost = async () => {
    if (!postContent.trim() || !user) return

    setIsCreatingPost(true)
    try {
      const validImageLinks = imageLinks.filter((link) => link.trim() !== "")
      const validVideoLinks = videoLinks.filter((link) => link.trim() !== "")

      const postData = {
        authorId: user.uid,
        authorUsername: userProfile.username,
        authorDisplayName: userProfile.displayName,
        authorProfileImage: userProfile.profileImage || "/placeholder.svg",
        authorUserType: userProfile.userType || "creator",
        content: postContent.trim(),
        images: validImageLinks,
        videos: validVideoLinks,
        likes: 0,
        comments: 0,
        retweets: 0,
        requiredLevel,
      }

      await createPost(postData)
      await updateCreatorContentCount(user.uid, 1)

      setPostContent("")
      setImageLinks([""])
      setVideoLinks([""])
      setRequiredLevel("Bronze")
      setShowPostComposer(false)

      await loadCreatorData()
    } catch (error) {
      console.error("Error creating post:", error)
    } finally {
      setIsCreatingPost(false)
    }
  }

  const loadCreatorData = async () => {
    if (!user) return

    try {
      setIsLoading(true)

      const isCreator = await isUserCreator(user.uid)
      if (!isCreator) {
        router.push("/feed")
        return
      }

      const profile = await getUserProfile(user.uid)
      setUserProfile(profile)

      if (profile) {
        setFollowerCount(profile.followerCount || 0)
        setSatisfaction(profile.satisfaction || 98)
      }

      const userPosts = await getPostsByAuthor(profile.username)
      setPosts(userPosts)

      await loadHighlights()
      await loadServices()
    } catch (error) {
      console.error("Error loading creator data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadServices = async () => {
    if (!user) return

    try {
      const creatorServices = await getCreatorServices(user.uid)
      setServices(creatorServices)
    } catch (error) {
      console.error("Error loading creator services:", error)
      setServices([])
    }
  }

  const handleToggleService = async (serviceProductId: string) => {
    if (!user || !userProfile) return

    setIsTogglingService(serviceProductId)
    try {
      const existingService = services.find((s) => s.serviceProductId === serviceProductId)

      if (existingService) {
        await updateCreatorService(existingService.id!, {
          isActive: !existingService.isActive,
        })
      } else {
        await createCreatorService({
          creatorId: user.uid,
          creatorUsername: userProfile.username,
          serviceProductId,
          isActive: true,
        })
      }

      await loadServices()
    } catch (error) {
      console.error("Error toggling service:", error)
      alert("Erro ao atualizar serviço. Tente novamente.")
    } finally {
      setIsTogglingService(null)
    }
  }

  const handleEditService = (serviceProductId: string) => {
    const service = services.find((s) => s.serviceProductId === serviceProductId)
    if (service) {
      setEditingService(service)
      setServiceCustomDescription(service.customDescription || "")
      setServiceCoverImage(service.coverImage || "")
    } else {
      // Create a new service entry for editing
      const newService: CreatorService = {
        creatorId: user!.uid,
        creatorUsername: userProfile!.username,
        serviceProductId,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setEditingService(newService)
      setServiceCustomDescription("")
      setServiceCoverImage("")
    }
  }

  const handleSaveServiceCustomization = async () => {
    if (!editingService || !user) return

    setIsSavingService(true)
    try {
      const updates = {
        customDescription: serviceCustomDescription.trim() || undefined,
        coverImage: serviceCoverImage.trim() || undefined,
        isBestSeller: editingService.isBestSeller === true,
        isExclusive: editingService.isExclusive === true,
      }

      if (editingService.id) {
        // Update existing service
        await updateCreatorService(editingService.id, updates)
      } else {
        // Create new service with customization
        await createCreatorService({
          ...editingService,
          ...updates,
        })
      }

      setEditingService(null)
      setServiceCustomDescription("")
      setServiceCoverImage("")
      await loadServices()
    } catch (error) {
      console.error("Error saving service customization:", error)
      alert("Erro ao salvar personalização do serviço. Tente novamente.")
    } finally {
      setIsSavingService(false)
    }
  }

  const isServiceActive = (serviceProductId: string) => {
    const service = services.find((s) => s.serviceProductId === serviceProductId)
    return service?.isActive || false
  }

  const handleSaveStats = async () => {
    if (!user) return

    setIsSavingStats(true)
    try {
      await updateUserProfile(user.uid, {
        followerCount: followerCount,
        satisfaction: satisfaction,
      })

      setIsEditingStats(false)

      // Reload profile to get updated data
      const profile = await getUserProfile(user.uid)
      setUserProfile(profile)
    } catch (error) {
      console.error("Error saving stats:", error)
      alert("Erro ao salvar estatísticas. Tente novamente.")
    } finally {
      setIsSavingStats(false)
    }
  }

  useEffect(() => {
    loadCreatorData()
  }, [user, router])

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Acesso Restrito</h2>
          <p className="text-muted-foreground mb-4">Você precisa estar logado para acessar o dashboard.</p>
          <Link href="/">
            <Button>Fazer Login</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavigation title="Dashboard" showBackButton backHref="/feed" />
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

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation title="Dashboard da Criadora" showBackButton backHref="/feed" />

      <main className="max-w-4xl mx-auto pb-20 px-4 sm:px-6">
        <div className="py-4">
          <Card className="glow-pink border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
                <div className="flex items-center space-x-3 sm:space-x-4 w-full sm:w-auto">
                  <Link href={`/creator/${userProfile?.username}`}>
                    <Avatar className="h-16 w-16 sm:h-20 sm:w-20 ring-2 ring-primary/30 cursor-pointer hover:ring-primary/50 transition-all flex-shrink-0">
                      <AvatarImage
                        src={userProfile?.profileImage || "/placeholder.svg"}
                        alt={userProfile?.displayName}
                      />
                      <AvatarFallback>{userProfile?.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2 mb-1 flex-wrap">
                      <h2 className="text-lg sm:text-xl font-bold truncate">{userProfile?.displayName}</h2>
                      <Badge className="bg-primary/20 text-primary border-primary/30 flex-shrink-0">
                        <Crown className="h-3 w-3 mr-1" />
                        Criadora
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">@{userProfile?.username}</p>
                  </div>
                </div>
                <Link href="/creator-settings" className="self-end sm:self-start">
                  <Button variant="ghost" size="sm" className="rounded-full">
                    <Settings className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-4 border-t border-border/50">
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-bold text-primary">{posts.length}</p>
                  <p className="text-xs text-muted-foreground">Posts</p>
                </div>
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-bold text-primary">{highlights.length}</p>
                  <p className="text-xs text-muted-foreground">Destaques</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <Link href="/creator-dashboard/financial-office">
            <Button className="w-full rounded-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 h-12 text-base font-semibold">
              <Landmark className="h-5 w-5 mr-2" />
              Escritório Financeiro
            </Button>
          </Link>
        </div>

        <div className="mb-6">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                <span className="flex items-center">
                  <Gift className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-primary" />
                  Serviços Disponíveis
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowServiceManager(!showServiceManager)}
                  className="rounded-full"
                >
                  {showServiceManager ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </CardTitle>
            </CardHeader>

            {showServiceManager && (
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground mb-4">
                  Ative ou desative os serviços que você deseja oferecer. Os preços são fixos e processados via Stripe.
                </p>
                {SERVICE_PRODUCTS.map((product) => {
                  const isActive = isServiceActive(product.id)
                  const isToggling = isTogglingService === product.id
                  const service = services.find((s) => s.serviceProductId === product.id)

                  return (
                    <div
                      key={product.id}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 rounded-lg bg-muted/30 gap-3 border border-border/50"
                    >
                      <div className="flex items-start space-x-3 flex-1 min-w-0 w-full sm:w-auto">
                        <div className="text-2xl sm:text-3xl flex-shrink-0">{product.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 mb-1">
                            <h4 className="font-semibold text-sm sm:text-base truncate flex-1">{product.name}</h4>
                            {service?.isBestSeller && (
                              <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 text-[10px] flex-shrink-0">
                                <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                                TOP
                              </Badge>
                            )}
                            {service?.isExclusive && (
                              <Badge className="bg-purple-500/20 text-purple-600 border-purple-500/30 text-[10px] flex-shrink-0">
                                <Crown className="h-2.5 w-2.5 mr-0.5" />
                                VIP
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {service?.customDescription || product.description}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-primary">
                              R$ {(product.priceInCents / 100).toFixed(2).replace(".", ",")}
                            </p>
                            <Badge variant="outline" className="text-[10px]">
                              {product.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditService(product.id)}
                          className="h-9 px-3 flex-1 sm:flex-initial"
                        >
                          <Edit3 className="h-4 w-4 mr-1" />
                          <span className="text-xs">Editar</span>
                        </Button>
                        <Button
                          variant={isActive ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleToggleService(product.id)}
                          disabled={isToggling}
                          className="h-9 px-4 flex-1 sm:flex-initial font-semibold"
                        >
                          {isToggling ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isActive ? (
                            <>
                              <Eye className="h-4 w-4 mr-1" />
                              Ativo
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-4 w-4 mr-1" />
                              Ativar
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            )}

            {!showServiceManager && (
              <CardContent className="text-center py-6">
                <p className="text-sm text-muted-foreground">
                  {services.filter((s) => s.isActive).length} serviço(s) ativo(s)
                </p>
              </CardContent>
            )}
          </Card>
        </div>

        <div className="mb-6">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                <span className="flex items-center">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-primary" />
                  Estatísticas do Perfil
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (isEditingStats) {
                      setFollowerCount(userProfile?.followerCount || 0)
                      setSatisfaction(userProfile?.satisfaction || 98)
                    }
                    setIsEditingStats(!isEditingStats)
                  }}
                  className="rounded-full"
                >
                  {isEditingStats ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-muted-foreground">Número de Seguidores</label>
                  {!isEditingStats && (
                    <span className="text-lg font-bold text-primary">
                      {followerCount >= 1000000
                        ? `${(followerCount / 1000000).toFixed(1)}M`
                        : followerCount >= 1000
                          ? `${(followerCount / 1000).toFixed(1)}K`
                          : followerCount}
                    </span>
                  )}
                </div>
                {isEditingStats && (
                  <Input
                    type="number"
                    value={followerCount}
                    onChange={(e) => setFollowerCount(Number(e.target.value))}
                    placeholder="Ex: 248000"
                    className="bg-transparent"
                    min="0"
                  />
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-muted-foreground">Satisfação (%)</label>
                  {!isEditingStats && <span className="text-lg font-bold text-primary">{satisfaction}%</span>}
                </div>
                {isEditingStats && (
                  <Input
                    type="number"
                    value={satisfaction}
                    onChange={(e) => setSatisfaction(Number(e.target.value))}
                    placeholder="Ex: 98"
                    className="bg-transparent"
                    min="0"
                    max="100"
                  />
                )}
              </div>

              {isEditingStats && (
                <div className="flex space-x-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFollowerCount(userProfile?.followerCount || 0)
                      setSatisfaction(userProfile?.satisfaction || 98)
                      setIsEditingStats(false)
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveStats}
                    disabled={isSavingStats}
                    className="flex-1 bg-primary hover:bg-primary/90"
                  >
                    {isSavingStats ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar
                      </>
                    )}
                  </Button>
                </div>
              )}

              <div className="pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground text-center">
                  Estes valores são exibidos no seu perfil público
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                <span className="flex items-center">
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-primary" />
                  Destaques
                </span>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowStoryCreator(true)}
                    className="rounded-full"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  {highlights.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowHighlightManager(!showHighlightManager)}
                      className="rounded-full"
                    >
                      {showHighlightManager ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>

            {highlights.length > 0 && (
              <CardContent>
                <div className="flex space-x-3 sm:space-x-4 overflow-x-auto pb-2 -mx-2 px-2">
                  {highlights.map((highlight) => (
                    <div key={highlight.id} className="flex-shrink-0 text-center">
                      <div
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden ring-2 ring-primary/30 cursor-pointer hover:ring-primary/60 transition-all"
                        onClick={() => openStoryViewer(highlight)}
                      >
                        <img
                          src={highlight.coverImage || "/placeholder.svg"}
                          alt={highlight.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg"
                          }}
                        />
                      </div>
                      <p className="text-xs mt-1 text-muted-foreground truncate w-14 sm:w-16">{highlight.name}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}

            {showHighlightManager && highlights.length > 0 && (
              <CardContent className="space-y-3 pt-0 border-t border-border/50">
                {highlights.map((highlight) => (
                  <div
                    key={highlight.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-3"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                        <img
                          src={highlight.coverImage || "/placeholder.svg"}
                          alt={highlight.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg"
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{highlight.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {highlight.images.length} {highlight.images.length === 1 ? "imagem" : "imagens"}
                          {highlight.isTemporary && highlight.expiresAt && (
                            <span className="ml-2 text-primary">
                              • Expira em{" "}
                              {Math.ceil(
                                (new Date(
                                  highlight.expiresAt.toDate ? highlight.expiresAt.toDate() : highlight.expiresAt,
                                ).getTime() -
                                  new Date().getTime()) /
                                  (1000 * 60 * 60),
                              )}
                              h
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                      <Badge
                        variant="outline"
                        className={`text-xs hidden sm:inline-flex ${
                          highlight.requiredLevel === "Bronze"
                            ? "border-orange-500 text-orange-600"
                            : highlight.requiredLevel === "Gold"
                              ? "border-yellow-500 text-yellow-600"
                              : highlight.requiredLevel === "Platinum"
                                ? "border-purple-500 text-purple-600"
                                : highlight.requiredLevel === "Prata"
                                  ? "border-gray-500 text-gray-600"
                                  : "border-cyan-500 text-cyan-600"
                        }`}
                      >
                        {highlight.requiredLevel === "Bronze" || highlight.requiredLevel === "Prata" ? (
                          <Unlock className="h-3 w-3 mr-1" />
                        ) : (
                          <Lock className="h-3 w-3 mr-1" />
                        )}
                        {highlight.requiredLevel}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingHighlight(highlight)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteHighlight(highlight.id!)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            )}

            {highlights.length === 0 && (
              <CardContent className="text-center py-8">
                <Camera className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground mb-1">Nenhum destaque criado</p>
                <p className="text-xs text-muted-foreground">Crie destaques para mostrar seu melhor conteúdo</p>
              </CardContent>
            )}
          </Card>
        </div>

        <div className="mb-6">
          <Button
            onClick={() => setShowPostComposer(!showPostComposer)}
            className="w-full rounded-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 h-11 sm:h-12 text-sm sm:text-base"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            {showPostComposer ? "Cancelar" : "Criar Nova Publicação"}
          </Button>

          {showPostComposer && (
            <Card className="mt-4 border-primary/20">
              <CardContent className="p-4 space-y-4">
                <Textarea
                  placeholder="Compartilhe algo especial com sua audiência..."
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className="min-h-[120px] resize-none"
                  maxLength={500}
                />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium flex items-center">
                      <ImageIcon className="h-4 w-4 mr-2 text-primary" />
                      Imagens ({imageLinks.filter((link) => link.trim()).length}/4)
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addImageLink}
                      disabled={imageLinks.length >= 4}
                      className="h-8 rounded-full"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  {imageLinks.map((link, index) => (
                    <div key={index} className="flex space-x-2">
                      <Input
                        placeholder="https://exemplo.com/imagem.jpg"
                        value={link}
                        onChange={(e) => updateImageLink(index, e.target.value)}
                        className="flex-1 h-9"
                      />
                      <Button variant="ghost" size="sm" onClick={() => removeImageLink(index)} className="h-9 w-9 p-0">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium flex items-center">
                      <VideoIcon className="h-4 w-4 mr-2 text-primary" />
                      Vídeos ({videoLinks.filter((link) => link.trim()).length}/2)
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addVideoLink}
                      disabled={videoLinks.length >= 2}
                      className="h-8 rounded-full"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  {videoLinks.map((link, index) => (
                    <div key={index} className="flex space-x-2">
                      <Input
                        placeholder="https://exemplo.com/video.mp4"
                        value={link}
                        onChange={(e) => updateVideoLink(index, e.target.value)}
                        className="flex-1 h-9"
                      />
                      <Button variant="ghost" size="sm" onClick={() => removeVideoLink(index)} className="h-9 w-9 p-0">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Nível de Acesso</label>
                  <Select value={requiredLevel} onValueChange={(value: any) => setRequiredLevel(value)}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bronze">
                        <div className="flex items-center">
                          <Unlock className="h-3 w-3 mr-2" />
                          Bronze (Grátis)
                        </div>
                      </SelectItem>
                      <SelectItem value="Prata">
                        <div className="flex items-center">
                          <Lock className="h-3 w-3 mr-2" />
                          Prata
                        </div>
                      </SelectItem>
                      <SelectItem value="Gold">
                        <div className="flex items-center">
                          <Lock className="h-3 w-3 mr-2" />
                          Gold
                        </div>
                      </SelectItem>
                      <SelectItem value="Platinum">
                        <div className="flex items-center">
                          <Lock className="h-3 w-3 mr-2" />
                          Platinum
                        </div>
                      </SelectItem>
                      <SelectItem value="Diamante">
                        <div className="flex items-center">
                          <Lock className="h-3 w-3 mr-2" />
                          Diamante
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-muted-foreground">{postContent.length}/500</span>
                  <Button
                    onClick={handleCreatePost}
                    disabled={!postContent.trim() || isCreatingPost}
                    className="rounded-full"
                  >
                    {isCreatingPost ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Publicando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Publicar
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-semibold flex items-center">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-primary" />
              Suas Publicações
            </h3>
            {posts.length > 0 && (
              <Link href={`/creator/${userProfile?.username}`}>
                <Button variant="ghost" size="sm" className="text-xs">
                  Ver perfil
                </Button>
              </Link>
            )}
          </div>

          {posts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <TrendingUp className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <h4 className="font-semibold mb-2">Nenhuma publicação ainda</h4>
                <p className="text-sm text-muted-foreground mb-6">
                  Comece a compartilhar conteúdo exclusivo com sua audiência!
                </p>
                <Button onClick={() => setShowPostComposer(true)} className="rounded-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Publicação
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <Card key={post.id} className="border-primary/10 overflow-hidden">
                  <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border/50 bg-muted/20">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <Badge
                        variant="outline"
                        className={`text-xs flex-shrink-0 ${
                          post.requiredLevel === "Bronze"
                            ? "border-orange-500 text-orange-600"
                            : post.requiredLevel === "Gold"
                              ? "border-yellow-500 text-yellow-600"
                              : post.requiredLevel === "Platinum"
                                ? "border-purple-500 text-purple-600"
                                : post.requiredLevel === "Prata"
                                  ? "border-gray-500 text-gray-600"
                                  : "border-cyan-500 text-cyan-600"
                        }`}
                      >
                        {post.requiredLevel === "Bronze" || post.requiredLevel === "Prata" ? (
                          <Unlock className="h-3 w-3 mr-1" />
                        ) : (
                          <Lock className="h-3 w-3 mr-1" />
                        )}
                        {post.requiredLevel}
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate">
                        {new Date(post.createdAt?.toDate ? post.createdAt.toDate() : post.createdAt).toLocaleDateString(
                          "pt-BR",
                        )}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePost(post.id)}
                      disabled={isDeleting === post.id}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10 flex-shrink-0"
                    >
                      {isDeleting === post.id ? (
                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      )}
                    </Button>
                  </div>
                  <CardContent className="p-3 sm:p-4 overflow-hidden">
                    <div className="min-w-0">
                      <PostCard post={post} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {showStoryCreator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Camera className="h-5 w-5 mr-2" />
                  Criar Novo Destaque
                </span>
                <Button variant="ghost" size="sm" onClick={() => setShowStoryCreator(false)} className="rounded-full">
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome do Destaque</label>
                <Input
                  placeholder="Ex: Ensaios, Lifestyle, Beauty..."
                  value={storyName}
                  onChange={(e) => setStoryName(e.target.value)}
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Imagem de Capa</label>
                <Input
                  placeholder="https://exemplo.com/capa.jpg"
                  value={storyCoverImage}
                  onChange={(e) => setStoryCoverImage(e.target.value)}
                />
                {storyCoverImage && (
                  <div className="w-16 h-16 rounded-full overflow-hidden mx-auto ring-2 ring-primary/30">
                    <img
                      src={storyCoverImage || "/placeholder.svg"}
                      alt="Preview da capa"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg"
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nível de Acesso</label>
                <Select value={storyRequiredLevel} onValueChange={(value: any) => setStoryRequiredLevel(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bronze">Bronze (Grátis)</SelectItem>
                    <SelectItem value="Prata">Prata</SelectItem>
                    <SelectItem value="Gold">Gold</SelectItem>
                    <SelectItem value="Platinum">Platinum</SelectItem>
                    <SelectItem value="Diamante">Diamante</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isTemporary"
                      checked={isTemporaryStory}
                      onChange={(e) => {
                        const checked = e.target.checked
                        if (checked && storyRequiredLevel !== "Bronze") {
                          alert("Stories temporários estão disponíveis apenas para o nível Bronze (grátis).")
                          return
                        }
                        setIsTemporaryStory(checked)
                      }}
                      className="rounded"
                      disabled={storyRequiredLevel !== "Bronze"}
                    />
                    <label htmlFor="isTemporary" className="text-sm font-medium cursor-pointer">
                      Story Temporário
                    </label>
                  </div>
                  <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
                    Bronze
                  </Badge>
                </div>

                {isTemporaryStory && (
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <label className="text-sm font-medium">Duração</label>
                    <Select value={storyDuration.toString()} onValueChange={(value) => setStoryDuration(Number(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24">24 horas</SelectItem>
                        <SelectItem value="48">48 horas</SelectItem>
                        <SelectItem value="72">3 dias</SelectItem>
                        <SelectItem value="168">7 dias</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      O story será automaticamente removido após o período selecionado
                    </p>
                  </div>
                )}

                {storyRequiredLevel !== "Bronze" && (
                  <p className="text-xs text-muted-foreground">
                    Stories temporários estão disponíveis apenas para o nível Bronze (grátis).
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Imagens do Story ({storyImages.filter((img) => img.trim()).length}/10)
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {storyImages.map((image, index) => (
                    <div key={index} className="flex space-x-2">
                      <Input
                        placeholder={`Imagem ${index + 1} - https://exemplo.com/imagem.jpg`}
                        value={image}
                        onChange={(e) => updateStoryImage(index, e.target.value)}
                        className="flex-1 text-xs"
                      />
                      <Button variant="ghost" size="sm" onClick={() => removeStoryImage(index)} className="px-2">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addStoryImage}
                  disabled={storyImages.length >= 10}
                  className="w-full"
                >
                  <Plus className="h-3 w-3 mr-2" />
                  Adicionar Imagem
                </Button>
              </div>

              <div className="flex space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowStoryCreator(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateStory}
                  disabled={!storyName.trim() || !storyCoverImage.trim() || isCreatingStory}
                  className="flex-1"
                >
                  {isCreatingStory ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Criar Destaque
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {editingHighlight && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Edit3 className="h-5 w-5 mr-2" />
                  Editar Destaque
                </span>
                <Button variant="ghost" size="sm" onClick={() => setEditingHighlight(null)} className="rounded-full">
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome do Destaque</label>
                <Input
                  placeholder="Ex: Ensaios, Lifestyle, Beauty..."
                  value={editingHighlight.name}
                  onChange={(e) => setEditingHighlight({ ...editingHighlight, name: e.target.value })}
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Imagem de Capa</label>
                <Input
                  placeholder="https://exemplo.com/capa.jpg"
                  value={editingHighlight.coverImage}
                  onChange={(e) => setEditingHighlight({ ...editingHighlight, coverImage: e.target.value })}
                />
                {editingHighlight.coverImage && (
                  <div className="w-16 h-16 rounded-full overflow-hidden mx-auto ring-2 ring-primary/30">
                    <img
                      src={editingHighlight.coverImage || "/placeholder.svg"}
                      alt="Preview da capa"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nível de Acesso</label>
                <Select
                  value={editingHighlight.requiredLevel}
                  onValueChange={(value: any) => setEditingHighlight({ ...editingHighlight, requiredLevel: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bronze">Bronze (Grátis)</SelectItem>
                    <SelectItem value="Prata">Prata</SelectItem>
                    <SelectItem value="Gold">Gold</SelectItem>
                    <SelectItem value="Platinum">Platinum</SelectItem>
                    <SelectItem value="Diamante">Diamante</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Imagens do Story ({editingHighlight.images.length}/10)</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {editingHighlight.images.map((image, index) => (
                    <div key={index} className="flex space-x-2">
                      <Input
                        placeholder={`Imagem ${index + 1} - https://exemplo.com/imagem.jpg`}
                        value={image}
                        onChange={(e) => {
                          const newImages = [...editingHighlight.images]
                          newImages[index] = e.target.value
                          setEditingHighlight({ ...editingHighlight, images: newImages })
                        }}
                        className="flex-1 text-xs"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newImages = editingHighlight.images.filter((_, i) => i !== index)
                          setEditingHighlight({ ...editingHighlight, images: newImages })
                        }}
                        className="px-2"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                {editingHighlight.images.length < 10 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newImages = [...editingHighlight.images, ""]
                      setEditingHighlight({ ...editingHighlight, images: newImages })
                    }}
                    className="w-full"
                  >
                    <Plus className="h-3 w-3 mr-2" />
                    Adicionar Imagem
                  </Button>
                )}
              </div>

              <div className="flex space-x-2 pt-4">
                <Button variant="outline" onClick={() => setEditingHighlight(null)} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={handleEditHighlight}
                  disabled={!editingHighlight.name.trim() || !editingHighlight.coverImage.trim()}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {editingService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Edit3 className="h-5 w-5 mr-2" />
                  Personalizar Serviço
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingService(null)
                    setServiceCustomDescription("")
                    setServiceCoverImage("")
                  }}
                  className="rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const product = SERVICE_PRODUCTS.find((p) => p.id === editingService.serviceProductId)
                return (
                  <>
                    <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="text-4xl">{product?.icon}</div>
                        <div className="flex-1">
                          <h4 className="font-bold text-base">{product?.name}</h4>
                          <p className="text-sm font-bold text-primary">
                            R$ {((product?.priceInCents || 0) / 100).toFixed(2).replace(".", ",")}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        💡 O nome e preço são fixos. Personalize a descrição e imagem para destacar seu serviço.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-medium flex items-center">
                            <Sparkles className="h-3 w-3 mr-1 text-amber-500" />
                            Mais Vendido
                          </label>
                          <input
                            type="checkbox"
                            checked={editingService.isBestSeller || false}
                            onChange={(e) => setEditingService({ ...editingService, isBestSeller: e.target.checked })}
                            className="rounded"
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground">Destaque como produto mais popular</p>
                      </div>

                      <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-medium flex items-center">
                            <Crown className="h-3 w-3 mr-1 text-purple-500" />
                            Exclusivo
                          </label>
                          <input
                            type="checkbox"
                            checked={editingService.isExclusive || false}
                            onChange={(e) => setEditingService({ ...editingService, isExclusive: e.target.checked })}
                            className="rounded"
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground">Marcar como serviço VIP</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center">
                        <Camera className="h-4 w-4 mr-2 text-primary" />
                        Imagem de Capa (Opcional)
                      </label>
                      <Input
                        placeholder="https://exemplo.com/capa.jpg"
                        value={serviceCoverImage}
                        onChange={(e) => setServiceCoverImage(e.target.value)}
                      />
                      {serviceCoverImage && (
                        <div className="w-full h-40 rounded-lg overflow-hidden ring-2 ring-primary/20">
                          <img
                            src={serviceCoverImage || "/placeholder.svg"}
                            alt="Preview da capa"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder.svg"
                            }}
                          />
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        ✨ Uma imagem atrativa aumenta as conversões em até 40%
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center">
                        <Edit3 className="h-4 w-4 mr-2 text-primary" />
                        Descrição Personalizada (Opcional)
                      </label>
                      <Textarea
                        placeholder={`Descreva os detalhes exclusivos do seu ${product?.name}...\n\nExemplo: "Videochamada de 30 minutos com interação personalizada. Você escolhe o tema e eu preparo algo especial para você! 💕"`}
                        value={serviceCustomDescription}
                        onChange={(e) => setServiceCustomDescription(e.target.value)}
                        className="min-h-[120px] resize-none"
                        maxLength={300}
                      />
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-muted-foreground">
                          💬 Seja específica e mostre o valor único do seu serviço
                        </p>
                        <span className="text-xs text-muted-foreground font-medium">
                          {serviceCustomDescription.length}/300
                        </span>
                      </div>
                    </div>

                    <div className="flex space-x-2 pt-4 border-t border-border/50">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingService(null)
                          setServiceCustomDescription("")
                          setServiceCoverImage("")
                        }}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleSaveServiceCustomization}
                        disabled={isSavingService}
                        className="flex-1 bg-gradient-to-r from-primary to-primary/90"
                      >
                        {isSavingService ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Salvar Personalização
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {showStoryViewer && currentStory && (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
          <div className="relative w-full max-w-sm h-full max-h-[600px] bg-black rounded-lg overflow-hidden">
            <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/50 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden">
                    <img
                      src={currentStory.coverImage || "/placeholder.svg"}
                      alt={currentStory.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-white text-sm font-medium">{currentStory.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowStoryViewer(false)}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex space-x-1 mt-3">
                {currentStory.images.map((_, index) => (
                  <div
                    key={index}
                    className={`flex-1 h-0.5 rounded-full ${
                      index === currentImageIndex ? "bg-white" : index < currentImageIndex ? "bg-white" : "bg-white/30"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="relative w-full h-full">
              <img
                src={currentStory.images[currentImageIndex] || "/placeholder.svg"}
                alt={`${currentStory.name} - ${currentImageIndex + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.svg"
                }}
              />

              <div className="absolute inset-0 flex">
                <button
                  className="flex-1 flex items-center justify-start pl-4"
                  onClick={prevImage}
                  disabled={currentImageIndex === 0}
                >
                  {currentImageIndex > 0 && <ChevronLeft className="h-6 w-6 text-white/70" />}
                </button>
                <button
                  className="flex-1 flex items-center justify-end pr-4"
                  onClick={nextImage}
                  disabled={currentImageIndex === currentStory.images.length - 1}
                >
                  {currentImageIndex < currentStory.images.length - 1 && (
                    <ChevronRight className="h-6 w-6 text-white/70" />
                  )}
                </button>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
              <div className="text-center">
                <p className="text-white/70 text-xs">
                  {currentImageIndex + 1} de {currentStory.images.length}
                </p>
                <Badge
                  className={`mt-2 ${
                    currentStory.requiredLevel === "Bronze"
                      ? "bg-orange-500/20 text-orange-300"
                      : currentStory.requiredLevel === "Gold"
                        ? "bg-yellow-500/20 text-yellow-300"
                        : currentStory.requiredLevel === "Platinum"
                          ? "bg-purple-500/20 text-purple-300"
                          : currentStory.requiredLevel === "Prata"
                            ? "bg-gray-500/20 text-gray-300"
                            : "bg-cyan-500/20 text-cyan-300"
                  }`}
                >
                  {currentStory.requiredLevel}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNavigation userProfile={userProfile} />
    </div>
  )
}
