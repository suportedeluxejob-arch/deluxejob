"use client"

import { useState, useEffect } from "react"
import { X, Heart, Zap, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

export function InstallAppModal() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem("deluxe-install-dismissed")

    if (!dismissed) {
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [])

  const handleDismiss = () => {
    setIsOpen(false)
    localStorage.setItem("deluxe-install-dismissed", "true")
  }

  const handleInstall = () => {
    const userAgent = navigator.userAgent.toLowerCase()
    const isIOS = /iphone|ipad|ipod/.test(userAgent)
    const isAndroid = /android/.test(userAgent)

    if (isIOS) {
      alert(
        "Para instalar no iOS:\n\n1. Toque no ícone de compartilhar (quadrado com seta)\n2. Role para baixo e toque em 'Adicionar à Tela de Início'\n3. Toque em 'Adicionar'",
      )
    } else if (isAndroid) {
      alert(
        "Para instalar no Android:\n\n1. Toque no menu (três pontos)\n2. Toque em 'Adicionar à tela inicial' ou 'Instalar app'\n3. Confirme a instalação",
      )
    } else {
      alert(
        "Para instalar no computador:\n\n1. Clique no ícone de instalação na barra de endereço\n2. Ou vá em Menu > Instalar DeLuxe Job\n3. Confirme a instalação",
      )
    }

    handleDismiss()
  }

  if (!isOpen) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center p-4">
      <div className="w-full max-w-md animate-in slide-in-from-bottom duration-300 rounded-2xl bg-zinc-900 p-5 shadow-2xl border border-zinc-800">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Instalar DeLuxe Job</h2>
            <p className="text-xs text-zinc-400">Adicionar à Tela Inicial</p>
          </div>
          <button
            onClick={handleDismiss}
            className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Benefits - More compact */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-3 rounded-xl bg-zinc-800 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-500">
              <Heart className="h-5 w-5 text-white" />
            </div>
            <p className="text-sm font-medium text-white">Conteúdo Exclusivo Premium</p>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-zinc-800 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-500">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <p className="text-sm font-medium text-white">Acesso Rápido e Fácil</p>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-zinc-800 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-500">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <p className="text-sm font-medium text-white">Experiência Mais Fluida</p>
          </div>
        </div>

        {/* Tip - More compact */}
        <div className="mb-4 flex items-start gap-2 text-xs text-pink-500">
          <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-pink-500">
            <span className="text-[10px] font-bold">i</span>
          </div>
          <p>Dica: Se já foi adicionado, abra da área de trabalho</p>
        </div>

        {/* Actions - More compact */}
        <div className="flex gap-2">
          <Button
            onClick={handleDismiss}
            variant="outline"
            size="sm"
            className="flex-1 border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700"
          >
            Talvez Depois
          </Button>
          <Button
            onClick={handleInstall}
            size="sm"
            className="flex-1 bg-gradient-to-r from-pink-500 to-pink-600 text-white hover:from-pink-600 hover:to-pink-700"
          >
            Instalar
          </Button>
        </div>
      </div>
    </div>
  )
}
