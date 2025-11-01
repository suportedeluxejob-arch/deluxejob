"use client"

import { useState, memo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Heart, Sparkles, ArrowLeft, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = stripeKey ? loadStripe(stripeKey) : null

interface TipModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  creatorId: string
  creatorUsername: string
  creatorAvatar?: string
  postId?: string
  currentUserId: string
  userSubscriptions?: any[]
}

const SUGGESTED_AMOUNTS = [5, 10, 20, 50, 100]
const PLATFORM_FEE_PERCENTAGE = 15 // 15% para plataforma, 85% para criadora

export const TipModal = memo(function TipModal({
  open,
  onOpenChange,
  creatorId,
  creatorUsername,
  creatorAvatar,
  postId,
  currentUserId,
  userSubscriptions = [],
}: TipModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [message, setMessage] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentComplete, setPaymentComplete] = useState(false)
  const { toast } = useToast()

  const hasSubscription = userSubscriptions?.some((sub) => sub.creatorId === creatorId && sub.status === "active")

  const finalAmount = selectedAmount || 0
  const platformFee = finalAmount * (PLATFORM_FEE_PERCENTAGE / 100)
  const creatorReceives = finalAmount - platformFee

  const canSendMessage = hasSubscription || finalAmount >= 20

  const handleSendTip = async () => {
    if (!selectedAmount) {
      toast({
        title: "Selecione um valor",
        description: "Escolha um dos valores sugeridos para enviar a gorjeta",
        variant: "destructive",
      })
      return
    }

    if (message && !canSendMessage) {
      toast({
        title: "Mensagem não disponível",
        description: "Mensagens estão disponíveis apenas para assinantes ou gorjetas acima de R$20",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    try {
      const response = await fetch("/api/create-tip-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: selectedAmount,
          creatorId,
          creatorUsername,
          postId,
          message: canSendMessage ? message : undefined,
          userId: currentUserId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erro ao criar checkout")
      }

      const { clientSecret: secret } = await response.json()

      if (!secret) {
        throw new Error("Client secret não retornado")
      }

      setClientSecret(secret)
      setIsProcessing(false)
    } catch (error: any) {
      console.error("Error sending tip:", error)
      toast({
        title: "Erro ao enviar gorjeta",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      })
      setIsProcessing(false)
    }
  }

  const handleBackToSelection = () => {
    setClientSecret(null)
    setSelectedAmount(null)
    setMessage("")
    setPaymentComplete(false)
  }

  const handlePaymentComplete = () => {
    setPaymentComplete(true)

    // Fechar modal após 3 segundos
    setTimeout(() => {
      onOpenChange(false)
      handleBackToSelection()
    }, 3000)
  }

  if (paymentComplete) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold">Gorjeta Enviada!</h3>
              <p className="text-muted-foreground">
                Sua gorjeta de R$ {finalAmount.toFixed(2)} foi enviada para @{creatorUsername}
              </p>
              <p className="text-sm text-muted-foreground">
                O pagamento está sendo processado e será creditado em breve.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (clientSecret && stripePromise) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <Button variant="ghost" onClick={handleBackToSelection} className="w-fit -ml-2 mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Finalizar Gorjeta
            </DialogTitle>
          </DialogHeader>
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{
              clientSecret,
              onComplete: handlePaymentComplete,
            }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Enviar Gorjeta
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Creator Info */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Avatar className="h-12 w-12">
              <AvatarImage src={creatorAvatar || "/placeholder.svg"} />
              <AvatarFallback>{creatorUsername?.[0]?.toUpperCase() || "?"}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">@{creatorUsername || "Criadora"}</p>
              <p className="text-sm text-muted-foreground">Recebe {100 - PLATFORM_FEE_PERCENTAGE}% da gorjeta</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Escolha um valor</Label>
            <div className="grid grid-cols-5 gap-2">
              {SUGGESTED_AMOUNTS.map((amount) => (
                <Button
                  key={amount}
                  variant={selectedAmount === amount ? "default" : "outline"}
                  className="h-12"
                  onClick={() => setSelectedAmount(amount)}
                >
                  R${amount}
                </Button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">
              Mensagem (opcional)
              {!canSendMessage && (
                <span className="text-xs text-muted-foreground ml-2">
                  Disponível para assinantes ou gorjetas ≥ R$20
                </span>
              )}
            </Label>
            <Textarea
              id="message"
              placeholder={
                canSendMessage
                  ? "Escreva uma mensagem para a criadora..."
                  : "Assine ou envie R$20+ para enviar mensagem"
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={!canSendMessage}
              maxLength={200}
              rows={3}
            />
            {message && <p className="text-xs text-muted-foreground text-right">{message.length}/200 caracteres</p>}
          </div>

          {/* Summary */}
          {finalAmount >= 5 && (
            <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Valor da gorjeta:</span>
                <span className="font-semibold">R$ {finalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Taxa da plataforma ({PLATFORM_FEE_PERCENTAGE}%):</span>
                <span>R$ {platformFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-green-600 font-semibold pt-1 border-t">
                <span>Criadora recebe:</span>
                <span>R$ {creatorReceives.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSendTip} disabled={isProcessing || !selectedAmount}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Heart className="mr-2 h-4 w-4" />
                  Enviar R$ {finalAmount.toFixed(2)}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
})
