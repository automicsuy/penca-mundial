import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { UserRow } from "./UserRow";
import { ChevronLeft, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
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

  // Get all profiles
  const { data: profiles } = await db
    .from("profiles")
    .select("id, full_name, avatar_url, is_superadmin, can_create_groups")
    .order("full_name", { ascending: true });

  // Get commission totals per user (from approved payments)
  const { data: commissions } = await db
    .from("payments")
    .select("user_id, platform_commission")
    .eq("status", "approved");

  const commissionByUser = new Map<string, number>();
  for (const c of commissions ?? []) {
    commissionByUser.set(
      c.user_id,
      (commissionByUser.get(c.user_id) ?? 0) + (c.platform_commission ?? 0)
    );
  }

  const totalCommission = [...commissionByUser.values()].reduce((a, b) => a + b, 0);

  const users = (profiles ?? []).map(p => ({
    ...p,
    total_commission: commissionByUser.get(p.id) ?? 0,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-[#0A2342] text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/admin" className="text-[#b8c9e0] hover:text-white">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <p className="font-black">Usuarios y permisos</p>
          <p className="text-xs text-[#b8c9e0]">{users.length} usuarios registrados</p>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Commission summary */}
        {totalCommission > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-green-800">Comisión total acumulada</p>
              <p className="text-2xl font-black text-green-700">${totalCommission.toFixed(0)} UYU</p>
              <p className="text-xs text-green-600">5% de todos los pagos aprobados</p>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <p className="font-semibold mb-1">💡 Control de acceso</p>
          <p>Habilitá a usuarios para que puedan crear grupos de pago. Cada inscripción genera un <strong>5% de comisión</strong> para la plataforma (se registra en los pagos aprobados).</p>
        </div>

        {/* User list */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-bold text-[#0A2342] mb-3 text-sm">Usuarios registrados</h2>
          {users.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No hay usuarios aún.</p>
          ) : (
            users.map(u => <UserRow key={u.id} user={u} />)
          )}
        </div>
      </main>
    </div>
  );
}
