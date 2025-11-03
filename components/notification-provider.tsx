"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, memo } from "react"

interface NotificationContextType {
  hasUnreadNotifications: boolean
  markNotificationsAsRead: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const NotificationProvider = memo(function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const markNotificationsAsRead = () => {
    setHasUnreadNotifications(false)
    if (isClient) {
      localStorage.setItem("isabelle-notification-read", "true")
    }
  }

  return (
    <NotificationContext.Provider
      value={{
        hasUnreadNotifications,
        markNotificationsAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
})

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}
