import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import prismadb from "@/lib/prismadb";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // •	check out session completed: create user account in case this event

  if (event.type === "checkout.session.completed") {
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );

    if (!session?.metadata?.userId) {
      return new NextResponse("User id is required", { status: 400 });
    }
    await prismadb.userSubscription.create({
      data: {
        userId: session?.metadata?.userId,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
        stripePriceId: subscription.items.data[0].price.id,
        stripeCurrentPeriodEnd: new Date(
          subscription.current_period_end * 1000
        ),
      },
    });
  }
  // Check for another event – user has just upgraded the subscription
  // Simply update the existing user subscription

  if (event.type === "invoice.payment_succeeded") {
    console.log("Entered invoice.payment_succeeded event");
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );

    // Add logging before the update call to log the ID you are trying to update:
    console.log(`Updating subscription with ID: ${subscription.id}`);

    if (!subscription.id) {
      console.log("Subscription ID not found");
      return new NextResponse("Subscription ID is required", { status: 400 });
    }

    const existingSubscription = await prismadb.userSubscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!existingSubscription) {
      console.log(`No record found for subscription ID: ${subscription.id}`);
      // Handle the case when the record doesn't exist, maybe log it or create a new record
      return new NextResponse("No subscription record found to update", {
        status: 404,
      });
    }

    await prismadb.userSubscription.update({
      where: {
        stripeSubscriptionId: subscription.id,
      },
      data: {
        stripePriceId: subscription.items.data[0].price.id,
        stripeCurrentPeriodEnd: new Date(
          subscription.current_period_end * 1000
        ),
      },
    });
  }

  return new NextResponse(null, { status: 200 });
}
