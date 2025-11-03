import "server-only"

import Stripe from "stripe"

const stripeKey = process.env.STRIPE_SECRET_KEY!

export const stripe = new Stripe(stripeKey)
