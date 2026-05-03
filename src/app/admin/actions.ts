"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import {
  getWorldCupMatches,
  getWorldCupTeams,
  mapStage,
  type FDMatch,
} from "@/lib/football-api";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function syncFixture() {
  // Only superadmin can call this
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_superadmin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_superadmin) return { error: "Sin permisos" };

  try {
    const db = getServiceClient();

    // 1. Sync teams first
    let teamsFromApi: Awaited<ReturnType<typeof getWorldCupTeams>> = [];
    try {
      teamsFromApi = await getWorldCupTeams();
      for (const team of teamsFromApi) {
        await db.from("teams").upsert(
          {
            api_id: team.id,
            name: team.name,
            short_name: team.tla,
            flag_url: team.crest,
          },
          { onConflict: "api_id" }
        );
      }
    } catch {
      // Teams sync is best-effort; continue with matches
    }

    // 2. Get all World Cup matches
    const matches: FDMatch[] = await getWorldCupMatches();

    if (matches.length === 0) {
      return { error: "La API no devolvió partidos. Verificá que el torneo esté disponible en football-data.org (competition ID 2000)." };
    }

    // 3. Load team mappings
    const { data: teams } = await db
      .from("teams")
      .select("id, api_id, name");

    const teamByApiId = new Map(
      (teams ?? []).filter((t) => t.api_id).map((t) => [t.api_id!, t.id])
    );
    const teamByName = new Map(
      (teams ?? []).map((t) => [t.name.toLowerCase(), t.id])
    );

    let upserted = 0;
    const errors: string[] = [];

    for (const match of matches) {
      try {
        let homeId =
          teamByApiId.get(match.homeTeam.id) ??
          teamByName.get(match.homeTeam.name.toLowerCase());
        let awayId =
          teamByApiId.get(match.awayTeam.id) ??
          teamByName.get(match.awayTeam.name.toLowerCase());

        // Upsert unknown teams on-the-fly
        if (!homeId) {
          const { data: t } = await db
            .from("teams")
            .upsert(
              { api_id: match.homeTeam.id, name: match.homeTeam.name, short_name: match.homeTeam.tla, flag_url: match.homeTeam.crest },
              { onConflict: "api_id" }
            )
            .select("id")
            .single();
          homeId = t?.id;
        }
        if (!awayId) {
          const { data: t } = await db
            .from("teams")
            .upsert(
              { api_id: match.awayTeam.id, name: match.awayTeam.name, short_name: match.awayTeam.tla, flag_url: match.awayTeam.crest },
              { onConflict: "api_id" }
            )
            .select("id")
            .single();
          awayId = t?.id;
        }

        const { error } = await db.from("matches").upsert(
          {
            api_id: match.id,
            home_team_id: homeId ?? null,
            away_team_id: awayId ?? null,
            starts_at: match.utcDate,
            stage: mapStage(match.stage),
            group_letter: match.group?.replace("GROUP_", "") ?? null,
            matchday: match.matchday,
            status:
              match.status === "IN_PLAY" ? "LIVE" : match.status,
            home_score: match.score.fullTime.home,
            away_score: match.score.fullTime.away,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "api_id" }
        );

        if (error) {
          errors.push(`Partido ${match.id}: ${error.message}`);
        } else {
          upserted++;
        }
      } catch (err) {
        errors.push(`Partido ${match.id}: ${String(err)}`);
      }
    }

    // After sync: reset points_earned to 0 for predictions on non-FINISHED matches.
    // This handles the case where a manually-set test result gets overwritten by the sync.
    const { data: nonFinished } = await db
      .from("matches")
      .select("id")
      .not("status", "in", '("FINISHED")');

    if (nonFinished && nonFinished.length > 0) {
      const ids = nonFinished.map((m: { id: string }) => m.id);
      await db
        .from("predictions")
        .update({ points_earned: 0, updated_at: new Date().toISOString() })
        .in("match_id", ids);
    }

    return {
      success: true,
      total: matches.length,
      upserted,
      errors: errors.slice(0, 5),
    };
  } catch (err) {
    return { error: String(err) };
  }
}
