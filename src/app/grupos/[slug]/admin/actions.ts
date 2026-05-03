"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createInvitation(groupId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { data: membership } = await supabase
    .from("group_members").select("role").eq("group_id", groupId).eq("user_id", user.id).single();
  if (!membership || membership.role !== "admin") return { error: "No autorizado" };

  const code = Math.random().toString(36).substring(2, 10).toUpperCase();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

  const { data, error } = await supabase.from("invitations").insert({
    group_id: groupId, code, max_uses: 100, expires_at: expiresAt, created_by: user.id,
  }).select().single();

  if (error) return { error: error.message };
  return { data };
}

export async function deleteInvitation(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { error } = await supabase.from("invitations").delete().eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}

export async function toggleMemberEnabled(memberId: string, groupId: string, enabled: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { data: membership } = await supabase
    .from("group_members").select("role").eq("group_id", groupId).eq("user_id", user.id).single();
  if (!membership || membership.role !== "admin") return { error: "No autorizado" };

  const { error } = await supabase
    .from("group_members").update({ enabled }).eq("id", memberId).eq("group_id", groupId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function setMemberPaymentStatus(memberId: string, groupId: string, status: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const validStatuses = ["free", "pending", "approved", "rejected"];
  if (!validStatuses.includes(status)) return { error: "Estado inválido" };

  const { data: membership } = await supabase
    .from("group_members").select("role").eq("group_id", groupId).eq("user_id", user.id).single();
  if (!membership || membership.role !== "admin") return { error: "No autorizado" };

  const update: Record<string, unknown> = { payment_status: status };
  if (status === "approved") {
    update.payment_date = new Date().toISOString();
    update.enabled = true;
  }

  const { error } = await supabase
    .from("group_members").update(update).eq("id", memberId).eq("group_id", groupId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateGroupPaymentConfig(
  groupId: string,
  entryFeeRequired: boolean,
  entryFee: number
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { data: membership } = await supabase
    .from("group_members").select("role").eq("group_id", groupId).eq("user_id", user.id).single();
  if (!membership || membership.role !== "admin") return { error: "No autorizado" };

  const { error } = await supabase
    .from("groups")
    .update({ entry_fee_required: entryFeeRequired, entry_fee: entryFeeRequired ? entryFee : 0 })
    .eq("id", groupId);

  if (error) return { error: error.message };
  revalidatePath(`/grupos`);
  return { success: true };
}
