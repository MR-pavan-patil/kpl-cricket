'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { Match, Player, BallLogEvent } from '@/types'
import { calculateScorecard } from '@/utils/scorecard'

export async function savePlayingXI(matchId: string, teamId: string, playerIds: string[]) {
  const supabase = await createClient()

  // 1. Delete existing match_players for this match and team
  const { error: deleteError } = await supabase
    .from('match_players')
    .delete()
    .eq('match_id', matchId)
    .eq('team_id', teamId)

  if (deleteError) {
    return { error: deleteError.message }
  }

  // 2. Insert new match_players
  if (playerIds.length > 0) {
    const records = playerIds.map((pid) => ({
      match_id: matchId,
      player_id: pid,
      team_id: teamId,
    }))

    const { error: insertError } = await supabase
      .from('match_players')
      .insert(records)

    if (insertError) {
      return { error: insertError.message }
    }
  }

  revalidatePath(`/admin/matches/${matchId}/setup`)
  return { success: true }
}

export async function updateToss(matchId: string, winnerId: string, decision: 'bat' | 'bowl') {
  const supabase = await createClient()

  // Fetch match details to get team1_id and team2_id
  const { data: match, error: fetchError } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single()

  if (fetchError || !match) {
    return { error: fetchError?.message || 'Match not found.' }
  }

  // Determine current batting team
  let currentBattingId = winnerId
  if (decision === 'bowl') {
    currentBattingId = match.team1_id === winnerId ? match.team2_id : match.team1_id
  }

  const { error: updateError } = await supabase
    .from('matches')
    .update({
      toss_winner_id: winnerId,
      toss_decision: decision,
      current_batting_team_id: currentBattingId,
      status: 'live', // Auto set to live when toss is updated
    })
    .eq('id', matchId)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath(`/admin/matches/${matchId}/setup`)
  revalidatePath(`/admin/scoring/${matchId}`)
  revalidatePath(`/matches/${matchId}`)
  return { success: true }
}

export async function setScoringState(
  matchId: string,
  strikerId: string | null,
  nonStrikerId: string | null,
  bowlerId: string | null
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('matches')
    .update({
      current_striker_id: strikerId,
      current_non_striker_id: nonStrikerId,
      current_bowler_id: bowlerId,
    })
    .eq('id', matchId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/admin/scoring/${matchId}`)
  revalidatePath(`/matches/${matchId}`)
  return { success: true }
}

export async function selectNextBatsman(matchId: string, batsmanId: string, slot: 'striker' | 'non_striker') {
  const supabase = await createClient()

  const updateFields: any = {}
  if (slot === 'striker') {
    updateFields.current_striker_id = batsmanId
  } else {
    updateFields.current_non_striker_id = batsmanId
  }

  const { error } = await supabase
    .from('matches')
    .update(updateFields)
    .eq('id', matchId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/admin/scoring/${matchId}`)
  revalidatePath(`/matches/${matchId}`)
  return { success: true }
}

