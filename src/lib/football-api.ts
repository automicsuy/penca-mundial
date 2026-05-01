/**
 * Wrapper for football-data.org API
 * Free plan: 10 requests/minute, supports major competitions
 * World Cup 2026 competition ID: 2000 (FIFA World Cup)
 */

const BASE_URL = "https://api.football-data.org/v4";
const API_KEY = process.env.FOOTBALL_DATA_API_KEY!;

// FIFA World Cup competition ID on football-data.org
export const WORLD_CUP_ID = 2000;

export interface FDTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

export interface FDScore {
  winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
  duration: "REGULAR" | "EXTRA_TIME" | "PENALTY_SHOOTOUT";
  fullTime: { home: number | null; away: number | null };
  halfTime: { home: number | null; away: number | null };
}

export interface FDMatch {
  id: number;
  utcDate: string;
  status:
    | "SCHEDULED"
    | "TIMED"
    | "IN_PLAY"
    | "PAUSED"
    | "FINISHED"
    | "SUSPENDED"
    | "POSTPONED"
    | "CANCELLED"
    | "AWARDED";
  matchday: number | null;
  stage: string;
  group: string | null;
  homeTeam: FDTeam;
  awayTeam: FDTeam;
  score: FDScore;
  venue?: string;
}

export interface FDMatchesResponse {
  matches: FDMatch[];
  resultSet: {
    count: number;
    competitions: string;
    first: string;
    last: string;
    played: number;
  };
}

async function fetchFD<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "X-Auth-Token": API_KEY,
    },
    next: { revalidate: 0 }, // always fresh for cron
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `football-data.org error ${res.status}: ${text}`
    );
  }

  return res.json() as Promise<T>;
}

/**
 * Get all matches for the World Cup
 */
export async function getWorldCupMatches(): Promise<FDMatch[]> {
  const data = await fetchFD<FDMatchesResponse>(
    `/competitions/${WORLD_CUP_ID}/matches`
  );
  return data.matches;
}

/**
 * Get matches currently live or finished today (for efficient sync)
 */
export async function getLiveAndTodayMatches(): Promise<FDMatch[]> {
  const today = new Date().toISOString().split("T")[0];
  const data = await fetchFD<FDMatchesResponse>(
    `/competitions/${WORLD_CUP_ID}/matches?dateFrom=${today}&dateTo=${today}`
  );
  return data.matches;
}

/**
 * Get matches in LIVE or IN_PLAY status
 */
export async function getLiveMatches(): Promise<FDMatch[]> {
  try {
    const data = await fetchFD<FDMatchesResponse>(
      `/competitions/${WORLD_CUP_ID}/matches?status=LIVE`
    );
    return data.matches;
  } catch {
    return [];
  }
}

/**
 * Get all teams in the competition
 */
export async function getWorldCupTeams(): Promise<FDTeam[]> {
  const data = await fetchFD<{ teams: FDTeam[] }>(
    `/competitions/${WORLD_CUP_ID}/teams`
  );
  return data.teams;
}

/**
 * Map football-data.org stage names to our DB stage names
 */
export function mapStage(fdStage: string): string {
  const map: Record<string, string> = {
    GROUP_STAGE: "GROUP",
    LAST_16: "ROUND_OF_16",
    ROUND_OF_16: "ROUND_OF_16",
    QUARTER_FINALS: "QUARTER_FINAL",
    SEMI_FINALS: "SEMI_FINAL",
    THIRD_PLACE: "THIRD_PLACE",
    FINAL: "FINAL",
  };
  return map[fdStage] ?? "GROUP";
}

/**
 * Determine if any matches are currently live
 * Used to decide sync frequency
 */
export async function hasLiveMatches(): Promise<boolean> {
  const live = await getLiveMatches();
  return live.length > 0;
}
