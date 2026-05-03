"use client";

import { useState } from "react";
import { toggleCanCreateGroups } from "./actions";
import { Loader2 } from "lucide-react";

interface UserRowProps {
  user: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    is_superadmin: boolean;
    can_create_groups: boolean;
    email?: string;
    total_commission: number;
  };
}

export function UserRow({ user }: UserRowProps) {
  const [enabled, setEnabled] = useState(user.can_create_groups);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const next = !enabled;
    const res = await toggleCanCreateGroups(user.id, next);
    if (!res.error) setEnabled(next);
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      {/* Avatar */}
      <div className="flex-shrink-0">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-[#0A2342] flex items-center justify-center">
            <span className="text-white text-sm font-bold">
              {(user.full_name ?? "?")[0].toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Name + badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-[#0A2342] text-sm truncate">
            {user.full_name ?? "Sin nombre"}
          </p>
          {user.is_superadmin && (
            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">superadmin</span>
          )}
        </div>
        {user.total_commission > 0 && (
          <p className="text-xs text-green-600 font-medium">
            💰 Comisión acumulada: ${user.total_commission.toFixed(0)} UYU
          </p>
        )}
      </div>

      {/* Toggle */}
      {!user.is_superadmin && (
        <button
          onClick={toggle}
          disabled={loading}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
            enabled
              ? "bg-green-100 text-green-700 hover:bg-green-200"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
          {enabled ? "✓ Puede crear grupos" : "Sin permiso"}
        </button>
      )}
      {user.is_superadmin && (
        <span className="text-xs text-purple-500 font-medium">Acceso total</span>
      )}
    </div>
  );
}