export async function recordMatchEngineBall(matchId: string, ball: BallLogEvent) {
  const supabase = await createClient()

  // 1. Fetch current match
  const { data: match, error: fetchError } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single()

  if (fetchError || !match) {
    return { error: fetchError?.message || 'Match not found.' }
  }

  // 2. Fetch match players (Playing XI) to run calculation
  const { data: mPlayersData, error: mPlayersError } = await supabase
    .from('match_players')
    .select('*, player:players(*)')
    .eq('match_id', matchId)

  if (mPlayersError) {
    return { error: mPlayersError.message }
  }

  const players: Player[] = (mPlayersData || [])
    .map((mp: any) => mp.player)
    .filter(Boolean)

  // 3. Append ball
  const updatedLog = [...(match.balls_log || []), ball]

  // Calculate scores for both innings using scorecard calculator
  const innings1Score = calculateScorecard(updatedLog, players, 1)
  const innings2Score = calculateScorecard(updatedLog, players, 2)

  // Determine who bats first to map innings to team columns correctly
  const teamBattingFirstId = match.toss_decision === 'bat'
    ? match.toss_winner_id
    : (match.team1_id === match.toss_winner_id ? match.team2_id : match.team1_id)

  let team1_runs = 0
  let team1_wickets = 0
  let team1_balls = 0
  let team2_runs = 0
  let team2_wickets = 0
  let team2_balls = 0

  if (teamBattingFirstId === match.team1_id) {
    team1_runs = innings1Score.totalRuns
    team1_wickets = innings1Score.totalWickets
    team1_balls = innings1Score.totalBalls
    team2_runs = innings2Score.totalRuns
    team2_wickets = innings2Score.totalWickets
    team2_balls = innings2Score.totalBalls
  } else {
    team2_runs = innings1Score.totalRuns
    team2_wickets = innings1Score.totalWickets
    team2_balls = innings1Score.totalBalls
    team1_runs = innings2Score.totalRuns
    team1_wickets = innings2Score.totalWickets
    team1_balls = innings2Score.totalBalls
  }

  // Determine current innings scorecard
  const currentInningsScore = match.innings_number === 1 ? innings1Score : innings2Score
  const target = innings1Score.totalRuns + 1

  // 4. Strike Rotation
  // Swap on odd runs off bat or byes or leg-byes
  const runsToRotate = (ball.extra_type === 'bye' || ball.extra_type === 'leg_bye')
    ? ball.extra_runs
    : ball.runs

  let nextStrikerId = ball.striker_id
  let nextNonStrikerId = ball.non_striker_id

  if (runsToRotate % 2 === 1) {
    nextStrikerId = ball.non_striker_id
    nextNonStrikerId = ball.striker_id
  }

  // Over completion check
  let nextBowlerId = ball.bowler_id
  const legalBallsInInnings = currentInningsScore.totalBalls
  const isOverCompleted = ball.is_legal && (legalBallsInInnings % 6 === 0)

  if (isOverCompleted) {
    // Swap striker and non-striker at end of over
    const temp = nextStrikerId
    nextStrikerId = nextNonStrikerId
    nextNonStrikerId = temp
    // Clear bowler so admin is forced to select a new one
    nextBowlerId = null as any
  }

  // Wicket handling
  if (ball.is_wicket) {
    const outBatsmanId = ball.dismissed_batsman_id || ball.batsman_id
    if (outBatsmanId === nextStrikerId) {
      nextStrikerId = null as any
    } else if (outBatsmanId === nextNonStrikerId) {
      nextNonStrikerId = null as any
    }
  }

  // Innings Management
  let inningsNumber = match.innings_number
  let currentBattingTeamId = match.current_batting_team_id
  let matchStatus = match.status
  let winnerId = match.winner_id
  let resultDesc = match.result_desc

  // Helper to get team names
  const { data: t1Data } = await supabase.from('teams').select('name').eq('id', match.team1_id).single()
  const { data: t2Data } = await supabase.from('teams').select('name').eq('id', match.team2_id).single()
  const team1Name = t1Data?.name || 'Team A'
  const team2Name = t2Data?.name || 'Team B'

  const teamBattingSecondId = teamBattingFirstId === match.team1_id ? match.team2_id : match.team1_id
  const teamBattingSecondName = teamBattingSecondId === match.team1_id ? team1Name : team2Name
  const teamBattingFirstName = teamBattingFirstId === match.team1_id ? team1Name : team2Name

  const isBattingFirstInnings = currentBattingTeamId === teamBattingFirstId

  const team1SquadCount = (mPlayersData || []).filter((mp) => mp.team_id === match.team1_id).length || match.players_count
  const team2SquadCount = (mPlayersData || []).filter((mp) => mp.team_id === match.team2_id).length || match.players_count
  const battingFirstTeamPlayersCount = teamBattingFirstId === match.team1_id ? team1SquadCount : team2SquadCount
  const battingSecondTeamPlayersCount = teamBattingSecondId === match.team1_id ? team1SquadCount : team2SquadCount

  if (inningsNumber === 1) {
    const isFirstInningsOver =
      currentInningsScore.totalWickets >= battingFirstTeamPlayersCount - 1 ||
      currentInningsScore.totalBalls >= match.overs_limit * 6

    if (isFirstInningsOver) {
      inningsNumber = 2
      currentBattingTeamId = teamBattingSecondId
      nextStrikerId = null as any
      nextNonStrikerId = null as any
      nextBowlerId = null as any
    }
  } else if (inningsNumber === 2) {
    const currentBattingRuns = currentBattingTeamId === match.team1_id ? team1_runs : team2_runs
    const currentBattingWickets = currentBattingTeamId === match.team1_id ? team1_wickets : team2_wickets
    const currentBattingBallsCount = currentBattingTeamId === match.team1_id ? team1_balls : team2_balls

    // A. Chasing team wins immediately if they cross the target
    if (currentBattingRuns >= target) {
      matchStatus = 'completed'
      winnerId = teamBattingSecondId
      const wicketsLeft = battingSecondTeamPlayersCount - currentBattingWickets
      resultDesc = `${teamBattingSecondName} won by ${wicketsLeft} wickets`
      currentBattingTeamId = null
      nextStrikerId = null as any
      nextNonStrikerId = null as any
      nextBowlerId = null as any
    } else {
      // B. Check if second innings is over (all out or overs complete)
      const isSecondInningsOver =
        currentBattingWickets >= battingSecondTeamPlayersCount - 1 ||
        currentBattingBallsCount >= match.overs_limit * 6

      if (isSecondInningsOver) {
        matchStatus = 'completed'
        currentBattingTeamId = null
        nextStrikerId = null as any
        nextNonStrikerId = null as any
        nextBowlerId = null as any

        if (currentBattingRuns === target - 1) {
          winnerId = null
          resultDesc = 'Match Tied'
        } else {
          winnerId = teamBattingFirstId
          const runsMargin = target - 1 - currentBattingRuns
          resultDesc = `${teamBattingFirstName} won by ${runsMargin} runs`
        }
      }
    }
  }

  // 5. Update database
  const { error: updateError } = await supabase
    .from('matches')
    .update({
      balls_log: updatedLog,
      team1_runs,
      team1_wickets,
      team1_balls,
      team2_runs,
      team2_wickets,
      team2_balls,
      current_striker_id: nextStrikerId,
      current_non_striker_id: nextNonStrikerId,
      current_bowler_id: nextBowlerId,
      innings_number: inningsNumber,
      current_batting_team_id: currentBattingTeamId,
      status: matchStatus,
      winner_id: winnerId,
      result_desc: resultDesc,
    })
    .eq('id', matchId)

  if (updateError) {
    return { error: updateError.message }
  }

  // 6. Recalculate all player stats if match is completed
  if (matchStatus === 'completed') {
    await recalculateAllPlayerStats()
  }

  revalidatePath(`/admin/scoring/${matchId}`)
  revalidatePath(`/matches/${matchId}`)
  revalidatePath('/schedule')
  revalidatePath('/stats')
  revalidatePath('/')
  return { success: true }
}

