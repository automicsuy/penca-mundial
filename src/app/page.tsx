import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginButtons } from "@/components/auth/LoginButtons";
import { Trophy, Users, Zap, Star } from "lucide-react";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect(searchParams.redirect ?? "/dashboard");
  }

  const redirectTo = searchParams.redirect ?? "/dashboard";

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0A2342] via-[#0A2342] to-[#1a3a5c]">
      {/* Header */}
      <header className="p-6 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <span className="text-3xl">⚽</span>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Penca<span className="text-[#FFD700]">Mundial</span>
          </h1>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="max-w-md w-full">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 bg-[#C8102E] text-white text-sm font-bold px-4 py-1.5 rounded-full">
              <Star className="w-3.5 h-3.5 fill-current" />
              FIFA WORLD CUP 2026
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl font-black text-white text-center mb-4 leading-tight">
            Hacé tu penca del{" "}
            <span className="text-[#FFD700]">Mundial</span>
          </h2>

          <p className="text-[#b8c9e0] text-center mb-8 text-lg leading-relaxed">
            Predecí resultados, competí con amigos y seguí el
            torneo en tiempo real.
          </p>

          {/* Features */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { icon: Users, label: "Grupos privados" },
              { icon: Zap, label: "Tiempo real" },
              { icon: Trophy, label: "Puntos por grupo" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="bg-white/10 rounded-xl p-3 text-center"
              >
                <Icon className="w-5 h-5 text-[#FFD700] mx-auto mb-1" />
                <p className="text-white text-xs font-medium">{label}</p>
              </div>
            ))}
          </div>

          {/* Login card */}
          <div className="bg-white rounded-2xl p-6 shadow-2xl">
            <h3 className="font-bold text-[#0A2342] text-center mb-5 text-lg">
              Iniciar sesión
            </h3>
            <LoginButtons redirectTo={redirectTo} />
            <p className="text-xs text-gray-400 text-center mt-4">
              Al ingresar aceptás los términos de uso. Solo usuarios con
              invitación pueden unirse a grupos privados.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center">
        <p className="text-[#4a6a8a] text-xs">
          USA 🇺🇸 · CANADA 🇨🇦 · MEXICO 🇲🇽 · 11 JUN – 19 JUL 2026
        </p>
      </footer>
    </div>
  );
}
