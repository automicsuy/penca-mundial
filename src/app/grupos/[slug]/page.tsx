import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { MatchCard } from "@/components/matches/MatchCard";
import { formatStage } from "@/lib/points";
import { ChevronLeft, Settings, Trophy, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MatchWithTeams, MatchStage } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const STAGE_ORDER: MatchStage[] = [
  "GROUP", "ROUND_OF_16", "QUARTER_FINAL",
  "SEMI_FINAL", "THIRD_PLACE", "FINAL",
];

export default async function GrupoPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // Fetch group
  const { data: group } = await supabase
    .from("groups")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (!group) notFound();

  // Verify membership
  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", group.id)
    .eq("user_id", user.id)
    .single();

  if (!membership) redirect("/dashboard");

  const isAdmin = membership.role === "admin";

  // Leaderboard
  const { data: leaderboard } = await supabase
    .from("leaderboard")
    .select("*")
    .eq("group_id", group.id)
    .order("rank", { ascending: true });

  // Recent/upcoming matches with user's predictions
  const { data: matches } = await supabase
    .from("matches")
    .select(`
      *,
      home_team:teams!matches_home_team_id_fkey(*),
      away_team:teams!matches_away_team_id_fkey(*)
    `)
    .order("starts_at", { ascending: true });

  // User predictions for this group
  const { data: predictions } = await supabase
    .from("predictions")
    .select("*")
    .eq("group_id", group.id)
    .eq("user_id", user.id);

  const predByMatch = new Map(
    (predictions ?? []).map((p) => [p.match_id, p])
  );

  // Group matches by stage
  const matchesByStage = new Map<string, MatchWithTeams[]>();
  (matches ?? []).forEach((m) => {
    const stage = m.stage;
    if (!matchesByStage.has(stage)) matchesByStage.set(stage, []);
    matchesByStage.get(stage)!.push(m as MatchWithTeams);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-[#0A2342] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-[#b8c9e0] hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <span className="font-black tracking-tight">
            <span className="text-[#FFD700]">{group.name}</span>
          </span>
        </div>
        {isAdmin && (
          <Link href={`/grupos/${params.slug}/admin`}>
            <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10 hover:text-white">
              <Settings className="w-4 h-4 mr-1" />
              Admin
            </Button>
          </Link>
        )}
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href={`/grupos/${params.slug}/predicciones`}>
            <div className="bg-[#0A2342] text-white rounded-xl p-4 flex items-center gap-3 hover:bg-[#0A2342]/90 transition-colors">
              <Calendar className="w-5 h-5 text-[#FFD700]" />
              <div>
                <p className="font-bold text-sm">Mis predicciones</p>
                <p className="text-xs text-[#b8c9e0]">Ver y editar</p>
              </div>
            </div>
          </Link>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-[#FFD700]" />
              <div>
                <p className="font-bold text-sm text-[#0A2342]">
                  {(leaderboard ?? []).find((e) => e.user_id === user.id)
                    ?.total_points ?? 0} pts
                </p>
                <p className="text-xs text-gray-500">
                  Puesto #{(leaderboard ?? []).find((e) => e.user_id === user.id)?.rank ?? "-"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Prizes */}
        {(group.prize_1st || group.prize_2nd || group.prize_3rd) && (
          <div className="bg-gradient-to-r from-[#FFD700]/10 to-[#FFD700]/5 border border-[#FFD700]/30 rounded-xl p-4">
            <h3 className="font-bold text-[#0A2342] mb-2 flex items-center gap-1">
              <Trophy className="w-4 h-4 text-[#FFD700]" /> Premios
            </h3>
            <div className="space-y-1 text-sm">
              {group.prize_1st && <p>🥇 <strong>1°:</strong> {group.prize_1st}</p>}
              {group.prize_2nd && <p>🥈 <strong>2°:</strong> {group.prize_2nd}</p>}
              {group.prize_3rd && <p>🥉 <strong>3°:</strong> {group.prize_3rd}</p>}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <LeaderboardTable
          groupId={group.id}
          initialEntries={(leaderboard ?? []) as any}
          prizes={{
            prize_1st: group.prize_1st,
            prize_2nd: group.prize_2nd,
            prize_3rd: group.prize_3rd,
          }}
        />

        {/* Fixture by stage */}
        {STAGE_ORDER.filter((s) => matchesByStage.has(s)).map((stage) => {
          const stageMatches = matchesByStage.get(stage) ?? [];
          // Show only upcoming or recently finished matches
          const now = Date.now();
          const visible = stageMatches.filter(
            (m) => Math.abs(new Date(m.starts_at).getTime() - now) < 7 * 24 * 60 * 60 * 1000
              || m.status === "LIVE"
              || m.status === "IN_PLAY"
          );
          if (visible.length === 0) return null;

          return (
            <div key={stage}>
              <h3 className="font-bold text-[#0A2342] mb-3 flex items-center gap-2">
                <span className="w-1 h-5 bg-[#C8102E] rounded-full" />
                {formatStage(stage)}
              </h3>
              <div className="space-y-2">
                {visible.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    prediction={predByMatch.get(match.id) ?? null}
                    showResult={match.status === "FINISHED"}
                    compact
                  />
                ))}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
