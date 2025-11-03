import { Badge } from "@/components/ui/badge"
import { ENGAGEMENT_LEVELS, type EngagementLevel } from "@/lib/types"
import { cn } from "@/lib/utils"

interface EngagementLevelBadgeProps {
  level: EngagementLevel
  size?: "sm" | "md" | "lg"
  showIcon?: boolean
  className?: string
}

export function EngagementLevelBadge({ level, size = "md", showIcon = true, className }: EngagementLevelBadgeProps) {
  const levelData = ENGAGEMENT_LEVELS[level]

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  }

  return (
    <Badge
      className={cn("font-semibold border-2 transition-all", sizeClasses[size], className)}
      style={{
        backgroundColor: `${levelData.color}20`,
        borderColor: `${levelData.color}80`,
        color: levelData.color,
      }}
    >
      {showIcon && <span className="mr-1">{levelData.icon}</span>}
      {levelData.name}
    </Badge>
  )
}
