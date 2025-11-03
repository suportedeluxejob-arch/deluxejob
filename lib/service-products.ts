export interface ServiceProduct {
  id: string
  name: string
  description: string
  priceInCents: number
  stripePriceId: string
  category: "video" | "pack" | "custom" | "meeting"
  icon: string
}

export const SERVICE_PRODUCTS: ServiceProduct[] = [
  {
    id: "video-call",
    name: "Chamada de Vídeo Privada",
    description: "Videochamada exclusiva e personalizada",
    priceInCents: 7990,
    stripePriceId: "price_1SGR565I63txB0RGgoOky5My",
    category: "video",
    icon: "📹",
  },
  {
    id: "foot-pack",
    name: "Pack de Pé",
    description: "Pack exclusivo de fotos personalizadas",
    priceInCents: 4990,
    stripePriceId: "price_1SGR4M5I63txB0RG2Ygzu78m",
    category: "pack",
    icon: "👣",
  },
  {
    id: "custom-pack",
    name: "Pack Personalizado",
    description: "Pack totalmente customizado para você",
    priceInCents: 9700,
    stripePriceId: "price_1SGR3j5I63txB0RGuyM3i3mx",
    category: "custom",
    icon: "✨",
  },
  {
    id: "personal-meeting",
    name: "Encontro Personalizado",
    description: "Encontro exclusivo e inesquecível",
    priceInCents: 72900,
    stripePriceId: "price_1SGQxT5I63txB0RGBhB57rg3",
    category: "meeting",
    icon: "💝",
  },
]

export function getServiceProduct(id: string): ServiceProduct | undefined {
  return SERVICE_PRODUCTS.find((p) => p.id === id)
}

export function getServiceProductByPriceId(priceId: string): ServiceProduct | undefined {
  return SERVICE_PRODUCTS.find((p) => p.stripePriceId === priceId)
}
