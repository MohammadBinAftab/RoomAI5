import { NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";
import { addCredits } from "@/lib/credits";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const headersList = headers();
    const signature = headersList.get("x-razorpay-signature")!;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      return new NextResponse("Invalid signature", { status: 400 });
    }

    const event = JSON.parse(body);

    if (event.event === "payment.captured") {
      const { userId, credits } = event.payload.payment.entity.notes;
      
      await addCredits(userId, parseInt(credits));
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    return new NextResponse("Webhook error", { status: 400 });
  }
}