import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { headers } from "next/headers"
import type Stripe from "stripe"

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const headersList = await headers()
    const signature = headersList.get("stripe-signature")

    if (!signature) {
      console.error("No Stripe signature found")
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error("Webhook signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.metadata?.type === "tip") {
          await handleTipCheckoutCompleted(session)
        } else if (session.metadata?.type === "service_purchase") {
          await handleServicePurchaseCompleted(session)
        } else {
          await handleCheckoutCompleted(session)
        }
        break
      }

      case "charge.updated": {
        const charge = event.data.object as Stripe.Charge

        if (charge.metadata?.type === "tip" && charge.status === "succeeded" && charge.paid) {
          await handleTipFromCharge(charge)
        }
        break
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaid(invoice)
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentFailed(invoice)
        break
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        if (paymentIntent.metadata?.type === "tip") {
          await handleTipPaymentSucceeded(paymentIntent)
        }
        break
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        if (paymentIntent.metadata?.type === "tip") {
          await handleTipPaymentFailed(paymentIntent)
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const creatorId = session.metadata?.creatorId
  const tier = session.metadata?.tier as "prata" | "gold" | "platinum" | "diamante"

  if (!userId || !creatorId || !tier) {
    console.error("Missing metadata in checkout session")
    return
  }

  const { addCreatorSubscription, getUserProfile, createNotificationWithExpiry } = await import(
    "@/lib/firebase/firestore"
  )

  const creatorProfile = await getUserProfile(creatorId)

  if (!creatorProfile) {
    console.error("Creator not found:", creatorId)
    return
  }

  await addCreatorSubscription(userId, {
    creatorId,
    creatorUsername: creatorProfile.username,
    creatorDisplayName: creatorProfile.displayName,
    tier,
    stripeSubscriptionId: session.subscription as string,
    status: "active",
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  })

  const userProfile = await getUserProfile(userId)
  if (!userProfile?.stripeCustomerId && session.customer) {
    const { updateUserProfile } = await import("@/lib/firebase/firestore")
    await updateUserProfile(userId, {
      stripeCustomerId: session.customer as string,
    })
  }

  await createNotificationWithExpiry({
    userId,
    type: "tier_upgrade",
    title: `Assinatura ${tier.charAt(0).toUpperCase() + tier.slice(1)} Ativada!`,
    message: `Você agora tem acesso ao conteúdo ${tier} de @${creatorProfile.username}! Aproveite o conteúdo exclusivo.`,
    fromUserId: "deluxe-platform",
    fromUsername: "DeLuxe",
    fromDisplayName: "DeLuxe",
    fromProfileImage: "/deluxe-logo.png",
  })
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  const creatorId = subscription.metadata?.creatorId
  const tier = subscription.metadata?.tier as "prata" | "gold" | "platinum" | "diamante"

  if (!userId || !creatorId || !tier) {
    console.error("Missing metadata in subscription")
    return
  }

  const { addCreatorSubscription, getUserProfile } = await import("@/lib/firebase/firestore")
  const creatorProfile = await getUserProfile(creatorId)

  if (!creatorProfile) {
    console.error("Creator not found")
    return
  }

  await addCreatorSubscription(userId, {
    creatorId,
    creatorUsername: creatorProfile.username,
    creatorDisplayName: creatorProfile.displayName,
    tier,
    stripeSubscriptionId: subscription.id,
    status: subscription.status as "active" | "canceled" | "past_due",
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  const creatorId = subscription.metadata?.creatorId

  if (!userId || !creatorId) {
    console.error("Missing metadata in subscription deletion")
    return
  }

  const { cancelCreatorSubscription, getUserProfile, createNotificationWithExpiry } = await import(
    "@/lib/firebase/firestore"
  )

  await cancelCreatorSubscription(userId, creatorId)

  const creatorProfile = await getUserProfile(creatorId)
  const creatorName = creatorProfile ? `@${creatorProfile.username}` : "a criadora"

  await createNotificationWithExpiry({
    userId,
    type: "system",
    title: "Assinatura Cancelada",
    message: `Sua assinatura de ${creatorName} foi cancelada.`,
    fromUserId: "deluxe-platform-uid",
    fromUsername: "deluxe",
    fromDisplayName: "DeLuxe",
    fromProfileImage: "/deluxe-logo.png",
  })
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
  const userId = subscription.metadata?.userId
  const creatorId = subscription.metadata?.creatorId
  const tier = subscription.metadata?.tier

  if (!userId || !creatorId) {
    console.error("Missing metadata in subscription")
    return
  }

  const { createTransaction, processMLMCommissions, getCreatorNetwork, getCreatorFinancials, updateCreatorFinancials } =
    await import("@/lib/firebase/firestore")

  const grossAmountCents = invoice.amount_paid

  const creatorShareCents = Math.floor(grossAmountCents * 0.7)
  const platformShareCents = Math.floor(grossAmountCents * 0.3)

  await createTransaction({
    creatorId,
    type: "subscription",
    amount: creatorShareCents,
    description: `Assinatura ${tier} - Usuário ${userId}`,
    fromUserId: userId,
    status: "completed",
    createdAt: new Date(),
  })

  const creatorFinancials = await getCreatorFinancials(creatorId)
  await updateCreatorFinancials(creatorId, {
    availableBalance: (creatorFinancials.availableBalance || 0) + creatorShareCents,
    directEarnings: (creatorFinancials.directEarnings || 0) + creatorShareCents,
    monthlyRevenue: (creatorFinancials.monthlyRevenue || 0) + creatorShareCents,
    totalEarnings: (creatorFinancials.totalEarnings || 0) + creatorShareCents,
  })

  const network = await getCreatorNetwork(creatorId)
  let totalCommissionsPaidCents = 0

  if (network && network.length > 0 && network[0].referredBy) {
    totalCommissionsPaidCents = await processMLMCommissions(creatorId, grossAmountCents, userId)
  }

  const platformProfitCents = platformShareCents - totalCommissionsPaidCents

  await createTransaction({
    creatorId: "PLATFORM",
    type: "platform_revenue",
    amount: platformProfitCents,
    description: `Lucro da plataforma - Assinatura ${tier}`,
    fromUserId: userId,
    status: "completed",
    createdAt: new Date(),
  })
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
  const userId = subscription.metadata?.userId
  const creatorId = subscription.metadata?.creatorId

  if (!userId || !creatorId) {
    console.error("Missing userId in subscription metadata")
    return
  }

  const { addCreatorSubscription, getUserProfile, createNotificationWithExpiry } = await import(
    "@/lib/firebase/firestore"
  )

  const creatorProfile = await getUserProfile(creatorId)

  if (creatorProfile) {
    await addCreatorSubscription(userId, {
      creatorId,
      creatorUsername: creatorProfile.username,
      creatorDisplayName: creatorProfile.displayName,
      tier: subscription.metadata?.tier as "prata" | "gold" | "platinum" | "diamante",
      stripeSubscriptionId: subscription.id,
      status: "past_due",
    })
  }

  await createNotificationWithExpiry({
    userId,
    type: "system",
    title: "Falha no Pagamento",
    message:
      "Não conseguimos processar seu pagamento. Por favor, atualize suas informações de pagamento para continuar com acesso aos conteúdos exclusivos.",
    fromUserId: "deluxe-platform-uid",
    fromUsername: "deluxe",
    fromDisplayName: "DeLuxe",
    fromProfileImage: "/deluxe-logo.png",
  })
}

async function handleTipPaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const {
    postId,
    senderId,
    senderUsername,
    creatorId,
    creatorUsername: creatorUsernameMeta,
    message,
  } = paymentIntent.metadata

  if (!postId || !senderId || !creatorId) {
    console.error("Missing metadata in payment intent")
    return
  }

  const {
    updateTipStatus,
    incrementPostTips,
    createNotificationWithExpiry,
    getUserProfile,
    updateCreatorFinancials,
    getCreatorFinancials,
    createTransaction,
  } = await import("@/lib/firebase/firestore")

  const { collection, query, where, getDocs } = await import("firebase/firestore")
  const { db } = await import("@/lib/firebase/config")

  const tipsQuery = query(collection(db, "tips"), where("stripePaymentIntentId", "==", paymentIntent.id))
  const tipsSnapshot = await getDocs(tipsQuery)

  if (tipsSnapshot.empty) {
    console.error("Tip not found for payment intent:", paymentIntent.id)
    return
  }

  const tipDoc = tipsSnapshot.docs[0]
  const tipId = tipDoc.id
  const tipData = tipDoc.data()

  await updateTipStatus(tipId, "completed")
  await incrementPostTips(postId, tipData.amount)

  const creatorAmountCents = Math.floor(paymentIntent.amount * 0.85)
  const platformFeeCents = Math.floor(paymentIntent.amount * 0.15)

  const creatorFinancials = await getCreatorFinancials(creatorId)
  await updateCreatorFinancials(creatorId, {
    availableBalance: (creatorFinancials.availableBalance || 0) + creatorAmountCents,
    directEarnings: (creatorFinancials.directEarnings || 0) + creatorAmountCents,
    totalEarnings: (creatorFinancials.totalEarnings || 0) + creatorAmountCents,
  })

  await createTransaction({
    creatorId,
    type: "tip",
    amount: creatorAmountCents,
    description: `Tip de @${senderUsername} - R$${(tipData.amount).toFixed(2)}`,
    fromUserId: senderId,
    fromUsername: senderUsername,
    status: "completed",
    createdAt: new Date(),
  })

  const senderProfile = await getUserProfile(senderId)

  await createNotificationWithExpiry({
    userId: creatorId,
    type: "tip_received",
    title: "Você recebeu um Tip!",
    message: message
      ? `@${senderUsername} enviou R$${tipData.amount.toFixed(2)} com a mensagem: "${message}"`
      : `@${senderUsername} enviou R$${tipData.amount.toFixed(2)} de tip!`,
    fromUserId: senderId,
    fromUsername: senderUsername || "usuario",
    fromDisplayName: senderProfile?.displayName || senderUsername || "Usuário",
    fromProfileImage: senderProfile?.photoURL || "/placeholder.svg",
    actionUrl: `/post/${postId}`,
  })

  await createNotificationWithExpiry({
    userId: senderId,
    type: "tip_sent",
    title: "Tip enviado com sucesso!",
    message: `Seu tip de R$${tipData.amount.toFixed(2)} para @${creatorUsernameMeta} foi processado!`,
    fromUserId: "deluxe-platform",
    fromUsername: "DeLuxe",
    fromDisplayName: "DeLuxe",
    fromProfileImage: "/deluxe-logo.png",
  })
}

async function handleTipPaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { senderId } = paymentIntent.metadata

  if (!senderId) {
    console.error("Missing senderId in payment intent metadata")
    return
  }

  const { updateTipStatus, createNotificationWithExpiry } = await import("@/lib/firebase/firestore")

  const { collection, query, where, getDocs } = await import("firebase/firestore")
  const { db } = await import("@/lib/firebase/config")

  const tipsQuery = query(collection(db, "tips"), where("stripePaymentIntentId", "==", paymentIntent.id))
  const tipsSnapshot = await getDocs(tipsQuery)

  if (!tipsSnapshot.empty) {
    const tipId = tipsSnapshot.docs[0].id
    await updateTipStatus(tipId, "failed")
  }

  await createNotificationWithExpiry({
    userId: senderId,
    type: "system",
    title: "Falha no pagamento do Tip",
    message: "Não conseguimos processar seu tip. Por favor, tente novamente ou use outro método de pagamento.",
    fromUserId: "deluxe-platform",
    fromUsername: "DeLuxe",
    fromDisplayName: "DeLuxe",
    fromProfileImage: "/deluxe-logo.png",
  })
}

async function handleServicePurchaseCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const creatorId = session.metadata?.creatorId
  const serviceProductId = session.metadata?.serviceProductId

  if (!userId || !creatorId || !serviceProductId) {
    console.error("Missing metadata in service purchase session")
    return
  }

  const { getServiceProduct } = await import("@/lib/service-products")
  const {
    createTransaction,
    getUserProfile,
    updateCreatorFinancials,
    getCreatorFinancials,
    createNotificationWithExpiry,
  } = await import("@/lib/firebase/firestore")

  const serviceProduct = getServiceProduct(serviceProductId)

  if (!serviceProduct) {
    console.error("Service product not found:", serviceProductId)
    return
  }

  const grossAmountCents = session.amount_total || 0
  const grossAmount = grossAmountCents / 100

  const creatorShareCents = Math.floor(grossAmountCents * 0.7)
  const platformShareCents = Math.floor(grossAmountCents * 0.3)

  await createTransaction({
    creatorId,
    type: "service",
    amount: creatorShareCents,
    description: `${serviceProduct.name} - Usuário ${userId}`,
    fromUserId: userId,
    status: "completed",
    createdAt: new Date(),
  })

  const creatorFinancials = await getCreatorFinancials(creatorId)
  await updateCreatorFinancials(creatorId, {
    availableBalance: (creatorFinancials.availableBalance || 0) + creatorShareCents,
    directEarnings: (creatorFinancials.directEarnings || 0) + creatorShareCents,
    monthlyRevenue: (creatorFinancials.monthlyRevenue || 0) + creatorShareCents,
    totalEarnings: (creatorFinancials.totalEarnings || 0) + creatorShareCents,
  })

  await createTransaction({
    creatorId: "PLATFORM",
    type: "platform_revenue",
    amount: platformShareCents,
    description: `Lucro da plataforma - ${serviceProduct.name}`,
    fromUserId: userId,
    status: "completed",
    createdAt: new Date(),
  })

  const creatorProfile = await getUserProfile(creatorId)
  const userProfile = await getUserProfile(userId)

  await createNotificationWithExpiry({
    userId: creatorId,
    type: "service_purchase",
    title: "Novo Serviço Adquirido!",
    message: `@${userProfile?.username || "usuario"} comprou ${serviceProduct.name} por R$${grossAmount.toFixed(2)}! Você recebeu R$${(creatorShareCents / 100).toFixed(2)}.`,
    fromUserId: userId,
    fromUsername: userProfile?.username || "usuario",
    fromDisplayName: userProfile?.displayName || userProfile?.username || "Usuário",
    fromProfileImage: userProfile?.photoURL || "/placeholder.svg",
  })

  await createNotificationWithExpiry({
    userId,
    type: "service_purchase",
    title: "Serviço Adquirido com Sucesso!",
    message: `Você adquiriu ${serviceProduct.name} de @${creatorProfile?.username || "criadora"} por R$${grossAmount.toFixed(2)}!`,
    fromUserId: creatorId,
    fromUsername: creatorProfile?.username || "criadora",
    fromDisplayName: creatorProfile?.displayName || creatorProfile?.username || "Criadora",
    fromProfileImage: creatorProfile?.photoURL || "/placeholder.svg",
  })
}

