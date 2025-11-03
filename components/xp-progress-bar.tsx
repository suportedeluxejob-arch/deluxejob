"use client"

import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Star, TrendingUp } from "lucide-react"

interface XPProgressBarProps {
  currentXP: number
  currentLevel: string
}

export function XPProgressBar({ currentXP, currentLevel }: XPProgressBarProps) {
  const levelHierarchy = {
    bronze: { min: 0, max: 500 },
    prata: { min: 500, max: 1500 },
    gold: { min: 1500, max: 3000 },
    platinum: { min: 3000, max: 6000 },
    diamante: { min: 6000, max: 10000 },
  }

  const normalizedLevel = currentLevel.toLowerCase()
  const currentLevelData = levelHierarchy[normalizedLevel as keyof typeof levelHierarchy]

  if (!currentLevelData) {
    console.error(`[v0] Level not found: ${currentLevel} (normalized: ${normalizedLevel})`)
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400" />
            <span className="font-semibold text-sm">Progresso XP</span>
          </div>
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
            {currentXP.toLocaleString()} XP
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground">Nível não reconhecido: {currentLevel}</div>
      </div>
    )
  }

  const nextLevelKey = Object.keys(levelHierarchy)[Object.keys(levelHierarchy).indexOf(normalizedLevel) + 1]
  const nextLevelData = nextLevelKey ? levelHierarchy[nextLevelKey as keyof typeof levelHierarchy] : null

  const progressXP = currentXP - currentLevelData.min
  const requiredXP = currentLevelData.max - currentLevelData.min
  const progressPercentage = Math.min((progressXP / requiredXP) * 100, 100)

  const capitalizeLevel = (level: string) => {
    return level.charAt(0).toUpperCase() + level.slice(1)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-400" />
          <span className="font-semibold text-sm">Progresso XP</span>
        </div>
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
          {currentXP.toLocaleString()} XP
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{capitalizeLevel(normalizedLevel)}</span>
          {nextLevelKey && <span className="text-muted-foreground">{capitalizeLevel(nextLevelKey)}</span>}
        </div>

        <Progress value={progressPercentage} className="h-2" />

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{progressXP.toLocaleString()} XP</span>
          {nextLevelData && <span>{(currentLevelData.max - currentXP).toLocaleString()} XP restantes</span>}
        </div>
      </div>

      {nextLevelKey && (
        <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2 text-primary">
            <TrendingUp className="w-3 h-3" />
            <span className="text-xs font-medium">Próximo: {capitalizeLevel(nextLevelKey)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
