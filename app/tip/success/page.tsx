"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Loader2, Sparkles } from "lucide-react"

export default function TipSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isVerifying, setIsVerifying] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sessionId = searchParams.get("session_id")

    if (!sessionId) {
      setError("Sessão não encontrada")
      setIsVerifying(false)
      return
    }

    // Webhook will handle the tip processing
    // Just show success message
    setTimeout(() => {
      setIsVerifying(false)
    }, 2000)
  }, [searchParams])

  if (isVerifying) {
    return (
      <div className="container max-w-2xl mx-auto py-12 px-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Verificando pagamento...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container max-w-2xl mx-auto py-12 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => router.push("/feed")}>Voltar ao Feed</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-2xl mx-auto py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-6 w-6" />
            Gorjeta Enviada com Sucesso!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-yellow-500">
            <Sparkles className="h-5 w-5" />
            <p className="text-lg">Obrigado por apoiar esta criadora!</p>
          </div>

          <p className="text-muted-foreground">
            Sua gorjeta foi processada com sucesso. A criadora receberá uma notificação e poderá agradecer pelo seu
            apoio.
          </p>

          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Importante:</strong> 85% do valor vai diretamente para a criadora, e 15% é usado para manter a
              plataforma funcionando.
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => router.push("/feed")} className="flex-1">
              Voltar ao Feed
            </Button>
            <Button variant="outline" onClick={() => router.push("/my-subscriptions")} className="flex-1">
              Ver Minhas Gorjetas
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
