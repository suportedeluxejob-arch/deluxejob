"use client"

import type React from "react"

import { useState, useRef, memo } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ImageIcon,
  VideoIcon,
  Loader2,
  X,
  Lock,
  Crown,
  Upload,
  Shield,
  Star,
  Gem,
  Award,
  Plus,
  Minus,
} from "lucide-react"
import { updateCreatorContentCount, createPost } from "@/lib/firebase/firestore"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/config"

interface CreatorPostComposerProps {
  userProfile: any
  onPostCreated?: () => void
}

export const CreatorPostComposer = memo(function CreatorPostComposer({
  userProfile,
  onPostCreated,
}: CreatorPostComposerProps) {
  const [user] = useAuthState(auth)
  const [content, setContent] = useState("")
  const [mediaUrl, setMediaUrl] = useState("")
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null)
  const [requiredLevel, setRequiredLevel] = useState<"Bronze" | "Prata" | "Gold" | "Platinum" | "Diamante">("Bronze")
  const [likes, setLikes] = useState(0)
  const [comments, setComments] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isImage = file.type.startsWith("image/")
    const isVideo = file.type.startsWith("video/")

    if (!isImage && !isVideo) {
      alert("Por favor, selecione uma imagem ou vídeo")
      return
    }

    const maxSize = 4 * 1024 * 1024 // 4MB
    if (file.size > maxSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
      alert(
        `Arquivo muito grande (${sizeMB}MB).\n\nLimite: 4MB\n\n${isVideo ? "Dica: Use um compressor de vídeo online para reduzir o tamanho mantendo a qualidade." : "Dica: Reduza a resolução ou qualidade da imagem."}`,
      )
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        let errorMessage = "Falha no upload"
        try {
          const error = await response.json()
          errorMessage = error.error || errorMessage
        } catch {
          errorMessage = response.statusText || errorMessage
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()

      setMediaUrl(data.url)
      setMediaType(isImage ? "image" : "video")
      setUploadProgress(100)
    } catch (error: any) {
      console.error("Upload error:", error)
      alert(error.message || "Falha ao fazer upload do arquivo")
      setMediaUrl("")
      setMediaType(null)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleRemoveMedia = async () => {
    if (mediaUrl && mediaUrl.includes("blob.vercel-storage.com")) {
      try {
        await fetch("/api/delete-blob", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: mediaUrl }),
        })
      } catch (error) {
        console.error("Error deleting blob:", error)
      }
    }
    setMediaUrl("")
    setMediaType(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const adjustCounter = (type: "likes" | "comments", increment: boolean, amount = 1) => {
    const adjustment = increment ? amount : -amount

    switch (type) {
      case "likes":
        setLikes((prev) => Math.max(0, prev + adjustment))
        break
      case "comments":
        setComments((prev) => Math.max(0, prev + adjustment))
        break
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

  const handleSubmit = async () => {
    if (!content.trim()) {
      return
    }

    if (!user || !userProfile) {
      return
    }

    setIsLoading(true)

    try {
      const images = mediaUrl.trim() && mediaType === "image" ? [mediaUrl.trim()] : []
      const videos = mediaUrl.trim() && mediaType === "video" ? [mediaUrl.trim()] : []

      await createPost({
        authorId: user.uid,
        authorUsername: userProfile.username,
        authorDisplayName: userProfile.displayName,
        authorProfileImage: userProfile.profileImage || "",
        authorUserType: "creator",
        content: content.trim(),
        images,
        videos,
        likes: Math.max(0, likes),
        comments: Math.max(0, comments),
        retweets: 0,
        requiredLevel,
      })

      await updateCreatorContentCount(user.uid, 1)

      setContent("")
      setMediaUrl("")
      setMediaType(null)
      setRequiredLevel("Bronze")
      setLikes(0)
      setComments(0)
      setIsExpanded(false)

      onPostCreated?.()
    } catch (error: any) {
      console.error("Error creating post:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "Diamante":
        return <Gem className="h-3 w-3" />
      case "Platinum":
        return <Star className="h-3 w-3" />
      case "Gold":
        return <Crown className="h-3 w-3" />
      case "Prata":
        return <Award className="h-3 w-3" />
      case "Bronze":
        return <Shield className="h-3 w-3" />
      default:
        return <Shield className="h-3 w-3" />
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Bronze":
        return "bg-orange-600/20 text-orange-400 border-orange-600/30"
      case "Prata":
        return "bg-gray-400/20 text-gray-300 border-gray-400/30"
      case "Gold":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30"
      case "Platinum":
        return "bg-pink-500/20 text-pink-400 border-pink-500/30"
      case "Diamante":
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  if (userProfile?.userType !== "creator") {
    return null
  }

  return (
    <div className="w-full mb-4">
      <Card className="glow-pink border-primary/20 bg-card/80 backdrop-blur-md">
        <CardContent className="p-4">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <Avatar className="h-12 w-12 ring-2 ring-primary/30 shadow-lg">
                <AvatarImage
                  src={userProfile.profileImage || "/placeholder.svg"}
                  alt={userProfile.displayName}
                  className="object-cover"
                />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {userProfile.displayName?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-foreground truncate">{userProfile.displayName}</span>
                  <Badge
                    variant="secondary"
                    className="text-xs bg-primary/20 text-primary border-primary/30 px-2 py-0.5"
                  >
                    <Crown className="h-3 w-3 mr-1" />
                    Criadora
                  </Badge>
                </div>

                <div className="flex items-center space-x-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <Select value={requiredLevel} onValueChange={(value: any) => setRequiredLevel(value)}>
                    <SelectTrigger className="w-28 h-8 bg-background/50 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bronze">
                        <div className="flex items-center space-x-1">
                          <Shield className="h-3 w-3 text-orange-500" />
                          <span>Bronze</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="Prata">
                        <div className="flex items-center space-x-1">
                          <Award className="h-3 w-3 text-gray-400" />
                          <span>Prata</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="Gold">
                        <div className="flex items-center space-x-1">
                          <Crown className="h-3 w-3 text-yellow-500" />
                          <span>Gold</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="Platinum">
                        <div className="flex items-center space-x-1">
                          <Star className="h-3 w-3 text-pink-500" />
                          <span>Platinum</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="Diamante">
                        <div className="flex items-center space-x-1">
                          <Gem className="h-3 w-3 text-cyan-500" />
                          <span>Diamante</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge className={`text-xs ${getLevelColor(requiredLevel)} flex-shrink-0`}>
                    {getLevelIcon(requiredLevel)}
                    <span className="ml-1">{requiredLevel}</span>
                  </Badge>
                </div>
              </div>

              <Textarea
                placeholder="Compartilhe algo especial com sua audiência..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onFocus={() => setIsExpanded(true)}
                className="min-h-[50px] border-border/50 focus:ring-primary focus:border-primary resize-none bg-background/50 backdrop-blur-sm leading-relaxed w-full mb-3"
                maxLength={500}
              />

              {isExpanded && (
                <div className="space-y-3 animate-in slide-in-from-top-4 duration-300">
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={mediaType === "image" ? "default" : "outline"}
                        onClick={() => {
                          if (mediaType === "image") {
                            handleRemoveMedia()
                          } else {
                            setMediaType("image")
                            setMediaUrl("")
                            fileInputRef.current?.click()
                          }
                        }}
                        disabled={isUploading}
                        className="flex-1"
                      >
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Foto
                      </Button>
                      <Button
                        size="sm"
                        variant={mediaType === "video" ? "default" : "outline"}
                        onClick={() => {
                          if (mediaType === "video") {
                            handleRemoveMedia()
                          } else {
                            setMediaType("video")
                            setMediaUrl("")
                            fileInputRef.current?.click()
                          }
                        }}
                        disabled={isUploading}
                        className="flex-1"
                      >
                        <VideoIcon className="h-4 w-4 mr-2" />
                        Vídeo
                      </Button>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={mediaType === "image" ? "image/*" : mediaType === "video" ? "video/*" : "*"}
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    {isUploading && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Fazendo upload...</span>
                          <span className="text-primary font-medium">{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-primary h-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {mediaUrl && !isUploading && (
                      <div className="space-y-2">
                        {mediaType === "image" && (
                          <div className="relative rounded-lg overflow-hidden border border-border/50">
                            <img
                              src={mediaUrl || "/placeholder.svg"}
                              alt="Preview"
                              className="w-full h-auto max-h-64 object-cover"
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder.svg?height=200&width=400"
                              }}
                            />
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={handleRemoveMedia}
                              className="absolute top-2 right-2"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        {mediaType === "video" && (
                          <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                            <div className="flex items-center space-x-2">
                              <VideoIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground truncate max-w-[250px]">
                                Vídeo carregado
                              </span>
                            </div>
                            <Button size="sm" variant="ghost" onClick={handleRemoveMedia} className="h-8 w-8 p-0">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 p-3 bg-muted/20 rounded-lg border border-border/50">
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2">Métricas Iniciais</h4>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Curtidas */}
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">❤️ Curtidas</label>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0 bg-transparent"
                            onClick={() => adjustCounter("likes", false, 10)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            value={likes}
                            onChange={(e) => setLikes(Math.max(0, Number.parseInt(e.target.value) || 0))}
                            className="h-7 text-center text-xs"
                            min="0"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0 bg-transparent"
                            onClick={() => adjustCounter("likes", true, 10)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Comentários */}
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">💬 Comentários</label>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0 bg-transparent"
                            onClick={() => adjustCounter("comments", false, 5)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            value={comments}
                            onChange={(e) => setComments(Math.max(0, Number.parseInt(e.target.value) || 0))}
                            className="h-7 text-center text-xs"
                            min="0"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0 bg-transparent"
                            onClick={() => adjustCounter("comments", true, 5)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-3">
                <div></div>

                <div className="flex items-center space-x-3">
                  <div className="text-xs text-muted-foreground">
                    <span
                      className={content.length > 450 ? "text-orange-500" : content.length > 480 ? "text-red-500" : ""}
                    >
                      {content.length}
                    </span>
                    /500
                  </div>
                  <Button
                    onClick={handleSubmit}
                    disabled={!content.trim() || isLoading}
                    size="sm"
                    className="rounded-full px-6 bg-primary hover:bg-primary/90 shadow-lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Postando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Publicar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})
