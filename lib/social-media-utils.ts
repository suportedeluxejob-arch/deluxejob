import { Instagram, Twitter, Youtube, Facebook, Linkedin, Globe, Music, MessageCircle, Send } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export interface SocialPlatform {
  name: string
  icon: LucideIcon
  color: string
  pattern: RegExp
}

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  {
    name: "Instagram",
    icon: Instagram,
    color: "#E4405F",
    pattern: /instagram\.com|instagr\.am/i,
  },
  {
    name: "Twitter",
    icon: Twitter,
    color: "#1DA1F2",
    pattern: /twitter\.com|x\.com/i,
  },
  {
    name: "TikTok",
    icon: Music,
    color: "#000000",
    pattern: /tiktok\.com/i,
  },
  {
    name: "YouTube",
    icon: Youtube,
    color: "#FF0000",
    pattern: /youtube\.com|youtu\.be/i,
  },
  {
    name: "Facebook",
    icon: Facebook,
    color: "#1877F2",
    pattern: /facebook\.com|fb\.com/i,
  },
  {
    name: "LinkedIn",
    icon: Linkedin,
    color: "#0A66C2",
    pattern: /linkedin\.com/i,
  },
  {
    name: "WhatsApp",
    icon: MessageCircle,
    color: "#25D366",
    pattern: /wa\.me|whatsapp\.com/i,
  },
  {
    name: "Telegram",
    icon: Send,
    color: "#0088cc",
    pattern: /t\.me|telegram\.me|telegram\.org/i,
  },
]

export function detectSocialPlatform(url: string): SocialPlatform {
  for (const platform of SOCIAL_PLATFORMS) {
    if (platform.pattern.test(url)) {
      return platform
    }
  }

  // Default to generic globe icon for unknown platforms
  return {
    name: "Website",
    icon: Globe,
    color: "#6B7280",
    pattern: /.*/,
  }
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}
