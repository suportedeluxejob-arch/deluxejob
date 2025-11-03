"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/config"
import { getUserProfile, updateUserProfile, createUserProfile, type UserProfile } from "@/lib/firebase/firestore"
import { AVATAR_OPTIONS, getRandomAvatar } from "@/lib/avatars"

export default function EditProfile() {
  const router = useRouter()
  const [user] = useAuthState(auth)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  const [formData, setFormData] = useState({
    username: "",
    displayName: "",
    bio: "",
    profileImage: "",
  })

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        router.replace("/login")
        return
      }

      try {
        let userProfile = await getUserProfile(user.uid)

        if (!userProfile) {
          const randomAvatar = getRandomAvatar()
          const initialProfile: Omit<UserProfile, "createdAt" | "updatedAt"> = {
            uid: user.uid,
            username: user.displayName || user.email?.split("@")[0] || "usuario",
            displayName: user.displayName || "Usuário",
            bio: "",
            profileImage: randomAvatar.url,
            userType: "user", // Assuming default userType is 'user'
          }

          await createUserProfile(initialProfile)
          userProfile = await getUserProfile(user.uid)
        }

        if (userProfile) {
          setProfile(userProfile)
          setFormData({
            username: userProfile.username,
            displayName: userProfile.displayName,
            bio: userProfile.bio,
            profileImage: userProfile.profileImage,
          })
        }
      } catch (error) {
        console.error("Error loading profile:", error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [user, router])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleAvatarSelect = (avatarUrl: string) => {
    setFormData((prev) => ({
      ...prev,
      profileImage: avatarUrl,
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
      })

      router.push(`/user/${profile.username}`)
    } catch (error) {
      console.error("[v0] Error updating profile:", error)
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

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between p-4 max-w-md mx-auto">
          <Link href={`/user/${formData.username}`}>
            <Button variant="ghost" size="sm" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Editar Perfil</h1>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-primary font-semibold"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
          </Button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-6 space-y-6">
        {/* Profile Image */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <Avatar className="h-24 w-24 ring-4 ring-primary/20">
              <AvatarImage src={formData.profileImage || "/placeholder.svg"} alt={formData.displayName} />
              <AvatarFallback className="text-2xl font-bold">
                {formData.displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="w-full space-y-3">
            <p className="text-sm font-medium text-muted-foreground text-center">Escolha seu avatar:</p>
            <div className="grid grid-cols-4 gap-3">
              {AVATAR_OPTIONS.map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => handleAvatarSelect(avatar.url)}
                  className={`relative rounded-full p-1 transition-all ${
                    formData.profileImage === avatar.url ? "ring-2 ring-primary bg-primary/10" : "hover:bg-muted"
                  }`}
                  title={avatar.name}
                >
                  <div
                    className={`h-12 w-12 rounded-full ${avatar.color} flex items-center justify-center overflow-hidden`}
                  >
                    <Avatar className="h-full w-full">
                      <AvatarImage src={avatar.url || "/placeholder.svg"} alt={avatar.name} />
                      <AvatarFallback className={`${avatar.color} text-white text-lg`}>
                        {avatar.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
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
              placeholder="Seu nome"
              className="bg-transparent"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Biografia</label>
            <Textarea
              value={formData.bio}
              onChange={(e) => handleInputChange("bio", e.target.value)}
              placeholder="Conte um pouco sobre você..."
              className="bg-transparent resize-none"
              rows={4}
            />
            <p className="text-xs text-muted-foreground text-right">{formData.bio.length}/150</p>
          </div>
        </div>

        {/* Save Button */}
        <Button className="w-full rounded-full glow-pink-hover" onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar Alterações"
          )}
        </Button>
      </main>
    </div>
  )
}
