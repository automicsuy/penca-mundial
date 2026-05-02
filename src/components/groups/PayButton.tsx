"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";

export function PayButton({ groupSlug, amount }: { groupSlug: string; amount: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupSlug }),
      });
      const data = await res.json();
      if (data.initPoint) {
        window.location.href = data.initPoint;
      } else {
        setError(data.error || "Error al iniciar el pago");
        setLoading(false);
      }
    } catch {
      setError("Error de conexión");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <button onClick={handlePay} disabled={loading}
        className="w-full bg-[#009EE3] hover:bg-[#0088cc] disabled:opacity-60 text-white font-bold py-2.5 px-4 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors">
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" />Redirigiendo...</>
        ) : (
          <><CreditCard className="w-4 h-4" />Pagar ${amount} UYU con MercadoPago</>
        )}
      </button>
      {error && <p className="text-xs text-red-600 text-center">{error}</p>}
    </div>
  );
}
