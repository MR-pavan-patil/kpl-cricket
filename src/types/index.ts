export interface Team {
  id: string;
  name: string;
  logo_url: string | null;
  captain_name: string;
  created_at: string;
  players?: Player[];
}

export interface Player {
  id: string;
  team_id: string;
  name: string;
  role: string; // 'Batsman' | 'Bowler' | 'All Rounder' | 'Wicket Keeper'
  jersey_number: number;
  runs: number;
  wickets: number;
  fours: number;
  sixes: number;
  matches_played: number;
  created_at?: string;
  team?: Team;
}

export interface BallLogEvent {
  runs: number;
  extra_runs: number;
  extra_type: 'wide' | 'no_ball' | 'bye' | 'leg_bye' | null;
  is_legal: boolean;
  is_wicket: boolean;
  wicket_type?: 'bowled' | 'caught' | 'run_out' | 'lbw' | 'stumped' | 'retired_hurt' | null;
  dismissed_batsman_id?: string | null;
  batsman_id: string; // facing batsman
  bowler_id: string; // bowling player
  striker_id: string;
  non_striker_id: string;
  label: string; // '0', '1', '2', '3', '4', '6', 'W', 'Wd', 'Nb' etc.
  innings: number;
}

export interface Match {
  id: string;
  team1_id: string;
  team2_id: string;
  match_date: string;
  venue: string;
  status: 'upcoming' | 'live' | 'completed';
  team1_runs: number;
  team1_wickets: number;
  team1_balls: number;
  team2_runs: number;
  team2_wickets: number;
  team2_balls: number;
  current_batting_team_id: string | null;
  balls_log: BallLogEvent[];
  winner_id: string | null;
  result_desc: string | null;
  result_type?: 'win' | 'loss' | 'tie' | 'no_result' | null;
  match_abandon_reason?: string | null;
  overs_limit: number;
  players_count: number;
  powerplay_overs: string | null;
  toss_winner_id: string | null;
  toss_decision: 'bat' | 'bowl' | null;
  current_striker_id: string | null;
  current_non_striker_id: string | null;
  current_bowler_id: string | null;
  innings_number: number;
  stage: 'league' | 'quarter_final' | 'semi_final_1' | 'semi_final_2' | 'final';
  created_at?: string;
  team1?: Team;
  team2?: Team;
}

