"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bell, X, Star, Trophy, Gift } from "lucide-react"
import type { Notification } from "@/lib/types"

interface NotificationsPanelProps {
  userId: string
}

export function NotificationsPanel({ userId }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    // Simular notificações (em produção viria do Firebase)
    const mockNotifications: Notification[] = [
      {
        id: "1",
        userId,
        title: "Missão Disponível!",
        message: "Curta 3 fotos para ganhar +100 XP e avançar para o nível Prata!",
        type: "mission",
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 min atrás
        actionUrl: "/missions",
      },
      {
        id: "2",
        userId,
        title: "XP Ganho!",
        message: "Você ganhou +50 XP por curtir uma publicação da Isabelle!",
        type: "xp_gained",
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2h atrás
      },
      {
        id: "3",
        userId,
        title: "Quase lá!",
        message: "Você está a 200 XP de chegar no nível Ouro. Complete uma missão para liberar comentários!",
        type: "level_up",
        isRead: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 dia atrás
      },
    ]

    setNotifications(mockNotifications)
  }, [userId])

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "mission":
        return <Trophy className="w-4 h-4 text-yellow-400" />
      case "level_up":
        return <Star className="w-4 h-4 text-blue-400" />
      case "xp_gained":
        return <Gift className="w-4 h-4 text-green-400" />
      default:
        return <Bell className="w-4 h-4" />
    }
  }

  const markAsRead = (notificationId: string) => {
    setNotifications((prev) => prev.map((notif) => (notif.id === notificationId ? { ...notif, isRead: true } : notif)))
  }

  const removeNotification = (notificationId: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId))
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notificações
          </div>
          {unreadCount > 0 && <Badge className="bg-red-500 text-white">{unreadCount}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg border transition-all ${
              notification.isRead ? "bg-gray-900/20 border-gray-700/30" : "bg-blue-900/20 border-blue-500/30"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 rounded-full bg-gray-800/50">{getNotificationIcon(notification.type)}</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-white text-sm">{notification.title}</h4>
                  <p className="text-sm text-gray-400 mt-1">{notification.message}</p>
                  <span className="text-xs text-gray-500 mt-2 block">{notification.createdAt.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!notification.isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAsRead(notification.id)}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    Marcar como lida
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeNotification(notification.id)}
                  className="text-gray-400 hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma notificação no momento</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
