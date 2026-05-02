import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { InviteManager } from "@/components/groups/InviteManager";
import { MemberRow } from "@/components/groups/MemberRow";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPage({ params }: { params: { slug: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: group } = await supabase.from("groups").select("*").eq("slug", params.slug).single();
  if (!group) notFound();

  const { data: membership } = await supabase
    .from("group_members").select("role").eq("group_id", group.id).eq("user_id", user.id).single();
  if (!membership || membership.role !== "admin") redirect(`/grupos/${params.slug}`);

  const { data: members } = await supabase
    .from("group_members")
    .select("id, role, joined_at, payment_status, payment_date, enabled, user_id, profiles (id, full_name, avatar_url)")
    .eq("group_id", group.id)
    .order("joined_at", { ascending: true });

  const { data: invitations } = await supabase
    .from("invitations").select("*").eq("group_id", group.id).order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-[#0A2342] text-white px-4 py-3 flex items-center gap-3">
        <Link href={`/grupos/${params.slug}`} className="text-[#b8c9e0] hover:text-white">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <p className="font-black">Admin</p>
          <p className="text-xs text-[#b8c9e0]">{group.name}</p>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Group config */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-bold text-[#0A2342] mb-3">Configuración del grupo</h2>
          <div className="grid grid-cols-2 gap-3">
            <PtsBadge label="Exacto grupos" value={group.pts_exact_groups} />
            <PtsBadge label="Ganador grupos" value={group.pts_winner_groups} />
            <PtsBadge label="Exacto eliminatorias" value={group.pts_exact_knockout} />
            <PtsBadge label="Ganador eliminatorias" value={group.pts_winner_knockout} />
          </div>
          {group.entry_fee_required && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Inscripción:</span>
              <span className="bg-[#009EE3]/10 text-[#009EE3] font-bold text-sm px-2 py-0.5 rounded-full">
                ${group.entry_fee} UYU
              </span>
            </div>
          )}
          {!group.entry_fee_required && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <span className="text-xs text-gray-400">Sin pago de inscripción</span>
            </div>
          )}
          {(group.prize_1st || group.prize_2nd || group.prize_3rd) && (
            <div className="mt-3 space-y-1">
              {group.prize_1st && <p className="text-sm">🥇 {group.prize_1st}</p>}
              {group.prize_2nd && <p className="text-sm">🥈 {group.prize_2nd}</p>}
              {group.prize_3rd && <p className="text-sm">🥉 {group.prize_3rd}</p>}
            </div>
          )}
        </div>

        {/* Invitations */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <InviteManager groupId={group.id} initialInvitations={invitations ?? []} />
        </div>

        {/* Members with payment management */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-[#0A2342]">Participantes ({members?.length ?? 0})</h2>
            {group.entry_fee_required && (
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />Pagó
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-400" />Pendiente
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-gray-300" />Sin pago
                </span>
              </div>
            )}
          </div>
          <div className="divide-y divide-gray-100">
            {(members ?? []).map((member) => {
              const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
              return (
                <MemberRow
                  key={member.id}
                  memberId={member.id}
                  userId={member.user_id}
                  groupId={group.id}
                  role={member.role}
                  joinedAt={member.joined_at}
                  paymentStatus={member.payment_status}
                  paymentDate={member.payment_date}
                  enabled={member.enabled}
                  showPayment={group.entry_fee_required}
                  profile={profile}
                />
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

function PtsBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-black text-[#0A2342] mt-0.5">{value} pts</p>
    </div>
  );
}
