import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Stripe from "stripe";
import Razorpay from "razorpay";
import { addCredits } from "@/lib/credits";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_SECRET!,
});

const CREDITS_PER_AMOUNT = {
  10: 10,  // $10 = 10 credits
  25: 30,  // $25 = 30 credits
  50: 70   // $50 = 70 credits
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { amount, provider } = await req.json();
    const credits = CREDITS_PER_AMOUNT[amount as keyof typeof CREDITS_PER_AMOUNT] || 0;

    if (provider === "stripe") {
      const stripeSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        metadata: {
          userId: session.user.id,
          credits: credits
        },
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${credits} RoomAI Credits`,
              },
              unit_amount: amount * 100,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel`,
      });

      return NextResponse.json({ url: stripeSession.url });
    } else if (provider === "razorpay") {
      const order = await razorpay.orders.create({
        amount: amount * 100,
        currency: "INR",
        receipt: `order_${Date.now()}`,
        notes: {
          userId: session.user.id,
          credits: credits
        }
      });

      return NextResponse.json({ 
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        credits: credits
      });
    }

    return new NextResponse("Invalid payment provider", { status: 400 });
  } catch (error) {
    console.error("Payment error:", error);
    return new NextResponse("Payment error", { status: 500 });
  }
}