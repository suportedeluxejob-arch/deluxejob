import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
})

const TIP_PRICE_IDS: Record<number, string> = {
  5: "price_1SKWre5I63txB0RG1ufDFaCb",
  10: "price_1SKWsX5I63txB0RGOXK5La8q",
  20: "price_1SKWuC5I63txB0RGWaSAytim",
  50: "price_1SKWun5I63txB0RGB12sOa3F",
  100: "price_1SKWvP5I63txB0RGkz213Acw",
}

export async function POST(req: NextRequest) {
  try {
    const { amount, creatorId, creatorUsername, postId, message, userId } = await req.json()

    if (!TIP_PRICE_IDS[amount]) {
      return NextResponse.json(
        { error: "Valor inválido. Escolha entre R$5, R$10, R$20, R$50 ou R$100" },
        { status: 400 },
      )
    }

    const priceId = TIP_PRICE_IDS[amount]

    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode: "payment",
      redirect_on_completion: "never",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      payment_intent_data: {
        metadata: {
          type: "tip",
          creatorId,
          creatorUsername,
          postId: postId || "",
          message: message || "",
          amount: amount.toString(),
          userId: userId || "",
        },
      },
      metadata: {
        type: "tip",
        creatorId,
        creatorUsername,
        postId: postId || "",
        message: message || "",
        amount: amount.toString(),
        userId: userId || "",
      },
    })

    return NextResponse.json({
      clientSecret: session.client_secret,
      sessionId: session.id,
    })
  } catch (error: any) {
    console.error("Error creating tip checkout:", error)
    return NextResponse.json({ error: error.message || "Erro ao criar checkout" }, { status: 500 })
  }
}
