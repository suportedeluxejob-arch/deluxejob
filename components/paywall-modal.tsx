"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Crown, Lock, Sparkles, Check } from "lucide-react"
import { useRouter } from "next/navigation"

interface PaywallModalProps {
  isOpen: boolean
  onClose: () => void
  featureName: string
  requiredTier: string
  creatorId?: string
  creatorUsername?: string
  benefits?: string[]
}

export function PaywallModal({
  isOpen,
  onClose,
  featureName,
  requiredTier,
  creatorId,
  creatorUsername,
  benefits = [],
}: PaywallModalProps) {
  const router = useRouter()

  const handleUpgrade = () => {
    if (creatorId) {
      router.push(`/subscribe/${creatorId}`)
    } else {
      router.push("/creators")
    }
    onClose()
  }

  const getTierColor = (tier: string) => {
    const normalizedTier = tier.toLowerCase()
    switch (normalizedTier) {
      case "prata":
      case "silver":
        return "from-gray-400 to-gray-600"
      case "gold":
        return "from-amber-400 to-amber-600"
      case "platinum":
      case "premium":
        return "from-purple-500 to-purple-700"
      case "diamante":
      case "diamond":
        return "from-cyan-400 to-cyan-600"
      default:
        return "from-primary to-primary/80"
    }
  }

  const defaultBenefits = [
    "Acesso a conteúdo exclusivo",
    "Stories e destaques premium",
    "Chat direto com a criadora",
    "Suporte prioritário",
  ]

  const displayBenefits = benefits.length > 0 ? benefits : defaultBenefits

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div
            className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br ${getTierColor(requiredTier)} flex items-center justify-center`}
          >
            <Lock className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-center text-xl">Conteúdo Premium Bloqueado</DialogTitle>
          <DialogDescription className="text-center">
            <span className="font-semibold">{featureName}</span> requer assinatura{" "}
            <span className="font-bold text-primary">{requiredTier}</span>
            {creatorUsername && (
              <>
                {" "}
                de <span className="font-bold text-primary">@{creatorUsername}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold flex items-center">
              <Crown className="h-4 w-4 mr-2 text-primary" />O que você ganha:
            </p>
            <ul className="space-y-2">
              {displayBenefits.map((benefit, index) => (
                <li key={index} className="flex items-start space-x-2 text-sm">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          <Button
            onClick={handleUpgrade}
            className={`w-full bg-gradient-to-r ${getTierColor(requiredTier)} hover:opacity-90 text-white font-semibold py-6 rounded-xl shadow-lg transform hover:scale-[1.02] transition-all duration-200`}
          >
            <Sparkles className="h-5 w-5 mr-2" />
            {creatorUsername ? `Assinar @${creatorUsername}` : "Fazer Upgrade Agora"}
          </Button>

          <p className="text-xs text-center text-muted-foreground">Cancele quando quiser • Pagamento seguro</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
