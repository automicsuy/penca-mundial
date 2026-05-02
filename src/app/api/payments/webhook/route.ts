import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPayment } from "@/lib/mercadopago";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, data } = body;
  if (type !== "payment" || !data?.id) return NextResponse.json({ received: true });

  try {
    const payment = await getPayment(String(data.id));
    const status = payment.status;
    const preferenceId = payment.preference_id;
    const externalRef = payment.external_reference;
    if (!preferenceId || !externalRef) return NextResponse.json({ received: true });

    const [groupSlug, userId] = externalRef.split("|");
    const supabase = await createClient();

    const { data: payRecord } = await supabase
      .from("payments").select("id").eq("preference_id", preferenceId).single();

    if (payRecord) {
      await supabase.from("payments").update({
        payment_id: String(data.id),
        status: status === "approved" ? "approved" : status === "rejected" ? "rejected" : "pending",
        updated_at: new Date().toISOString(),
      }).eq("id", payRecord.id);
    }

    const { data: group } = await supabase.from("groups").select("id").eq("slug", groupSlug).single();
    if (!group) return NextResponse.json({ received: true });

    const newStatus = status === "approved" ? "approved" : status === "rejected" ? "rejected" : "pending";
    const update: Record<string, unknown> = { payment_status: newStatus, payment_id: String(data.id) };
    if (status === "approved") {
      update.payment_date = new Date().toISOString();
      update.enabled = true;
    }

    await supabase.from("group_members")
      .update(update)
      .eq("group_id", group.id).eq("user_id", userId);
  } catch (err) {
    console.error("[MP Webhook]", err);
  }

  return NextResponse.json({ received: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
