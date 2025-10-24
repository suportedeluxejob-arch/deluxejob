"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, UserPlus, AlertCircle } from "lucide-react"
import { createCreatorWithoutReferral } from "@/lib/firebase/firestore"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function CreateFirstCreatorPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    displayName: "",
    password: "",
    bio: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

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

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)
    setErrors({})

    try {
      const result = await createCreatorWithoutReferral(
        formData.username,
        formData.password,
        formData.displayName,
        formData.bio,
      )

      if (result.error) {
        setErrors({ general: result.error })
      } else {
        setSuccess(true)
        setFormData({
          username: "",
          displayName: "",
          password: "",
          bio: "",
        })
      }
    } catch (error) {
      console.error("[v0] Error creating first creator:", error)
      setErrors({ general: "Erro ao criar criadora. Tente novamente." })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Criar Primeira Criadora</h1>
        <p className="text-muted-foreground mt-2">
          Use esta página para cadastrar a primeira criadora da plataforma sem código de indicação
        </p>
      </div>

      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Esta funcionalidade deve ser usada apenas para criar a primeira criadora do sistema. Após isso, todas as
          outras criadoras devem usar o cadastro normal com código de indicação.
        </AlertDescription>
      </Alert>

      {success && (
        <Alert className="mb-6 bg-green-500/10 border-green-500/20">
          <AlertDescription className="text-green-600">
            Criadora cadastrada com sucesso! Ela já pode fazer login e gerar seu código de indicação.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Dados da Criadora
          </CardTitle>
          <CardDescription>Preencha os dados para criar a primeira criadora da plataforma</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.general && (
              <Alert variant="destructive">
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Nome de usuário *</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="@username"
                  value={formData.username}
                  onChange={(e) => handleInputChange("username", e.target.value)}
                />
                {errors.username && <p className="text-destructive text-sm">{errors.username}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Nome de exibição *</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Nome completo"
                  value={formData.displayName}
                  onChange={(e) => handleInputChange("displayName", e.target.value)}
                />
                {errors.displayName && <p className="text-destructive text-sm">{errors.displayName}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Senha (mínimo 6 caracteres)"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
              />
              {errors.password && <p className="text-destructive text-sm">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio *</Label>
              <Textarea
                id="bio"
                placeholder="Conte sobre a criadora..."
                value={formData.bio}
                onChange={(e) => handleInputChange("bio", e.target.value)}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">{formData.bio.length}/500 caracteres</p>
              {errors.bio && <p className="text-destructive text-sm">{errors.bio}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando criadora...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Criar primeira criadora
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