export async function undoMatchEngineBall(matchId: string) {
  const supabase = await createClient()

  // 1. Fetch current match
  const { data: match, error: fetchError } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single()

  if (fetchError || !match) {
    return { error: fetchError?.message || 'Match not found.' }
  }

  const currentLog: BallLogEvent[] = match.balls_log || []
  if (currentLog.length === 0) {
    return { error: 'No balls to undo.' }
  }

  // 2. Remove the last event
  const updatedLog = currentLog.slice(0, -1)

  // 3. Fetch match players (Playing XI) to rerun calculations
  const { data: mPlayersData, error: mPlayersError } = await supabase
    .from('match_players')
    .select('*, player:players(*)')
    .eq('match_id', matchId)

  if (mPlayersError) {
    return { error: mPlayersError.message }
  }

  const players: Player[] = (mPlayersData || [])
    .map((mp: any) => mp.player)
    .filter(Boolean)

  // 4. Calculate everything from scratch (Self-healing recount)
  const innings1Score = calculateScorecard(updatedLog, players, 1)
  const innings2Score = calculateScorecard(updatedLog, players, 2)

  // Determine who bats first to map innings to team columns correctly
  const teamBattingFirstId = match.toss_decision === 'bat'
    ? match.toss_winner_id
    : (match.team1_id === match.toss_winner_id ? match.team2_id : match.team1_id)

  let team1_runs = 0
  let team1_wickets = 0
  let team1_balls = 0
  let team2_runs = 0
  let team2_wickets = 0
  let team2_balls = 0

  if (teamBattingFirstId === match.team1_id) {
    team1_runs = innings1Score.totalRuns
    team1_wickets = innings1Score.totalWickets
    team1_balls = innings1Score.totalBalls
    team2_runs = innings2Score.totalRuns
    team2_wickets = innings2Score.totalWickets
    team2_balls = innings2Score.totalBalls
  } else {
    team2_runs = innings1Score.totalRuns
    team2_wickets = innings1Score.totalWickets
    team2_balls = innings1Score.totalBalls
    team1_runs = innings2Score.totalRuns
    team1_wickets = innings2Score.totalWickets
    team1_balls = innings2Score.totalBalls
  }

  // Determine state before the undone ball
  // We can look at the last ball in updatedLog (if any) to find the striker/non-striker/bowler state
  let nextStrikerId = null
  let nextNonStrikerId = null
  let nextBowlerId = null
  let inningsNumber = 1
  let currentBattingTeamId = null
  let matchStatus = 'live' as 'live' | 'upcoming' | 'completed'
  let winnerId = null
  let resultDesc = null

  if (updatedLog.length > 0) {
    const lastBall = updatedLog[updatedLog.length - 1]
    inningsNumber = lastBall.innings

    // We can re-simulate the strike rotation up to the last ball
    // First, let's find the batting team of the last ball
    const teamBattingFirstId = match.toss_decision === 'bat' ? match.toss_winner_id : (match.team1_id === match.toss_winner_id ? match.team2_id : match.team1_id)
    const teamBattingSecondId = teamBattingFirstId === match.team1_id ? match.team2_id : match.team1_id
    currentBattingTeamId = lastBall.innings === 1 ? teamBattingFirstId : teamBattingSecondId

    // Let's determine who was striker and non striker AFTER the last ball
    const currentInningsScore = lastBall.innings === 1 ? innings1Score : innings2Score
    const runsToRotate = (lastBall.extra_type === 'bye' || lastBall.extra_type === 'leg_bye')
      ? lastBall.extra_runs
      : lastBall.runs

    let sId = lastBall.striker_id
    let nsId = lastBall.non_striker_id

    if (runsToRotate % 2 === 1) {
      sId = lastBall.non_striker_id
      nsId = lastBall.striker_id
    }

    // Over completion check
    const legalBallsInInnings = currentInningsScore.totalBalls
    const isOverCompleted = lastBall.is_legal && (legalBallsInInnings % 6 === 0)

    if (isOverCompleted) {
      // Swap striker and non-striker at end of over
      const temp = sId
      sId = nsId
      nsId = temp
      nextBowlerId = null
    } else {
      nextBowlerId = lastBall.bowler_id as any
    }

    if (lastBall.is_wicket) {
      const outBatsmanId = lastBall.dismissed_batsman_id || lastBall.batsman_id
      if (outBatsmanId === sId) {
        sId = null as any
      } else if (outBatsmanId === nsId) {
        nsId = null as any
      }
    }

    nextStrikerId = sId as any
    nextNonStrikerId = nsId as any
  } else {
    // Log is empty now: back to initial toss state
    inningsNumber = 1
    const teamBattingFirstId = match.toss_decision === 'bat' ? match.toss_winner_id : (match.team1_id === match.toss_winner_id ? match.team2_id : match.team1_id)
    currentBattingTeamId = teamBattingFirstId
    matchStatus = match.toss_winner_id ? 'live' : 'upcoming'
  }

  // 5. Update match record
  const { error: updateError } = await supabase
    .from('matches')
    .update({
      balls_log: updatedLog,
      team1_runs,
      team1_wickets,
      team1_balls,
      team2_runs,
      team2_wickets,
      team2_balls,
      current_striker_id: nextStrikerId,
      current_non_striker_id: nextNonStrikerId,
      current_bowler_id: nextBowlerId,
      innings_number: inningsNumber,
      current_batting_team_id: currentBattingTeamId,
      status: matchStatus,
      winner_id: winnerId,
      result_desc: resultDesc,
    })
    .eq('id', matchId)

  if (updateError) {
    return { error: updateError.message }
  }

  // Recalculate player stats (since match is no longer completed or its logs changed)
  await recalculateAllPlayerStats()

  revalidatePath(`/admin/scoring/${matchId}`)
  revalidatePath(`/matches/${matchId}`)
  revalidatePath('/schedule')
  revalidatePath('/stats')
  revalidatePath('/')
  return { success: true }
}

