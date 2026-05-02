"use client";

import { useState } from "react";
import Image from "next/image";
import { User, CheckCircle, XCircle, Clock, Banknote } from "lucide-react";
import { toggleMemberEnabled, setMemberPaymentStatus } from "@/app/grupos/[slug]/admin/actions";

interface Props {
  memberId: string;
  userId: string;
  groupId: string;
  role: string;
  joinedAt: string;
  paymentStatus: string;
  paymentDate: string | null;
  enabled: boolean;
  showPayment: boolean;
  profile: { full_name?: string | null; avatar_url?: string | null } | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  free:     { label: "Sin cargo",  color: "bg-gray-100 text-gray-500" },
  pending:  { label: "Pendiente",  color: "bg-yellow-100 text-yellow-700" },
  approved: { label: "Pagó ✓",     color: "bg-green-100 text-green-700" },
  rejected: { label: "Rechazado",  color: "bg-red-100 text-red-700" },
};

export function MemberRow({
  memberId, userId, groupId, role, joinedAt,
  paymentStatus: initialPayStatus, paymentDate, enabled: initialEnabled,
  showPayment, profile,
}: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [payStatus, setPayStatus] = useState(initialPayStatus);
  const [loadingEnable, setLoadingEnable] = useState(false);
  const [loadingPay, setLoadingPay] = useState(false);

  const statusInfo = STATUS_LABELS[payStatus] ?? STATUS_LABELS.free;

  async function handleToggleEnabled() {
    setLoadingEnable(true);
    const fd = new FormData();
    fd.append("memberId", memberId);
    fd.append("groupId", groupId);
    fd.append("enabled", String(!enabled));
    const result = await toggleMemberEnabled(fd);
    if (!result?.error) setEnabled(!enabled);
    setLoadingEnable(false);
  }

  async function handleSetPayment(status: string) {
    setLoadingPay(true);
    const fd = new FormData();
    fd.append("memberId", memberId);
    fd.append("groupId", groupId);
    fd.append("status", status);
    const result = await setMemberPaymentStatus(fd);
    if (!result?.error) setPayStatus(status);
    setLoadingPay(false);
  }

  return (
    <div className={`px-5 py-3 ${!enabled && role !== "admin" ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="w-9 h-9 flex-shrink-0">
          {profile?.avatar_url ? (
            <Image src={profile.avatar_url} alt={profile.full_name ?? ""} width={36} height={36}
              className="rounded-full" unoptimized />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#0A2342] flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        {/* Name + date */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[#0A2342] truncate text-sm">
            {profile?.full_name ?? "Usuario"}
          </p>
          <p className="text-xs text-gray-400">
            Se unió {new Date(joinedAt).toLocaleDateString("es-UY")}
            {paymentDate && payStatus === "approved" && (
              <> · Pagó {new Date(paymentDate).toLocaleDateString("es-UY")}</>
            )}
          </p>
        </div>

        {/* Badges + controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {role === "admin" && (
            <span className="text-xs bg-[#FFD700] text-[#0A2342] font-bold px-2 py-0.5 rounded-full">Admin</span>
          )}

          {/* Payment status badge + dropdown */}
          {showPayment && role !== "admin" && (
            <div className="flex items-center gap-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              <select
                value={payStatus}
                onChange={(e) => handleSetPayment(e.target.value)}
                disabled={loadingPay}
                className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#0A2342] disabled:opacity-50"
                title="Cambiar estado de pago"
              >
                <option value="free">Sin cargo</option>
                <option value="pending">Pendiente</option>
                <option value="approved">Aprobado</option>
                <option value="rejected">Rechazado</option>
              </select>
            </div>
          )}

          {/* Enable/Disable toggle */}
          {role !== "admin" && (
            <button
              onClick={handleToggleEnabled}
              disabled={loadingEnable}
              title={enabled ? "Deshabilitar participante" : "Habilitar participante"}
              className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg border transition-colors disabled:opacity-50 ${
                enabled
                  ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                  : "border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100"
              }`}
            >
              {enabled ? (
                <><CheckCircle className="w-3.5 h-3.5" />Habilitado</>
              ) : (
                <><XCircle className="w-3.5 h-3.5" />Deshabilitado</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
