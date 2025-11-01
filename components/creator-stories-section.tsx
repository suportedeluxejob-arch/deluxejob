"use client"

import { useState, useEffect } from "react"
import { StoryRingAvatar } from "@/components/story-ring-avatar"
import { StoryViewer } from "@/components/story-viewer"
import { getCreatorActiveStories, type TemporaryStory } from "@/lib/firebase/firestore"
import { Plus } from "lucide-react"

interface CreatorStoriesSectionProps {
  creatorId: string
  creatorName: string
  creatorUsername: string
  creatorAvatar: string
  isOwnProfile?: boolean
  onCreateStory?: () => void
}

export function CreatorStoriesSection({
  creatorId,
  creatorName,
  creatorUsername,
  creatorAvatar,
  isOwnProfile = false,
  onCreateStory,
}: CreatorStoriesSectionProps) {
  const [activeStories, setActiveStories] = useState<TemporaryStory[]>([])
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStories = async () => {
      try {
        setLoading(true)
        const stories = await getCreatorActiveStories(creatorId)
        setActiveStories(stories)
      } catch (error) {
        console.error("Error loading stories:", error)
      } finally {
        setLoading(false)
      }
    }

    loadStories()

    const interval = setInterval(loadStories, 60000)
    return () => clearInterval(interval)
  }, [creatorId])

  const hasStories = activeStories.length > 0

  if (loading) {
    return (
      <div className="flex items-center space-x-4 px-4 py-3">
        <div className="h-16 w-16 rounded-full bg-muted animate-pulse" />
      </div>
    )
  }

  if (!hasStories && !isOwnProfile) {
    return null
  }

  return (
    <>
      <div className="flex items-center space-x-4 px-4 py-3 overflow-x-auto scrollbar-hide">
        {isOwnProfile && (
          <div className="flex flex-col items-center space-y-1 flex-shrink-0">
            <StoryRingAvatar
              src={creatorAvatar}
              alt={creatorName}
              fallback={creatorName.charAt(0).toUpperCase()}
              hasActiveStory={hasStories}
              size="lg"
              onClick={() => {
                if (hasStories) {
                  setIsViewerOpen(true)
                } else if (onCreateStory) {
                  onCreateStory()
                }
              }}
            />
            {!hasStories && (
              <button
                onClick={onCreateStory}
                className="absolute bottom-0 right-0 bg-primary rounded-full p-1 ring-2 ring-background"
              >
                <Plus className="h-4 w-4 text-primary-foreground" />
              </button>
            )}
            <span className="text-xs text-muted-foreground max-w-[80px] truncate">
              {hasStories ? "Seu story" : "Adicionar"}
            </span>
          </div>
        )}

        {!isOwnProfile && hasStories && (
          <div className="flex flex-col items-center space-y-1 flex-shrink-0">
            <StoryRingAvatar
              src={creatorAvatar}
              alt={creatorName}
              fallback={creatorName.charAt(0).toUpperCase()}
              hasActiveStory={true}
              size="lg"
              onClick={() => setIsViewerOpen(true)}
            />
            <span className="text-xs text-muted-foreground max-w-[80px] truncate">{creatorName}</span>
          </div>
        )}
      </div>

      <StoryViewer
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        stories={activeStories}
        initialStoryIndex={0}
        creatorName={creatorName}
        creatorUsername={creatorUsername}
        creatorAvatar={creatorAvatar}
      />
    </>
  )
}
