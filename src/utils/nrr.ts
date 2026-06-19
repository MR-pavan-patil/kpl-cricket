import { Match } from '@/types'

export interface MatchPlayerMini {
  match_id: string
  team_id: string
}

export function calculateTeamNRR(
  teamId: string,
  completedMatches: Match[],
  matchPlayers: MatchPlayerMini[]
): number {
  let totalRunsScored = 0
  let totalOversFaced = 0
  let totalRunsConceded = 0
  let totalOversBowled = 0

  for (const m of completedMatches) {
    if (m.team1_id !== teamId && m.team2_id !== teamId) continue

    const isTeam1 = m.team1_id === teamId
    const oppId = isTeam1 ? m.team2_id : m.team1_id
    const runsScored = isTeam1 ? m.team1_runs : m.team2_runs
    const runsConceded = isTeam1 ? m.team2_runs : m.team1_runs
    const ballsFaced = isTeam1 ? m.team1_balls : m.team2_balls
    const ballsBowled = isTeam1 ? m.team2_balls : m.team1_balls
    const wicketsLost = isTeam1 ? m.team1_wickets : m.team2_wickets
    const wicketsTaken = isTeam1 ? m.team2_wickets : m.team1_wickets

    // Get Playing XI squad size for team in this match
    const teamSquadCount = matchPlayers.filter(
      (mp) => mp.match_id === m.id && mp.team_id === teamId
    ).length || m.players_count

    // Get Playing XI squad size for opponent in this match
    const oppSquadCount = matchPlayers.filter(
      (mp) => mp.match_id === m.id && mp.team_id === oppId
    ).length || m.players_count

    const teamAllOut = wicketsLost >= teamSquadCount - 1
    const oppAllOut = wicketsTaken >= oppSquadCount - 1

    const oversFaced = teamAllOut ? m.overs_limit : (ballsFaced / 6)
    const oversBowled = oppAllOut ? m.overs_limit : (ballsBowled / 6)

    totalRunsScored += runsScored
    totalOversFaced += oversFaced
    totalRunsConceded += runsConceded
    totalOversBowled += oversBowled
  }

  const nrrFaced = totalOversFaced > 0 ? (totalRunsScored / totalOversFaced) : 0
  const nrrBowled = totalOversBowled > 0 ? (totalRunsConceded / totalOversBowled) : 0
  return nrrFaced - nrrBowled
}
