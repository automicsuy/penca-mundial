"use client";

import { useState, useRef } from "react";
import { createGroup } from "@/app/grupos/nuevo/actions";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function CreateGroupForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feeRequired, setFeeRequired] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await createGroup(formData);
    if (result?.error) setError(result.error);
    setLoading(false);
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Basic info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-bold text-[#0A2342] text-lg">Información del grupo</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del grupo *</label>
          <input type="text" name="name" required maxLength={60}
            placeholder="Ej: La penca de la oficina"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2342] focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
          <textarea name="description" maxLength={200} placeholder="Agrega una descripción..." rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2342] focus:border-transparent resize-none" />
        </div>
      </div>

      {/* Points config */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <h2 className="font-bold text-[#0A2342] text-lg">Sistema de puntos</h2>
          <p className="text-sm text-gray-500 mt-1">Configurá cuántos puntos vale cada tipo de acierto.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <PointInput label="Resultado exacto (grupos)" name="pts_exact_groups" defaultValue={3} />
          <PointInput label="Ganador/empate (grupos)" name="pts_winner_groups" defaultValue={1} />
          <PointInput label="Resultado exacto (eliminatorias)" name="pts_exact_knockout" defaultValue={6} />
          <PointInput label="Ganador (eliminatorias)" name="pts_winner_knockout" defaultValue={2} />
        </div>
      </div>

      {/* Payment / Inscripción */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <h2 className="font-bold text-[#0A2342] text-lg">Inscripción / Pago</h2>
          <p className="text-sm text-gray-500 mt-1">Activá si los participantes deben pagar para participar.</p>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="entry_fee_required"
            id="entry_fee_required"
            className="w-4 h-4 accent-[#0A2342]"
            checked={feeRequired}
            onChange={(e) => setFeeRequired(e.target.checked)}
          />
          <span className="text-sm font-medium text-gray-700">
            Este grupo requiere pago de inscripción (MercadoPago)
          </span>
        </label>
        {feeRequired && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto de inscripción (UYU) *
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-500">$</span>
              <input type="number" name="entry_fee" min={1} max={99999}
                required={feeRequired} placeholder="Ej: 500"
                className="w-36 border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-[#0A2342] focus:outline-none focus:ring-2 focus:ring-[#0A2342] focus:border-transparent" />
              <span className="text-xs text-gray-500">pesos uruguayos</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Los participantes pagan vía MercadoPago. El admin los habilita manualmente al confirmar el pago.
            </p>
          </div>
        )}
      </div>

      {/* Prizes */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <h2 className="font-bold text-[#0A2342] text-lg">Premios (opcional)</h2>
          <p className="text-sm text-gray-500 mt-1">Definí qué se lleva cada puesto.</p>
        </div>
        {[
          { label: "🥇 Primer puesto", name: "prize_1st" },
          { label: "🥈 Segundo puesto", name: "prize_2nd" },
          { label: "🥉 Tercer puesto", name: "prize_3rd" },
        ].map(({ label, name }) => (
          <div key={name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input type="text" name={name} maxLength={100} placeholder="Ej: 1 botella de whisky"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2342] focus:border-transparent" />
          </div>
        ))}
      </div>

      <Button type="submit" variant="navy" size="lg" className="w-full" disabled={loading}>
        {loading ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" />Creando grupo...</>) : "Crear grupo"}
      </Button>
    </form>
  );
}

function PointInput({ label, name, defaultValue }: { label: string; name: string; defaultValue: number }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input type="number" name={name} min={0} max={20} defaultValue={defaultValue}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-[#0A2342] focus:outline-none focus:ring-2 focus:ring-[#0A2342] focus:border-transparent" />
    </div>
  );
}
