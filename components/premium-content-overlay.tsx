"use client"

import { Button } from "@/components/ui/button"
import { Crown, Lock, Diamond } from "lucide-react"
import { useRouter } from "next/navigation"

interface PremiumContentOverlayProps {
  requiredLevel: "Gold" | "Platinum" | "Diamante"
  creatorId?: string
  creatorUsername?: string
  userSubscriptions?: any[]
}

const levelOrder = {
  Gold: 1,
  Platinum: 2,
  Diamante: 3,
}

const levelIcons = {
  Gold: "🥇",
  Platinum: <Crown className="w-4 h-4 text-pink-400" />,
  Diamante: <Diamond className="w-4 h-4 text-cyan-400" />,
}

export function PremiumContentOverlay({
  requiredLevel,
  creatorId,
  creatorUsername,
  userSubscriptions,
}: PremiumContentOverlayProps) {
  const router = useRouter()

  const handleUpgrade = () => {
    if (creatorId) {
      router.push(`/subscribe/${creatorId}`)
    } else {
      router.push(`/creators`)
    }
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg">
      <div className="p-4 max-w-xs mx-4 text-center bg-black/80 backdrop-blur border border-gray-800 rounded-lg glow-pink">
        <div className="flex justify-center mb-3">
          <div className="p-2 rounded-full bg-gray-900 border border-gray-700">
            <Lock className="w-4 h-4 text-gray-400" />
          </div>
        </div>

        <h3 className="text-sm font-semibold mb-2 text-white">Conteúdo {requiredLevel}</h3>
        <p className="text-xs text-gray-400 mb-3">
          {creatorUsername
            ? `Assine @${creatorUsername} no plano ${requiredLevel} para desbloquear este conteúdo`
            : `Assine o plano ${requiredLevel} para desbloquear este conteúdo`}
        </p>

        <Button
          size="sm"
          className="w-full bg-primary hover:bg-primary/80 glow-pink-hover text-xs"
          onClick={handleUpgrade}
        >
          {creatorUsername ? `Assinar @${creatorUsername}` : "Fazer Upgrade"}
        </Button>
      </div>
    </div>
  )
}
