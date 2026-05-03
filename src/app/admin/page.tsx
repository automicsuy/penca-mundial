import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SyncButton } from "./SyncButton";
import { ChevronLeft, Database, Users, Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_superadmin, full_name")
    .eq("id", user.id)
    .single();

  if (!profile?.is_superadmin) redirect("/dashboard");

  // Stats
  const [{ count: matchCount }, { count: teamCount }, { count: groupCount }] =
    await Promise.all([
      supabase.from("matches").select("*", { count: "exact", head: true }),
      supabase.from("teams").select("*", { count: "exact", head: true }),
      supabase.from("groups").select("*", { count: "exact", head: true }),
    ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-[#0A2342] text-white px-4 py-3 flex items-center gap-3">
        <Link href="/dashboard" className="text-[#b8c9e0] hover:text-white">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <p className="font-black">Panel Superadmin</p>
          <p className="text-xs text-[#b8c9e0]">{profile.full_name}</p>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={<Database className="w-5 h-5" />} label="Partidos" value={matchCount ?? 0} />
          <StatCard icon={<Trophy className="w-5 h-5" />} label="Equipos" value={teamCount ?? 0} />
          <StatCard icon={<Users className="w-5 h-5" />} label="Grupos" value={groupCount ?? 0} />
        </div>

        {/* Sync fixture */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-bold text-[#0A2342] mb-1">Sincronizar fixture</h2>
          <p className="text-sm text-gray-500 mb-4">
            Descarga todos los partidos del Mundial 2026 desde football-data.org y los guarda en la base de datos. Podés ejecutarlo cuantas veces quieras — hace upsert, no duplica.
          </p>
          <SyncButton />
        </div>

        {/* Quick links */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-bold text-[#0A2342] mb-3">Accesos rápidos</h2>
          <div className="space-y-2">
            <Link
              href="/admin/matches"
              className="flex items-center gap-2 text-sm font-semibold text-[#C8102E] hover:underline"
            >
              ⚽ Editor de partidos y resultados
            </Link>
            <Link
              href="/admin/users"
              className="flex items-center gap-2 text-sm font-semibold text-[#0A2342] hover:underline"
            >
              👥 Usuarios y comisiones
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-sm text-[#0A2342] hover:underline"
            >
              → Dashboard
            </Link>
            <Link
              href="/grupos/nuevo"
              className="flex items-center gap-2 text-sm text-[#0A2342] hover:underline"
            >
              → Crear nuevo grupo
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
      <div className="flex justify-center text-[#0A2342] mb-1">{icon}</div>
      <p className="text-2xl font-black text-[#0A2342]">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
