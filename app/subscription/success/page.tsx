"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, Sparkles, ArrowRight, Home } from "lucide-react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/config"
import { getUserProfile } from "@/lib/firebase/firestore"

export default function SubscriptionSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user] = useAuthState(auth)
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [verificationError, setVerificationError] = useState<string | null>(null)
  const [verificationSuccess, setVerificationSuccess] = useState(false)

  const sessionId = searchParams.get("session_id")

  useEffect(() => {
    const loadUserProfile = async () => {
      if (user) {
        try {
          const profile = await getUserProfile(user.uid)
          if (profile) {
            setUsername(profile.username)
          }
        } catch (error) {
          console.error("Error loading user profile:", error)
        }
      }
      setLoading(false)
    }

    const timer = setTimeout(() => {
      loadUserProfile()
    }, 1500)

    return () => clearTimeout(timer)
  }, [user])

  useEffect(() => {
    const verifyCheckout = async () => {
      if (!sessionId || !user || verifying || verificationSuccess) return

      setVerifying(true)

      try {
        const response = await fetch("/api/verify-checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            userId: user.uid,
          }),
        })

        const data = await response.json()

        if (response.ok) {
          setVerificationSuccess(true)
        } else {
          console.error("Error verifying checkout:", data.error)
          setVerificationError(data.error)
        }
      } catch (error) {
        console.error("Error verifying checkout:", error)
        setVerificationError("Erro ao verificar assinatura")
      } finally {
        setVerifying(false)
      }
    }

    if (user && sessionId && !loading) {
      verifyCheckout()
    }
  }, [sessionId, user, loading, verifying, verificationSuccess])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Processando sua assinatura...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 space-y-6">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
              <div className="relative bg-primary/10 rounded-full p-6">
                <CheckCircle className="h-16 w-16 text-primary" />
              </div>
            </div>
          </div>

          {/* Success Message */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Assinatura Confirmada!</h1>
            <p className="text-muted-foreground">
              Parabéns! Sua assinatura foi ativada com sucesso. Agora você tem acesso a todo o conteúdo exclusivo.
            </p>
            {verifying && (
              <p className="text-xs text-primary animate-pulse font-medium">⏳ Atualizando seu nível de usuário...</p>
            )}
            {verificationSuccess && (
              <p className="text-xs text-green-500 font-medium">✅ Nível atualizado com sucesso!</p>
            )}
            {verificationError && <p className="text-xs text-destructive">⚠️ Nota: {verificationError}</p>}
          </div>

          {/* Benefits */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Acesso Imediato</p>
                <p className="text-xs text-muted-foreground">Todo o conteúdo exclusivo já está disponível</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Renovação Automática</p>
                <p className="text-xs text-muted-foreground">Sua assinatura renova automaticamente todo mês</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Cancele Quando Quiser</p>
                <p className="text-xs text-muted-foreground">Sem taxas de cancelamento ou multas</p>
              </div>
            </div>
          </div>

          {/* Session ID (for debugging in test mode) */}
          {sessionId && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                ID da Sessão: <span className="font-mono">{sessionId.substring(0, 20)}...</span>
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={() => {
                if (username) {
                  router.push(`/user/${username}`)
                } else {
                  router.push("/")
                }
              }}
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold py-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
            >
              Ver Meu Perfil
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            <Button onClick={() => router.push("/")} variant="outline" className="w-full py-6 rounded-xl font-semibold">
              <Home className="h-5 w-5 mr-2" />
              Voltar para Início
            </Button>
          </div>

          {/* Additional Info */}
          <div className="text-center pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Um e-mail de confirmação foi enviado para você com todos os detalhes da sua assinatura.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
