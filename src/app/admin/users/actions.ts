"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function assertSuperadmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data: profile } = await supabase
    .from("profiles").select("is_superadmin").eq("id", user.id).single();
  if (!profile?.is_superadmin) throw new Error("Sin permisos");
}

export async function toggleCanCreateGroups(userId: string, enabled: boolean) {
  try {
    await assertSuperadmin();
    const db = getServiceClient();
    const { error } = await db
      .from("profiles")
      .update({ can_create_groups: enabled })
      .eq("id", userId);
    if (error) return { error: error.message };
    revalidatePath("/admin/users");
    return { success: true };
  } catch (err) {
    return { error: String(err) };
  }
}
