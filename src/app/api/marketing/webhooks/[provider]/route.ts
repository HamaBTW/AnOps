import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/server/db/client";
import { ingestDeliveryEvent } from "@/server/marketing/delivery.service";
import { normalizeEventType } from "@/server/marketing/delivery-events";

function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  if (signature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string }> }
) {
  const { provider } = await context.params;
  const secret = process.env.MARKETING_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "Webhook provider secret is not configured." },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-anops-signature") ?? "";

  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody);
    const { companyId, deliveryReference, providerEventId, eventType, occurredAt } = payload;

    if (!companyId || !ObjectId.isValid(companyId) || !deliveryReference || !eventType) {
      return NextResponse.json({ error: "Malformed webhook payload." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    const result = await ingestDeliveryEvent(db, new ObjectId(companyId), {
      provider,
      providerEventId: providerEventId || `evt-${Date.now()}`,
      deliveryReference,
      type: normalizeEventType(eventType),
      occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
    });

    return NextResponse.json({ ok: true, duplicate: result.duplicate, status: result.status });
  } catch (err: any) {
    if (err?.message?.includes("not found")) {
      return NextResponse.json({ error: "Delivery not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Unable to process webhook." }, { status: 500 });
  }
}
