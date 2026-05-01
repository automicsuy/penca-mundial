export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
      };
      teams: {
        Row: {
          id: number;
          api_id: number | null;
          name: string;
          short_name: string | null;
          flag_url: string | null;
          group_letter: string | null;
        };
        Insert: {
          id?: number;
          api_id?: number | null;
          name: string;
          short_name?: string | null;
          flag_url?: string | null;
          group_letter?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["teams"]["Insert"]>;
      };
      matches: {
        Row: {
          id: string;
          api_id: number | null;
          home_team_id: number | null;
          away_team_id: number | null;
          starts_at: string;
          stage: MatchStage;
          group_letter: string | null;
          matchday: number | null;
          status: MatchStatus;
          home_score: number | null;
          away_score: number | null;
          venue: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          api_id?: number | null;
          home_team_id?: number | null;
          away_team_id?: number | null;
          starts_at: string;
          stage: MatchStage;
          group_letter?: string | null;
          matchday?: number | null;
          status?: MatchStatus;
          home_score?: number | null;
          away_score?: number | null;
          venue?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["matches"]["Insert"]>;
      };
      groups: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          created_by: string | null;
          pts_exact_groups: number;
          pts_winner_groups: number;
          pts_exact_knockout: number;
          pts_winner_knockout: number;
          prize_1st: string | null;
          prize_2nd: string | null;
          prize_3rd: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          created_by?: string | null;
          pts_exact_groups?: number;
          pts_winner_groups?: number;
          pts_exact_knockout?: number;
          pts_winner_knockout?: number;
          prize_1st?: string | null;
          prize_2nd?: string | null;
          prize_3rd?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["groups"]["Insert"]>;
      };
      group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          role: "admin" | "member";
          joined_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          role?: "admin" | "member";
          joined_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["group_members"]["Insert"]>;
      };
      invitations: {
        Row: {
          id: string;
          group_id: string;
          code: string;
          created_by: string | null;
          max_uses: number;
          uses_count: number;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          code: string;
          created_by?: string | null;
          max_uses?: number;
          uses_count?: number;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["invitations"]["Insert"]>;
      };
      predictions: {
        Row: {
          id: string;
          user_id: string;
          group_id: string;
          match_id: string;
          home_score_pred: number;
          away_score_pred: number;
          points_earned: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          group_id: string;
          match_id: string;
          home_score_pred: number;
          away_score_pred: number;
          points_earned?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["predictions"]["Insert"]>;
      };
    };
    Views: {
      leaderboard: {
        Row: {
          group_id: string;
          user_id: string;
          full_name: string | null;
          avatar_url: string | null;
          total_points: number;
          predictions_with_points: number;
          total_predictions: number;
          rank: number;
        };
      };
    };
    Functions: {};
    Enums: {};
  };
}

export type MatchStage =
  | "GROUP"
  | "ROUND_OF_16"
  | "QUARTER_FINAL"
  | "SEMI_FINAL"
  | "THIRD_PLACE"
  | "FINAL";

export type MatchStatus =
  | "SCHEDULED"
  | "TIMED"
  | "LIVE"
  | "IN_PLAY"
  | "PAUSED"
  | "FINISHED"
  | "SUSPENDED"
  | "POSTPONED"
  | "CANCELLED";

// Convenience types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Team = Database["public"]["Tables"]["teams"]["Row"];
export type Match = Database["public"]["Tables"]["matches"]["Row"];
export type Group = Database["public"]["Tables"]["groups"]["Row"];
export type GroupMember = Database["public"]["Tables"]["group_members"]["Row"];
export type Invitation = Database["public"]["Tables"]["invitations"]["Row"];
export type Prediction = Database["public"]["Tables"]["predictions"]["Row"];
export type LeaderboardEntry = Database["public"]["Views"]["leaderboard"]["Row"];

export type MatchWithTeams = Match & {
  home_team: Team | null;
  away_team: Team | null;
};

export type PredictionWithMatch = Prediction & {
  match: MatchWithTeams;
};
