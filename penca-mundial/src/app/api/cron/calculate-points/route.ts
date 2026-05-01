import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculatePoints } from "@/lib/points";
import type { MatchStage, PointsConfig } from "@/lib/points";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getServiceClient();

    // 1. Find all FINISHED matches that have predictions needing recalculation
    //    We recalculate all predictions for matches finished in the last 2 hours
    //    to handle delayed score updates
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const { data: finishedMatches, error: matchesErr } = await supabase
      .from("matches")
      .select("id, stage, home_score, away_score, status")
      .eq("status", "FINISHED")
      .gte("updated_at", twoHoursAgo);

    if (matchesErr) throw matchesErr;
    if (!finishedMatches || finishedMatches.length === 0) {
      return NextResponse.json({
        updated: 0,
        message: "No recently finished matches",
      });
    }

    const matchIds = finishedMatches.map((m) => m.id);

    // 2. Get all predictions for those matches (with group config)
    const { data: predictions, error: predErr } = await supabase
      .from("predictions")
      .select(
        `
        id,
        user_id,
        group_id,
        match_id,
        home_score_pred,
        away_score_pred,
        points_earned,
        groups (
          pts_exact_groups,
          pts_winner_groups,
          pts_exact_knockout,
          pts_winner_knockout
        )
      `
      )
      .in("match_id", matchIds);

    if (predErr) throw predErr;
    if (!predictions || predictions.length === 0) {
      return NextResponse.json({
        updated: 0,
        message: "No predictions for finished matches",
      });
    }

    // 3. Build a map of match results
    const matchMap = new Map(
      finishedMatches.map((m) => [
        m.id,
        {
          home_score: m.home_score ?? 0,
          away_score: m.away_score ?? 0,
          stage: m.stage as MatchStage,
        },
      ])
    );

    // 4. Calculate and update points for each prediction
    let updated = 0;
    const errors: string[] = [];

    for (const pred of predictions) {
      const matchResult = matchMap.get(pred.match_id);
      if (!matchResult) continue;

      // Extract group config (Supabase join returns object or array)
      const groupConfig = Array.isArray(pred.groups)
        ? pred.groups[0]
        : pred.groups;
      if (!groupConfig) continue;

      const config: PointsConfig = {
        pts_exact_groups: groupConfig.pts_exact_groups,
        pts_winner_groups: groupConfig.pts_winner_groups,
        pts_exact_knockout: groupConfig.pts_exact_knockout,
        pts_winner_knockout: groupConfig.pts_winner_knockout,
      };

      const newPoints = calculatePoints(
        {
          home_score_pred: pred.home_score_pred,
          away_score_pred: pred.away_score_pred,
        },
        matchResult,
        config
      );

      // Only update if points changed
      if (newPoints !== pred.points_earned) {
        const { error } = await supabase
          .from("predictions")
          .update({ points_earned: newPoints, updated_at: new Date().toISOString() })
          .eq("id", pred.id);

        if (error) {
          errors.push(`Prediction ${pred.id}: ${error.message}`);
        } else {
          updated++;
        }
      }
    }

    console.log(
      `[calculate-points] Processed ${predictions.length} predictions, updated ${updated}`
    );

    return NextResponse.json({
      processed: predictions.length,
      updated,
      errors: errors.slice(0, 10),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[calculate-points] Fatal error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