async function handleTipCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { postId, userId, creatorId, creatorUsername, message, amount } = session.metadata || {}

  if (!userId || !creatorId || !amount) {
    console.error("Missing required metadata:", { userId, creatorId, amount })
    return
  }

  const {
    createNotificationWithExpiry,
    getUserProfile,
    updateCreatorFinancials,
    getCreatorFinancials,
    createTransaction,
  } = await import("@/lib/firebase/firestore")

  const tipAmount = Number.parseFloat(amount)
  const tipAmountCents = Math.floor(tipAmount * 100)

  const creatorAmountCents = Math.floor(tipAmountCents * 0.85)
  const platformFeeCents = Math.floor(tipAmountCents * 0.15)

  try {
    const creatorFinancials = await getCreatorFinancials(creatorId)

    await updateCreatorFinancials(creatorId, {
      availableBalance: (creatorFinancials.availableBalance || 0) + creatorAmountCents,
      directEarnings: (creatorFinancials.directEarnings || 0) + creatorAmountCents,
      totalEarnings: (creatorFinancials.totalEarnings || 0) + creatorAmountCents,
    })

    const senderProfile = await getUserProfile(userId)
    await createTransaction({
      creatorId,
      type: "tip",
      amount: creatorAmountCents,
      description: `Tip de @${senderProfile?.username || "usuario"} - R$${tipAmount.toFixed(2)}`,
      fromUserId: userId,
      fromUsername: senderProfile?.username || "usuario",
      status: "completed",
      createdAt: new Date(),
    })

    await createTransaction({
      creatorId: "PLATFORM",
      type: "platform_revenue",
      amount: platformFeeCents,
      description: `Taxa de tip - R$${tipAmount.toFixed(2)}`,
      fromUserId: userId,
      status: "completed",
      createdAt: new Date(),
    })

    await createNotificationWithExpiry({
      userId: creatorId,
      type: "tip_received",
      title: "Você recebeu uma Gorjeta!",
      message: message
        ? `@${senderProfile?.username || "usuario"} enviou R$${tipAmount.toFixed(2)} com a mensagem: "${message}"`
        : `@${senderProfile?.username || "usuario"} enviou R$${tipAmount.toFixed(2)} de gorjeta!`,
      fromUserId: userId,
      fromUsername: senderProfile?.username || "usuario",
      fromDisplayName: senderProfile?.displayName || senderProfile?.username || "Usuário",
      fromProfileImage: senderProfile?.profileImage || "/placeholder.svg",
      actionUrl: postId ? `/post/${postId}` : undefined,
    })

    await createNotificationWithExpiry({
      userId,
      type: "tip_sent",
      title: "Gorjeta enviada com sucesso!",
      message: `Sua gorjeta de R$${tipAmount.toFixed(2)} para @${creatorUsername} foi processada!`,
      fromUserId: "deluxe-platform",
      fromUsername: "DeLuxe",
      fromDisplayName: "DeLuxe",
      fromProfileImage: "/deluxe-logo.png",
    })
  } catch (error) {
    console.error("Error processing tip:", error)
    throw error
  }
}

