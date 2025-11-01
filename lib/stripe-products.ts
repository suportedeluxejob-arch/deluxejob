export interface SubscriptionProduct {
  id: string
  tier: "prata" | "gold" | "platinum" | "diamante"
  name: string
  description: string
  priceInCents: number
  stripePriceId: string // You'll get this from Stripe Dashboard after creating products
  features: string[]
}

export const SUBSCRIPTION_PRODUCTS: SubscriptionProduct[] = [
  {
    id: "sub-prata",
    tier: "prata",
    name: "Assinatura Prata",
    description: "Acesso a conteúdo exclusivo básico",
    priceInCents: 1990,
    stripePriceId: "price_1SEJqf5I63txB0RGffH4TL4q",
    features: ["Acesso a stories exclusivos", "Conteúdo premium básico", "Suporte prioritário"],
  },
  {
    id: "sub-gold",
    tier: "gold",
    name: "Assinatura Gold",
    description: "Acesso completo a conteúdo premium",
    priceInCents: 3990,
    stripePriceId: "price_1SEJrb5I63txB0RGmEzQuWdw",
    features: ["Tudo do Prata", "Vídeos exclusivos", "Comentários prioritários", "Badge Gold no perfil"],
  },
  {
    id: "sub-platinum",
    tier: "platinum",
    name: "Assinatura Platinum",
    description: "Experiência VIP completa",
    priceInCents: 7990,
    stripePriceId: "price_1SEJsm5I63txB0RGwaobzeyd",
    features: ["Tudo do Gold", "Mensagens diretas", "Conteúdo behind the scenes", "Badge Platinum exclusivo"],
  },
  {
    id: "sub-diamante",
    tier: "diamante",
    name: "Assinatura Diamante",
    description: "Acesso total e benefícios exclusivos",
    priceInCents: 9990,
    stripePriceId: "price_1SEJtR5I63txB0RGvcbpNBay",
    features: [
      "Tudo do Platinum",
      "Videochamadas mensais",
      "Presentes personalizados",
      "Badge Diamante único",
      "Acesso antecipado a novidades",
    ],
  },
]

export function getSubscriptionProduct(tier: string): SubscriptionProduct | undefined {
  return SUBSCRIPTION_PRODUCTS.find((p) => p.tier === tier)
}

export function getSubscriptionProductById(id: string): SubscriptionProduct | undefined {
  return SUBSCRIPTION_PRODUCTS.find((p) => p.id === id)
}
