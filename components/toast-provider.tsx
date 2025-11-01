"use client"
import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

type ToastType = "success" | "error" | "info" | "warning" | "xp"

interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, "id">) => void
  showSuccess: (title: string, description?: string) => void
  showError: (title: string, description?: string) => void
  showInfo: (title: string, description?: string) => void
  showWarning: (title: string, description?: string) => void
  showXP: (xpAmount: number, description?: string) => void
  confirm: (title: string, description?: string) => Promise<boolean>
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string
    description?: string
    resolve: (value: boolean) => void
  } | null>(null)

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substr(2, 9)
      const newToast = { ...toast, id }

      setToasts((prev) => [...prev, newToast])

      // Auto remove after duration
      const duration = toast.duration || 4000
      setTimeout(() => {
        removeToast(id)
      }, duration)
    },
    [removeToast],
  )

  const showSuccess = useCallback(
    (title: string, description?: string) => {
      showToast({ type: "success", title, description })
    },
    [showToast],
  )

  const showError = useCallback(
    (title: string, description?: string) => {
      showToast({ type: "error", title, description })
    },
    [showToast],
  )

  const showInfo = useCallback(
    (title: string, description?: string) => {
      showToast({ type: "info", title, description })
    },
    [showToast],
  )

  const showWarning = useCallback(
    (title: string, description?: string) => {
      showToast({ type: "warning", title, description })
    },
    [showToast],
  )

  const showXP = useCallback(
    (xpAmount: number, description?: string) => {
      showToast({
        type: "xp",
        title: `+${xpAmount} XP`,
        description: description || "Continue interagindo para subir de nível!",
        duration: 2500,
      })
    },
    [showToast],
  )

  const confirm = useCallback((title: string, description?: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmDialog({ title, description, resolve })
    })
  }, [])

  const handleConfirm = (result: boolean) => {
    if (confirmDialog) {
      confirmDialog.resolve(result)
      setConfirmDialog(null)
    }
  }

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case "info":
        return <Info className="h-5 w-5 text-blue-500" />
      case "xp":
        return <Sparkles className="h-4 w-4 text-pink-400 animate-pulse" />
    }
  }

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case "success":
        return "border-green-500/20 bg-green-500/10"
      case "error":
        return "border-red-500/20 bg-red-500/10"
      case "warning":
        return "border-yellow-500/20 bg-yellow-500/10"
      case "info":
        return "border-blue-500/20 bg-blue-500/10"
      case "xp":
        return "border-pink-500/40 bg-gradient-to-r from-pink-600/30 to-purple-600/30 backdrop-blur-xl shadow-xl shadow-pink-500/30"
    }
  }

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo, showWarning, showXP, confirm }}>
      {children}

      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[100] space-y-2 w-[calc(100vw-2rem)] sm:w-auto sm:max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              flex items-start space-x-3 rounded-lg border backdrop-blur-md
              animate-in slide-in-from-right-full duration-300
              ${getToastStyles(toast.type)}
              ${toast.type === "xp" ? "p-3" : "p-4"}
            `}
          >
            {getToastIcon(toast.type)}
            <div className="flex-1 min-w-0">
              <p
                className={`font-semibold ${toast.type === "xp" ? "text-sm text-pink-100" : "text-sm text-foreground"}`}
              >
                {toast.title}
              </p>
              {toast.description && (
                <p
                  className={`mt-1 ${toast.type === "xp" ? "text-xs text-pink-200/80" : "text-xs text-muted-foreground"}`}
                >
                  {toast.description}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 rounded-full hover:bg-white/10"
              onClick={() => removeToast(toast.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-sm rounded-xl border border-border p-6 space-y-4">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">{confirmDialog.title}</h3>
              {confirmDialog.description && (
                <p className="text-sm text-muted-foreground mt-2">{confirmDialog.description}</p>
              )}
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" className="flex-1 bg-transparent" onClick={() => handleConfirm(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" className="flex-1" onClick={() => handleConfirm(true)}>
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}
