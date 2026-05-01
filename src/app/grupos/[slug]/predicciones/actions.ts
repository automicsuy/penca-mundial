"use server";

import { createClient } from "@/lib/supabase/server";

export async function savePrediction({
  matchId,
  groupId,
  homeScore,
  awayScore,
  existingPredictionId,
}: {
  matchId: string;
  groupId: string;
  homeScore: number;
  awayScore: number;
  existingPredictionId?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const payload = {
    user_id: user.id,
    group_id: groupId,
    match_id: matchId,
    home_score_pred: homeScore,
    away_score_pred: awayScore,
    updated_at: new Date().toISOString(),
  };

  if (existingPredictionId) {
    const { data, error } = await supabase
      .from("predictions")
      .update(payload)
      .eq("id", existingPredictionId)
      .select()
      .single();

    if (error) return { error: error.message };
    return { data };
  } else {
    const { data, error } = await supabase
      .from("predictions")
      .insert(payload)
      .select()
      .single();

    if (error) return { error: error.message };
    return { data };
  }
}
