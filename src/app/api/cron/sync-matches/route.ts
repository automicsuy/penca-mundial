import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getWorldCupMatches,
  getLiveAndTodayMatches,
  mapStage,
  type FDMatch,
} from "@/lib/football-api";

// Initialize service-role client (bypasses RLS for cron writes)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export const maxDuration = 60; // Vercel Pro: 60s; Hobby: 10s

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getServiceClient();

    // Determine sync scope: full sync once a day, today-only otherwise
    const hour = new Date().getHours();
    const isFullSync = hour === 6; // Full sync at 6 AM UTC

    let matches: FDMatch[];
    if (isFullSync) {
      matches = await getWorldCupMatches();
    } else {
      matches = await getLiveAndTodayMatches();
    }

    if (matches.length === 0) {
      return NextResponse.json({ synced: 0, message: "No matches to sync" });
    }

    // Get existing team mappings (api_id → DB id)
    const { data: teams } = await supabase
      .from("teams")
      .select("id, api_id, name");

    const teamByApiId = new Map(
      (teams ?? []).filter((t) => t.api_id).map((t) => [t.api_id!, t.id])
    );
    const teamByName = new Map(
      (teams ?? []).map((t) => [t.name.toLowerCase(), t.id])
    );

    let synced = 0;
    let upserted = 0;
    const errors: string[] = [];

    for (const match of matches) {
      try {
        // Resolve team IDs
        let homeId =
          teamByApiId.get(match.homeTeam.id) ??
          teamByName.get(match.homeTeam.name.toLowerCase());
        let awayId =
          teamByApiId.get(match.awayTeam.id) ??
          teamByName.get(match.awayTeam.name.toLowerCase());

        // Upsert unknown teams
        if (!homeId) {
          const { data: newTeam } = await supabase
            .from("teams")
            .upsert({
              api_id: match.homeTeam.id,
              name: match.homeTeam.name,
              short_name: match.homeTeam.tla,
              flag_url: match.homeTeam.crest,
            })
            .select("id")
            .single();
          homeId = newTeam?.id;
        }

        if (!awayId) {
          const { data: newTeam } = await supabase
            .from("teams")
            .upsert({
              api_id: match.awayTeam.id,
              name: match.awayTeam.name,
              short_name: match.awayTeam.tla,
              flag_url: match.awayTeam.crest,
            })
            .select("id")
            .single();
          awayId = newTeam?.id;
        }

        const stage = mapStage(match.stage);
        const groupLetter = match.group?.replace("GROUP_", "") ?? null;

        // Map status
        const status = match.status === "IN_PLAY" ? "LIVE" : match.status;

        const matchData = {
          api_id: match.id,
          home_team_id: homeId ?? null,
          away_team_id: awayId ?? null,
          starts_at: match.utcDate,
          stage,
          group_letter: groupLetter,
          matchday: match.matchday,
          status,
          home_score: match.score.fullTime.home,
          away_score: match.score.fullTime.away,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from("matches")
          .upsert(matchData, { onConflict: "api_id" });

        if (error) {
          errors.push(`Match ${match.id}: ${error.message}`);
        } else {
          upserted++;
        }

        synced++;
      } catch (err) {
        errors.push(`Match ${match.id}: ${String(err)}`);
      }
    }

    console.log(
      `[sync-matches] Processed ${synced} matches, upserted ${upserted}, errors: ${errors.length}`
    );

    // Reset points_earned to 0 for predictions on non-FINISHED matches.
    // Ensures manually-set test results don't persist after a real sync.
    const { data: nonFinished } = await supabase
      .from("matches")
      .select("id")
      .not("status", "in", '("FINISHED")');

    let pointsReset = 0;
    if (nonFinished && nonFinished.length > 0) {
      const ids = nonFinished.map((m: { id: string }) => m.id);
      const { count } = await supabase
        .from("predictions")
        .update({ points_earned: 0, updated_at: new Date().toISOString() })
        .in("match_id", ids)
        .select("*", { count: "exact", head: true });
      pointsReset = count ?? 0;
    }

    return NextResponse.json({
      synced,
      upserted,
      pointsReset,
      errors: errors.slice(0, 10),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[sync-matches] Fatal error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
