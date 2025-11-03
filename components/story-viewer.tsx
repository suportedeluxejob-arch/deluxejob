"use client"

import { useState, useEffect, useCallback } from "react"
import { X, ChevronLeft, ChevronRight, Pause, Play, Trash2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { deleteTemporaryStory, markStoryAsViewed } from "@/lib/firebase/firestore"
import { useToast } from "@/hooks/use-toast"

interface StoryItem {
  id?: string
  imageUrl?: string
  videoUrl?: string
  images?: string[]
  name?: string
  isTemporary?: boolean
  expiresAt?: any
  createdAt?: any
  creatorId?: string
  duration?: number // Added duration field
}

interface StoryViewerProps {
  isOpen: boolean
  onClose: () => void
  stories: StoryItem[]
  initialStoryIndex?: number
  creatorName: string
  creatorUsername: string
  creatorAvatar: string
  currentUserId?: string
  isOwner?: boolean
  onStoryDeleted?: () => void
}

export function StoryViewer({
  isOpen,
  onClose,
  stories,
  initialStoryIndex = 0,
  creatorName,
  creatorUsername,
  creatorAvatar,
  currentUserId,
  isOwner = false,
  onStoryDeleted,
}: StoryViewerProps) {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [shouldClose, setShouldClose] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState<string>("")
  const [expirationProgress, setExpirationProgress] = useState<number>(100)
  const { toast } = useToast()

  const currentStory = stories[currentStoryIndex]
  const currentStoryImages =
    currentStory?.images ||
    (currentStory?.imageUrl ? [currentStory.imageUrl] : []) ||
    (currentStory?.videoUrl ? [currentStory.videoUrl] : [])
  const totalImages = currentStoryImages.length

  useEffect(() => {
    if (!currentStory?.createdAt || !currentStory?.isTemporary) return

    const updateTimeRemaining = () => {
      const now = Date.now()
      const createdAt = currentStory.createdAt?.toMillis ? currentStory.createdAt.toMillis() : currentStory.createdAt
      const duration = (currentStory.duration || 24) * 60 * 60 * 1000 // Convert hours to milliseconds
      const expiresAt = createdAt + duration
      const remaining = expiresAt - now

      if (remaining <= 0) {
        setTimeRemaining("Expirado")
        setExpirationProgress(0)
        return
      }

      // Calculate progress (0-100, where 100 is just created, 0 is expired)
      const progressPercent = (remaining / duration) * 100
      setExpirationProgress(progressPercent)

      // Format time remaining
      const hours = Math.floor(remaining / (1000 * 60 * 60))
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))

      if (hours > 0) {
        setTimeRemaining(`${hours}h`)
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m`)
      } else {
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000)
        setTimeRemaining(`${seconds}s`)
      }
    }

    updateTimeRemaining()
    const interval = setInterval(updateTimeRemaining, 1000) // Update every second

    return () => clearInterval(interval)
  }, [currentStory?.createdAt, currentStory?.duration, currentStory?.isTemporary])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
      document.body.style.position = "fixed"
      document.body.style.width = "100%"
      document.body.style.height = "100%"
    } else {
      document.body.style.overflow = ""
      document.body.style.position = ""
      document.body.style.width = ""
      document.body.style.height = ""
    }

    return () => {
      document.body.style.overflow = ""
      document.body.style.position = ""
      document.body.style.width = ""
      document.body.style.height = ""
    }
  }, [isOpen])

  useEffect(() => {
    if (shouldClose) {
      const timer = setTimeout(() => {
        onClose()
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [shouldClose, onClose])

  useEffect(() => {
    if (isOpen && currentStory?.id && currentUserId) {
      markStoryAsViewed(currentStory.id, currentUserId)
        .then(() => {
          console.log("[v0] Story marked as viewed successfully")
        })
        .catch((error) => {
          console.error("[v0] Error marking story as viewed:", error)
        })
    }
  }, [isOpen, currentStory?.id, currentUserId])

  useEffect(() => {
    if (!isOpen || isPaused || !currentStory || totalImages === 0) return

    const duration = 5000 // 5 seconds per image
    const interval = 50 // Update progress every 50ms

    const timer = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + (interval / duration) * 100

        if (newProgress >= 100) {
          if (currentImageIndex < totalImages - 1) {
            setCurrentImageIndex((prev) => prev + 1)
            return 0
          } else if (currentStoryIndex < stories.length - 1) {
            setCurrentStoryIndex((prev) => prev + 1)
            setCurrentImageIndex(0)
            return 0
          } else {
            setShouldClose(true)
            return 100
          }
        }

        return newProgress
      })
    }, interval)

    return () => clearInterval(timer)
  }, [isOpen, isPaused, currentStoryIndex, currentImageIndex, totalImages, stories.length, currentStory])

  useEffect(() => {
    setProgress(0)
  }, [currentStoryIndex, currentImageIndex])

  const handlePrevious = useCallback(() => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex((prev) => prev - 1)
    } else if (currentStoryIndex > 0) {
      setCurrentStoryIndex((prev) => prev - 1)
      const prevStory = stories[currentStoryIndex - 1]
      const prevImages =
        prevStory?.images ||
        (prevStory?.imageUrl ? [prevStory.imageUrl] : []) ||
        (prevStory?.videoUrl ? [prevStory.videoUrl] : [])
      setCurrentImageIndex(prevImages.length - 1)
    }
  }, [currentImageIndex, currentStoryIndex, stories])

  const handleNext = useCallback(() => {
    if (currentImageIndex < totalImages - 1) {
      setCurrentImageIndex((prev) => prev + 1)
    } else if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex((prev) => prev + 1)
      setCurrentImageIndex(0)
    } else {
      setShouldClose(true)
    }
  }, [currentImageIndex, totalImages, currentStoryIndex, stories.length])

  const handleDeleteStory = async () => {
    if (!currentStory?.id || !currentStory?.creatorId || !isOwner) {
      return
    }

    if (!confirm("Tem certeza que deseja deletar este story?")) {
      return
    }

    try {
      await deleteTemporaryStory(currentStory.id, currentStory.creatorId)

      toast({
        title: "Story deletado",
        description: "O story foi removido com sucesso",
      })

      setTimeout(() => {
        onClose()
        if (onStoryDeleted) {
          onStoryDeleted()
        }
      }, 0)
    } catch (error) {
      console.error("[v0] Error deleting story:", error)
      toast({
        title: "Erro ao deletar",
        description: "Não foi possível deletar o story",
        variant: "destructive",
      })
    }
  }

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case "Escape":
          onClose()
          break
        case "ArrowLeft":
          handlePrevious()
          break
        case "ArrowRight":
          handleNext()
          break
        case " ":
          e.preventDefault()
          setIsPaused((prev) => !prev)
          break
      }
    },
    [isOpen, onClose, handlePrevious, handleNext],
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  if (!isOpen || !currentStory || totalImages === 0) return null

  const currentImage = currentStoryImages[currentImageIndex]
  const isVideo =
    currentImage &&
    (currentImage.includes(".mp4") ||
      currentImage.includes(".webm") ||
      currentImage.includes("video") ||
      currentStory?.videoUrl)

  const isExpiringSoon = expirationProgress < 10 // Less than 10% remaining
  const isExpiring = expirationProgress < 25 // Less than 25% remaining

  return (
    <div className="fixed inset-0 z-[9999] bg-black touch-none overscroll-none">
      <div className="absolute top-0 left-0 right-0 z-10 p-2 sm:p-3 flex space-x-1.5">
        {currentStoryImages.map((_, index) => (
          <div key={index} className="flex-1 h-1 sm:h-1.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
            <div
              className="h-full bg-gradient-to-r from-pink-400 via-purple-400 to-pink-500 transition-all duration-100 ease-linear shadow-lg"
              style={{
                width: index < currentImageIndex ? "100%" : index === currentImageIndex ? `${progress}%` : "0%",
              }}
            />
          </div>
        ))}
      </div>

      <div className="absolute top-0 left-0 right-0 z-10 pt-10 sm:pt-12 pb-3 px-3 sm:px-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-shrink">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-pink-600 p-[2px] animate-pulse">
                <div className="w-full h-full rounded-full bg-black" />
              </div>
              <Avatar className="h-10 w-10 sm:h-12 sm:w-12 relative ring-2 ring-white/10">
                <AvatarImage src={creatorAvatar || "/placeholder.svg"} alt={creatorName} />
                <AvatarFallback className="text-xs bg-gradient-to-br from-pink-500 to-purple-600 text-white">
                  {creatorName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="min-w-0 flex-shrink">
              <p className="text-white font-bold text-sm sm:text-base truncate drop-shadow-lg">{creatorName}</p>
              <p className="text-white/80 text-xs sm:text-sm truncate drop-shadow-md">@{creatorUsername}</p>
            </div>
          </div>

          {currentStory.isTemporary && timeRemaining && (
            <div className="relative flex-shrink-0">
              {isExpiring && (
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    className={`${isExpiringSoon ? "stroke-red-500" : "stroke-yellow-500"}`}
                    strokeWidth="2"
                    strokeDasharray={`${expirationProgress} 100`}
                    style={{
                      transition: "stroke-dasharray 1s linear",
                    }}
                  />
                </svg>
              )}
              <Badge
                className={`relative ${
                  isExpiringSoon
                    ? "bg-gradient-to-r from-red-500/90 to-red-600/90 animate-pulse"
                    : isExpiring
                      ? "bg-gradient-to-r from-yellow-500/90 to-orange-600/90"
                      : "bg-gradient-to-r from-pink-500/90 to-purple-600/90"
                } text-white border-0 backdrop-blur-sm shadow-lg flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5`}
              >
                <Clock className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${isExpiringSoon ? "animate-pulse" : ""}`} />
                <span className="text-xs sm:text-sm font-semibold">{timeRemaining}</span>
              </Badge>
            </div>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPaused(!isPaused)}
              className="text-white hover:bg-white/20 rounded-full p-2 sm:p-2.5 h-auto backdrop-blur-sm bg-black/20 transition-all hover:scale-110"
            >
              {isPaused ? <Play className="h-4 w-4 sm:h-5 sm:w-5" /> : <Pause className="h-4 w-4 sm:h-5 sm:w-5" />}
            </Button>

            {isOwner && currentStory.isTemporary && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteStory}
                className="text-white hover:bg-red-500/30 rounded-full p-2 sm:p-2.5 h-auto backdrop-blur-sm bg-black/20 transition-all hover:scale-110"
                title="Deletar story"
              >
                <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 sm:p-2.5 h-auto backdrop-blur-sm bg-black/20 transition-all hover:scale-110"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center bg-black">
        {isVideo ? (
          <video
            key={currentImage}
            src={currentImage}
            className="w-full h-full object-contain"
            autoPlay
            loop
            playsInline
            muted
            onLoadedData={() => setIsLoading(false)}
            onError={(e) => {
              console.error("[v0] Video failed to load:", currentImage)
              setIsLoading(false)
            }}
          />
        ) : (
          <img
            key={currentImage}
            src={currentImage || "/placeholder.svg"}
            alt={`Story ${currentImageIndex + 1}`}
            className="w-full h-full object-contain"
            onLoad={() => setIsLoading(false)}
            onError={(e) => {
              e.currentTarget.src = "/placeholder.svg"
              setIsLoading(false)
            }}
          />
        )}

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}
      </div>

      <div className="absolute inset-0 flex pointer-events-none">
        <button
          className="flex-1 cursor-pointer focus:outline-none active:bg-white/5 transition-colors pointer-events-auto"
          onClick={handlePrevious}
          disabled={currentStoryIndex === 0 && currentImageIndex === 0}
          aria-label="Story anterior"
        >
          <div className="h-full flex items-center justify-start pl-2 sm:pl-4 opacity-0 hover:opacity-100 active:opacity-100 transition-opacity">
            <div className="bg-gradient-to-r from-pink-500/20 to-purple-600/20 backdrop-blur-sm rounded-full p-2">
              <ChevronLeft className="h-8 w-8 sm:h-10 sm:w-10 text-white drop-shadow-2xl" />
            </div>
          </div>
        </button>
        <button
          className="flex-1 cursor-pointer focus:outline-none active:bg-white/5 transition-colors pointer-events-auto"
          onClick={handleNext}
          aria-label="Próximo story"
        >
          <div className="h-full flex items-center justify-end pr-2 sm:pr-4 opacity-0 hover:opacity-100 active:opacity-100 transition-opacity">
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-500/20 backdrop-blur-sm rounded-full p-2">
              <ChevronRight className="h-8 w-8 sm:h-10 sm:w-10 text-white drop-shadow-2xl" />
            </div>
          </div>
        </button>
      </div>

      {currentStory.name && (
        <div className="absolute bottom-6 sm:bottom-8 left-0 right-0 z-10 px-3 sm:px-4 flex justify-center">
          <Badge className="bg-gradient-to-r from-pink-500/80 to-purple-600/80 text-white border-0 backdrop-blur-md shadow-2xl px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-semibold">
            {currentStory.name}
          </Badge>
        </div>
      )}
    </div>
  )
}
