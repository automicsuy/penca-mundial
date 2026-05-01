import type { MatchStage } from "./supabase/types";

export interface PointsConfig {
  pts_exact_groups: number;
  pts_winner_groups: number;
  pts_exact_knockout: number;
  pts_winner_knockout: number;
}

export interface PredictionResult {
  home_score_pred: number;
  away_score_pred: number;
}

export interface MatchResult {
  home_score: number;
  away_score: number;
  stage: MatchStage;
}

const KNOCKOUT_STAGES: MatchStage[] = [
  "ROUND_OF_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "THIRD_PLACE",
  "FINAL",
];

function isKnockout(stage: MatchStage): boolean {
  return KNOCKOUT_STAGES.includes(stage);
}

function getWinner(home: number, away: number): "home" | "away" | "draw" {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

/**
 * Calculate points for a single prediction given the actual match result.
 *
 * Rules:
 * - Exact score in group stage → pts_exact_groups
 * - Correct winner/draw in group stage (not exact) → pts_winner_groups
 * - Exact score in knockout → pts_exact_knockout
 * - Correct winner in knockout (not exact) → pts_winner_knockout
 * - No points if match not finished or prediction wrong
 */
export function calculatePoints(
  prediction: PredictionResult,
  result: MatchResult,
  config: PointsConfig
): number {
  const { home_score_pred, away_score_pred } = prediction;
  const { home_score, away_score, stage } = result;
  const knockout = isKnockout(stage);

  const isExact =
    home_score_pred === home_score && away_score_pred === away_score;

  if (isExact) {
    return knockout ? config.pts_exact_knockout : config.pts_exact_groups;
  }

  const predictedWinner = getWinner(home_score_pred, away_score_pred);
  const actualWinner = getWinner(home_score, away_score);
  const correctWinner = predictedWinner === actualWinner;

  if (correctWinner) {
    return knockout ? config.pts_winner_knockout : config.pts_winner_groups;
  }

  return 0;
}

/**
 * Describe the points awarded in human-readable form
 */
export function describePoints(
  prediction: PredictionResult,
  result: MatchResult,
  config: PointsConfig
): string {
  const points = calculatePoints(prediction, result, config);
  const { home_score_pred, away_score_pred } = prediction;
  const { home_score, away_score } = result;
  const knockout = isKnockout(result.stage);

  if (home_score_pred === home_score && away_score_pred === away_score) {
    return knockout
      ? `¡Resultado exacto! +${points} pts`
      : `¡Resultado exacto! +${points} pts`;
  }

  const predictedWinner = getWinner(home_score_pred, away_score_pred);
  const actualWinner = getWinner(home_score, away_score);

  if (predictedWinner === actualWinner) {
    return knockout
      ? `Ganador correcto +${points} pts`
      : `Ganador/empate correcto +${points} pts`;
  }

  return "Sin puntos";
}

/**
 * Default points config
 */
export const DEFAULT_POINTS_CONFIG: PointsConfig = {
  pts_exact_groups: 3,
  pts_winner_groups: 1,
  pts_exact_knockout: 6,
  pts_winner_knockout: 2,
};

/**
 * Generate a slug from a group name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 50);
}

/**
 * Generate a random invite code
 */
export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Format stage name in Spanish
 */
export function formatStage(stage: MatchStage): string {
  const labels: Record<MatchStage, string> = {
    GROUP: "Fase de Grupos",
    ROUND_OF_16: "Octavos de Final",
    QUARTER_FINAL: "Cuartos de Final",
    SEMI_FINAL: "Semifinales",
    THIRD_PLACE: "Tercer Puesto",
    FINAL: "Final",
  };
  return labels[stage] ?? stage;
}


// Re-export for convenience
export type { MatchStage } from "./supabase/types";
