export type SubscriptionTier = "bronze" | "prata" | "gold" | "platinum" | "diamante"
export type EngagementLevel = "iniciante" | "veterano" | "super_fa" | "embaixador"

export interface CreatorSubscription {
  creatorId: string
  creatorUsername: string
  creatorDisplayName: string
  tier: SubscriptionTier
  stripeSubscriptionId: string
  status: "active" | "canceled" | "past_due"
  currentPeriodEnd: Date
  createdAt: Date
}

export interface User {
  uid: string
  email: string
  username: string
  displayName: string
  photoURL?: string
  bio?: string
  retweets: number

  // subscriptionTier?: SubscriptionTier
  // subscriptionExpiry?: Date

  subscriptions?: CreatorSubscription[]
  stripeCustomerId?: string // Mantém o customer ID global do Stripe

  engagementLevel?: EngagementLevel // What they earn through XP
  xp?: number // Experience points for engagement
  totalXp?: number // Total XP accumulated

  completedMissions?: string[]
  dailyMissionsReset?: Date
  weeklyMissionsReset?: Date
  createdAt: Date
  userType?: "user" | "creator"
}

export interface Post {
  id: string
  content: string
  imageUrl?: string
  videoUrl?: string
  authorId: string
  authorName: string
  authorUsername: string
  authorPhotoURL?: string
  createdAt: Date
  likes: number
  comments: number
  retweets: number
  requiredLevel: SubscriptionTier // Novo campo para controle de acesso
  tips?: number // Total number of tips received
  tipsAmount?: number // Total amount in BRL
}

export interface Mission {
  id: string
  title: string
  description: string
  type: "daily" | "weekly" | "achievement"
  xpReward: number
  requiredLevel: SubscriptionTier
  targetAction: "like" | "comment" | "retweet" | "view_story" | "send_gift"
  targetCount: number
  isActive: boolean
  expiresAt?: Date
}

export interface UserMissionProgress {
  missionId: string
  userId: string
  progress: number
  completed: boolean
  completedAt?: Date
}

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: "mission" | "level_up" | "xp_gained" | "tip_received" | "tip_sent" // Added tip types
  isRead: boolean
  createdAt: any
  actionUrl?: string
}

export interface ReferralCode {
  id?: string
  code: string
  creatorId: string
  creatorUsername: string
  createdAt: any
  isActive: boolean
}

export interface CreatorNetwork {
  id?: string
  creatorId: string
  creatorUsername: string
  referredBy?: string // Username of who referred them
  referralCode: string
  level: number // 1 = direct referral, 2 = second level, etc.
  joinedAt: any
  isActive: boolean
  totalEarnings?: number
  monthlyEarnings?: number
  subscriberCount?: number
}

export interface Transaction {
  id?: string
  creatorId: string
  type: "subscription" | "commission_level_1" | "commission_level_2" | "commission_level_3" | "withdrawal" | "tip" // Added tip type
  amount: number
  description: string
  fromUserId?: string
  fromUsername?: string
  relatedCreatorId?: string
  relatedCreatorUsername?: string
  status: "completed" | "pending" | "failed"
  createdAt: any
}

export interface CreatorFinancials {
  creatorId: string
  availableBalance: number
  totalEarnings: number
  monthlyRevenue: number
  directEarnings: number // From own subscribers
  networkEarnings: number // From MLM commissions
  totalWithdrawals: number
  lastUpdated: any
}

export interface Tip {
  id: string
  postId: string
  senderId: string
  senderUsername: string
  senderDisplayName: string
  creatorId: string
  creatorUsername: string
  amount: number // Valor em reais
  message?: string // Mensagem opcional junto com o tip
  stripePaymentIntentId: string
  status: "pending" | "completed" | "failed"
  createdAt: Date
  platformFee: number // 15% para plataforma
  creatorAmount: number // 85% para criadora
}

export const SUBSCRIPTION_TIERS: {
  [key in SubscriptionTier]: { name: string; color: string; price: number; monthlyPrice: number }
} = {
  bronze: { name: "Bronze", color: "#CD7F32", price: 0, monthlyPrice: 0 },
  prata: { name: "Prata", color: "#C0C0C0", price: 19.9, monthlyPrice: 19.9 },
  gold: { name: "Gold", color: "#FFD700", price: 39.9, monthlyPrice: 39.9 },
  platinum: { name: "Platinum", color: "#E5E4E2", price: 79.9, monthlyPrice: 79.9 },
  diamante: { name: "Diamante", color: "#06B6D4", price: 99.9, monthlyPrice: 99.9 },
}

