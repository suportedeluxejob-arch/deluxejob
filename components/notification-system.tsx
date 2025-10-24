"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Bell, X, Heart, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  getActiveUserNotifications,
  markNotificationAsRead,
  deleteNotification,
  type Notification,
} from "@/lib/firebase/firestore"
import { useAuth } from "@/lib/firebase/auth"

export function NotificationSystem() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return

    // Escutar notificações ativas
    const unsubscribe = getActiveUserNotifications(user.uid, (activeNotifications) => {
      setNotifications(activeNotifications)
      const unread = activeNotifications.filter((n) => !n.read).length
      setUnreadCount(unread)
    })

    return () => unsubscribe()
  }, [user])

  const handleOpenNotifications = async () => {
    setShowNotifications(!showNotifications)

    // Se está abrindo o painel e há notificações não lidas, marcar todas como lidas
    if (!showNotifications && unreadCount > 0) {
      const unreadNotifications = notifications.filter((n) => !n.read && n.id)

      // Marcar todas as notificações não lidas como lidas
      for (const notification of unreadNotifications) {
        if (notification.id) {
          try {
            await markNotificationAsRead(notification.id)
          } catch (error) {
            console.error("[v0] Error marking notification as read:", error)
          }
        }
      }
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId)
    } catch (error) {
      console.error("[v0] Error marking notification as read:", error)
    }
  }

  const handleDeleteNotification = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await deleteNotification(notificationId)
    } catch (error) {
      console.error("[v0] Error deleting notification:", error)
    }
  }

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return "Agora"

    const now = new Date()
    const notificationTime = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - notificationTime.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "Agora"
    if (diffInMinutes < 60) return `${diffInMinutes}m`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`
    return `${Math.floor(diffInMinutes / 1440)}d`
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "message":
        return <Heart className="h-4 w-4 text-primary" />
      case "welcome":
        return <Sparkles className="h-4 w-4 text-primary" />
      default:
        return <Bell className="h-4 w-4 text-primary" />
    }
  }

  if (!user) return null

  return (
    <div className="relative">
      {/* Botão de notificações */}
      <Button
        variant="ghost"
        size="sm"
        className={`relative p-2 transition-all duration-200 ${
          unreadCount > 0 ? "text-pink-600 hover:text-pink-700" : "hover:text-gray-700"
        }`}
        onClick={handleOpenNotifications}
      >
        <Bell className={`h-5 w-5 ${unreadCount > 0 ? "animate-pulse" : ""}`} />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-pink-500 hover:bg-pink-600 animate-pulse"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Painel de notificações */}
      {showNotifications && (
        <Card className="absolute right-0 top-12 w-80 sm:w-96 max-h-[400px] overflow-hidden z-50 shadow-xl border border-border/50 bg-background/95 backdrop-blur-sm">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-3 border-b border-border/50 bg-muted/30">
              <div className="flex items-center space-x-2">
                <Bell className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Notificações</h3>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary text-xs px-2 py-0.5">
                    {unreadCount} nova{unreadCount > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(false)}
                className="h-6 w-6 p-0 hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">Nenhuma notificação no momento</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 hover:bg-muted/50 cursor-pointer transition-all duration-200 relative group ${
                        !notification.read ? "bg-primary/5 border-l-2 border-primary" : ""
                      }`}
                      onClick={() => {
                        if (!notification.read && notification.id) {
                          handleMarkAsRead(notification.id)
                        }
                      }}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => notification.id && handleDeleteNotification(notification.id, e)}
                      >
                        <X className="h-3 w-3" />
                      </Button>

                      <div className="flex items-start space-x-3">
                        {notification.fromProfileImage ? (
                          <div className="relative">
                            <Avatar className="h-8 w-8 ring-1 ring-border">
                              <AvatarImage
                                src={notification.fromProfileImage || "/placeholder.svg"}
                                alt={notification.fromDisplayName || "Perfil"}
                                className="object-cover"
                              />
                              <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                {notification.fromDisplayName?.[0] || "I"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border border-background"></div>
                          </div>
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            {getNotificationIcon(notification.type)}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <p className="text-sm font-medium text-foreground leading-tight">{notification.title}</p>
                            <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                              {formatTimeAgo(notification.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{notification.message}</p>
                          {!notification.read && (
                            <div className="flex items-center mt-1">
                              <div className="h-1.5 w-1.5 bg-primary rounded-full"></div>
                              <span className="text-xs text-primary font-medium ml-1">Nova</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
