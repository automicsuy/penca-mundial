import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { MatchEditor } from "./MatchEditor";
import { ChevronLeft } from "lucide-react";
import { formatStage } from "@/lib/points";
import type { MatchStage } from "@/lib/points";

export const dynamic = "force-dynamic";

const STAGE_ORDER: MatchStage[] = [
  "GROUP", "ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "THIRD_PLACE", "FINAL",
];

const STATUS_FILTERS = [
  { value: "", label: "Todos" },
  { value: "SCHEDULED", label: "Programados" },
  { value: "TIMED", label: "Con horario" },
  { value: "LIVE", label: "En vivo" },
  { value: "FINISHED", label: "Finalizados" },
];

export default async function AdminMatchesPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles").select("is_superadmin").eq("id", user.id).single();
  if (!profile?.is_superadmin) redirect("/dashboard");

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  let query = db
    .from("matches")
    .select(`
      id, starts_at, stage, group_letter, matchday, status,
      home_score, away_score,
      home_team:home_team_id (name, short_name),
      away_team:away_team_id (name, short_name)
    `)
    .order("starts_at", { ascending: true });

  if (searchParams.status) query = query.eq("status", searchParams.status);

  const { data: matches } = await query;

  // Group by stage
  const byStage = new Map<string, NonNullable<typeof matches>>();
  for (const m of matches ?? []) {
    const list = byStage.get(m.stage) ?? [];
    list.push(m);
    byStage.set(m.stage, list);
  }
  const stages = STAGE_ORDER.filter(s => byStage.has(s));

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-[#0A2342] text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/admin" className="text-[#b8c9e0] hover:text-white">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <p className="font-black">Editor de partidos</p>
          <p className="text-xs text-[#b8c9e0]">
            {matches?.length ?? 0} partidos · sync automática siempre pisa
          </p>
        </div>
      </nav>

      {/* Status filter */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex gap-2 overflow-x-auto">
        {STATUS_FILTERS.map(f => (
          <Link
            key={f.value}
            href={f.value ? `/admin/matches?status=${f.value}` : "/admin/matches"}
            className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
              (searchParams.status ?? "") === f.value
                ? "bg-[#0A2342] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-6">
        {stages.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">No hay partidos. Sincronizá el fixture primero.</p>
            <Link href="/admin" className="text-[#0A2342] underline text-sm mt-2 inline-block">
              Ir al panel admin →
            </Link>
          </div>
        )}

        {stages.map(stage => (
          <section key={stage}>
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="h-px flex-1 bg-gray-200" />
              {formatStage(stage)}
              <span className="h-px flex-1 bg-gray-200" />
            </h2>
            <div className="space-y-2">
              {byStage.get(stage)!.map(match => (
                <MatchEditor key={match.id} match={match as any} />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