export const ENGAGEMENT_LEVELS: {
  [key in EngagementLevel]: { name: string; color: string; icon: string; badge: string }
} = {
  iniciante: { name: "Iniciante", color: "#8B7355", icon: "🌱", badge: "Novo na comunidade" },
  veterano: { name: "Veterano", color: "#4A90E2", icon: "⭐", badge: "Membro ativo" },
  super_fa: { name: "Super Fã", color: "#9B59B6", icon: "💜", badge: "Fã dedicado" },
  embaixador: { name: "Embaixador", color: "#F39C12", icon: "👑", badge: "Embaixador oficial" },
}

export const SUBSCRIPTION_HIERARCHY: SubscriptionTier[] = ["bronze", "prata", "gold", "platinum", "diamante"]
export const ENGAGEMENT_HIERARCHY: EngagementLevel[] = ["iniciante", "veterano", "super_fa", "embaixador"]

export const ENGAGEMENT_XP_REQUIREMENTS: { [key in EngagementLevel]: number } = {
  iniciante: 0,
  veterano: 1000,
  super_fa: 3000,
  embaixador: 7000,
}

export const XP_REQUIREMENTS: { [key in SubscriptionTier]: number } = {
  bronze: 0,
  prata: 500,
  gold: 1500,
  platinum: 3000,
  diamante: 6000,
}

export type UserLevel = SubscriptionTier
export const USER_LEVELS = SUBSCRIPTION_TIERS
export const LEVEL_HIERARCHY = SUBSCRIPTION_HIERARCHY

export function canAccessCreatorContent(
  userSubscriptions: CreatorSubscription[] | undefined,
  creatorId: string,
  requiredTier: SubscriptionTier,
): boolean {
  if (!userSubscriptions || userSubscriptions.length === 0) {
    // Sem assinaturas, só pode ver conteúdo bronze
    return requiredTier === "bronze"
  }

  // Procura assinatura ativa para essa criadora específica
  const creatorSubscription = userSubscriptions.find((sub) => sub.creatorId === creatorId && sub.status === "active")

  if (!creatorSubscription) {
    // Sem assinatura para essa criadora, só pode ver bronze
    return requiredTier === "bronze"
  }

  // Verifica se o tier da assinatura é suficiente
  const userIndex = SUBSCRIPTION_HIERARCHY.indexOf(creatorSubscription.tier)
  const requiredIndex = SUBSCRIPTION_HIERARCHY.indexOf(requiredTier)
  return userIndex >= requiredIndex
}

export function getHighestSubscriptionTier(userSubscriptions: CreatorSubscription[] | undefined): SubscriptionTier {
  if (!userSubscriptions || userSubscriptions.length === 0) return "bronze"

  const activeSubscriptions = userSubscriptions.filter((sub) => sub.status === "active")
  if (activeSubscriptions.length === 0) return "bronze"

  let highestIndex = 0
  for (const sub of activeSubscriptions) {
    const index = SUBSCRIPTION_HIERARCHY.indexOf(sub.tier)
    if (index > highestIndex) {
      highestIndex = index
    }
  }

  return SUBSCRIPTION_HIERARCHY[highestIndex]
}

export function getCreatorSubscription(
  userSubscriptions: CreatorSubscription[] | undefined,
  creatorId: string,
): CreatorSubscription | undefined {
  if (!userSubscriptions) return undefined
  return userSubscriptions.find((sub) => sub.creatorId === creatorId && sub.status === "active")
}

export function canAccessContent(
  subscriptionTier: SubscriptionTier | undefined,
  requiredTier: SubscriptionTier,
): boolean {
  if (!subscriptionTier) return false
  const userIndex = SUBSCRIPTION_HIERARCHY.indexOf(subscriptionTier)
  const requiredIndex = SUBSCRIPTION_HIERARCHY.indexOf(requiredTier)
  return userIndex >= requiredIndex
}

export function getNextSubscriptionTier(currentTier: SubscriptionTier | undefined): SubscriptionTier | null {
  if (!currentTier) return "bronze"
  const currentIndex = SUBSCRIPTION_HIERARCHY.indexOf(currentTier)
  if (currentIndex < SUBSCRIPTION_HIERARCHY.length - 1) {
    return SUBSCRIPTION_HIERARCHY[currentIndex + 1]
  }
  return null
}

export function getNextEngagementLevel(currentLevel: EngagementLevel | undefined): EngagementLevel | null {
  if (!currentLevel) return "iniciante"
  const currentIndex = ENGAGEMENT_HIERARCHY.indexOf(currentLevel)
  if (currentIndex < ENGAGEMENT_HIERARCHY.length - 1) {
    return ENGAGEMENT_HIERARCHY[currentIndex + 1]
  }
  return null
}

