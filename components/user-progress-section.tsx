"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Trophy, Lock, Check, Crown, Sparkles, MessageCircle, Repeat2, MessageSquare, Heart } from "lucide-react"
import { UserLevelBadge } from "@/components/user-level-badge"
import { EngagementLevelBadge } from "@/components/engagement-level-badge"
import { useRouter } from "next/navigation"
import {
  ENGAGEMENT_XP_REQUIREMENTS,
  ENGAGEMENT_HIERARCHY,
  SUBSCRIPTION_TIERS,
  calculateEngagementLevelFromXp,
  getNextEngagementLevel,
  type EngagementLevel,
  type SubscriptionTier,
} from "@/lib/types"

interface UserProgressSectionProps {
  user: {
    xp: number
    totalXp?: number
    level?: SubscriptionTier
    subscriptionTier?: SubscriptionTier
    engagementLevel?: EngagementLevel
    username: string
    displayName?: string
  }
  showTips?: boolean
}

export function UserProgressSection({ user, showTips = true }: UserProgressSectionProps) {
  const router = useRouter()

  const rawTier = (user.level || user.subscriptionTier || "bronze") as string
  const currentTier = rawTier.toLowerCase() as SubscriptionTier

  const currentEngagementLevel = user.engagementLevel || calculateEngagementLevelFromXp(user.totalXp || user.xp)
  const nextEngagementLevel = getNextEngagementLevel(currentEngagementLevel)

  const currentLevelIndex = ENGAGEMENT_HIERARCHY.indexOf(currentEngagementLevel)
  const currentLevelXP = ENGAGEMENT_XP_REQUIREMENTS[currentEngagementLevel]
  const nextLevelXP = nextEngagementLevel ? ENGAGEMENT_XP_REQUIREMENTS[nextEngagementLevel] : currentLevelXP

  const totalXP = user.totalXp || user.xp
  const progressXP = totalXP - currentLevelXP
  const requiredXP = nextLevelXP - currentLevelXP
  const progressPercentage = nextEngagementLevel ? Math.min((progressXP / requiredXP) * 100, 100) : 100

  const tierFeatures = {
    bronze: {
      unlocked: ["Curtir publicações"],
      locked: ["Retweets", "Comentários", "Chat privado", "Conteúdo exclusivo"],
      nextTier: "prata",
      nextTierUnlocks: ["Retweets", "Stories exclusivos"],
    },
    prata: {
      unlocked: ["Curtir publicações", "Retweets", "Stories exclusivos"],
      locked: ["Comentários", "Chat privado"],
      nextTier: "gold",
      nextTierUnlocks: ["Comentários em publicações"],
    },
    gold: {
      unlocked: ["Curtir publicações", "Retweets", "Stories exclusivos", "Comentários"],
      locked: ["Chat privado"],
      nextTier: "platinum",
      nextTierUnlocks: ["Chat privado com a criadora"],
    },
    platinum: {
      unlocked: ["Curtir publicações", "Retweets", "Stories exclusivos", "Comentários", "Chat privado"],
      locked: [],
      nextTier: "diamante",
      nextTierUnlocks: ["Conteúdo VIP", "Prioridade no chat"],
    },
    diamante: {
      unlocked: ["Todas as funcionalidades", "Conteúdo VIP", "Prioridade no chat", "Badge exclusivo"],
      locked: [],
      nextTier: null,
      nextTierUnlocks: [],
    },
  }

  const currentFeatures = tierFeatures[currentTier]

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-pink-900/30 to-purple-900/30 border-pink-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-white">
            <Crown className="w-5 h-5 text-pink-400" />
            Seu Nível de Assinatura
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <UserLevelBadge level={currentTier} size="lg" />
            {currentTier === "bronze" && (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Gratuito</Badge>
            )}
            {currentTier !== "bronze" && (
              <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30">Premium</Badge>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-white">✅ Você tem acesso a:</p>
            <div className="space-y-1">
              {currentFeatures.unlocked.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-green-400">
                  <Check className="w-4 h-4" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {currentFeatures.locked.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-white">🔒 Bloqueado no seu nível:</p>
              <div className="space-y-1">
                {currentFeatures.locked.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="w-4 h-4" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              {currentFeatures.nextTier && (
                <div className="mt-4 p-3 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-lg border border-pink-500/30">
                  <p className="text-sm font-semibold text-white mb-2">
                    🎁 Assine {SUBSCRIPTION_TIERS[currentFeatures.nextTier as SubscriptionTier].name} para desbloquear:
                  </p>
                  <ul className="text-xs text-pink-200 space-y-1 mb-3">
                    {currentFeatures.nextTierUnlocks.map((unlock, index) => (
                      <li key={index}>• {unlock}</li>
                    ))}
                  </ul>
                  <Button
                    size="sm"
                    onClick={() => router.push("/creators")}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Fazer Upgrade
                  </Button>
                </div>
              )}
            </div>
          )}

          {currentTier === "diamante" && (
            <div className="p-3 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg border border-cyan-500/30 text-center">
              <p className="text-sm font-semibold text-cyan-300">
                👑 Você tem acesso completo a todas as funcionalidades!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-500/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Status de Engajamento
            </CardTitle>
            <Badge variant="outline" className="text-xs text-muted-foreground border-muted-foreground/30">
              Apenas visual
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Ganhe XP interagindo para aumentar seu status na comunidade
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Engagement Level */}
          <div className="flex items-center justify-between">
            <EngagementLevelBadge level={currentEngagementLevel} size="md" showIcon={true} />
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
              {totalXP.toLocaleString()} XP
            </Badge>
          </div>

          {/* Progress Bar */}
          {nextEngagementLevel && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground capitalize">{currentEngagementLevel.replace("_", " ")}</span>
                <span className="text-muted-foreground capitalize">{nextEngagementLevel.replace("_", " ")}</span>
              </div>

              <Progress value={progressPercentage} className="h-3" />

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progressXP.toLocaleString()} XP</span>
                <span>{(requiredXP - progressXP).toLocaleString()} XP restantes</span>
              </div>
            </div>
          )}

          {/* How to gain XP */}
          {showTips && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                <span className="font-semibold text-sm text-white">Como Ganhar XP</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-background/20 rounded-lg p-2">
                  <div className="flex items-center gap-1 text-pink-400 mb-1">
                    <Heart className="w-3 h-3" />
                    <span className="font-semibold">Curtir</span>
                  </div>
                  <div className="text-muted-foreground">+100 XP</div>
                </div>
                <div className="bg-background/20 rounded-lg p-2">
                  <div className="flex items-center gap-1 text-blue-400 mb-1">
                    <MessageSquare className="w-3 h-3" />
                    <span className="font-semibold">Comentar</span>
                  </div>
                  <div className="text-muted-foreground">+200 XP</div>
                </div>
                <div className="bg-background/20 rounded-lg p-2">
                  <div className="flex items-center gap-1 text-green-400 mb-1">
                    <Repeat2 className="w-3 h-3" />
                    <span className="font-semibold">Retweet</span>
                  </div>
                  <div className="text-muted-foreground">+150 XP</div>
                </div>
                <div className="bg-background/20 rounded-lg p-2">
                  <div className="flex items-center gap-1 text-purple-400 mb-1">
                    <MessageCircle className="w-3 h-3" />
                    <span className="font-semibold">Chat</span>
                  </div>
                  <div className="text-muted-foreground">+50 XP</div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground/70 bg-background/10 rounded-lg p-2">
                <div className="font-medium text-white mb-1">ℹ️ Sobre o Status de Engajamento:</div>
                <p>
                  O status de engajamento é apenas visual e não desbloqueia funcionalidades. Para acessar mais recursos,
                  faça upgrade da sua assinatura.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
