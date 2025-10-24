"use client"

import { useState, useEffect } from "react"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { createSubscriptionCheckout, createServiceCheckout } from "@/app/actions/stripe"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, ArrowLeft, Video, ImageIcon, Sparkles, Heart } from "lucide-react"
import { SUBSCRIPTION_PRODUCTS, type SubscriptionProduct } from "@/lib/stripe-products"
import { SERVICE_PRODUCTS, type ServiceProduct } from "@/lib/service-products"
import { auth } from "@/lib/firebase/config"
import { useRouter, useSearchParams } from "next/navigation"

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = stripeKey ? loadStripe(stripeKey) : null

interface SubscriptionCheckoutProps {
  creatorId: string
  creatorName: string
}

const serviceIcons = {
  video: Video,
  pack: ImageIcon,
  custom: Sparkles,
  meeting: Heart,
}

export function SubscriptionCheckout({ creatorId, creatorName }: SubscriptionCheckoutProps) {
  const [selectedTier, setSelectedTier] = useState<SubscriptionProduct | null>(null)
  const [selectedService, setSelectedService] = useState<ServiceProduct | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [existingSubscription, setExistingSubscription] = useState<any>(null)
  const [checkingSubscription, setCheckingSubscription] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get("tab") || "subscriptions"

  useEffect(() => {
    const checkExistingSubscription = async () => {
      if (!auth.currentUser) {
        setCheckingSubscription(false)
        return
      }

      try {
        const { getUserProfile } = await import("@/lib/firebase/firestore")
        const profile = await getUserProfile(auth.currentUser.uid)

        if (profile?.subscriptions) {
          const creatorSub = profile.subscriptions.find(
            (sub: any) => sub.creatorId === creatorId && sub.status === "active",
          )
          setExistingSubscription(creatorSub)
        }
      } catch (error) {
        console.error("Error checking existing subscription:", error)
      } finally {
        setCheckingSubscription(false)
      }
    }

    checkExistingSubscription()
  }, [creatorId, creatorName])

  const handleSelectTier = async (product: SubscriptionProduct) => {
    setLoading(true)
    try {
      if (!auth.currentUser) {
        throw new Error("Você precisa estar logado para assinar")
      }

      const userId = auth.currentUser.uid
      const result = await createSubscriptionCheckout(userId, creatorId, product.tier)
      setClientSecret(result.clientSecret!)
      setSelectedTier(product)
      setSelectedService(null)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao iniciar checkout. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleSelectService = async (product: ServiceProduct) => {
    setLoading(true)
    try {
      if (!auth.currentUser) {
        throw new Error("Você precisa estar logado para comprar serviços")
      }

      const userId = auth.currentUser.uid
      const result = await createServiceCheckout(userId, creatorId, product.id)
      setClientSecret(result.clientSecret!)
      setSelectedService(product)
      setSelectedTier(null)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao iniciar checkout. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleBackToPlans = () => {
    setClientSecret(null)
    setSelectedTier(null)
    setSelectedService(null)
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }, 100)
  }

  if (!stripePromise) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Erro de Configuração</CardTitle>
            <CardDescription>
              A chave pública do Stripe não está configurada. Verifique as variáveis de ambiente.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (clientSecret && (selectedTier || selectedService)) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <Button variant="ghost" onClick={handleBackToPlans} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para planos
        </Button>
        <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <Button variant="ghost" onClick={() => router.push("/creators")} className="mb-6 -ml-2">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Assine {creatorName}</h2>
        <p className="text-muted-foreground">Escolha seu plano de assinatura exclusivo para {creatorName}</p>

        {existingSubscription && (
          <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg max-w-md mx-auto">
            <p className="text-sm text-primary">
              Você já tem uma assinatura {existingSubscription.tier} ativa para {creatorName}. Você pode fazer upgrade
              ou downgrade do seu plano abaixo.
            </p>
          </div>
        )}
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
          <TabsTrigger value="subscriptions">Assinaturas</TabsTrigger>
          <TabsTrigger value="services">Serviços</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions">
          {checkingSubscription ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {SUBSCRIPTION_PRODUCTS.map((product) => {
                const isCurrentPlan = existingSubscription?.tier === product.tier

                return (
                  <Card
                    key={product.id}
                    className={`relative flex flex-col ${isCurrentPlan ? "border-primary border-2" : ""}`}
                  >
                    {isCurrentPlan && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
                        Plano Atual
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="text-2xl">{product.name}</CardTitle>
                      <CardDescription>{product.description}</CardDescription>
                      <div className="mt-4">
                        <span className="text-4xl font-bold">R$ {(product.priceInCents / 100).toFixed(2)}</span>
                        <span className="text-muted-foreground">/mês</span>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      <ul className="space-y-2 mb-6 flex-1">
                        {product.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        onClick={() => handleSelectTier(product)}
                        disabled={loading || isCurrentPlan}
                        className="w-full"
                        size="lg"
                        variant={isCurrentPlan ? "secondary" : "default"}
                      >
                        {isCurrentPlan ? "Plano Atual" : loading ? "Carregando..." : "Assinar Agora"}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="services">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {SERVICE_PRODUCTS.map((product) => {
              const IconComponent = serviceIcons[product.category]
              return (
                <Card key={product.id} className="relative flex flex-col">
                  <CardHeader>
                    <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                      <IconComponent className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{product.name}</CardTitle>
                    <CardDescription>{product.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-3xl font-bold">R$ {(product.priceInCents / 100).toFixed(2)}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <Button
                      onClick={() => handleSelectService(product)}
                      disabled={loading}
                      className="w-full mt-auto"
                      size="lg"
                    >
                      {loading ? "Carregando..." : "Comprar Agora"}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-8 p-4 bg-muted/30 rounded-lg max-w-2xl mx-auto">
        <p className="text-sm text-muted-foreground text-center">
          Esta assinatura é exclusiva para {creatorName}. Para acessar conteúdo de outras criadoras, você precisará
          assinar cada uma separadamente. Gerencie todas as suas assinaturas em{" "}
          <button onClick={() => router.push("/my-subscriptions")} className="text-primary hover:underline font-medium">
            Minhas Assinaturas
          </button>
          .
        </p>
      </div>
    </div>
  )
}
