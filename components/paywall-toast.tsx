"use client"

import { Button } from "@/components/ui/button"
import { Crown, Lock, Sparkles, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

interface PaywallToastProps {
  isOpen: boolean
  onClose: () => void
  featureName: string
  requiredTier: string
  creatorId?: string
  creatorUsername?: string
  description?: string
}

export function PaywallToast({
  isOpen,
  onClose,
  featureName,
  requiredTier,
  creatorId,
  creatorUsername,
  description,
}: PaywallToastProps) {
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Delay to trigger animation
      setTimeout(() => setIsVisible(true), 10)
    } else {
      setIsVisible(false)
    }
  }, [isOpen])

  if (!isOpen) return null

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

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Toast */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out ${
          isVisible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="max-w-md mx-auto p-4 pb-safe">
          <div className="bg-gradient-to-br from-background to-muted border-2 border-primary/30 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header with gradient */}
            <div className={`bg-gradient-to-r ${getTierColor(requiredTier)} p-4 relative`}>
              <button
                onClick={onClose}
                className="absolute top-2 right-2 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center space-x-3 text-white">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Lock className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">Conteúdo Bloqueado</h3>
                  <p className="text-sm text-white/90">{featureName}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Crown className={`h-5 w-5 text-${getTierColor(requiredTier)}`} />
                  <p className="text-sm font-semibold">
                    Requer nível <span className="text-primary">{requiredTier}</span>
                    {creatorUsername && (
                      <>
                        {" "}
                        de <span className="text-primary">@{creatorUsername}</span>
                      </>
                    )}
                  </p>
                </div>
                {description && <p className="text-sm text-muted-foreground pl-7">{description}</p>}
              </div>

              {/* CTA Button */}
              <Button
                onClick={handleUpgrade}
                className={`w-full bg-gradient-to-r ${getTierColor(requiredTier)} hover:opacity-90 text-white font-semibold py-6 rounded-xl shadow-lg transform active:scale-95 transition-all duration-200`}
              >
                <Sparkles className="h-5 w-5 mr-2" />
                {creatorUsername ? `Assinar @${creatorUsername}` : "Fazer Upgrade"}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Desbloqueie este e outros conteúdos exclusivos
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