export function calculateEngagementLevelFromXp(totalXp: number | undefined): EngagementLevel {
  if (!totalXp) return "iniciante"
  for (let i = ENGAGEMENT_HIERARCHY.length - 1; i >= 0; i--) {
    const level = ENGAGEMENT_HIERARCHY[i]
    if (totalXp >= ENGAGEMENT_XP_REQUIREMENTS[level]) {
      return level
    }
  }
  return "iniciante"
}

export function getXpForNextEngagementLevel(currentLevel: EngagementLevel | undefined): number {
  const nextLevel = getNextEngagementLevel(currentLevel)
  return nextLevel ? ENGAGEMENT_XP_REQUIREMENTS[nextLevel] : 0
}

export function getNextLevel(currentLevel: SubscriptionTier | undefined): SubscriptionTier | null {
  return getNextSubscriptionTier(currentLevel)
}

export function getXpForNextLevel(currentLevel: SubscriptionTier | undefined): number {
  const nextLevel = getNextSubscriptionTier(currentLevel)
  return nextLevel ? XP_REQUIREMENTS[nextLevel] : 0
}

export function calculateLevelFromXp(totalXp: number | undefined): SubscriptionTier {
  if (!totalXp) return "bronze"
  for (let i = SUBSCRIPTION_HIERARCHY.length - 1; i >= 0; i--) {
    const level = SUBSCRIPTION_HIERARCHY[i]
    if (totalXp >= XP_REQUIREMENTS[level]) {
      return level
    }
  }
  return "bronze"
}

export const DEFAULT_MISSIONS: Mission[] = [
  // Bronze
  {
    id: "bronze_like_1",
    title: "Primeira Curtida",
    description: "Curta 1 foto da criadora",
    type: "daily",
    xpReward: 50,
    requiredLevel: "bronze",
    targetAction: "like",
    targetCount: 1,
    isActive: true,
  },
  {
    id: "bronze_like_3",
    title: "Curtidas Diárias",
    description: "Curta 3 fotos da criadora",
    type: "daily",
    xpReward: 100,
    requiredLevel: "bronze",
    targetAction: "like",
    targetCount: 3,
    isActive: true,
  },
  // Prata
  {
    id: "prata_story_2",
    title: "Stories Exclusivos",
    description: "Veja 2 stories exclusivos",
    type: "daily",
    xpReward: 150,
    requiredLevel: "prata",
    targetAction: "view_story",
    targetCount: 2,
    isActive: true,
  },
  {
    id: "prata_retweet_1",
    title: "Primeiro Retweet",
    description: "Reposte 1 foto da criadora",
    type: "daily",
    xpReward: 120,
    requiredLevel: "prata",
    targetAction: "retweet",
    targetCount: 1,
    isActive: true,
  },
  // Gold
  {
    id: "gold_comment_2",
    title: "Comentários Ativos",
    description: "Comente em 2 publicações",
    type: "daily",
    xpReward: 200,
    requiredLevel: "gold",
    targetAction: "comment",
    targetCount: 2,
    isActive: true,
  },
  {
    id: "gold_retweet_2",
    title: "Compartilhamentos",
    description: "Reposte 2 fotos da criadora",
    type: "weekly",
    xpReward: 300,
    requiredLevel: "gold",
    targetAction: "retweet",
    targetCount: 2,
    isActive: true,
  },
  // Diamante
  {
    id: "diamante_gift_1",
    title: "Presente Especial",
    description: "Envie um presente para a criadora",
    type: "weekly",
    xpReward: 500,
    requiredLevel: "diamante",
    targetAction: "send_gift",
    targetCount: 1,
    isActive: true,
  },
]

// MLM Commission rates
export const MLM_COMMISSION_RATES = {
  level_1: 0.1, // 10% from direct referrals
  level_2: 0.05, // 5% from second level
  level_3: 0.03, // 3% from third level
  level_4: 0.02, // 2% from fourth level
}

export const TIP_CONFIG = {
  MIN_AMOUNT: 5, // R$5 mínimo
  MAX_AMOUNT: 1000, // R$1000 máximo
  SUGGESTED_AMOUNTS: [5, 10, 20, 50, 100],
  PLATFORM_FEE_PERCENTAGE: 0.15, // 15% para plataforma
  CREATOR_PERCENTAGE: 0.85, // 85% para criadora
  MESSAGE_MIN_AMOUNT: 20, // R$20 para enviar mensagem
  MESSAGE_MAX_LENGTH: 200,
}
