"use client";

import { useState } from "react";
import { updateGroupPaymentConfig } from "@/app/grupos/[slug]/admin/actions";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign } from "lucide-react";

interface PaymentConfigFormProps {
  groupId: string;
  initialRequired: boolean;
  initialFee: number;
}

export function PaymentConfigForm({ groupId, initialRequired, initialFee }: PaymentConfigFormProps) {
  const [required, setRequired] = useState(initialRequired);
  const [fee, setFee] = useState(initialFee || 0);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (required && (!fee || fee <= 0)) {
      setError("Ingresá un monto válido");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await updateGroupPaymentConfig(groupId, required, fee);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="fee_required"
          checked={required}
          onChange={(e) => { setRequired(e.target.checked); setSaved(false); }}
          className="w-4 h-4 accent-[#0A2342]"
        />
        <label htmlFor="fee_required" className="text-sm font-medium text-gray-700">
          Requiere pago de inscripción
        </label>
      </div>

      {required && (
        <div className="flex items-center gap-2 ml-7">
          <DollarSign className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="number"
            min={1}
            max={999999}
            value={fee}
            onChange={(e) => { setFee(parseInt(e.target.value) || 0); setSaved(false); }}
            placeholder="Ej: 500"
            className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-[#0A2342] focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
          />
          <span className="text-xs text-gray-500">pesos uruguayos</span>
        </div>
      )}

      {error && <p className="text-xs text-red-600 ml-7">{error}</p>}

      <div className="ml-7">
        <Button
          onClick={handleSave}
          disabled={loading}
          size="sm"
          variant={saved ? "outline" : "navy"}
          className={saved ? "border-green-500 text-green-600" : ""}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? "✓ Guardado" : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
