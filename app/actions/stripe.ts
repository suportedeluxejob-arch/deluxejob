"use server"

import { stripe } from "@/lib/stripe"
import { getSubscriptionProduct } from "@/lib/stripe-products"
import { getServiceProduct } from "@/lib/service-products"

export async function createSubscriptionCheckout(
  userId: string,
  creatorId: string,
  tier: "prata" | "gold" | "platinum" | "diamante",
) {
  try {
    if (!userId) {
      throw new Error("Usuário não autenticado")
    }

    const product = getSubscriptionProduct(tier)
    if (!product) {
      throw new Error(`Produto de assinatura não encontrado para tier: ${tier}`)
    }

    let appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://deluxejob.netlify.app"

    if (!appUrl.startsWith("http://") && !appUrl.startsWith("https://")) {
      appUrl = `https://${appUrl}`
    }

    appUrl = appUrl.replace(/^(https?):([^/])/, "$1://$2")

    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode: "subscription",
      line_items: [
        {
          price: product.stripePriceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          userId,
          creatorId,
          tier,
        },
      },
      metadata: {
        userId,
        creatorId,
        tier,
      },
      return_url: `${appUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    })

    return {
      clientSecret: session.client_secret,
      sessionId: session.id,
      success: true,
    }
  } catch (error) {
    console.error("Error creating subscription checkout:", error)

    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido ao criar checkout"
    console.error("Error details:", errorMessage)

    return {
      success: false,
      error: errorMessage,
    }
  }
}

export async function getCheckoutSession(sessionId: string) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    return session
  } catch (error) {
    console.error("Error retrieving checkout session:", error)
    throw error
  }
}

export async function createServiceCheckout(userId: string, creatorId: string, serviceProductId: string) {
  try {
    if (!userId) {
      throw new Error("Usuário não autenticado")
    }

    const product = getServiceProduct(serviceProductId)
    if (!product) {
      throw new Error(`Serviço não encontrado: ${serviceProductId}`)
    }

    let appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://deluxejob.netlify.app"

    if (!appUrl.startsWith("http://") && !appUrl.startsWith("https://")) {
      appUrl = `https://${appUrl}`
    }

    appUrl = appUrl.replace(/^(https?):([^/])/, "$1://$2")

    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode: "payment",
      line_items: [
        {
          price: product.stripePriceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        creatorId,
        serviceProductId,
        type: "service_purchase",
      },
      return_url: `${appUrl}/service/success?session_id={CHECKOUT_SESSION_ID}`,
    })

    return {
      clientSecret: session.client_secret,
      sessionId: session.id,
      success: true,
    }
  } catch (error) {
    console.error("Error creating service checkout:", error)

    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido ao criar checkout"
    console.error("Error details:", errorMessage)

    return {
      success: false,
      error: errorMessage,
    }
  }
}
