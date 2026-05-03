"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { calculatePoints } from "@/lib/points";
import type { MatchStage, PointsConfig } from "@/lib/points";

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

export async function updateMatch(
  matchId: string,
  homeScore: number | null,
  awayScore: number | null,
  status: string
) {
  try {
    await assertSuperadmin();
    const db = getServiceClient();

    const { error } = await db
      .from("matches")
      .update({
        home_score: homeScore,
        away_score: awayScore,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", matchId);

    if (error) return { error: error.message };

    // Auto-recalculate points when saving as FINISHED with scores
    if (status === "FINISHED" && homeScore !== null && awayScore !== null) {
      await recalculatePointsForMatch(matchId, homeScore, awayScore, db);
    }

    return { success: true };
  } catch (err) {
    return { error: String(err) };
  }
}

async function recalculatePointsForMatch(
  matchId: string,
  homeScore: number,
  awayScore: number,
  db: ReturnType<typeof createServiceClient>
) {
  const { data: match } = await db
    .from("matches").select("stage").eq("id", matchId).single();
  if (!match) return;

  const { data: predictions } = await db
    .from("predictions")
    .select(`
      id, home_score_pred, away_score_pred, points_earned,
      groups (pts_exact_groups, pts_winner_groups, pts_exact_knockout, pts_winner_knockout)
    `)
    .eq("match_id", matchId);

  if (!predictions?.length) return;

  const matchResult = {
    home_score: homeScore,
    away_score: awayScore,
    stage: match.stage as MatchStage,
  };

  for (const pred of predictions) {
    const groupConfig = Array.isArray(pred.groups) ? pred.groups[0] : pred.groups;
    if (!groupConfig) continue;

    const config: PointsConfig = {
      pts_exact_groups: groupConfig.pts_exact_groups,
      pts_winner_groups: groupConfig.pts_winner_groups,
      pts_exact_knockout: groupConfig.pts_exact_knockout,
      pts_winner_knockout: groupConfig.pts_winner_knockout,
    };

    const newPoints = calculatePoints(
      { home_score_pred: pred.home_score_pred, away_score_pred: pred.away_score_pred },
      matchResult,
      config
    );

    if (newPoints !== pred.points_earned) {
      await db.from("predictions")
        .update({ points_earned: newPoints, updated_at: new Date().toISOString() })
        .eq("id", pred.id);
    }
  }
}
