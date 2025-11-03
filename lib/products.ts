export interface SubscriptionProduct {
  id: string
  name: string
  tier: "prata" | "gold" | "platinum" | "diamante"
  description: string
  priceInCents: number
  features: string[]
}

export const SUBSCRIPTION_PRODUCTS: SubscriptionProduct[] = [
  {
    id: "prata",
    name: "Prata",
    tier: "prata",
    description: "Acesso básico ao conteúdo premium",
    priceInCents: 1990, // R$ 19.90
    features: ["Curtir posts", "Retuitar conteúdo", "Acesso a stories exclusivos"],
  },
  {
    id: "gold",
    name: "Gold",
    tier: "gold",
    description: "Acesso completo com interação",
    priceInCents: 3990, // R$ 39.90
    features: [
      "Todos os recursos Prata",
      "Comentar em posts",
      "Acesso prioritário a novos conteúdos",
      "Badge Gold no perfil",
    ],
  },
  {
    id: "platinum",
    name: "Platinum",
    tier: "platinum",
    description: "Experiência VIP completa",
    priceInCents: 7990, // R$ 79.90
    features: [
      "Todos os recursos Gold",
      "Mensagens diretas com criadoras",
      "Conteúdo exclusivo Platinum",
      "Badge Platinum no perfil",
    ],
  },
  {
    id: "diamante",
    name: "Diamante",
    tier: "diamante",
    description: "Acesso ilimitado e benefícios exclusivos",
    priceInCents: 9990, // R$ 99.90
    features: [
      "Todos os recursos Platinum",
      "Acesso antecipado a todo conteúdo",
      "Sessões privadas mensais",
      "Badge Diamante no perfil",
      "Suporte prioritário",
    ],
  },
]
