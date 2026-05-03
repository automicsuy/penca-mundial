"use client";

import { useState } from "react";
import { createInvitation, deleteInvitation } from "@/app/grupos/[slug]/admin/actions";
import { Button } from "@/components/ui/button";
import { Copy, Check, Loader2, Plus, Trash2 } from "lucide-react";
import type { Invitation } from "@/lib/supabase/types";

interface InviteManagerProps {
  groupId: string;
  initialInvitations: Invitation[];
}

export function InviteManager({ groupId, initialInvitations }: InviteManagerProps) {
  const [invitations, setInvitations] = useState(initialInvitations);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  async function handleCreateInvite() {
    setLoading(true);
    const result = await createInvitation(groupId);
    if (!result.error && result.data) {
      setInvitations((prev) => [...prev, result.data as Invitation]);
    }
    setLoading(false);
  }

  async function handleDeleteInvite(id: string) {
    await deleteInvitation(id);
    setInvitations((prev) => prev.filter((inv) => inv.id !== id));
  }

  async function copyLink(code: string) {
    // Always use current origin so the link works from any environment
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/unirse/${code}`;
    await navigator.clipboard.writeText(url);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[#0A2342]">Links de invitación</h3>
        <Button onClick={handleCreateInvite} disabled={loading} variant="navy" size="sm">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" />Nuevo link</>}
        </Button>
      </div>

      {invitations.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">No hay links de invitación activos.</p>
      ) : (
        <div className="space-y-2">
          {invitations.map((inv) => {
            const origin = typeof window !== "undefined" ? window.location.origin : "";
            const url = `${origin}/unirse/${inv.code}`;
            const isCopied = copiedCode === inv.code;
            const isExpired = inv.expires_at && new Date(inv.expires_at) < new Date();

            return (
              <div key={inv.id} className={`flex items-center gap-2 p-3 rounded-lg border ${isExpired ? "border-gray-200 bg-gray-50 opacity-60" : "border-gray-200 bg-white"}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-gray-600 truncate">{url}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Usado {inv.uses_count}/{inv.max_uses} veces{isExpired && " · Expirado"}
                  </p>
                </div>
                <button onClick={() => copyLink(inv.code)} className="p-2 text-gray-500 hover:text-[#0A2342] transition-colors" title="Copiar link">
                  {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </button>
                <button onClick={() => handleDeleteInvite(inv.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Eliminar link">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
