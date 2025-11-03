"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Share2, Copy, Check, MessageCircle } from "lucide-react"
import { useToast } from "@/components/toast-provider"

interface ShareProfileModalProps {
  isOpen: boolean
  onClose: () => void
  creatorUsername: string
  creatorDisplayName: string
  creatorImage?: string
}

export function ShareProfileModal({
  isOpen,
  onClose,
  creatorUsername,
  creatorDisplayName,
  creatorImage,
}: ShareProfileModalProps) {
  const [copied, setCopied] = useState(false)
  const { showSuccess } = useToast()

  const shareLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/creator/${creatorUsername}`
      : `https://deluxejob.com/creator/${creatorUsername}`

  const shareText = `Confira o perfil de ${creatorDisplayName} na DeLuxe Job! 🌟`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      showSuccess("Link copiado!", "O link foi copiado para a área de transferência")
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy link:", error)
    }
  }

  const handleShareWhatsApp = () => {
    const message = encodeURIComponent(`${shareText}\n\n${shareLink}`)
    const whatsappUrl = `https://wa.me/?text=${message}`
    window.open(whatsappUrl, "_blank")
  }

  const handleShareFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}`
    window.open(facebookUrl, "_blank")
  }

  const handleShareInstagram = () => {
    // Instagram doesn't have a direct share intent, so copy link instead
    handleCopyLink()
    showSuccess("Link copiado!", "Cole o link no Direct ou Stories do Instagram")
  }

  const handleShareTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(shareText)}`
    window.open(twitterUrl, "_blank")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl border border-border/50">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Compartilhar Perfil</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          <div className="bg-card rounded-xl p-4 border border-border/50 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Pré-visualização</p>
            <div className="bg-background rounded-lg p-3 flex gap-3">
              {creatorImage && (
                <img
                  src={creatorImage || "/placeholder.svg"}
                  alt={creatorDisplayName}
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{creatorDisplayName}</p>
                <p className="text-xs text-muted-foreground truncate">@{creatorUsername}</p>
                <p className="text-xs text-muted-foreground mt-1">DeLuxe Job - Plataforma premium</p>
              </div>
            </div>
          </div>

          {/* Share Link */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Link para compartilhar</Label>
            <div className="flex gap-2">
              <Input value={shareLink} readOnly className="text-xs rounded-lg" />
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyLink}
                className="flex-shrink-0 rounded-lg bg-transparent"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Social Share Options */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Compartilhar em</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareWhatsApp}
                className="rounded-lg text-xs bg-transparent"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareFacebook}
                className="rounded-lg text-xs bg-transparent"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Facebook
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareInstagram}
                className="rounded-lg text-xs bg-transparent"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Instagram
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareTwitter}
                className="rounded-lg text-xs bg-transparent"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Twitter
              </Button>
            </div>
          </div>

          {/* Info Text */}
          <p className="text-xs text-muted-foreground text-center">
            Quando alguém abrir este link, verá o perfil de {creatorDisplayName} com uma pré-visualização bonita!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
