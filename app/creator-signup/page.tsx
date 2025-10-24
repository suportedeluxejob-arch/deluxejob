"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Eye, EyeOff, Loader2, Users, CheckCircle2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { createCreator } from "@/lib/firebase/auth"
import { validateReferralCode } from "@/lib/firebase/firestore"
import Link from "next/link"

export default function CreatorSignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isValidatingCode, setIsValidatingCode] = useState(false)
  const [codeValidated, setCodeValidated] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    displayName: "",
    password: "",
    bio: "",
    referralCode: "", // Added referral code field
    acceptTerms: false,
    isOver18: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const router = useRouter()

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
    if (field === "referralCode") {
      setCodeValidated(false)
    }
  }

  const handleValidateCode = async () => {
    if (!formData.referralCode) {
      setErrors((prev) => ({ ...prev, referralCode: "Digite o código de indicação" }))
      return
    }

    setIsValidatingCode(true)
    setErrors((prev) => ({ ...prev, referralCode: "" }))

    try {
      const codeData = await validateReferralCode(formData.referralCode.toUpperCase())

      if (codeData) {
        setCodeValidated(true)
        setErrors((prev) => ({ ...prev, referralCode: "" }))
      } else {
        setCodeValidated(false)
        setErrors((prev) => ({
          ...prev,
          referralCode: "Código de indicação inválido ou inativo",
        }))
      }
    } catch (error) {
      console.error("[v0] Error validating referral code:", error)
      setCodeValidated(false)
      setErrors((prev) => ({
        ...prev,
        referralCode: "Erro ao validar código. Tente novamente.",
      }))
    } finally {
      setIsValidatingCode(false)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.referralCode) {
      newErrors.referralCode = "Código de indicação é obrigatório"
    } else if (!codeValidated) {
      newErrors.referralCode = "Você precisa validar o código de indicação"
    }

    if (!formData.username) {
      newErrors.username = "Nome de usuário é obrigatório"
    } else if (formData.username.length < 3) {
      newErrors.username = "Nome de usuário deve ter pelo menos 3 caracteres"
    }

    if (!formData.displayName) {
      newErrors.displayName = "Nome de exibição é obrigatório"
    }

    if (!formData.password) {
      newErrors.password = "Senha é obrigatória"
    } else if (formData.password.length < 6) {
      newErrors.password = "Senha deve ter pelo menos 6 caracteres"
    }

    if (!formData.bio) {
      newErrors.bio = "Bio é obrigatória"
    } else if (formData.bio.length < 20) {
      newErrors.bio = "Bio deve ter pelo menos 20 caracteres"
    }

    if (!formData.isOver18) {
      newErrors.isOver18 = "Você deve ter mais de 18 anos"
    }

    if (!formData.acceptTerms) {
      newErrors.acceptTerms = "Você deve aceitar os termos de uso"
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
      const { user, error } = await createCreator(
        formData.username,
        formData.password,
        formData.displayName,
        formData.bio,
        formData.referralCode.toUpperCase(),
      )

      if (error) {
        if (error.includes("já está em uso")) {
          setErrors({ username: error })
        } else {
          setErrors({ general: error })
        }
        return
      }

      if (user) {
        router.push("/creator-dashboard")
      }
    } catch (error) {
      console.error("[v0] Creator signup error:", error)
      setErrors({ general: "Erro interno. Tente novamente." })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center fade-in">
          <h1 className="text-4xl font-bold text-primary mb-2">Torne-se uma Criadora</h1>
          <p className="text-muted-foreground">
            Junte-se à nossa plataforma exclusiva e compartilhe seu conteúdo com uma audiência engajada
          </p>
        </div>

        <Card className="glow-pink border-border/50 fade-in">
          <CardHeader>
            <CardTitle className="text-center text-2xl">Cadastro de Criadora</CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {errors.general && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <p className="text-destructive text-sm">{errors.general}</p>
                </div>
              )}

              <div className="space-y-2 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <Label htmlFor="referralCode" className="flex items-center gap-2 text-base font-semibold">
                  <Users className="h-5 w-5 text-primary" />
                  Código de Indicação *
                </Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Para se cadastrar como criadora, você precisa de um código de indicação válido de outra criadora da
                  plataforma.
                </p>
                <div className="flex gap-2">
                  <Input
                    id="referralCode"
                    type="text"
                    placeholder="Digite o código (ex: ISA-ABC123)"
                    value={formData.referralCode}
                    onChange={(e) => handleInputChange("referralCode", e.target.value.toUpperCase())}
                    className="rounded-full border-border focus:ring-primary focus:border-primary glow-pink-hover uppercase font-mono"
                    disabled={codeValidated}
                  />
                  <Button
                    type="button"
                    onClick={handleValidateCode}
                    disabled={isValidatingCode || codeValidated || !formData.referralCode}
                    className="rounded-full min-w-[120px]"
                    variant={codeValidated ? "default" : "outline"}
                  >
                    {isValidatingCode ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Validando...
                      </>
                    ) : codeValidated ? (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Validado
                      </>
                    ) : (
                      "Validar"
                    )}
                  </Button>
                </div>
                {errors.referralCode && <p className="text-destructive text-sm">{errors.referralCode}</p>}
                {codeValidated && (
                  <p className="text-primary text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Código válido! Você pode continuar o cadastro.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Nome de usuário *</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="@seuusername"
                    value={formData.username}
                    onChange={(e) => handleInputChange("username", e.target.value)}
                    className="rounded-full border-border focus:ring-primary focus:border-primary glow-pink-hover"
                  />
                  {errors.username && <p className="text-destructive text-sm">{errors.username}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">Nome de exibição *</Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Seu nome completo"
                    value={formData.displayName}
                    onChange={(e) => handleInputChange("displayName", e.target.value)}
                    className="rounded-full border-border focus:ring-primary focus:border-primary glow-pink-hover"
                  />
                  {errors.displayName && <p className="text-destructive text-sm">{errors.displayName}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
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

              <div className="space-y-2">
                <Label htmlFor="bio">Bio *</Label>
                <Textarea
                  id="bio"
                  placeholder="Conte um pouco sobre você e seu conteúdo..."
                  value={formData.bio}
                  onChange={(e) => handleInputChange("bio", e.target.value)}
                  className="min-h-[100px] border-border focus:ring-primary focus:border-primary glow-pink-hover"
                />
                <p className="text-xs text-muted-foreground">{formData.bio.length}/500 caracteres</p>
                {errors.bio && <p className="text-destructive text-sm">{errors.bio}</p>}
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="over18"
                    checked={formData.isOver18}
                    onCheckedChange={(checked) => handleInputChange("isOver18", checked as boolean)}
                  />
                  <Label htmlFor="over18" className="text-sm">
                    Tenho mais de 18 anos *
                  </Label>
                </div>
                {errors.isOver18 && <p className="text-destructive text-sm">{errors.isOver18}</p>}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="terms"
                    checked={formData.acceptTerms}
                    onCheckedChange={(checked) => handleInputChange("acceptTerms", checked as boolean)}
                  />
                  <Label htmlFor="terms" className="text-sm">
                    Aceito os termos de uso e política de privacidade *
                  </Label>
                </div>
                {errors.acceptTerms && <p className="text-destructive text-sm">{errors.acceptTerms}</p>}
              </div>

              <Button
                type="submit"
                className="w-full rounded-full glow-pink-hover"
                disabled={isLoading || !codeValidated}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  "Criar conta de criadora"
                )}
              </Button>

              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Já tem uma conta de criadora?{" "}
                  <Link
                    href="/creator-access?redirect=login"
                    className="text-primary hover:text-primary/80 font-medium"
                  >
                    Login de criadora
                  </Link>
                </p>
                <p className="text-sm text-muted-foreground">
                  Quer criar uma conta normal?{" "}
                  <Link href="/" className="text-primary hover:text-primary/80 font-medium">
                    Cadastro de usuário
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