export async function recalculateAllPlayerStats() {
  const supabase = await createClient()

  // 1. Fetch all players
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('*')

  if (playersError || !players) {
    return { error: playersError?.message || 'No players found.' }
  }

  // 2. Fetch all completed matches
  const { data: completedMatches, error: matchesError } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'completed')

  if (matchesError) {
    return { error: matchesError.message }
  }

  // 3. Fetch all match_players records for completed matches
  const completedMatchIds = (completedMatches || []).map((m) => m.id)
  let playingXIMap = new Map<string, Set<string>>() // playerId -> Set of completedMatchIds they played in

  if (completedMatchIds.length > 0) {
    const { data: mpData, error: mpError } = await supabase
      .from('match_players')
      .select('player_id, match_id')
      .in('match_id', completedMatchIds)

    if (!mpError && mpData) {
      mpData.forEach((row) => {
        if (!playingXIMap.has(row.player_id)) {
          playingXIMap.set(row.player_id, new Set())
        }
        playingXIMap.get(row.player_id)!.add(row.match_id)
      })
    }
  }

  // Map to hold aggregated career stats
  const careerStats = new Map<string, { runs: number; wickets: number; fours: number; sixes: number; matches_played: number }>()

  players.forEach((p) => {
    careerStats.set(p.id, {
      runs: 0,
      wickets: 0,
      fours: 0,
      sixes: 0,
      matches_played: playingXIMap.get(p.id)?.size || 0,
    })
  })

  // 4. Calculate stats from balls log of all completed matches
  for (const match of completedMatches || []) {
    const logs: BallLogEvent[] = match.balls_log || []

    logs.forEach((ball) => {
      // Striker batting runs
      const isWide = ball.extra_type === 'wide'
      if (!isWide && ball.runs > 0) {
        const stats = careerStats.get(ball.batsman_id)
        if (stats) {
          stats.runs += ball.runs
          if (ball.runs === 4) stats.fours += 1
          if (ball.runs === 6) stats.sixes += 1
        }
      }

      // Bowler wickets
      if (ball.is_wicket && ball.wicket_type && ['bowled', 'caught', 'lbw', 'stumped'].includes(ball.wicket_type)) {
        const stats = careerStats.get(ball.bowler_id)
        if (stats) {
          stats.wickets += 1
        }
      }
    })
  }

  // 5. Bulk update players in database
  for (const player of players) {
    const stats = careerStats.get(player.id)!
    await supabase
      .from('players')
      .update({
        runs: stats.runs,
        wickets: stats.wickets,
        fours: stats.fours,
        sixes: stats.sixes,
        matches_played: stats.matches_played,
      })
      .eq('id', player.id)
  }

  return { success: true }
}

export async function saveMatchSettings(matchId: string, oversLimit: number, playersCount: number, powerplayOvers: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('matches')
    .update({
      overs_limit: oversLimit,
      players_count: playersCount,
      powerplay_overs: powerplayOvers || null,
    })
    .eq('id', matchId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/admin/matches/${matchId}/setup`)
  return { success: true }
}
