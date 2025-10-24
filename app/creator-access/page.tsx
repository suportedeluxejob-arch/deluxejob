"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Crown, Lock, Sparkles } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

const CREATOR_ACCESS_CODE = "3313JOB"

export default function CreatorAccessPage() {
  const [accessCode, setAccessCode] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "signup"

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!accessCode) {
      setError("Por favor, digite o código de acesso")
      return
    }

    if (accessCode.toUpperCase() !== CREATOR_ACCESS_CODE) {
      setError("Código de acesso inválido. Tente novamente.")
      return
    }

    // Código correto - redirecionar para a página apropriada
    if (redirectTo === "login") {
      router.push("/creator-login")
    } else {
      router.push("/creator-signup")
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center fade-in">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Lock className="h-10 w-10 text-primary" />
            <Crown className="h-8 w-8 text-primary" />
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-primary mb-2">Área Exclusiva</h1>
          <p className="text-muted-foreground">Esta área é restrita apenas para criadoras autorizadas</p>
        </div>

        <Card className="glow-pink border-border/50 fade-in">
          <CardHeader className="space-y-1">
            <CardTitle className="text-center text-2xl flex items-center justify-center gap-2">
              <Lock className="h-6 w-6 text-primary" />
              Código de Acesso Necessário
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <p className="text-destructive text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-2 fade-in">
                <Label htmlFor="accessCode" className="flex items-center gap-2 text-base">
                  <Lock className="h-4 w-4 text-primary" />
                  Digite o Código de Acesso
                </Label>
                <Input
                  id="accessCode"
                  type="text"
                  placeholder="CÓDIGO DE ACESSO"
                  value={accessCode}
                  onChange={(e) => {
                    setAccessCode(e.target.value.toUpperCase())
                    setError("")
                  }}
                  className="rounded-full border-border focus:ring-primary focus:border-primary glow-pink-hover uppercase text-center text-lg font-semibold tracking-wider"
                  maxLength={20}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground text-center">
                  Apenas criadoras autorizadas possuem este código
                </p>
              </div>

              <Button type="submit" className="w-full rounded-full glow-pink-hover" size="lg">
                <Crown className="mr-2 h-5 w-5" />
                Verificar Código
              </Button>

              <div className="text-center fade-in pt-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground mb-3">Não tem o código de acesso?</p>
                <p className="text-xs text-muted-foreground">
                  Entre em contato com a administração para solicitar acesso como criadora
                </p>
              </div>

              <div className="text-center fade-in">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-primary hover:text-primary/80"
                  onClick={() => router.push("/")}
                >
                  Voltar para login normal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
