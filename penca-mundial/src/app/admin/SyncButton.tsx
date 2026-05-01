"use client";

import { useState } from "react";
import { syncFixture } from "./actions";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";

export function SyncButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    total?: number;
    upserted?: number;
    errors?: string[];
    error?: string;
  } | null>(null);

  async function handleSync() {
    setLoading(true);
    setResult(null);
    const res = await syncFixture();
    setResult(res);
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <Button
        onClick={handleSync}
        disabled={loading}
        variant="navy"
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Sincronizando...
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4 mr-2" />
            Sincronizar fixture desde football-data.org
          </>
        )}
      </Button>

      {result && (
        <div
          className={`rounded-lg p-4 text-sm ${
            result.success
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          {result.success ? (
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-800">
                  ✓ Sincronización completada
                </p>
                <p className="text-green-700 mt-1">
                  {result.upserted} de {result.total} partidos sincronizados.
                </p>
                {result.errors && result.errors.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-yellow-700 cursor-pointer text-xs">
                      {result.errors.length} errores menores
                    </summary>
                    <ul className="mt-1 space-y-0.5">
                      {result.errors.map((e, i) => (
                        <li key={i} className="text-xs text-gray-600 font-mono">
                          {e}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-800">Error</p>
                <p className="text-red-700 mt-1 font-mono text-xs">
                  {result.error}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
