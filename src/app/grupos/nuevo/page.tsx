import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CreateGroupForm } from "@/components/groups/CreateGroupForm";
import { ChevronLeft } from "lucide-react";

export default async function NuevoGrupoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-[#0A2342] text-white px-4 py-3 flex items-center gap-3">
        <Link href="/dashboard" className="text-[#b8c9e0] hover:text-white">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <span className="font-black tracking-tight">
          Penca<span className="text-[#FFD700]">Mundial</span>
        </span>
      </nav>

      <main className="max-w-xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-[#0A2342]">Crear grupo</h1>
          <p className="text-gray-500 text-sm mt-1">
            Configurá tu penca y compartí el link con tus amigos.
          </p>
        </div>

        <CreateGroupForm />
      </main>
    </div>
  );
}
