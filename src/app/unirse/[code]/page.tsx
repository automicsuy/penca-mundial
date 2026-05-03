import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Trophy, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

interface JoinPageProps {
  params: { code: string };
}

export default async function UnirsePage({ params }: JoinPageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const code = params.code.toUpperCase();

  // Find invitation (include entry_fee info for payment status logic)
  const { data: invitation } = await supabase
    .from("invitations")
    .select(`
      *,
      groups (id, name, slug, description, prize_1st, prize_2nd, prize_3rd, entry_fee_required, entry_fee)
    `)
    .eq("code", code)
    .single();

  if (!invitation) {
    return <ErrorPage message="Este link de invitación no existe o ya no es válido." />;
  }

  const group = Array.isArray(invitation.groups)
    ? invitation.groups[0]
    : invitation.groups;

  if (!group) {
    return <ErrorPage message="El grupo de esta invitación ya no existe." />;
  }

  // Check expiry
  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
    return <ErrorPage message="Este link de invitación ha expirado." />;
  }

  // Check max uses
  if (invitation.uses_count >= invitation.max_uses) {
    return <ErrorPage message="Este link de invitación alcanzó el límite de usos." />;
  }

  // If not logged in, redirect to login with this URL as return
  if (!user) {
    const loginUrl = `/?redirect=${encodeURIComponent(`/unirse/${code}`)}`;
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A2342] to-[#1a3a5c] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
          <span className="text-4xl mb-3 block">⚽</span>
          <h1 className="text-xl font-black text-[#0A2342] mb-2">
            Te invitaron a <span className="text-[#C8102E]">{group.name}</span>
          </h1>
          <p className="text-gray-500 text-sm mb-5">
            Iniciá sesión para unirte al grupo y hacer tus predicciones.
          </p>
          <Link href={loginUrl}>
            <Button variant="navy" size="lg" className="w-full">
              Iniciar sesión para unirse
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Check if already a member
  const { data: existingMember } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", group.id)
    .eq("user_id", user.id)
    .single();

  if (existingMember) {
    redirect(`/grupos/${group.slug}`);
  }

  // Determine payment status and enabled state based on group config
  const requiresPayment = group.entry_fee_required === true;
  const memberPaymentStatus = requiresPayment ? "pending" : "free";
  const memberEnabled = !requiresPayment; // disabled until payment approved if fee required

  // Join the group
  const { error: joinError } = await supabase
    .from("group_members")
    .insert({
      group_id: group.id,
      user_id: user.id,
      role: "member",
      payment_status: memberPaymentStatus,
      enabled: memberEnabled,
    });

  if (joinError) {
    console.error("Join error:", JSON.stringify(joinError));
    return <ErrorPage message={`No se pudo unir al grupo: ${joinError.message}`} />;
  }

  // Increment uses count
  await supabase
    .from("invitations")
    .update({ uses_count: invitation.uses_count + 1 })
    .eq("id", invitation.id);

  redirect(`/grupos/${group.slug}?joined=1`);
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A2342] to-[#1a3a5c] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h1 className="text-xl font-bold text-[#0A2342] mb-2">
          No se pudo unir al grupo
        </h1>
        <p className="text-gray-500 text-sm mb-5">{message}</p>
        <Link href="/dashboard">
          <Button variant="navy" className="w-full">
            Ir al inicio
          </Button>
        </Link>
      </div>
    </div>
  );
}
