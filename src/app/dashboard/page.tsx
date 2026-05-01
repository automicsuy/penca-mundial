import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GroupCard } from "@/components/groups/GroupCard";
import { Button } from "@/components/ui/button";
import { Plus, LogOut, Settings } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  // Fetch user's groups with member counts
  const { data: memberships } = await supabase
    .from("group_members")
    .select(`
      role,
      groups (
        id, name, slug, description,
        prize_1st, prize_2nd, prize_3rd,
        created_by, created_at,
        pts_exact_groups, pts_winner_groups,
        pts_exact_knockout, pts_winner_knockout
      )
    `)
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  const groupIds =
    memberships?.map((m) => (m.groups as any)?.id).filter(Boolean) ?? [];

  // Member counts per group
  const memberCounts: Record<string, number> = {};
  if (groupIds.length > 0) {
    const { data: counts } = await supabase
      .from("group_members")
      .select("group_id")
      .in("group_id", groupIds);

    (counts ?? []).forEach((c) => {
      memberCounts[c.group_id] = (memberCounts[c.group_id] ?? 0) + 1;
    });
  }

  // Leaderboard positions for this user
  const { data: leaderboard } = await supabase
    .from("leaderboard")
    .select("group_id, total_points, rank")
    .eq("user_id", user.id)
    .in("group_id", groupIds);

  const lbByGroup = new Map(
    (leaderboard ?? []).map((l) => [l.group_id, l])
  );

  // Profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, is_superadmin")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <nav className="bg-[#0A2342] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚽</span>
          <span className="font-black tracking-tight">
            Penca<span className="text-[#FFD700]">Mundial</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#b8c9e0] hidden sm:block">
            {profile?.full_name ?? user.email}
          </span>
          {profile?.is_superadmin && (
            <Link href="/admin" title="Panel superadmin">
              <Settings className="w-5 h-5 text-[#FFD700] hover:text-white" />
            </Link>
          )}
          <form action="/auth/signout" method="post">
            <button className="text-[#b8c9e0] hover:text-white p-1" title="Cerrar sesión">
              <LogOut className="w-5 h-5" />
            </button>
          </form>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-[#0A2342]">Mis grupos</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {memberships?.length ?? 0} grupo
              {(memberships?.length ?? 0) !== 1 ? "s" : ""}
            </p>
          </div>
          <Link href="/grupos/nuevo">
            <Button variant="navy" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Nuevo grupo
            </Button>
          </Link>
        </div>

        {/* Groups list */}
        {!memberships || memberships.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-5xl mb-4 block">⚽</span>
            <h2 className="text-xl font-bold text-[#0A2342] mb-2">
              Todavía no estás en ningún grupo
            </h2>
            <p className="text-gray-500 mb-6">
              Creá tu propio grupo o pedí a alguien que te invite.
            </p>
            <Link href="/grupos/nuevo">
              <Button variant="navy">
                <Plus className="w-4 h-4 mr-2" />
                Crear primer grupo
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {memberships.map((m) => {
              const group = m.groups as any;
              if (!group) return null;
              const lb = lbByGroup.get(group.id);
              return (
                <GroupCard
                  key={group.id}
                  group={group}
                  memberCount={memberCounts[group.id] ?? 1}
           