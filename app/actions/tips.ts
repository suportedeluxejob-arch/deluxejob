"use server"

import { stripe } from "@/lib/stripe"
import { createTip } from "@/lib/firebase/firestore"

export async function createTipPaymentIntent(data: {
  amount: number
  creatorId: string
  postId?: string
  message?: string
}) {
  try {
    if (data.amount < 5 || data.amount > 1000) {
      throw new Error("Valor deve estar entre R$5 e R$1.000")
    }

    const amountInCents = Math.round(data.amount * 100)

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "brl",
      metadata: {
        type: "tip",
        postId: data.postId || "",
        creatorId: data.creatorId,
        message: data.message || "",
      },
      automatic_payment_methods: {
        enabled: true,
      },
    })

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    }
  } catch (error) {
    console.error("Error creating tip payment intent:", error)

    const errorMessage = error instanceof Error ? error.message : "Erro ao criar pagamento"

    return {
      success: false,
      error: errorMessage,
    }
  }
}

export async function createTipPayment(data: {
  postId: string
  senderId: string
  senderUsername: string
  senderDisplayName: string
  creatorId: string
  creatorUsername: string
  amount: number
  message?: string
}) {
  try {
    if (!data.senderId) {
      throw new Error("Usuário não autenticado")
    }

    if (data.amount < 5 || data.amount > 1000) {
      throw new Error("Valor deve estar entre R$5 e R$1.000")
    }

    const amountInCents = Math.round(data.amount * 100)

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "brl",
      metadata: {
        type: "tip",
        postId: data.postId,
        senderId: data.senderId,
        senderUsername: data.senderUsername,
        creatorId: data.creatorId,
        creatorUsername: data.creatorUsername,
        message: data.message || "",
      },
      automatic_payment_methods: {
        enabled: true,
      },
    })

    const tipId = await createTip({
      ...data,
      stripePaymentIntentId: paymentIntent.id,
    })

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      tipId,
    }
  } catch (error) {
    console.error("Error creating tip payment:", error)

    const errorMessage = error instanceof Error ? error.message : "Erro ao criar pagamento"

    return {
      success: false,
      error: errorMessage,
    }
  }
}
