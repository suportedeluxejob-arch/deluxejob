"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { StoryCreatorModal } from "@/components/story-creator-modal"
import type { ReactNode } from "react"

interface StoryCreatorButtonProps {
  profileImage?: string
  displayName?: string
  onClick?: () => void
  userId?: string
  username?: string
  onStoryCreated?: () => void
  children?: ReactNode
}

export function StoryCreatorButton({
  profileImage,
  displayName,
  userId,
  username,
  onStoryCreated,
  children,
}: StoryCreatorButtonProps) {
  const [showModal, setShowModal] = useState(false)

  const handleClick = () => {
    setShowModal(true)
  }

  const handleSuccess = () => {
    if (onStoryCreated) {
      onStoryCreated()
    }
  }

  if (children) {
    return (
      <>
        <button
          onClick={handleClick}
          className="relative group cursor-pointer transform hover:scale-105 transition-all duration-200 touch-manipulation active:scale-95"
          aria-label="Adicionar story"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          {children}
          <div className="absolute bottom-0 right-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg ring-2 ring-background group-hover:scale-110 group-active:scale-95 transition-transform duration-200">
            <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground font-bold" strokeWidth={3} />
          </div>
        </button>

        {userId && username && (
          <StoryCreatorModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            userId={userId}
            username={username}
            onSuccess={handleSuccess}
          />
        )}
      </>
    )
  }

  // Original behavior when no children provided
  const avatarFallback = displayName?.charAt(0)?.toUpperCase() || "?"

  return (
    <>
      <button
        onClick={handleClick}
        className="relative group cursor-pointer transform hover:scale-105 transition-all duration-200 touch-manipulation active:scale-95"
        aria-label="Adicionar story"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <Avatar className="h-20 w-20 sm:h-24 sm:w-24 ring-4 ring-background shadow-2xl">
          <AvatarImage
            src={profileImage || "/placeholder.svg"}
            alt={displayName || "Creator"}
            className="object-cover"
          />
          <AvatarFallback className="text-xl sm:text-2xl font-bold">{avatarFallback}</AvatarFallback>
        </Avatar>

        <div className="absolute bottom-0 right-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg ring-2 ring-background group-hover:scale-110 group-active:scale-95 transition-transform duration-200">
          <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground font-bold" strokeWidth={3} />
        </div>
      </button>

      {userId && username && (
        <StoryCreatorModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          userId={userId}
          username={username}
          onSuccess={handleSuccess}
        />
      )}
    </>
  )
}
