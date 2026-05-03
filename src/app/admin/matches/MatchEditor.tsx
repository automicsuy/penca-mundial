"use client";

import { useState } from "react";
import { updateMatch } from "./actions";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

const STATUSES = [
  { value: "SCHEDULED", label: "Programado" },
  { value: "TIMED", label: "Con horario" },
  { value: "LIVE", label: "En vivo" },
  { value: "FINISHED", label: "Finalizado" },
  { value: "POSTPONED", label: "Postergado" },
  { value: "CANCELLED", label: "Cancelado" },
];

interface MatchEditorProps {
  match: {
    id: string;
    status: string;
    home_score: number | null;
    away_score: number | null;
    home_team: { name: string; short_name: string } | null;
    away_team: { name: string; short_name: string } | null;
    starts_at: string;
    stage: string;
    group_letter: string | null;
  };
}

export function MatchEditor({ match }: MatchEditorProps) {
  const [homeScore, setHomeScore] = useState(
    match.home_score !== null ? String(match.home_score) : ""
  );
  const [awayScore, setAwayScore] = useState(
    match.away_score !== null ? String(match.away_score) : ""
  );
  const [status, setStatus] = useState(match.status);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<"ok" | "err" | null>(null);
  const [errMsg, setErrMsg] = useState("");

  async function handleSave() {
    setSaving(true);
    setResult(null);
    const res = await updateMatch(
      match.id,
      homeScore !== "" ? parseInt(homeScore) : null,
      awayScore !== "" ? parseInt(awayScore) : null,
      status
    );
    setSaving(false);
    if (res.error) {
      setErrMsg(res.error);
      setResult("err");
    } else {
      setResult("ok");
    }
    setTimeout(() => setResult(null), 3000);
  }

  const homeName = match.home_team?.short_name ?? match.home_team?.name ?? "TBD";
  const awayName = match.away_team?.short_name ?? match.away_team?.name ?? "TBD";
  const date = new Date(match.starts_at).toLocaleString("es-UY", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });

  const statusColors: Record<string, string> = {
    LIVE: "bg-red-100 text-red-700",
    FINISHED: "bg-green-100 text-green-700",
    SCHEDULED: "bg-gray-100 text-gray-500",
    TIMED: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      {/* Date + group */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400">{date}</span>
        {match.group_letter && (
          <span className="text-xs bg-[#0A2342]/10 text-[#0A2342] px-2 py-0.5 rounded-full font-medium">
            Grupo {match.group_letter}
          </span>
        )}
      </div>

      {/* Teams + score inputs */}
      <div className="flex items-center gap-2 mb-3">
        <span className="flex-1 font-semibold text-[#0A2342] text-right text-sm truncate">{homeName}</span>
        <div className="flex items-center gap-1 flex-shrink-0">
          <input
            type="number" min="0" max="99"
            value={homeScore}
            onChange={e => setHomeScore(e.target.value)}
            className="w-11 text-center border border-gray-300 rounded-lg py-1.5 font-bold text-[#0A2342] text-sm focus:outline-none focus:border-[#0A2342] focus:ring-1 focus:ring-[#0A2342]"
            placeholder="-"
          />
          <span className="text-gray-400 font-bold text-sm">:</span>
          <input
            type="number" min="0" max="99"
            value={awayScore}
            onChange={e => setAwayScore(e.target.value)}
            className="w-11 text-center border border-gray-300 rounded-lg py-1.5 font-bold text-[#0A2342] text-sm focus:outline-none focus:border-[#0A2342] focus:ring-1 focus:ring-[#0A2342]"
            placeholder="-"
          />
        </div>
        <span className="flex-1 font-semibold text-[#0A2342] text-sm truncate">{awayName}</span>
      </div>

      {/* Status + save button */}
      <div className="flex items-center gap-2">
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="flex-1 text-xs border border-gray-300 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:border-[#0A2342]"
        >
          {STATUSES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-1.5 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors whitespace-nowrap ${
            result === "ok" ? "bg-green-600" : result === "err" ? "bg-red-600" : "bg-[#0A2342] hover:bg-[#1a3a5c]"
          }`}
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> :
           result === "ok" ? <CheckCircle className="w-3 h-3" /> :
           result === "err" ? <AlertCircle className="w-3 h-3" /> : null}
          {saving ? "Guardando..." : result === "ok" ? "¡Guardado!" : result === "err" ? "Error" : "Guardar y recalcular"}
        </button>
      </div>
      {result === "err" && errMsg && (
        <p className="text-xs text-red-500 mt-1">{errMsg}</p>
      )}
    </div>
  );
}
