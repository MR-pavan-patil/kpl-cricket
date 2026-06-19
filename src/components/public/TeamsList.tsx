'use client'

import { useState, useEffect } from 'react'
import { Team, Player, Match } from '@/types'
import { 
  User, 
  ShieldAlert, 
  Award, 
  ChevronRight, 
  Star, 
  X, 
  Users, 
  Shield, 
  TrendingUp, 
  Activity, 
  Calendar, 
  Trophy,
  Target
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface TeamsListProps {
  initialTeams: Team[]
  initialPlayers: Player[]
  initialMatches: Match[]
}

export default function TeamsList({ initialTeams, initialPlayers, initialMatches }: TeamsListProps) {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [selectedPlayerTab, setSelectedPlayerTab] = useState<string>('overview')

  const [matches, setMatches] = useState<Match[]>(initialMatches)
  const [players, setPlayers] = useState<Player[]>(initialPlayers)
  const [teams, setTeams] = useState<Team[]>(initialTeams)

  // Realtime Supabase Channel subscription
  useEffect(() => {
    const supabase = createClient()
    
    // Subscribe to matches updates
    const matchesChannel = supabase
      .channel('public-teams-matches')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMatch = payload.new as Match
            const hydratedMatch = {
              ...newMatch,
              team1: teams.find((t) => t.id === newMatch.team1_id),
              team2: teams.find((t) => t.id === newMatch.team2_id),
            }
            setMatches((prev) => [hydratedMatch, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            const updatedMatch = payload.new as Match
            const hydratedMatch = {
              ...updatedMatch,
              team1: teams.find((t) => t.id === updatedMatch.team1_id),
              team2: teams.find((t) => t.id === updatedMatch.team2_id),
            }
            setMatches((prev) =>
              prev.map((m) => (m.id === updatedMatch.id ? hydratedMatch : m))
            )
          } else if (payload.eventType === 'DELETE') {
            const oldMatch = payload.old as { id: string }
            setMatches((prev) => prev.filter((m) => m.id !== oldMatch.id))
          }
        }
      )
      .subscribe()

    // Subscribe to players updates (career statistics)
    const playersChannel = supabase
      .channel('public-teams-players')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPlayers((prev) => [...prev, payload.new as Player])
          } else if (payload.eventType === 'UPDATE') {
            const updatedPlayer = payload.new as Player
            setPlayers((prev) =>
              prev.map((p) => (p.id === updatedPlayer.id ? updatedPlayer : p))
            )
          } else if (payload.eventType === 'DELETE') {
            const oldPlayer = payload.old as { id: string }
            setPlayers((prev) => prev.filter((p) => p.id !== oldPlayer.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(matchesChannel)
      supabase.removeChannel(playersChannel)
    }
  }, [teams])

  const getTeamPlayers = (teamId: string) => {
    return players.filter((p) => p.team_id === teamId)
  }

  const getRoleBadgeStyle = (role: string) => {
    const r = role.toLowerCase()
    if (r.includes('batsman')) {
      return 'bg-blue-50 text-blue-700 border-blue-150'
    } else if (r.includes('bowler')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-150'
    } else if (r.includes('keeper')) {
      return 'bg-amber-50 text-amber-700 border-amber-150'
    } else {
      // All Rounder
      return 'bg-purple-50 text-purple-700 border-purple-150'
    }
  }

  // Dynamic calculations for Player statistics
  const getPlayerStats = (playerId: string, teamId: string) => {
    let tournamentRuns = 0
    let tournamentBalls = 0
    let tournamentFours = 0
    let tournamentSixes = 0
    let tournamentWickets = 0
    let tournamentRunsConceded = 0
    let tournamentBallsBowled = 0
    let highestScore = 0
    let highestScoreNotOut = false
    let bestBowlingWickets = 0
    let bestBowlingRuns = 999
    let matchHistory: any[] = []

    matches.forEach((m) => {
      const isTeam1 = m.team1_id === teamId
      const isTeam2 = m.team2_id === teamId
      if (!isTeam1 && !isTeam2) return // Player's team didn't play

      if (m.status === 'upcoming') return

      const ballsLog = m.balls_log || []

      let runsInMatch = 0
      let ballsInMatch = 0
      let foursInMatch = 0
      let sixesInMatch = 0
      let isOutInMatch = false

      let runsConcededInMatch = 0
      let ballsBowledInMatch = 0
      let wicketsInMatch = 0
      let participated = false

      ballsLog.forEach((b) => {
        // Batting stats
        if (b.batsman_id === playerId) {
          participated = true
          runsInMatch += b.runs
          if (b.extra_type !== 'wide') {
            ballsInMatch++
          }
          if (b.runs === 4) foursInMatch++
          if (b.runs === 6) sixesInMatch++
        }

        if (b.is_wicket && b.dismissed_batsman_id === playerId) {
          isOutInMatch = true
          participated = true
        }

        // Bowling stats
        if (b.bowler_id === playerId) {
          participated = true
          if (b.is_legal) {
            ballsBowledInMatch++
          }
          // Conceded runs
          if (b.extra_type === 'wide' || b.extra_type === 'no_ball') {
            runsConcededInMatch += b.runs + b.extra_runs
          } else if (b.extra_type !== 'bye' && b.extra_type !== 'leg_bye') {
            runsConcededInMatch += b.runs
          }

          if (b.is_wicket && b.wicket_type !== 'run_out' && b.wicket_type !== 'retired_hurt') {
            wicketsInMatch++
          }
        }
      })

      if (m.status === 'completed') {
        participated = true
      }

      if (participated) {
        tournamentRuns += runsInMatch
        tournamentBalls += ballsInMatch
        tournamentFours += foursInMatch
        tournamentSixes += sixesInMatch

        tournamentWickets += wicketsInMatch
        tournamentRunsConceded += runsConcededInMatch
        tournamentBallsBowled += ballsBowledInMatch

        // High score
        if (runsInMatch > highestScore) {
          highestScore = runsInMatch
          highestScoreNotOut = !isOutInMatch
        } else if (runsInMatch === highestScore && !isOutInMatch) {
          highestScoreNotOut = true
        }

        // Best bowling figures
        if (wicketsInMatch > bestBowlingWickets) {
          bestBowlingWickets = wicketsInMatch
          bestBowlingRuns = runsConcededInMatch
        } else if (wicketsInMatch === bestBowlingWickets && runsConcededInMatch < bestBowlingRuns) {
          bestBowlingRuns = runsConcededInMatch
        }

        const opponentTeam = isTeam1 ? m.team2 : m.team1
        const opponentName = opponentTeam?.name || 'Unknown Opponent'

        matchHistory.push({
          matchId: m.id,
          opponent: opponentName,
          runs: runsInMatch,
          balls: ballsInMatch,
          isOut: isOutInMatch,
          wickets: wicketsInMatch,
          runsConceded: runsConcededInMatch,
          ballsBowled: ballsBowledInMatch,
          result: m.result_desc || 'Completed',
          date: new Date(m.match_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
        })
      }
    })

    const tournamentSR = tournamentBalls > 0 ? ((tournamentRuns / tournamentBalls) * 100).toFixed(2) : '0.00'
    const tournamentEcon = tournamentBallsBowled > 0 ? ((tournamentRunsConceded * 6) / tournamentBallsBowled).toFixed(2) : '0.00'

    return {
      tournamentRuns,
      tournamentBalls,
      tournamentFours,
      tournamentSixes,
      tournamentWickets,
      tournamentRunsConceded,
      tournamentBallsBowled,
      highestScore: highestScore > 0 ? `${highestScore}${highestScoreNotOut ? '*' : ''}` : '0',
      bestBowling: bestBowlingWickets > 0 ? `${bestBowlingWickets}/${bestBowlingRuns}` : '0/0',
      tournamentSR,
      tournamentEcon,
      matchHistory: matchHistory.reverse()
    }
  }

  // Calculate Match MVPs across all completed matches
  const getPlayerMVPs = () => {
    const mvpCounts: Record<string, number> = {}

    matches.forEach((m) => {
      if (m.status !== 'completed') return
      const ballsLog = m.balls_log || []
      const matchScores: Record<string, number> = {}

      ballsLog.forEach((b) => {
        if (b.batsman_id) {
          if (!matchScores[b.batsman_id]) matchScores[b.batsman_id] = 0
          matchScores[b.batsman_id] += b.runs
          if (b.runs === 4) matchScores[b.batsman_id] += 1
          if (b.runs === 6) matchScores[b.batsman_id] += 2
        }

        if (b.bowler_id) {
          if (!matchScores[b.bowler_id]) matchScores[b.bowler_id] = 0
          if (b.is_wicket && b.wicket_type !== 'run_out' && b.wicket_type !== 'retired_hurt') {
            matchScores[b.bowler_id] += 20
          }
          if (b.extra_type === 'wide' || b.extra_type === 'no_ball') {
            matchScores[b.bowler_id] -= (b.runs + b.extra_runs) * 0.5
          } else if (b.extra_type !== 'bye' && b.extra_type !== 'leg_bye') {
            matchScores[b.bowler_id] -= b.runs * 0.5
          }
        }
      })

      let topPlayerId = ''
      let maxPoints = -9999
      Object.entries(matchScores).forEach(([pId, points]) => {
        if (points > maxPoints) {
          maxPoints = points
          topPlayerId = pId
        }
      })

      if (topPlayerId) {
        mvpCounts[topPlayerId] = (mvpCounts[topPlayerId] || 0) + 1
      }
    })

    return mvpCounts
  }

  const mvpsMap = getPlayerMVPs()

  const isTopRunScorer = (player: Player) => {
    const teammates = players.filter((p) => p.team_id === player.team_id)
    if (teammates.length <= 1) return false
    return player.runs > 0 && teammates.every((t) => t.id === player.id || t.runs <= player.runs)
  }

  const isTopWicketTaker = (player: Player) => {
    const teammates = players.filter((p) => p.team_id === player.team_id)
    if (teammates.length <= 1) return false
    return player.wickets > 0 && teammates.every((t) => t.id === player.id || t.wickets <= player.wickets)
  }

  // Determine Team colors accent
  const getTeamColor = (teamName: string) => {
    const name = teamName.toLowerCase()
    if (name.includes('mi') || name.includes('mumbai')) return 'from-blue-600 to-indigo-800'
    if (name.includes('rcb') || name.includes('bangalore') || name.includes('royal')) return 'from-rose-600 to-red-800'
    if (name.includes('csk') || name.includes('chennai')) return 'from-yellow-450 to-amber-600'
    if (name.includes('kkr') || name.includes('kolkata')) return 'from-purple-700 to-indigo-900'
    if (name.includes('srh') || name.includes('hyderabad')) return 'from-orange-500 to-red-600'
    if (name.includes('dc') || name.includes('delhi')) return 'from-sky-600 to-blue-800'
    return 'from-blue-600 to-indigo-600'
  }

  if (teams.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm animate-fade-in-up">
        <ShieldAlert className="h-12 w-12 text-slate-350 mx-auto mb-4" />
        <h3 className="text-lg font-black text-slate-900">No Teams Registered</h3>
        <p className="text-sm text-slate-500 mt-1">
          Teams will appear here once they are added by the administrator.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Team Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
        {teams.map((team) => {
          const teamPlayers = getTeamPlayers(team.id)
          const colorGradient = getTeamColor(team.name)

          return (
            <div
              key={team.id}
              className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group"
            >
              {/* Card Banner Background */}
              <div className={`h-24 bg-gradient-to-r ${colorGradient} relative`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
              </div>

              {/* Card Content */}
              <div className="px-6 pb-6 flex-1 flex flex-col relative pt-12">
                {/* Logo wrapper overlapping the banner */}
                <div className="absolute -top-10 left-6 w-20 h-20 rounded-2xl bg-white border-2 border-white shadow-md flex items-center justify-center font-black text-xl text-slate-700 overflow-hidden group-hover:scale-105 transition-transform duration-300">
                  {team.logo_url ? (
                    <img
                      src={team.logo_url}
                      alt={`${team.name} Logo`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    team.name.slice(0, 2).toUpperCase()
                  )}
                </div>

                {/* Team Info */}
                <div className="space-y-3 flex-1">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                      {team.name}
                    </h3>
                    
                    {/* Captain Badge */}
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-100 text-amber-800 text-xs font-semibold">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>Captain: {team.captain_name}</span>
                    </div>
                  </div>

                  {/* Team Stats Summary */}
                  <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-slate-105">
                    <div className="text-center border-r border-slate-105">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Squad Size</p>
                      <p className="text-lg font-black text-slate-900 mt-0.5">{teamPlayers.length} Players</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Top Stat</p>
                      <p className="text-sm font-bold text-slate-700 mt-1.5">
                        {teamPlayers.length > 0 ? (
                          `${Math.max(...teamPlayers.map(p => p.runs))} Runs`
                        ) : (
                          'No records'
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action button */}
                <button
                  onClick={() => setSelectedTeam(team)}
                  className="mt-6 w-full py-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:shadow-sm"
                >
                  View Squad Roster <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Squad Overlay Modal */}
      {selectedTeam && (() => {
        const teamPlayers = getTeamPlayers(selectedTeam.id)
        const teamGradient = getTeamColor(selectedTeam.name)

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-md animate-fade-in transition-all">
            {/* Click-away overlay */}
            <div className="absolute inset-0 cursor-pointer" onClick={() => setSelectedTeam(null)} />

            {/* Modal Body */}
            <div className="relative bg-white rounded-3xl border border-slate-200 w-full max-w-4xl shadow-2xl overflow-hidden max-h-[92vh] sm:max-h-[90vh] flex flex-col z-10 scale-100 animate-zoom-in">
              
              {/* Header block with team gradient */}
              <div className={`bg-gradient-to-r ${teamGradient} p-6 sm:p-8 text-white relative`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
                <button
                  onClick={() => setSelectedTeam(null)}
                  className="absolute top-6 right-6 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer z-30"
                  aria-label="Close squad view"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-5 relative z-10 pr-12 sm:pr-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border border-white/20 flex items-center justify-center font-black text-xl text-slate-800 overflow-hidden shadow-lg flex-shrink-0">
                    {selectedTeam.logo_url ? (
                      <img
                        src={selectedTeam.logo_url}
                        alt={`${selectedTeam.name} Logo`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      selectedTeam.name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black">{selectedTeam.name}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-semibold text-white/80">
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> Captain: {selectedTeam.captain_name}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> {teamPlayers.length} Squad Players
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Roster Area */}
              <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-55">
                <div className="flex items-center gap-2 mb-6 border-b border-slate-150 pb-3">
                  <Shield className="h-5 w-5 text-blue-650" />
                  <h4 className="text-xs sm:text-sm font-black text-slate-700 uppercase tracking-wider">Squad Player Profiles (Click player card to view profile)</h4>
                </div>

                {teamPlayers.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 italic text-sm">
                    No players registered in this team.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teamPlayers.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedPlayer(p)
                          setSelectedPlayerTab('overview')
                        }}
                        className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-blue-500/50 hover:bg-blue-50/10 transition-all duration-300 flex items-start gap-3 sm:gap-4 hover:shadow-md cursor-pointer group/item"
                      >
                        {/* Jersey Circle */}
                        <div className="w-12 h-12 rounded-xl bg-blue-55 border border-blue-105 text-blue-600 flex items-center justify-center font-black text-sm flex-shrink-0 shadow-inner group-hover/item:bg-blue-600 group-hover/item:text-white transition-colors duration-300">
                          #{p.jersey_number}
                        </div>

                        {/* Roster Profile */}
                        <div className="flex-1 space-y-2.5 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <p className="font-extrabold text-slate-900 group-hover/item:text-blue-600 transition-colors truncate text-sm">
                              {p.name}
                            </p>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border flex-shrink-0 ${getRoleBadgeStyle(p.role)}`}>
                              <Award className="h-3 w-3" /> {p.role}
                            </span>
                          </div>

                          {/* Stat items */}
                          <div className="grid grid-cols-3 gap-2 text-center text-[10px] bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                            <div>
                              <p className="text-slate-550 font-bold uppercase tracking-wider text-[9px]">Runs</p>
                              <p className="font-extrabold text-slate-950 mt-0.5">{p.runs}</p>
                            </div>
                            <div className="border-l border-r border-slate-200">
                              <p className="text-slate-550 font-bold uppercase tracking-wider text-[9px]">Wkts</p>
                              <p className="font-extrabold text-slate-950 mt-0.5">{p.wickets}</p>
                            </div>
                            <div>
                              <p className="text-slate-550 font-bold uppercase tracking-wider text-[9px]">Matches</p>
                              <p className="font-extrabold text-slate-950 mt-0.5">{p.matches_played}</p>
                            </div>
                          </div>

                          {/* Boundaries */}
                          <div className="flex gap-4 text-[10px] font-bold text-slate-500 pl-1">
                            <span>4s: <strong className="text-slate-800">{p.fours}</strong></span>
                            <span>6s: <strong className="text-slate-800">{p.sixes}</strong></span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Close Row */}
              <div className="p-4 bg-white border-t border-slate-150 flex justify-end">
                <button
                  onClick={() => setSelectedTeam(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-650 hover:text-slate-950 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
                >
                  Close Squad View
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Player Profile Detail Modal Overlay (on top of Squad view) */}
      {selectedPlayer && (() => {
        const playerTeam = teams.find((t) => t.id === selectedPlayer.team_id)
        const teamName = playerTeam?.name || 'Unknown Team'
        const isCaptain = playerTeam?.captain_name === selectedPlayer.name
        const teamGradient = getTeamColor(teamName)
        
        // Compute stats from match logs
        const stats = getPlayerStats(selectedPlayer.id, selectedPlayer.team_id)
        
        // Teammate & Rank badges
        const topScorer = isTopRunScorer(selectedPlayer)
        const topWicketer = isTopWicketTaker(selectedPlayer)
        const mvpCount = mvpsMap[selectedPlayer.id] || 0

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-md animate-fade-in transition-all">
            {/* Click-away overlay */}
            <div className="absolute inset-0 cursor-pointer" onClick={() => setSelectedPlayer(null)} />

            {/* Modal Body */}
            <div className="relative bg-white rounded-3xl border border-slate-250 w-full max-w-2xl shadow-2xl overflow-hidden max-h-[92vh] sm:max-h-[90vh] md:max-h-[85vh] flex flex-col z-10 scale-100 animate-zoom-in">
              
              {/* Header profile with team color gradient */}
              <div className={`bg-gradient-to-r ${teamGradient} p-6 sm:p-8 text-white relative`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
                <button
                  onClick={() => setSelectedPlayer(null)}
                  className="absolute top-6 right-6 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer z-30"
                  aria-label="Close player profile"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10 text-center sm:text-left pr-12 sm:pr-0">
                  {/* Large visual jersey avatar */}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white text-slate-800 flex flex-col items-center justify-center shadow-xl flex-shrink-0 border-4 border-white/25">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Jersey</p>
                    <p className="text-3xl font-black text-slate-900">#{selectedPlayer.jersey_number}</p>
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                      <h3 className="text-2xl font-black truncate">{selectedPlayer.name}</h3>
                      {isCaptain && (
                        <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                          <Star className="w-3 h-3 fill-slate-950" /> Captain
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-white/80">{teamName}</p>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getRoleBadgeStyle(selectedPlayer.role)}`}>
                      <Award className="h-3.5 w-3.5" /> {selectedPlayer.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="bg-white border-b border-slate-150 flex px-4 sm:px-6 overflow-x-auto">
                {[
                  { id: 'overview', name: 'Overview', icon: User },
                  { id: 'batting', name: 'Batting Stats', icon: TrendingUp },
                  { id: 'bowling', name: 'Bowling Stats', icon: Activity },
                  { id: 'history', name: 'Match History', icon: Calendar }
                ].map((t) => {
                  const Icon = t.icon
                  const active = selectedPlayerTab === t.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedPlayerTab(t.id)}
                      className={`flex items-center gap-2 py-4 px-3 sm:px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                        active
                           ? 'border-blue-600 text-blue-600'
                           : 'border-transparent text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {t.name}
                    </button>
                  )
                })}
              </div>

              {/* Tab Contents */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-55">
                
                {/* 1. OVERVIEW TAB */}
                {selectedPlayerTab === 'overview' && (
                  <div className="space-y-6 animate-fade-in">
                    
                    {/* Performance Cards Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {topScorer && (
                        <div className="bg-gradient-to-br from-amber-50 to-orange-100/50 border border-orange-200/50 p-4 rounded-2xl text-center shadow-xs">
                          <Trophy className="h-6 w-6 text-orange-600 mx-auto mb-1.5" />
                          <p className="text-[9px] text-orange-700 font-bold uppercase tracking-wider">Top Run Scorer</p>
                          <p className="text-xs text-orange-950 font-extrabold mt-1">Runs Leader</p>
                        </div>
                      )}
                      {topWicketer && (
                        <div className="bg-gradient-to-br from-purple-50 to-indigo-100/50 border border-purple-200/50 p-4 rounded-2xl text-center shadow-xs">
                          <Target className="h-6 w-6 text-purple-600 mx-auto mb-1.5" />
                          <p className="text-[9px] text-purple-700 font-bold uppercase tracking-wider">Top Bowler</p>
                          <p className="text-xs text-purple-950 font-extrabold mt-1">Wickets Leader</p>
                        </div>
                      )}
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-200/50 p-4 rounded-2xl text-center shadow-xs">
                        <Activity className="h-6 w-6 text-blue-600 mx-auto mb-1.5" />
                        <p className="text-[9px] text-blue-750 font-bold uppercase tracking-wider">MVP Count</p>
                        <p className="text-base font-black text-blue-900 mt-1">{mvpCount} MVPs</p>
                      </div>
                      <div className="bg-gradient-to-br from-amber-50 to-yellow-100/50 border border-yellow-250/50 p-4 rounded-2xl text-center shadow-xs">
                        <Star className="h-6 w-6 text-amber-600 mx-auto mb-1.5 fill-amber-100" />
                        <p className="text-[9px] text-amber-705 font-bold uppercase tracking-wider">Top Score</p>
                        <p className="text-base font-black text-amber-900 mt-1">{stats.highestScore}</p>
                      </div>
                      {(!topScorer && !topWicketer) && (
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100/60 border border-slate-200 p-4 rounded-2xl text-center shadow-xs col-span-2">
                          <User className="h-6 w-6 text-slate-550 mx-auto mb-1.5" />
                          <p className="text-[9px] text-slate-650 font-bold uppercase tracking-wider">Team Roster</p>
                          <p className="text-xs text-slate-900 font-bold mt-1">Active Squad Member</p>
                        </div>
                      )}
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-blue-600" /> Tournament Stats Preview
                      </h4>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Runs</p>
                          <p className="text-xl font-black text-slate-905 mt-0.5">{stats.tournamentRuns}</p>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Wickets</p>
                          <p className="text-xl font-black text-slate-905 mt-0.5">{stats.tournamentWickets}</p>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Str. Rate</p>
                          <p className="text-xl font-black text-slate-905 mt-0.5">{stats.tournamentSR}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. BATTING STATS TAB */}
                {selectedPlayerTab === 'batting' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Career Batting Card */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-105 pb-2">
                          Career Batting
                        </h4>
                        <div className="space-y-3.5 text-xs font-semibold">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Matches Played</span>
                            <span className="text-slate-900">{selectedPlayer.matches_played}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Total Runs</span>
                            <span className="text-blue-600 font-black">{selectedPlayer.runs}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Highest Score</span>
                            <span className="text-slate-900 font-black">{stats.highestScore}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Fours (4s)</span>
                            <span className="text-slate-900">{selectedPlayer.fours}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Sixes (6s)</span>
                            <span className="text-slate-900">{selectedPlayer.sixes}</span>
                          </div>
                        </div>
                      </div>

                      {/* Tournament Batting Card */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-105 pb-2">
                          Tournament Batting
                        </h4>
                        <div className="space-y-3.5 text-xs font-semibold">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Innings Played</span>
                            <span className="text-slate-900">{stats.matchHistory.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Tournament Runs</span>
                            <span className="text-blue-600 font-black">{stats.tournamentRuns}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Balls Faced</span>
                            <span className="text-slate-900">{stats.tournamentBalls}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Strike Rate</span>
                            <span className="text-slate-900 font-black">{stats.tournamentSR}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Tournament Boundaries</span>
                            <span className="text-slate-900">{stats.tournamentFours}x4, {stats.tournamentSixes}x6</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. BOWLING STATS TAB */}
                {selectedPlayerTab === 'bowling' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Career Bowling Card */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-105 pb-2">
                          Career Bowling
                        </h4>
                        <div className="space-y-3.5 text-xs font-semibold">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Matches Played</span>
                            <span className="text-slate-900">{selectedPlayer.matches_played}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Total Wickets</span>
                            <span className="text-emerald-600 font-black">{selectedPlayer.wickets}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Best Bowling</span>
                            <span className="text-slate-900 font-black">{stats.bestBowling}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Economy</span>
                            <span className="text-slate-900">{stats.tournamentEcon}</span>
                          </div>
                        </div>
                      </div>

                      {/* Tournament Bowling Card */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-105 pb-2">
                          Tournament Bowling
                        </h4>
                        <div className="space-y-3.5 text-xs font-semibold">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Overs Bowled</span>
                            <span className="text-slate-900">{Math.floor(stats.tournamentBallsBowled / 6)}.{stats.tournamentBallsBowled % 6}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Wickets Taken</span>
                            <span className="text-emerald-600 font-black">{stats.tournamentWickets}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Runs Conceded</span>
                            <span className="text-slate-905">{stats.tournamentRunsConceded}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Tournament Economy</span>
                            <span className="text-slate-900 font-black">{stats.tournamentEcon}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. MATCH HISTORY TAB */}
                {selectedPlayerTab === 'history' && (
                  <div className="space-y-4 animate-fade-in">
                    {stats.matchHistory.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs italic">
                        No match logs recorded for this player in this tournament.
                      </div>
                    ) : (
                      <>
                        {/* Table layout on desktop/tablet */}
                        <div className="hidden sm:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-150 text-slate-550 font-bold uppercase text-[9px] tracking-wider">
                                  <th className="p-3.5 pl-5">Opponent</th>
                                  <th className="p-3.5 text-center">Batting</th>
                                  <th className="p-3.5 text-center">Bowling</th>
                                  <th className="p-3.5">Result</th>
                                  <th className="p-3.5 pr-5 text-right">Date</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-800 font-semibold">
                                {stats.matchHistory.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-3.5 pl-5 font-bold text-slate-900">{item.opponent}</td>
                                    <td className="p-3.5 text-center">
                                      {item.runs} <span className="text-[10px] text-slate-450 font-normal">({item.balls}){item.isOut ? '' : '*'}</span>
                                    </td>
                                    <td className="p-3.5 text-center">
                                      {item.wickets}/{item.runsConceded} <span className="text-[10px] text-slate-450 font-normal">({Math.floor(item.ballsBowled / 6)}.{item.ballsBowled % 6})</span>
                                    </td>
                                    <td className="p-3.5 text-slate-600 truncate max-w-[150px]" title={item.result}>
                                      {item.result}
                                    </td>
                                    <td className="p-3.5 pr-5 text-right text-slate-500">{item.date}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Card layout on mobile */}
                        <div className="block sm:hidden space-y-3">
                          {stats.matchHistory.map((item, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-150 shadow-xs space-y-2.5">
                              <div className="flex justify-between items-center">
                                <span className="font-extrabold text-slate-900 text-xs truncate max-w-[170px]">{item.opponent}</span>
                                <span className="text-[9px] text-slate-400 font-bold">{item.date}</span>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2 text-center text-[10px] bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                                <div>
                                  <p className="text-slate-450 font-bold uppercase tracking-wider text-[9px]">Batting</p>
                                  <p className="font-extrabold text-slate-950 mt-0.5">
                                    {item.runs} <span className="font-normal text-slate-500">({item.balls}){item.isOut ? '' : '*'}</span>
                                  </p>
                                </div>
                                <div className="border-l border-slate-200">
                                  <p className="text-slate-450 font-bold uppercase tracking-wider text-[9px]">Bowling</p>
                                  <p className="font-extrabold text-slate-950 mt-0.5">
                                    {item.wickets}/{item.runsConceded} <span className="font-normal text-slate-500">({Math.floor(item.ballsBowled / 6)}.{item.ballsBowled % 6})</span>
                                  </p>
                                </div>
                              </div>
                              
                              <div className="text-[10px] text-slate-600 font-bold pl-1 bg-blue-50/20 p-2 rounded-lg border border-blue-105/20">
                                <span className="text-blue-600 uppercase text-[9px] tracking-wider font-extrabold block mb-0.5">Match Result</span>
                                <p className="truncate text-slate-700">{item.result}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

              </div>

              {/* Close Row */}
              <div className="p-4 bg-white border-t border-slate-150 flex justify-end">
                <button
                  onClick={() => setSelectedPlayer(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-650 hover:text-slate-950 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
                >
                  Back to Squad
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
