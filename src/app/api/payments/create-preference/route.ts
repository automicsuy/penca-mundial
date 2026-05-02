import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPreference } from "@/lib/mercadopago";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupSlug } = await req.json();
  if (!groupSlug) return NextResponse.json({ error: "groupSlug required" }, { status: 400 });

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, slug, entry_fee, entry_fee_required")
    .eq("slug", groupSlug)
    .single();

  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  if (!group.entry_fee_required) return NextResponse.json({ error: "No payment required" }, { status: 400 });

  const { data: member } = await supabase
    .from("group_members")
    .select("id, payment_status")
    .eq("group_id", group.id)
    .eq("user_id", user.id)
    .single();

  if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });
  if (member.payment_status === "approved") return NextResponse.json({ error: "Already paid" }, { status: 400 });

  const preference = await createPreference({
    groupSlug: group.slug,
    groupName: group.name,
    userId: user.id,
    userEmail: user.email || "unknown@email.com",
    amount: group.entry_fee,
  });

  if (!preference.id) return NextResponse.json({ error: "MP error" }, { status: 500 });

  await supabase.from("payments").insert({
    group_id: group.id, user_id: user.id,
    preference_id: preference.id, status: "pending",
    amount: group.entry_fee, currency: "UYU",
  });

  await supabase.from("group_members")
    .update({ payment_status: "pending" })
    .eq("group_id", group.id).eq("user_id", user.id);

  return NextResponse.json({
    preferenceId: preference.id,
    initPoint: preference.init_point,
    sandboxInitPoint: preference.sandbox_init_point,
  });
}
