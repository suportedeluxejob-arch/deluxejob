"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface StoryRingAvatarProps {
  src: string
  alt: string
  fallback: string
  hasActiveStory?: boolean
  hasUnviewedStory?: boolean
  isOwner?: boolean
  size?: "sm" | "md" | "lg" | "xl"
  onClick?: () => void
  className?: string
}

export function StoryRingAvatar({
  src,
  alt,
  fallback,
  hasActiveStory = false,
  hasUnviewedStory = false,
  isOwner = false,
  size = "md",
  onClick,
  className,
}: StoryRingAvatarProps) {
  const sizeClasses = {
    sm: "h-12 w-12 sm:h-14 sm:w-14",
    md: "h-14 w-14 sm:h-16 sm:w-16",
    lg: "h-16 w-16 sm:h-20 sm:w-20",
    xl: "h-20 w-20 sm:h-24 sm:w-24",
  }

  const paddingClasses = {
    sm: "p-[2px]",
    md: "p-[3px]",
    lg: "p-[3px]",
    xl: "p-1",
  }

  const showGradientRing = hasActiveStory && hasUnviewedStory

  return (
    <div
      className={cn(
        "relative inline-block cursor-pointer transition-transform hover:scale-105 active:scale-95",
        sizeClasses[size],
        className,
      )}
      onClick={onClick}
    >
      {showGradientRing && (
        <div
          className={cn(
            "absolute inset-0 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600",
            paddingClasses[size],
          )}
        >
          <div className="w-full h-full rounded-full bg-background" />
        </div>
      )}

      <Avatar
        className={cn(
          "absolute inset-0 m-auto",
          showGradientRing
            ? "ring-2 ring-background"
            : hasActiveStory
              ? "ring-2 ring-muted-foreground/30"
              : "ring-2 ring-border/30",
          sizeClasses[size],
        )}
        style={{
          width: showGradientRing ? "calc(100% - 6px)" : "100%",
          height: showGradientRing ? "calc(100% - 6px)" : "100%",
        }}
      >
        <AvatarImage src={src || "/placeholder.svg"} alt={alt} className="object-cover" />
        <AvatarFallback className="text-xs sm:text-sm font-semibold">{fallback}</AvatarFallback>
      </Avatar>
    </div>
  )
}
