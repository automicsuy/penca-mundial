"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { Trophy, Medal } from "lucide-react";
import type { LeaderboardEntry } from "@/lib/supabase/types";

interface LeaderboardTableProps {
  groupId: string;
  initialEntries: LeaderboardEntry[];
  prizes?: {
    prize_1st?: string | null;
    prize_2nd?: string | null;
    prize_3rd?: string | null;
  };
}

export function LeaderboardTable({
  groupId,
  initialEntries,
  prizes,
}: LeaderboardTableProps) {
  const [entries, setEntries] = useState(initialEntries);
  const supabase = createClient();

  // Subscribe to realtime updates on predictions
  useEffect(() => {
    const channel = supabase
      .channel(`leaderboard:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "predictions",
          filter: `group_id=eq.${groupId}`,
        },
        async () => {
          // Refetch leaderboard when any prediction in this group changes
          const { data } = await supabase
            .from("leaderboard")
            .select("*")
            .eq("group_id", groupId)
            .order("rank", { ascending: true });

          if (data) setEntries(data as LeaderboardEntry[]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, supabase]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-[#FFD700]" />
        <h2 className="font-bold text-[#0A2342]">Tabla de posiciones</h2>
      </div>

      {entries.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aún no hay predicciones</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {entries.map((entry, index) => (
            <LeaderboardRow
              key={entry.user_id}
              entry={entry}
              prize={
                index === 0
                  ? prizes?.prize_1st
                  : index === 1
                  ? prizes?.prize_2nd
                  : index === 2
                  ? prizes?.prize_3rd
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LeaderboardRow({
  entry,
  prize,
}: {
  entry: LeaderboardEntry;
  prize?: string | null;
}) {
  const rank = entry.rank;
  const isTop3 = rank <= 3;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${
        rank === 1 ? "bg-yellow-50" : rank === 2 ? "bg-gray-50" : ""
      }`}
    >
      {/* Rank */}
      <div className="w-8 text-center flex-shrink-0">
        {rank === 1 ? (
          <span className="text-lg">🥇</span>
        ) : rank === 2 ? (
          <span className="text-lg">🥈</span>
        ) : rank === 3 ? (
          <span className="text-lg">🥉</span>
        ) : (
          <span className="text-sm font-bold text-gray-400">#{rank}</span>
        )}
      </div>

      {/* Avatar */}
      <div className="flex-shrink-0">
        {entry.avatar_url ? (
          <Image
            src={entry.avatar_url}
            alt={entry.full_name ?? "User"}
            width={36}
            height={36}
            className="rounded-full"
            unoptimized
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-[#0A2342] flex items-center justify-center">
            <span className="text-white text-sm font-bold">
              {(entry.full_name ?? "?")[0].toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Name + prize */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#0A2342] truncate">
          {entry.full_name ?? "Usuario"}
        </p>
        {prize && (
          <p className="text-xs text-amber-600 truncate">🏆 {prize}</p>
        )}
        <p className="text-xs text-gray-400">
          {entry.predictions_with_points} aciertos de {entry.total_predictions}
        </p>
      </div>

      {/* Points */}
      <div className="text-right flex-shrink-0">
        <p
          className={`text-xl font-black ${
            isTop3 ? "text-[#0A2342]" : "text-gray-600"
          }`}
        >
          {entry.total_points}
        </p>
        <p className="text-xs text-gray-400">pts</p>
      </div>
    </div>
  );
}
