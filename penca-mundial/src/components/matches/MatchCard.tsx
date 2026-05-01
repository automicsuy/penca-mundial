import Image from "next/image";
import { formatDate } from "@/lib/utils";
import { formatStage } from "@/lib/points";
import type { MatchWithTeams, Prediction } from "@/lib/supabase/types";

interface MatchCardProps {
  match: MatchWithTeams;
  prediction?: Prediction | null;
  showResult?: boolean;
  compact?: boolean;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  SCHEDULED: { label: "Programado", color: "text-gray-500" },
  TIMED: { label: "Próximo", color: "text-blue-600" },
  LIVE: { label: "EN VIVO", color: "text-red-600" },
  IN_PLAY: { label: "EN VIVO", color: "text-red-600" },
  PAUSED: { label: "Entretiempo", color: "text-orange-500" },
  FINISHED: { label: "Final", color: "text-gray-600" },
  POSTPONED: { label: "Postergado", color: "text-yellow-600" },
  CANCELLED: { label: "Cancelado", color: "text-gray-400" },
};

export function MatchCard({
  match,
  prediction,
  showResult = false,
  compact = false,
}: MatchCardProps) {
  const isLive = match.status === "LIVE" || match.status === "IN_PLAY";
  const isFinished = match.status === "FINISHED";
  const hasResult = isFinished && match.home_score !== null && match.away_score !== null;
  const statusInfo = STATUS_LABELS[match.status] ?? { label: match.status, color: "text-gray-500" };

  return (
    <div
      className={`bg-white rounded-xl border transition-all ${
        isLive
          ? "border-red-300 shadow-sm shadow-red-100"
          : "border-gray-200 hover:border-gray-300"
      } ${compact ? "p-3" : "p-4"}`}
    >
      {/* Header */}
      {!compact && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gray-400 font-medium">
            {formatStage(match.stage)}
            {match.group_letter && ` · Grupo ${match.group_letter}`}
          </span>
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-red-600">EN VIVO</span>
              </span>
            )}
            <span className={`text-xs font-medium ${statusInfo.color}`}>
              {!isLive && statusInfo.label}
            </span>
          </div>
        </div>
      )}

      {/* Match row */}
      <div className="flex items-center gap-2">
        {/* Home team */}
        <div className="flex-1 flex items-center justify-end gap-2">
          <span className={`font-bold text-[#0A2342] text-right leading-tight ${compact ? "text-sm" : "text-base"}`}>
            {match.home_team?.short_name ?? match.home_team?.name ?? "TBD"}
          </span>
          <TeamFlag team={match.home_team} size={compact ? 20 : 28} />
        </div>

        {/* Score / vs */}
        <div className="flex-shrink-0 text-center min-w-[60px]">
          {showResult && hasResult ? (
            <div className="flex items-center justify-center gap-1">
              <span className={`font-black text-[#0A2342] ${compact ? "text-lg" : "text-2xl"}`}>
                {match.home_score}
              </span>
              <span className="text-gray-400 font-bold">-</span>
              <span className={`font-black text-[#0A2342] ${compact ? "text-lg" : "text-2xl"}`}>
                {match.away_score}
              </span>
            </div>
          ) : isLive && hasResult ? (
            <div className="flex items-center justify-center gap-1">
              <span className="font-black text-red-600 text-2xl">{match.home_score}</span>
              <span className="text-red-400 font-bold">-</span>
              <span className="font-black text-red-600 text-2xl">{match.away_score}</span>
            </div>
          ) : (
            <div>
              <p className="text-gray-400 font-bold text-xs">VS</p>
              {!compact && (
                <p className="text-gray-500 text-xs mt-0.5">
                  {new Date(match.starts_at).toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Away team */}
        <div className="flex-1 flex items-center gap-2">
          <TeamFlag team={match.away_team} size={compact ? 20 : 28} />
          <span className={`font-bold text-[#0A2342] leading-tight ${compact ? "text-sm" : "text-base"}`}>
            {match.away_team?.short_name ?? match.away_team?.name ?? "TBD"}
          </span>
        </div>
      </div>

      {/* Prediction badge */}
      {prediction && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500">Tu predicción:</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#0A2342]">
              {prediction.home_score_pred} - {prediction.away_score_pred}
            </span>
            {isFinished && prediction.points_earned > 0 && (
              <span className="text-xs font-bold text-white bg-green-500 px-2 py-0.5 rounded-full">
                +{prediction.points_earned} pts
              </span>
            )}
            {isFinished && prediction.points_earned === 0 && (
              <span className="text-xs text-gray-400">0 pts</span>
            )}
          </div>
        </div>
      )}

      {/* Date */}
      {!compact && !isFinished && !isLive && (
        <p className="mt-2 text-xs text-gray-400 text-center">
          {formatDate(match.starts_at)}
        </p>
      )}
    </div>
  );
}

function TeamFlag({
  team,
  size,
}: {
  team: { flag_url?: string | null; name: string } | null;
  size: number;
}) {
  if (!team?.flag_url) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0"
      >
        ?
      </div>
    );
  }

  return (
    <Image
      src={team.flag_url}
      alt={team.name}
      width={size}
      height={size}
      className="rounded-sm object-cover flex-shrink-0"
      unoptimized
    />
  );
}
