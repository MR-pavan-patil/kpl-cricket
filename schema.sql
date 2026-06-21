-- Enable uuid-ossp extension
create extension if not exists "uuid-ossp";

-- Drop existing tables if they exist
drop table if exists matches;
drop table if exists players;
drop table if exists teams;

-- Teams Table
create table teams (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  logo_url text,
  captain_name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Players Table
create table players (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references teams(id) on delete cascade not null,
  name text not null,
  role text not null, -- 'Batsman' | 'Bowler' | 'All Rounder' | 'Wicket Keeper'
  jersey_number integer not null,
  runs integer default 0 not null,
  wickets integer default 0 not null,
  fours integer default 0 not null,
  sixes integer default 0 not null,
  matches_played integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Matches Table
create table matches (
  id uuid default gen_random_uuid() primary key,
  team1_id uuid references teams(id) on delete cascade not null,
  team2_id uuid references teams(id) on delete cascade not null,
  match_date timestamp with time zone not null,
  venue text not null,
  status text check (status in ('upcoming', 'live', 'completed')) default 'upcoming' not null,
  team1_runs integer default 0 not null,
  team1_wickets integer default 0 not null,
  team1_balls integer default 0 not null,
  team2_runs integer default 0 not null,
  team2_wickets integer default 0 not null,
  team2_balls integer default 0 not null,
  current_batting_team_id uuid references teams(id) on delete set null,
  balls_log jsonb default '[]'::jsonb not null,
  winner_id uuid references teams(id) on delete set null,
  result_desc text,
  result_type text check (result_type in ('win', 'loss', 'tie', 'no_result')),
  match_abandon_reason text,
  overs_limit integer default 20 not null,
  players_count integer default 11 not null,
  powerplay_overs text,
  toss_winner_id uuid references teams(id) on delete set null,
  toss_decision text check (toss_decision in ('bat', 'bowl')),
  current_striker_id uuid references players(id) on delete set null,
  current_non_striker_id uuid references players(id) on delete set null,
  current_bowler_id uuid references players(id) on delete set null,
  innings_number integer default 1 not null,
  stage text check (stage in ('league', 'quarter_final', 'semi_final_1', 'semi_final_2', 'final')) default 'league' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Match Players Table (Playing XI Selection)
create table match_players (
  id uuid default gen_random_uuid() primary key,
  match_id uuid references matches(id) on delete cascade not null,
  player_id uuid references players(id) on delete cascade not null,
  team_id uuid references teams(id) on delete cascade not null,
  unique(match_id, player_id)
);

-- Enable RLS (Row Level Security) - optional but good practice
alter table teams enable row level security;
alter table players enable row level security;
alter table matches enable row level security;
alter table match_players enable row level security;

-- Create Policies (Select is public, Write is authenticated)
create policy "Allow public read teams" on teams for select using (true);
create policy "Allow auth write teams" on teams for all using (auth.role() = 'authenticated');

create policy "Allow public read players" on players for select using (true);
create policy "Allow auth write players" on players for all using (auth.role() = 'authenticated');

create policy "Allow public read matches" on matches for select using (true);
create policy "Allow auth write matches" on matches for all using (auth.role() = 'authenticated');

create policy "Allow public read match_players" on match_players for select using (true);
create policy "Allow auth write match_players" on match_players for all using (auth.role() = 'authenticated');

-- Enable Supabase Realtime Replication for matches and match_players
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table match_players;
