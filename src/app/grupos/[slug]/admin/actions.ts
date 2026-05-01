"use server";

import { createClient } from "@/lib/supabase/server";
import { generateInviteCode } from "@/lib/points";

export async function createInvitation(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const code = generateInviteCode();
  const { data, error } = await supabase
    .from("invitations")
    .insert({
      group_id: groupId,
      code,
      max_uses: 100,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function deleteInvitation(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("invitations")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  return { success: true };
}
