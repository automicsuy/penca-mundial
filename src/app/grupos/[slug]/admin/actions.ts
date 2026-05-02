"use server";

import { createClient } from "@/lib/supabase/server";

export async function createInvitation(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const groupId = formData.get("groupId") as string;
  const maxUses = parseInt(formData.get("maxUses") as string) || 1;

  // Verify admin
  const { data: membership } = await supabase
    .from("group_members").select("role").eq("group_id", groupId).eq("user_id", user.id).single();
  if (!membership || membership.role !== "admin") return { error: "No autorizado" };

  const code = Math.random().toString(36).substring(2, 10).toUpperCase();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase.from("invitations").insert({
    group_id: groupId, code, max_uses: maxUses, expires_at: expiresAt, created_by: user.id,
  }).select().single();

  if (error) return { error: error.message };
  return { data };
}

export async function deleteInvitation(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const invitationId = formData.get("invitationId") as string;
  const { error } = await supabase.from("invitations").delete().eq("id", invitationId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function toggleMemberEnabled(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const memberId = formData.get("memberId") as string;
  const groupId = formData.get("groupId") as string;
  const enabled = formData.get("enabled") === "true";

  // Verify caller is admin
  const { data: membership } = await supabase
    .from("group_members").select("role").eq("group_id", groupId).eq("user_id", user.id).single();
  if (!membership || membership.role !== "admin") return { error: "No autorizado" };

  const { error } = await supabase
    .from("group_members").update({ enabled }).eq("id", memberId).eq("group_id", groupId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function setMemberPaymentStatus(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const memberId = formData.get("memberId") as string;
  const groupId = formData.get("groupId") as string;
  const status = formData.get("status") as string;

  const validStatuses = ["free", "pending", "approved", "rejected"];
  if (!validStatuses.includes(status)) return { error: "Estado inválido" };

  // Verify caller is admin
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
