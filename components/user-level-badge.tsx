import { Crown, Gem, Star, Shield, Award } from "lucide-react"

interface UserLevelBadgeProps {
  level: "bronze" | "prata" | "gold" | "platinum" | "diamante"
  size?: "sm" | "md" | "lg"
  className?: string
}

export function UserLevelBadge({ level, size = "md", className }: UserLevelBadgeProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  }

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  }

  const containerSizes = {
    sm: "px-2 py-1",
    md: "px-3 py-1.5",
    lg: "px-4 py-2",
  }

  const getLevelConfig = () => {
    const normalizedLevel = level?.toLowerCase() as "bronze" | "prata" | "gold" | "platinum" | "diamante"

    switch (normalizedLevel) {
      case "bronze":
        return {
          icon: Shield,
          color: "text-amber-600",
          bgColor: "bg-gradient-to-r from-amber-500/20 to-orange-500/20",
          borderColor: "border-amber-500/30",
          name: "Bronze",
          glow: "shadow-amber-500/20",
        }
      case "prata":
        return {
          icon: Award,
          color: "text-gray-300",
          bgColor: "bg-gradient-to-r from-gray-400/20 to-gray-300/20",
          borderColor: "border-gray-400/30",
          name: "Prata",
          glow: "shadow-gray-400/20",
        }
      case "gold":
        return {
          icon: Crown,
          color: "text-yellow-400",
          bgColor: "bg-gradient-to-r from-yellow-500/20 to-amber-500/20",
          borderColor: "border-yellow-500/30",
          name: "Gold",
          glow: "shadow-yellow-500/20",
        }
      case "platinum":
        return {
          icon: Star,
          color: "text-purple-400",
          bgColor: "bg-gradient-to-r from-purple-500/20 to-pink-500/20",
          borderColor: "border-purple-500/30",
          name: "Platinum",
          glow: "shadow-purple-500/20",
        }
      case "diamante":
        return {
          icon: Gem,
          color: "text-cyan-400",
          bgColor: "bg-gradient-to-r from-cyan-500/20 to-blue-500/20",
          borderColor: "border-cyan-500/30",
          name: "Diamante",
          glow: "shadow-cyan-500/20",
        }
      default:
        console.warn("Unknown level, defaulting to Bronze:", normalizedLevel)
        return {
          icon: Shield,
          color: "text-amber-600",
          bgColor: "bg-gradient-to-r from-amber-500/20 to-orange-500/20",
          borderColor: "border-amber-500/30",
          name: "Bronze",
          glow: "shadow-amber-500/20",
        }
    }
  }

  const config = getLevelConfig()
  const Icon = config.icon

  return (
    <div
      className={`flex items-center space-x-2 ${containerSizes[size]} rounded-full border ${config.bgColor} ${config.borderColor} backdrop-blur-sm shadow-lg ${config.glow} ${className || ""}`}
    >
      <div className="relative">
        <Icon className={`${sizeClasses[size]} ${config.color} drop-shadow-sm`} />
        <div className={`absolute inset-0 ${sizeClasses[size]} ${config.color} opacity-30 blur-sm`}></div>
      </div>
      <span className={`font-semibold ${config.color} ${textSizes[size]} drop-shadow-sm`}>{config.name}</span>
    </div>
  )
}
