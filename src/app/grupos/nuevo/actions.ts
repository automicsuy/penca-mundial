"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateSlug } from "@/lib/points";

export async function createGroup(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const pts_exact_groups = parseInt(formData.get("pts_exact_groups") as string) || 3;
  const pts_winner_groups = parseInt(formData.get("pts_winner_groups") as string) || 1;
  const pts_exact_knockout = parseInt(formData.get("pts_exact_knockout") as string) || 6;
  const pts_winner_knockout = parseInt(formData.get("pts_winner_knockout") as string) || 2;
  const prize_1st = (formData.get("prize_1st") as string)?.trim() || null;
  const prize_2nd = (formData.get("prize_2nd") as string)?.trim() || null;
  const prize_3rd = (formData.get("prize_3rd") as string)?.trim() || null;

  if (!name) return { error: "El nombre del grupo no es válido." };

  const slug = generateSlug(name);
  if (!slug) return { error: "El nombre del grupo no es válido." };

  const { data, error } = await supabase
    .from("groups")
    .insert({
      name,
      slug,
      description,
      created_by: user.id,
      pts_exact_groups,
      pts_winner_groups,
      pts_exact_knockout,
      pts_winner_knockout,
      prize_1st,
      prize_2nd,
      prize_3rd,
    })
    .select("slug")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "Ya existe un grupo con ese nombre. Probá con otro." };
    }
    return { error: error.message };
  }

  redirect(`/grupos/${data.slug}`);
}
