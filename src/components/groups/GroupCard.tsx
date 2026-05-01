import Link from "next/link";
import { Trophy, Users, ChevronRight } from "lucide-react";
import type { Group } from "@/lib/supabase/types";

interface GroupCardProps {
  group: Group;
  memberCount: number;
  userPoints?: number;
  userRank?: number;
  isAdmin?: boolean;
}

export function GroupCard({
  group,
  memberCount,
  userPoints,
  userRank,
  isAdmin,
}: GroupCardProps) {
  return (
    <Link href={`/grupos/${group.slug}`}>
      <div className="group relative bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-[#0A2342]/30 transition-all duration-200 cursor-pointer">
        {isAdmin && (
          <span className="absolute top-3 right-3 text-xs bg-[#FFD700] text-[#0A2342] font-bold px-2 py-0.5 rounded-full">
            Admin
          </span>
        )}

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0A2342] flex items-center justify-center flex-shrink-0">
            <Trophy className="w-5 h-5 text-[#FFD700]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-[#0A2342] text-lg truncate group-hover:text-[#C8102E] transition-colors">
              {group.name}
            </h3>
            {group.description && (
              <p className="text-sm text-gray-500 truncate mt-0.5">
                {group.description}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Users className="w-4 h-4" />
              <span>{memberCount} participantes</span>
            </div>
            {userRank !== undefined && userPoints !== undefined && (
              <div className="flex items-center gap-1 text-sm">
                <span className="font-bold text-[#0A2342]">
                  #{userRank}
                </span>
                <span className="text-gray-400">·</span>
                <span className="text-[#C8102E] font-semibold">
                  {userPoints} pts
                </span>
              </div>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#0A2342] transition-colors" />
        </div>

        {/* Prizes teaser */}
        {group.prize_1st && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              🏆 <span className="font-medium text-gray-600">{group.prize_1st}</span>
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}
