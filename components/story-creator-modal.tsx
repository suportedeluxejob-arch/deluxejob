"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Camera, X, Plus, Save, Loader2, ImageIcon, Video, Clock, Bookmark } from "lucide-react"
import { createTemporaryStory, createCreatorHighlight } from "@/lib/firebase/firestore"

interface StoryCreatorModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  username: string
  onSuccess?: () => void
}

interface MediaItem {
  url: string
  type: "image" | "video"
  isUploading?: boolean
}

export function StoryCreatorModal({ isOpen, onClose, userId, username, onSuccess }: StoryCreatorModalProps) {
  const [storyType, setStoryType] = useState<"temporary" | "highlight">("temporary")
  const [storyMedia, setStoryMedia] = useState<MediaItem[]>([])
  const [storyRequiredLevel, setStoryRequiredLevel] = useState<"Bronze" | "Gold" | "Platinum" | "Diamante" | "Prata">(
    "Bronze",
  )
  const [storyDuration, setStoryDuration] = useState<number>(24)
  const [highlightName, setHighlightName] = useState("")
  const [highlightCoverImage, setHighlightCoverImage] = useState("")
  const [isCreatingStory, setIsCreatingStory] = useState(false)

  const mediaInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  const uploadFile = async (file: File): Promise<{ url: string; isVideo: boolean } | null> => {
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload-story-media", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        alert(error.error || "Erro ao fazer upload")
        return null
      }

      const data = await response.json()
      return { url: data.url, isVideo: data.isVideo }
    } catch (error) {
      console.error("Upload error:", error)
      alert("Erro ao fazer upload do arquivo")
      return null
    }
  }

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if (storyMedia.length + files.length > 10) {
      alert("Você pode adicionar no máximo 10 mídias por story")
      return
    }

    const newMedia: MediaItem[] = files.map(() => ({
      url: "",
      type: "image" as const,
      isUploading: true,
    }))
    setStoryMedia([...storyMedia, ...newMedia])

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const result = await uploadFile(file)

      if (result) {
        setStoryMedia((prev) => {
          const updated = [...prev]
          const uploadingIndex = updated.findIndex((item) => item.isUploading)
          if (uploadingIndex !== -1) {
            updated[uploadingIndex] = {
              url: result.url,
              type: result.isVideo ? "video" : "image",
              isUploading: false,
            }
          }
          return updated
        })
      } else {
        setStoryMedia((prev) => prev.filter((item) => !item.isUploading || item.url !== ""))
      }
    }

    if (mediaInputRef.current) {
      mediaInputRef.current.value = ""
    }
  }

  const removeMedia = (index: number) => {
    setStoryMedia(storyMedia.filter((_, i) => i !== index))
  }

  const handleCreateStory = async () => {
    if (storyMedia.length === 0) {
      alert("Adicione pelo menos uma imagem ou vídeo")
      return
    }

    if (storyType === "highlight" && !highlightName.trim()) {
      alert("Digite um nome para o destaque")
      return
    }

    setIsCreatingStory(true)
    try {
      const validMedia = storyMedia.filter((item) => item.url.trim() !== "" && !item.isUploading)

      if (storyType === "temporary") {
        for (const media of validMedia) {
          await createTemporaryStory(
            userId,
            media.type === "image" ? media.url : "",
            storyDuration,
            "",
            media.type === "video" ? media.url : undefined,
          )
        }
      } else {
        const coverImage = highlightCoverImage || validMedia[0]?.url || ""
        await createCreatorHighlight({
          creatorId: userId,
          creatorUsername: username,
          name: highlightName,
          coverImage: coverImage,
          requiredLevel: storyRequiredLevel,
          images: validMedia.map((m) => m.url),
        })
      }

      // Reset form
      setStoryMedia([])
      setStoryRequiredLevel("Bronze")
      setStoryDuration(24)
      setHighlightName("")
      setHighlightCoverImage("")

      if (onSuccess) {
        onSuccess()
      }

      onClose()
    } catch (error) {
      console.error("Error creating story:", error)
      alert("Erro ao criar. Tente novamente.")
    } finally {
      setIsCreatingStory(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100000] p-3 sm:p-4 overflow-y-auto pointer-events-auto">
      <Card className="w-full max-w-md my-auto shadow-2xl relative z-[100001]">
        <CardHeader className="pb-2 sm:pb-3 sticky top-0 bg-background z-10 border-b">
          <CardTitle className="flex items-center justify-between text-base sm:text-lg">
            <span className="flex items-center">
              <Camera className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Criar Conteúdo
            </span>
            <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 max-h-[calc(85vh-80px)] overflow-y-auto">
          <Tabs value={storyType} onValueChange={(v) => setStoryType(v as "temporary" | "highlight")}>
            <TabsList className="grid w-full grid-cols-2 h-9 sm:h-10">
              <TabsTrigger value="temporary" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                Story 24h
              </TabsTrigger>
              <TabsTrigger value="highlight" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                <Bookmark className="h-3 w-3 sm:h-4 sm:w-4" />
                Destaque
              </TabsTrigger>
            </TabsList>

            <TabsContent value="temporary" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
              <div className="p-2.5 sm:p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium">Story Temporário</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                      Aparece com círculo colorido no feed e perfil. Expira automaticamente. NÃO aparece nos destaques
                      permanentes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium">Duração</label>
                <Select value={storyDuration.toString()} onValueChange={(value) => setStoryDuration(Number(value))}>
                  <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">24 horas (padrão)</SelectItem>
                    <SelectItem value="48">48 horas</SelectItem>
                    <SelectItem value="72">3 dias</SelectItem>
                    <SelectItem value="168">7 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="highlight" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
              <div className="p-2.5 sm:p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-start gap-2">
                  <Bookmark className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium">Destaque Permanente</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                      Fica salvo no seu perfil PERMANENTEMENTE. Não expira. Ideal para conteúdo importante que você quer
                      manter sempre visível.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium">Nome do Destaque *</label>
                <Input
                  placeholder="Ex: Viagem Paris, Treinos, Receitas..."
                  value={highlightName}
                  onChange={(e) => setHighlightName(e.target.value)}
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium">URL da Capa (opcional)</label>
                <Input
                  placeholder="Deixe vazio para usar a primeira imagem"
                  value={highlightCoverImage}
                  onChange={(e) => setHighlightCoverImage(e.target.value)}
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-xs sm:text-sm font-medium">Nível de Acesso</label>
            <Select value={storyRequiredLevel} onValueChange={(value: any) => setStoryRequiredLevel(value)}>
              <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
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

          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-xs sm:text-sm font-medium">
              Imagens e Vídeos ({storyMedia.filter((item) => !item.isUploading).length}/10)
            </label>

            <input
              ref={mediaInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleMediaUpload}
              className="hidden"
            />

            <Button
              variant="outline"
              onClick={() => mediaInputRef.current?.click()}
              disabled={storyMedia.length >= 10}
              className="w-full h-9 sm:h-10 text-xs sm:text-sm"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              Adicionar Fotos ou Vídeos
            </Button>

            {storyMedia.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 max-h-40 sm:max-h-48 overflow-y-auto p-2 border rounded-lg">
                {storyMedia.map((item, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    {item.isUploading ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-primary" />
                      </div>
                    ) : (
                      <>
                        {item.type === "video" ? (
                          <video src={item.url} className="w-full h-full object-cover" />
                        ) : (
                          <img
                            src={item.url || "/placeholder.svg"}
                            alt={`Media ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        )}
                        <div className="absolute top-0.5 left-0.5 sm:top-1 sm:left-1">
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">
                            {item.type === "video" ? (
                              <Video className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            ) : (
                              <ImageIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            )}
                          </Badge>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeMedia(index)}
                          className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 h-5 w-5 sm:h-6 sm:w-6 p-0 rounded-full"
                        >
                          <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Adicione fotos (JPG, PNG, GIF) ou vídeos (MP4, WebM). Máximo: 10MB para fotos, 50MB para vídeos.
            </p>
          </div>

          <div className="flex space-x-2 pt-2 sm:pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 bg-transparent h-9 sm:h-10 text-xs sm:text-sm"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateStory}
              disabled={storyMedia.length === 0 || isCreatingStory || (storyType === "highlight" && !highlightName)}
              className="flex-1 h-9 sm:h-10 text-xs sm:text-sm"
            >
              {isCreatingStory ? (
                <>
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  {storyType === "temporary" ? "Postar Story" : "Criar Destaque"}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
