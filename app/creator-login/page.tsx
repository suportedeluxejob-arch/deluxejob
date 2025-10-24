"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, Loader2, Crown, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { signInCreator } from "@/lib/firebase/auth"
import Link from "next/link"

export default function CreatorLoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const router = useRouter()

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.username) {
      newErrors.username = "Nome de usuário é obrigatório"
    }

    if (!formData.password) {
      newErrors.password = "Senha é obrigatória"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)
    setErrors({})

    try {
      const { user, error } = await signInCreator(formData.username, formData.password)

      if (error) {
        setErrors({ general: error })
        return
      }

      if (user) {
        router.push("/creator-dashboard")
      }
    } catch (error) {
      console.error("Creator login error:", error)
      setErrors({ general: "Erro interno. Tente novamente." })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center fade-in">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Crown className="h-8 w-8 text-primary" />
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-primary mb-2">Login Criadora</h1>
          <p className="text-muted-foreground">Acesse sua conta de criadora e gerencie seu conteúdo</p>
        </div>

        <Card className="glow-pink border-border/50 fade-in">
          <CardHeader className="space-y-1">
            <CardTitle className="text-center text-2xl flex items-center justify-center gap-2">
              <Crown className="h-6 w-6 text-primary" />
              Área da Criadora
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {errors.general && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <p className="text-destructive text-sm">{errors.general}</p>
                </div>
              )}

              <div className="space-y-2 fade-in">
                <Label htmlFor="username">Nome de usuário</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Seu nome de usuário"
                  value={formData.username}
                  onChange={(e) => handleInputChange("username", e.target.value)}
                  className="rounded-full border-border focus:ring-primary focus:border-primary glow-pink-hover"
                />
                {errors.username && <p className="text-destructive text-sm">{errors.username}</p>}
              </div>

              <div className="space-y-2 fade-in">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Sua senha"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className="rounded-full border-border focus:ring-primary focus:border-primary glow-pink-hover pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.password && <p className="text-destructive text-sm">{errors.password}</p>}
              </div>

              <Button type="submit" className="w-full rounded-full glow-pink-hover" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    <Crown className="mr-2 h-4 w-4" />
                    Entrar como Criadora
                  </>
                )}
              </Button>

              <div className="text-center fade-in">
                <Button variant="link" className="text-primary hover:text-primary/80">
                  Esqueci minha senha
                </Button>
              </div>

              <div className="text-center fade-in space-y-2">
                <p className="text-sm text-muted-foreground">Ainda não é criadora?</p>
                <Link href="/creator-access?redirect=signup">
                  <Button variant="outline" className="w-full rounded-full glow-pink-hover bg-transparent">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Cadastrar como Criadora
                  </Button>
                </Link>
              </div>

              <div className="text-center fade-in">
                <p className="text-sm text-muted-foreground">
                  Usuário comum?{" "}
                  <Link href="/" className="text-primary hover:text-primary/80 font-medium">
                    Login normal
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
