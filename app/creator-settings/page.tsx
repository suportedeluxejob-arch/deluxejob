"use client"
import { useState, useEffect, useRef } from "react"
import type React from "react"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Loader2, Upload, Crown, Camera, Plus, X, LinkIcon, ImageIcon } from "lucide-react"
import Link from "next/link"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/config"
import { getUserProfile, updateUserProfile, type CreatorProfile, isUserCreator } from "@/lib/firebase/firestore"
import { detectSocialPlatform, isValidUrl } from "@/lib/social-media-utils"

export default function CreatorSettings() {
  const router = useRouter()
  const [user] = useAuthState(auth)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<CreatorProfile | null>(null)

  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingProfile, setUploadingProfile] = useState(false)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const profileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    username: "",
    displayName: "",
    bio: "",
    profileImage: "",
    coverImage: "",
    category: "",
    socialLinks: [] as string[],
  })

  const [newSocialLink, setNewSocialLink] = useState("")

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        router.replace("/creator-login")
        return
      }

      try {
        const isCreator = await isUserCreator(user.uid)
        if (!isCreator) {
          router.replace("/feed")
          return
        }

        const userProfile = await getUserProfile(user.uid)
        if (userProfile && userProfile.userType === "creator") {
          const creatorProfile = userProfile as CreatorProfile
          setProfile(creatorProfile)
          setFormData({
            username: creatorProfile.username,
            displayName: creatorProfile.displayName,
            bio: creatorProfile.bio,
            profileImage: creatorProfile.profileImage,
            coverImage: creatorProfile.coverImage || "",
            category: creatorProfile.category || "",
            socialLinks: Array.isArray(creatorProfile.socialLinks)
              ? creatorProfile.socialLinks
              : Object.values(creatorProfile.socialLinks || {}).filter(Boolean),
          })
        }
      } catch (error) {
        console.error("Error loading creator profile:", error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [user, router])

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleImageUpload = async (file: File, type: "cover" | "profile") => {
    if (!file) return

    const setUploading = type === "cover" ? setUploadingCover : setUploadingProfile
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erro ao fazer upload")
      }

      const data = await response.json()

      // Update form data with the uploaded image URL
      handleInputChange(type === "cover" ? "coverImage" : "profileImage", data.url)
    } catch (error) {
      console.error("Upload error:", error)
      alert(error instanceof Error ? error.message : "Erro ao fazer upload da imagem")
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "cover" | "profile") => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageUpload(file, type)
    }
  }

  const handleAddSocialLink = () => {
    if (!newSocialLink.trim()) return

    if (!isValidUrl(newSocialLink)) {
      alert("Por favor, insira uma URL válida (ex: https://instagram.com/seuusuario)")
      return
    }

    setFormData((prev) => ({
      ...prev,
      socialLinks: [...prev.socialLinks, newSocialLink.trim()],
    }))
    setNewSocialLink("")
  }

  const handleRemoveSocialLink = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.filter((_, i) => i !== index),
    }))
  }

  const handleSave = async () => {
    if (!user || !profile) return

    setSaving(true)
    try {
      await updateUserProfile(user.uid, {
        displayName: formData.displayName,
        bio: formData.bio,
        profileImage: formData.profileImage,
        coverImage: formData.coverImage,
        category: formData.category,
        socialLinks: formData.socialLinks,
      })

      router.push(`/creator/${profile.username}`)
    } catch (error) {
      console.error("Error updating creator profile:", error)
      alert("Erro ao salvar perfil. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando perfil...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between p-4 max-w-md mx-auto">
          <Link href={`/creator/${formData.username}`}>
            <Button variant="ghost" size="sm" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center space-x-2">
            <Crown className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Editar Perfil</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-primary font-semibold"
            onClick={handleSave}
            disabled={saving || uploadingCover || uploadingProfile}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
          </Button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-6 space-y-6 pb-20">
        {/* Profile Images */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center space-x-2">
              <Camera className="h-5 w-5 text-primary" />
              <span>Imagens do Perfil</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Cover Image */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground">Imagem de Capa</label>
              <div
                className="relative rounded-xl overflow-hidden bg-muted h-32 group cursor-pointer"
                onClick={() => coverInputRef.current?.click()}
              >
                {formData.coverImage ? (
                  <>
                    <img
                      src={formData.coverImage || "/placeholder.svg"}
                      alt="Capa"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="text-center text-white">
                        <Upload className="h-6 w-6 mx-auto mb-1" />
                        <p className="text-xs">Alterar imagem</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground group-hover:bg-muted/80 transition-colors">
                    <div className="text-center">
                      <Upload className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">Adicionar capa</p>
                      <p className="text-xs text-muted-foreground mt-1">Clique para selecionar</p>
                    </div>
                  </div>
                )}
                {uploadingCover && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <div className="text-center text-white">
                      <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                      <p className="text-sm">Enviando...</p>
                    </div>
                  </div>
                )}
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e, "cover")}
              />
              {formData.coverImage && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-transparent"
                  onClick={() => handleInputChange("coverImage", "")}
                >
                  <X className="h-4 w-4 mr-2" />
                  Remover imagem de capa
                </Button>
              )}
            </div>

            {/* Profile Image */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground">Foto de Perfil</label>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div
                    className="w-24 h-24 rounded-full overflow-hidden bg-muted border-2 border-primary/20 group cursor-pointer"
                    onClick={() => profileInputRef.current?.click()}
                  >
                    {formData.profileImage ? (
                      <>
                        <img
                          src={formData.profileImage || "/placeholder.svg"}
                          alt="Perfil"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Camera className="h-6 w-6 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground group-hover:bg-muted/80 transition-colors">
                        <ImageIcon className="h-8 w-8" />
                      </div>
                    )}
                    {uploadingProfile && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full bg-transparent"
                    onClick={() => profileInputRef.current?.click()}
                    disabled={uploadingProfile}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {formData.profileImage ? "Alterar foto" : "Adicionar foto"}
                  </Button>
                  {formData.profileImage && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full bg-transparent"
                      onClick={() => handleInputChange("profileImage", "")}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remover foto
                    </Button>
                  )}
                </div>
              </div>
              <input
                ref={profileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e, "profile")}
              />
              <p className="text-xs text-muted-foreground">Recomendado: imagem quadrada de pelo menos 400x400px</p>
            </div>
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Nome de usuário</label>
              <Input
                value={formData.username}
                readOnly
                disabled
                placeholder="@usuario"
                className="bg-muted/50 cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">O nome de usuário não pode ser alterado</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Nome de exibição</label>
              <Input
                value={formData.displayName}
                onChange={(e) => handleInputChange("displayName", e.target.value)}
                placeholder="Seu nome artístico"
                className="bg-transparent"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Biografia</label>
              <Textarea
                value={formData.bio}
                onChange={(e) => handleInputChange("bio", e.target.value)}
                placeholder="Conte sobre você, seus interesses e o que sua audiência pode esperar..."
                className="bg-transparent resize-none"
                rows={4}
              />
              <p className="text-xs text-muted-foreground text-right">{formData.bio.length}/300</p>
            </div>
          </CardContent>
        </Card>

        {/* Social Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <LinkIcon className="h-5 w-5 mr-2 text-primary" />
              Redes Sociais
            </CardTitle>
            <p className="text-sm text-muted-foreground">Adicione links para suas redes sociais</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.socialLinks.length > 0 && (
              <div className="space-y-2">
                {formData.socialLinks.map((link, index) => {
                  const platform = detectSocialPlatform(link)
                  const Icon = platform.icon
                  return (
                    <div key={index} className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                      <Icon className="h-4 w-4 flex-shrink-0" style={{ color: platform.color }} />
                      <span className="text-sm flex-1 truncate">{link}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleRemoveSocialLink(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Adicionar nova rede social</label>
              <div className="flex space-x-2">
                <Input
                  value={newSocialLink}
                  onChange={(e) => setNewSocialLink(e.target.value)}
                  placeholder="https://instagram.com/seuusuario"
                  className="bg-transparent flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddSocialLink()
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full px-4 bg-transparent"
                  onClick={handleAddSocialLink}
                  disabled={!newSocialLink.trim()}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Cole o link completo da sua rede social (ex: https://instagram.com/seuusuario)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button
          className="w-full rounded-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold py-4 shadow-lg transform hover:scale-[1.02] transition-all duration-200"
          onClick={handleSave}
          disabled={saving || uploadingCover || uploadingProfile}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Crown className="mr-2 h-4 w-4" />
              Salvar Perfil de Criadora
            </>
          )}
        </Button>
      </main>
    </div>
  )
}
