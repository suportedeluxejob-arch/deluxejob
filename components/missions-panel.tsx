"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Trophy, Star, Gift, Heart, MessageCircle, Repeat2, Eye } from "lucide-react"
import { type Mission, type UserMissionProgress, type User, DEFAULT_MISSIONS } from "@/lib/types"

interface MissionsPanelProps {
  user: User
  onMissionComplete?: (missionId: string, xpGained: number) => void
}

export function MissionsPanel({ user, onMissionComplete }: MissionsPanelProps) {
  const [missions, setMissions] = useState<Mission[]>([])
  const [progress, setProgress] = useState<{ [key: string]: UserMissionProgress }>({})

  useEffect(() => {
    // Filtrar missões disponíveis para o nível do usuário
    const availableMissions = DEFAULT_MISSIONS.filter((mission) => {
      const levelIndex = ["bronze", "prata", "gold", "platinum", "diamante"].indexOf(user.level)
      const missionLevelIndex = ["bronze", "prata", "gold", "platinum", "diamante"].indexOf(mission.requiredLevel)
      return missionLevelIndex <= levelIndex
    })

    setMissions(availableMissions)

    // Simular progresso das missões (em produção viria do Firebase)
    const mockProgress: { [key: string]: UserMissionProgress } = {}
    availableMissions.forEach((mission) => {
      mockProgress[mission.id] = {
        missionId: mission.id,
        userId: user.uid,
        progress: Math.floor(Math.random() * mission.targetCount),
        completed: user.completedMissions.includes(mission.id),
        completedAt: user.completedMissions.includes(mission.id) ? new Date() : undefined,
      }
    })
    setProgress(mockProgress)
  }, [user])

  const getMissionIcon = (action: string) => {
    switch (action) {
      case "like":
        return <Heart className="w-4 h-4" />
      case "comment":
        return <MessageCircle className="w-4 h-4" />
      case "retweet":
        return <Repeat2 className="w-4 h-4" />
      case "view_story":
        return <Eye className="w-4 h-4" />
      case "send_gift":
        return <Gift className="w-4 h-4" />
      default:
        return <Star className="w-4 h-4" />
    }
  }

  const completeMission = (mission: Mission) => {
    if (onMissionComplete) {
      onMissionComplete(mission.id, mission.xpReward)
    }

    setProgress((prev) => ({
      ...prev,
      [mission.id]: {
        ...prev[mission.id],
        completed: true,
        completedAt: new Date(),
      },
    }))
  }

  return (
    <Card className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Trophy className="w-5 h-5 text-yellow-400" />
          Missões Disponíveis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {missions.map((mission) => {
          const missionProgress = progress[mission.id]
          const progressPercentage = missionProgress ? (missionProgress.progress / mission.targetCount) * 100 : 0
          const isCompleted = missionProgress?.completed || false

          return (
            <div
              key={mission.id}
              className={`p-4 rounded-lg border transition-all ${
                isCompleted
                  ? "bg-green-900/20 border-green-500/30"
                  : "bg-gray-900/40 border-gray-700/50 hover:border-purple-500/50"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${isCompleted ? "bg-green-500/20" : "bg-purple-500/20"}`}>
                    {getMissionIcon(mission.targetAction)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{mission.title}</h3>
                    <p className="text-sm text-gray-400">{mission.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
                    +{mission.xpReward} XP
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {mission.type}
                  </Badge>
                </div>
              </div>

              {!isCompleted && (
                <>
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">
                        Progresso: {missionProgress?.progress || 0}/{mission.targetCount}
                      </span>
                      <span className="text-gray-400">{Math.round(progressPercentage)}%</span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                  </div>

                  {progressPercentage >= 100 && (
                    <Button
                      onClick={() => completeMission(mission)}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      Resgatar Recompensa
                    </Button>
                  )}
                </>
              )}

              {isCompleted && (
                <div className="flex items-center justify-center py-2">
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">✓ Missão Concluída</Badge>
                </div>
              )}
            </div>
          )
        })}

        {missions.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma missão disponível no momento</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