async function handleTipFromCharge(charge: Stripe.Charge) {
  const { postId, userId, creatorId, creatorUsername, message, amount } = charge.metadata || {}

  if (!userId || !creatorId || !amount) {
    console.error("Missing required metadata:", { userId, creatorId, amount })
    return
  }

  const {
    createNotificationWithExpiry,
    getUserProfile,
    updateCreatorFinancials,
    getCreatorFinancials,
    createTransaction,
  } = await import("@/lib/firebase/firestore")

  const tipAmount = Number.parseFloat(amount)
  const tipAmountCents = Math.floor(tipAmount * 100)

  const creatorAmountCents = Math.floor(tipAmountCents * 0.85)
  const platformFeeCents = Math.floor(tipAmountCents * 0.15)

  try {
    const creatorFinancials = await getCreatorFinancials(creatorId)

    await updateCreatorFinancials(creatorId, {
      availableBalance: (creatorFinancials.availableBalance || 0) + creatorAmountCents,
      directEarnings: (creatorFinancials.directEarnings || 0) + creatorAmountCents,
      totalEarnings: (creatorFinancials.totalEarnings || 0) + creatorAmountCents,
    })

    const senderProfile = await getUserProfile(userId)
    await createTransaction({
      creatorId,
      type: "tip",
      amount: creatorAmountCents,
      description: `Tip de @${senderProfile?.username || "usuario"} - R$${tipAmount.toFixed(2)}`,
      fromUserId: userId,
      fromUsername: senderProfile?.username || "usuario",
      status: "completed",
      createdAt: new Date(),
    })

    await createTransaction({
      creatorId: "PLATFORM",
      type: "platform_revenue",
      amount: platformFeeCents,
      description: `Taxa de tip - R$${tipAmount.toFixed(2)}`,
      fromUserId: userId,
      status: "completed",
      createdAt: new Date(),
    })

    await createNotificationWithExpiry({
      userId: creatorId,
      type: "tip_received",
      title: "Você recebeu uma Gorjeta!",
      message: message
        ? `@${senderProfile?.username || "usuario"} enviou R$${tipAmount.toFixed(2)} com a mensagem: "${message}"`
        : `@${senderProfile?.username || "usuario"} enviou R$${tipAmount.toFixed(2)} de gorjeta!`,
      fromUserId: userId,
      fromUsername: senderProfile?.username || "usuario",
      fromDisplayName: senderProfile?.displayName || senderProfile?.username || "Usuário",
      fromProfileImage: senderProfile?.profileImage || "/placeholder.svg",
      actionUrl: postId ? `/post/${postId}` : undefined,
    })

    await createNotificationWithExpiry({
      userId,
      type: "tip_sent",
      title: "Gorjeta enviada com sucesso!",
      message: `Sua gorjeta de R$${tipAmount.toFixed(2)} para @${creatorUsername} foi processada!`,
      fromUserId: "deluxe-platform",
      fromUsername: "DeLuxe",
      fromDisplayName: "DeLuxe",
      fromProfileImage: "/deluxe-logo.png",
    })
  } catch (error) {
    console.error("Error processing tip from charge:", error)
    throw error
  }
}
