"use client"

import { useEffect } from "react"
import { Sparkles } from "lucide-react"

interface XPNotificationProps {
  show: boolean
  xpGained: number
  action: string
  onClose: () => void
}

export function XPNotification({ show, xpGained, action, onClose }: XPNotificationProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose()
      }, 2500) // Reduced from 3000ms to 2500ms for faster dismissal

      return () => clearTimeout(timer)
    }
  }, [show, onClose])

  if (!show) return null

  const getActionText = (action: string) => {
    switch (action) {
      case "like":
        return "Curtida"
      case "comment":
        return "Comentário"
      case "retweet":
        return "Retweet"
      default:
        return "Ação"
    }
  }

  return (
    <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right-5 duration-300">
      <div className="bg-gradient-to-r from-pink-600/90 to-purple-600/90 backdrop-blur-xl border border-pink-500/30 rounded-lg shadow-xl shadow-pink-500/20 p-3 flex items-center gap-2 max-w-[280px]">
        <div className="p-1.5 bg-pink-500/20 rounded-full flex-shrink-0">
          <Sparkles className="w-4 h-4 text-pink-100 animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm text-pink-50">+{xpGained} XP</span>
            <span className="text-xs text-pink-200/80">• {getActionText(action)}</span>
          </div>
          <p className="text-xs text-pink-100/70 mt-0.5">Continue interagindo!</p>
        </div>
      </div>
    </div>
  )
}
