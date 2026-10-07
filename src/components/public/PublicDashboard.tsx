'use client'

import { useState, useEffect, useMemo } from 'react'
import { Team, Player, Match, BallLogEvent } from '@/types'
import { createClient } from '@/utils/supabase/client'
import { calculateTeamNRR } from '@/utils/nrr'
import { calculateScorecard, formatOvers } from '@/utils/scorecard'
import {
  Trophy,
  Users,
  Calendar,
  Activity,
  Shield,
  Award,
  Search,
  Sparkles,
  MapPin,
  Flame,
  ChevronRight,
  BarChart3,
  Star,
  ExternalLink,
  Target,
  Plus,
  Zap,
  Crown,
  Medal,
  TrendingUp,
} from 'lucide-react'
import QuickScorecardModal from './QuickScorecardModal'
import QuickTeamModal from './QuickTeamModal'
import QuickPlayerModal from './QuickPlayerModal'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface PublicDashboardProps {
  initialMatches: Match[]
  teams: Team[]
  players: Player[]
  matchPlayers: { match_id: string; team_id: string }[]
  initialSeason: number
  initialTab?: 'overview' | 'fixtures' | 'standings' | 'stats' | 'teams' | 'bracket'
}

// Calculate season-specific player stats from balls_log
interface SeasonPlayerStat {
  playerId: string
  name: string
  teamId: string
  teamName: string
  runs: number
  wickets: number
  fours: number
  sixes: number
  ballsFaced: number
  matchesPlayed: number
  strikeRate: number
  ballsBowled: number
  runsConceded: number
  economy: number
}

function calculateSeasonStats(
  seasonMatches: Match[],
  players: Player[],
  teams: Team[]
): SeasonPlayerStat[] {
  const completedMatches = seasonMatches.filter((m) => m.status === 'completed')
  const playerStatsMap = new Map<string, SeasonPlayerStat>()

  const getOrCreate = (playerId: string): SeasonPlayerStat => {
    if (!playerStatsMap.has(playerId)) {
      const player = players.find((p) => p.id === playerId)
      const team = player?.team_id ? teams.find((t) => t.id === player.team_id) : null
      playerStatsMap.set(playerId, {
        playerId,
        name: player?.name || 'Unknown',
        teamId: player?.team_id || '',
        teamName: team?.name || 'League Pool',
        runs: 0,
        wickets: 0,
        fours: 0,
        sixes: 0,
        ballsFaced: 0,
        matchesPlayed: 0,
        strikeRate: 0,
        ballsBowled: 0,
        runsConceded: 0,
        economy: 0,
      })
    }
    return playerStatsMap.get(playerId)!
  }

  // Track which matches each player has participated in
  const playerMatchSet = new Map<string, Set<string>>()

  for (const match of completedMatches) {
    const ballsLog: BallLogEvent[] = Array.isArray(match.balls_log) ? match.balls_log : []

    for (const ball of ballsLog) {
      // Batsman stats
      if (ball.batsman_id) {
        const batsmanStat = getOrCreate(ball.batsman_id)
        if (!playerMatchSet.has(ball.batsman_id)) playerMatchSet.set(ball.batsman_id, new Set())
        playerMatchSet.get(ball.batsman_id)!.add(match.id)

        // Only count runs and balls for non-wide deliveries
        if (ball.extra_type !== 'wide') {
          batsmanStat.runs += ball.runs
          batsmanStat.ballsFaced += 1
          if (ball.runs === 4) batsmanStat.fours += 1
          if (ball.runs === 6) batsmanStat.sixes += 1
        }
      }

      // Bowler stats
      if (ball.bowler_id) {
        const bowlerStat = getOrCreate(ball.bowler_id)
        if (!playerMatchSet.has(ball.bowler_id)) playerMatchSet.set(ball.bowler_id, new Set())
        playerMatchSet.get(ball.bowler_id)!.add(match.id)

        // Bowler concedes runs off the bat + extras (wide/no-ball)
        let bowlerRunsConceded = ball.runs
        if (ball.extra_type === 'wide' || ball.extra_type === 'no_ball') {
          bowlerRunsConceded += ball.extra_runs
        }
        bowlerStat.runsConceded += bowlerRunsConceded

        if (ball.is_legal) {
          bowlerStat.ballsBowled += 1
        }

        // Wicket credited to bowler
        if (ball.is_wicket && ball.wicket_type && ['bowled', 'caught', 'lbw', 'stumped'].includes(ball.wicket_type)) {
          bowlerStat.wickets += 1
        }
      }

      // Also track striker and non-striker as having participated
      if (ball.striker_id) {
        getOrCreate(ball.striker_id)
        if (!playerMatchSet.has(ball.striker_id)) playerMatchSet.set(ball.striker_id, new Set())
        playerMatchSet.get(ball.striker_id)!.add(match.id)
      }
      if (ball.non_striker_id) {
        getOrCreate(ball.non_striker_id)
        if (!playerMatchSet.has(ball.non_striker_id)) playerMatchSet.set(ball.non_striker_id, new Set())
        playerMatchSet.get(ball.non_striker_id)!.add(match.id)
      }
    }
  }

  // Calculate derived stats and match count
  for (const [playerId, stat] of playerStatsMap) {
    stat.matchesPlayed = playerMatchSet.get(playerId)?.size || 0
    stat.strikeRate = stat.ballsFaced > 0 ? parseFloat(((stat.runs / stat.ballsFaced) * 100).toFixed(2)) : 0
    const overFraction = Math.floor(stat.ballsBowled / 6) + (stat.ballsBowled % 6) / 6
    stat.economy = overFraction > 0 ? parseFloat((stat.runsConceded / overFraction).toFixed(2)) : 0
  }

  return Array.from(playerStatsMap.values())
}

export default function PublicDashboard({
  initialMatches,
  teams,
  players,
  matchPlayers,
  initialSeason,
  initialTab,
}: PublicDashboardProps) {
  const searchParams = useSearchParams()
  const urlTab = searchParams.get('tab') as 'overview' | 'fixtures' | 'standings' | 'stats' | 'teams' | 'bracket' | null
  const urlSeason = searchParams.get('season') ? parseInt(searchParams.get('season')!, 10) : null

  // Season Selection: URL -> Prop -> Default 1
  const [selectedSeason, setSelectedSeason] = useState<number>(urlSeason || initialSeason || 1)
  const [matches, setMatches] = useState<Match[]>(() => {
    return initialMatches.map((m) => ({
      ...m,
      team1: teams.find((t) => t.id === m.team1_id),
      team2: teams.find((t) => t.id === m.team2_id),
    }))
  })

  // Active Tab: URL -> Prop -> Default 'overview'
  const [activeTab, setActiveTab] = useState<'overview' | 'fixtures' | 'standings' | 'stats' | 'teams' | 'bracket'>(
    urlTab || initialTab || 'overview'
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)

  // Sync initialSeason & searchParams changes
  useEffect(() => {
    const tabParam = searchParams.get('tab') as any
    if (tabParam && ['overview', 'fixtures', 'standings', 'stats', 'teams', 'bracket'].includes(tabParam)) {
      setActiveTab(tabParam)
    } else if (initialTab) {
      setActiveTab(initialTab)
    }

    const seasonParam = searchParams.get('season')
    if (seasonParam) {
      const sNum = parseInt(seasonParam, 10)
      if (!isNaN(sNum) && (sNum === 1 || sNum === 2)) {
        setSelectedSeason(sNum)
      }
    } else if (initialSeason) {
      setSelectedSeason(initialSeason)
    }
  }, [searchParams, initialTab, initialSeason])

  // Instant tab switch with shallow URL update (zero server roundtrip)
  const handleTabChange = (newTab: 'overview' | 'fixtures' | 'standings' | 'stats' | 'teams' | 'bracket') => {
    setActiveTab(newTab)
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', newTab)
      window.history.replaceState(null, '', url.toString())
    } catch {}
  }

  // Instant season switch with shallow URL update
  const handleSeasonChange = (newSeason: number) => {
    setSelectedSeason(newSeason)
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('season', newSeason.toString())
      window.history.replaceState(null, '', url.toString())
    } catch {}
  }

  // Real-time matches listener
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('public-dashboard-matches')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMatch = payload.new as Match
            setMatches((prev) => [
              ...prev,
              {
                ...newMatch,
                team1: teams.find((t) => t.id === newMatch.team1_id),
                team2: teams.find((t) => t.id === newMatch.team2_id),
              },
            ])
          } else if (payload.eventType === 'UPDATE') {
            const updatedMatch = payload.new as Match
            setMatches((prev) =>
              prev.map((m) =>
                m.id === updatedMatch.id
                  ? {
                      ...m,
                      ...updatedMatch,
                      team1: teams.find((t) => t.id === updatedMatch.team1_id),
                      team2: teams.find((t) => t.id === updatedMatch.team2_id),
                    }
                  : m
              )
            )
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as Match
            setMatches((prev) => prev.filter((m) => m.id !== deleted.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [teams])

  // Filter matches by current season (Default Season 1 for completed matches, Season 2 for new)
  const seasonMatches = matches.filter((m) => {
    const mSeason = m.season || 1
    return mSeason === selectedSeason
  })

  const liveMatches = seasonMatches.filter((m) => m.status === 'live')
  const upcomingMatches = seasonMatches.filter((m) => m.status === 'upcoming')
  const completedMatches = seasonMatches.filter((m) => m.status === 'completed')
  const completedLeagueMatches = completedMatches.filter((m) => m.stage === 'league' || !m.stage)

  // Points Table Calculation with Form Guide
  const pointsTable = useMemo(() => {
    const table = teams.map((team) => {
      const teamMatches = completedLeagueMatches.filter(
        (m) => m.team1_id === team.id || m.team2_id === team.id
      )
      const won = teamMatches.filter((m) => m.winner_id === team.id).length
      const noResult = teamMatches.filter((m) => m.result_type === 'no_result').length
      const tied = teamMatches.filter((m) => !m.winner_id && m.result_type !== 'no_result').length
      const lost = teamMatches.filter((m) => m.winner_id && m.winner_id !== team.id).length
      const points = won * 2 + tied * 1 + noResult * 1
      const nrr = calculateTeamNRR(team.id, completedLeagueMatches, matchPlayers)

      // Calculate Form (Last 5 matches)
      const form = teamMatches
        .slice(-5)
        .map((m) => {
          if (m.result_type === 'no_result') return 'NR'
          if (m.winner_id === team.id) return 'W'
          if (m.winner_id) return 'L'
          return 'T'
        })
        .reverse()

      return {
        team,
        played: teamMatches.length,
        won,
        lost,
        tied,
        noResult,
        points,
        nrr,
        form,
      }
    })
    table.sort((a, b) => b.points - a.points || b.won - a.won || b.nrr - a.nrr)
    return table
  }, [teams, completedLeagueMatches, matchPlayers])

  // SEASON-SPECIFIC Leaderboards (calculated from balls_log data, NOT player aggregate table)
  const seasonPlayerStats = useMemo(() => {
    return calculateSeasonStats(seasonMatches, players, teams)
  }, [seasonMatches, players, teams])

  const topRuns = useMemo(() =>
    [...seasonPlayerStats].filter((p) => p.runs > 0).sort((a, b) => b.runs - a.runs).slice(0, 10),
    [seasonPlayerStats]
  )
  const topWickets = useMemo(() =>
    [...seasonPlayerStats].filter((p) => p.wickets > 0).sort((a, b) => b.wickets - a.wickets).slice(0, 10),
    [seasonPlayerStats]
  )
  const topFours = useMemo(() =>
    [...seasonPlayerStats].filter((p) => p.fours > 0).sort((a, b) => b.fours - a.fours).slice(0, 10),
    [seasonPlayerStats]
  )
  const topSixes = useMemo(() =>
    [...seasonPlayerStats].filter((p) => p.sixes > 0).sort((a, b) => b.sixes - a.sixes).slice(0, 10),
    [seasonPlayerStats]
  )

  // Season 1 Winner Detection
  const season1Matches = matches.filter((m) => (m.season || 1) === 1)
  const season1FinalMatch = season1Matches.find((m) => m.stage === 'final' && m.status === 'completed')
  const season1Winner = season1FinalMatch?.winner_id ? teams.find((t) => t.id === season1FinalMatch.winner_id) : null

  // Derive Bracket Playoff Teams:
  // User Rule: Top 1 Team goes directly to Final. Top 2 and Top 3 play the Semi Final!
  const rank1Team = pointsTable[0]?.team
  const rank2Team = pointsTable[1]?.team
  const rank3Team = pointsTable[2]?.team

  const sfMatch = seasonMatches.find((m) => m.stage === 'semi_final_1' || m.stage === 'quarter_final')
  const finalMatch = seasonMatches.find((m) => m.stage === 'final')

  const sfWinner = sfMatch?.winner_id ? teams.find((t) => t.id === sfMatch.winner_id) : null
  const grandChampion = finalMatch?.winner_id ? teams.find((t) => t.id === finalMatch.winner_id) : null

  // Search filtering
  const filteredMatchesBySearch = seasonMatches.filter((m) => {
    if (!searchQuery) return true
    const term = searchQuery.toLowerCase()
    const t1Name = m.team1?.name || ''
    const t2Name = m.team2?.name || ''
    return t1Name.toLowerCase().includes(term) || t2Name.toLowerCase().includes(term) || m.venue.toLowerCase().includes(term)
  })

  // Helper: find Player object from SeasonPlayerStat
  const findPlayer = (playerId: string) => players.find((p) => p.id === playerId) || null

  return (
    <div className="space-y-8 pb-24 text-gray-900 font-sans">
      
      {/* 1. Hero Showcase Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-slate-900 to-blue-950 text-white rounded-3xl p-6 sm:p-8 shadow-md">
        <div
          className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-20 pointer-events-none"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1600&q=80')`,
          }}
        />
        <div className="relative z-10 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-black uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {selectedSeason === 1 ? 'KPL Season 1 (Completed Season Archive)' : 'KPL Season 2 (Upcoming / Active Season)'}
            </div>

            {/* Season Switcher Pill */}
            <div className="flex items-center bg-white/10 border border-white/20 p-1 rounded-2xl text-xs font-bold">
              <button
                onClick={() => handleSeasonChange(1)}
                className={`px-3.5 py-1.5 rounded-xl transition-all ${
                  selectedSeason === 1
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Season 1 {season1Winner ? `🏆` : '(Completed)'}
              </button>
              <button
                onClick={() => handleSeasonChange(2)}
                className={`px-3.5 py-1.5 rounded-xl transition-all ${
                  selectedSeason === 2
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Season 2 (Upcoming) 🔥
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
              KPL Corporate League {selectedSeason === 1 ? 'Season 1' : 'Season 2'}
            </h1>
            <p className="text-gray-300 text-xs sm:text-sm max-w-2xl leading-relaxed font-medium">
              Realtime ball-by-ball scorecards, tournament standings, Orange/Purple cap leaderboards, and squad statistics.
            </p>
          </div>

          {/* Season 1 Winner Banner */}
          {selectedSeason === 1 && season1Winner && (
            <div className="flex items-center gap-4 bg-amber-500/20 border border-amber-400/30 rounded-2xl p-4">
              <Crown className="w-10 h-10 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-amber-300 font-black uppercase tracking-widest">Season 1 Champions</p>
                <p className="text-xl font-black text-white">{season1Winner.name} 🏆</p>
                <p className="text-xs text-amber-200 font-semibold">
                  {season1FinalMatch?.result_desc || 'Grand Final Winners'}
                </p>
              </div>
            </div>
          )}

          {/* Key Stats Counters Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 space-y-1">
              <p className="text-[10px] text-gray-300 font-extrabold uppercase tracking-wider">Total Teams</p>
              <p className="text-xl font-black text-white">{teams.length} Teams</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 space-y-1">
              <p className="text-[10px] text-gray-300 font-extrabold uppercase tracking-wider">Season Matches</p>
              <p className="text-xl font-black text-blue-300">{seasonMatches.length} Matches</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 space-y-1">
              <p className="text-[10px] text-gray-300 font-extrabold uppercase tracking-wider">Live On Pitch</p>
              <p className="text-xl font-black text-red-400">{liveMatches.length} Live</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 space-y-1">
              <p className="text-[10px] text-gray-300 font-extrabold uppercase tracking-wider">Completed</p>
              <p className="text-xl font-black text-emerald-300">{completedMatches.length} Finished</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive Navigation Bar & Search */}
      <div className="sticky top-20 z-30 bg-white border border-gray-200 p-2 rounded-2xl shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto p-1 text-xs font-bold">
          <button
            onClick={() => handleTabChange('overview')}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Overview
          </button>

          <button
            onClick={() => handleTabChange('fixtures')}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'fixtures'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Calendar className="w-4 h-4" /> Live &amp; Schedule ({seasonMatches.length})
          </button>

          <button
            onClick={() => handleTabChange('standings')}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'standings'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Shield className="w-4 h-4" /> Points Table
          </button>

          <button
            onClick={() => handleTabChange('stats')}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'stats'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Stats &amp; Leaders
          </button>

          <button
            onClick={() => handleTabChange('teams')}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'teams'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Users className="w-4 h-4" /> Teams &amp; Squads
          </button>

          <button
            onClick={() => handleTabChange('bracket')}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'bracket'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Trophy className="w-4 h-4" /> Knockout Tree
          </button>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search teams or venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
        </div>
      </div>

      {/* Season 2 Empty Info Banner (if Season 2 is selected and no matches scheduled yet) */}
      {selectedSeason === 2 && seasonMatches.length === 0 && (
        <div className="p-6 rounded-3xl bg-blue-50 border border-blue-200 text-blue-900 space-y-3 text-center">
          <Sparkles className="w-8 h-8 text-blue-600 mx-auto animate-bounce" />
          <h3 className="font-extrabold text-base">KPL Season 2 Starting Soon!</h3>
          <p className="text-xs text-blue-800 max-w-lg mx-auto font-medium">
            Season 2 has been initialized. League administrators can schedule Season 2 match fixtures from the Admin Portal. All Season 1 data is preserved safely in Season 1 Archive tab.
          </p>
          <Link
            href="/admin/matches"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" /> Schedule Season 2 Match in Admin
          </Link>
        </div>
      )}

      {/* 3. Live Matches Ribbon (Always Visible if Live) */}
      {liveMatches.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-red-600 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" /> Live Scoring Matches (Click for Scorecard)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {liveMatches.map((m) => (
              <div
                key={m.id}
                onClick={() => setSelectedMatch(m)}
                className="bg-white rounded-2xl border-2 border-red-200 p-6 shadow-md space-y-4 cursor-pointer hover:border-red-400 hover:shadow-lg transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 px-3 py-1 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-bl-xl">
                  Live Match
                </div>

                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span className="flex items-center gap-1 font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" /> {m.venue}
                  </span>
                  <span>Innings {m.innings_number}</span>
                </div>

                <div className="space-y-3 pt-1">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-gray-900 text-base">{m.team1?.name}</span>
                    <span className="text-lg font-black text-blue-600">
                      {m.team1_runs}/{m.team1_wickets} <span className="text-xs text-gray-500 font-semibold">({formatOvers(m.team1_balls)})</span>
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-gray-900 text-base">{m.team2?.name}</span>
                    <span className="text-lg font-black text-indigo-600">
                      {m.team2_runs}/{m.team2_wickets} <span className="text-xs text-gray-500 font-semibold">({formatOvers(m.team2_balls)})</span>
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-xs font-bold text-gray-700">
                  <span>{m.result_desc || 'Live Scoring in Progress'}</span>
                  <span className="text-blue-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    Scorecard &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Tab Content Switcher */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Main Grid: Standings Preview & Recent Matches */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Standings Table Card Preview */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" /> Season {selectedSeason} Points Standing
                </h3>
                <button
                  onClick={() => setActiveTab('standings')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-500 flex items-center gap-1"
                >
                  Full Table &rarr;
                </button>
              </div>

              {pointsTable.filter((r) => r.played > 0).length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-gray-200 text-gray-400 text-xs">
                  No points standings recorded for Season {selectedSeason}.
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 font-bold uppercase text-[9px] tracking-wider border-b border-gray-200">
                          <th className="p-3 pl-5 text-center w-12">Pos</th>
                          <th className="p-3">Team</th>
                          <th className="p-3 text-center">P</th>
                          <th className="p-3 text-center">W</th>
                          <th className="p-3 text-center">L</th>
                          <th className="p-3 text-center">NRR</th>
                          <th className="p-3 text-center pr-5 font-black text-blue-600">PTS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-semibold text-gray-900">
                        {pointsTable.slice(0, 5).map((row, idx) => (
                          <tr key={row.team.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="p-3 pl-5 text-center font-bold">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${
                                idx === 0 ? 'bg-amber-100 text-amber-800' :
                                idx === 1 ? 'bg-slate-100 text-slate-700' :
                                'text-gray-400'
                              }`}>
                                {idx + 1}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-gray-900">
                              <button
                                onClick={() => setSelectedTeam(row.team)}
                                className="hover:text-blue-600 transition-colors flex items-center gap-2.5 text-left"
                              >
                                <div className="w-7 h-7 rounded bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 font-bold text-[9px]">
                                  {row.team.logo_url ? <img src={row.team.logo_url} alt="" className="w-full h-full object-cover" /> : row.team.name.slice(0, 2).toUpperCase()}
                                </div>
                                <span>{row.team.name}</span>
                              </button>
                            </td>
                            <td className="p-3 text-center text-gray-500">{row.played}</td>
                            <td className="p-3 text-center text-emerald-600 font-bold">{row.won}</td>
                            <td className="p-3 text-center text-rose-600 font-bold">{row.lost}</td>
                            <td className={`p-3 text-center font-bold ${row.nrr > 0 ? 'text-emerald-600' : row.nrr < 0 ? 'text-rose-600' : 'text-gray-500'}`}>
                              {row.nrr > 0 ? `+${row.nrr.toFixed(3)}` : row.nrr.toFixed(3)}
                            </td>
                            <td className="p-3 text-center pr-5 font-black text-blue-600 text-sm">{row.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Upcoming Fixtures & Recent Results */}
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" /> Recent / Upcoming Matches
                </h3>
                <button
                  onClick={() => setActiveTab('fixtures')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-500 flex items-center gap-1"
                >
                  All Fixtures &rarr;
                </button>
              </div>

              <div className="space-y-3">
                {seasonMatches.length === 0 ? (
                  <div className="text-center py-8 bg-white rounded-2xl border border-gray-200 text-gray-400 text-xs">
                    No matches scheduled for Season {selectedSeason} yet.
                  </div>
                ) : (
                  seasonMatches.slice(0, 4).map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMatch(m)}
                      className="p-4 rounded-2xl bg-white border border-gray-200 hover:border-blue-500/40 hover:shadow-md transition-all cursor-pointer space-y-2 group"
                    >
                      <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold uppercase">
                        <span>{new Date(m.match_date).toLocaleDateString()}</span>
                        <span className={`px-2 py-0.5 rounded-full ${
                          m.status === 'live' ? 'bg-red-50 text-red-600 border border-red-200' :
                          m.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {m.status}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs font-bold text-gray-900">
                        <span>{m.team1?.name} vs {m.team2?.name}</span>
                        <span className="text-gray-400 text-[11px] group-hover:text-blue-600 transition-colors">Scorecard &rarr;</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Top Performers Showcase (Season-specific stats from balls_log!) */}
          <div className="space-y-4 pt-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 flex items-center gap-2 border-b border-gray-200 pb-2">
              <Award className="w-4 h-4 text-blue-600" /> Season {selectedSeason} Orange &amp; Purple Cap Leaders (Click player for full stats)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Orange Cap */}
              <div className="bg-gradient-to-br from-white to-amber-50/50 p-6 rounded-2xl border border-amber-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" /> Most Runs (Orange Cap)
                  </h4>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-black">Season {selectedSeason}</span>
                </div>

                {topRuns.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-2">No batsman stats recorded for Season {selectedSeason} yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {topRuns.slice(0, 3).map((p, idx) => (
                      <div
                        key={p.playerId}
                        onClick={() => {
                          const pl = findPlayer(p.playerId)
                          if (pl) setSelectedPlayer(pl)
                        }}
                        className="flex justify-between items-center p-3 rounded-xl bg-white border border-gray-150 text-xs shadow-2xs hover:border-amber-400 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <div>
                            <p className="font-bold text-gray-900 group-hover:text-amber-700 transition-colors">{p.name}</p>
                            <p className="text-[10px] text-gray-500">{p.teamName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-amber-700 text-sm">{p.runs} <span className="text-[10px] text-gray-400">runs</span></span>
                          <p className="text-[10px] text-gray-400">{p.ballsFaced}b • SR {p.strikeRate}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Purple Cap */}
              <div className="bg-gradient-to-br from-white to-indigo-50/50 p-6 rounded-2xl border border-indigo-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-indigo-600" /> Most Wickets (Purple Cap)
                  </h4>
                  <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-black">Season {selectedSeason}</span>
                </div>

                {topWickets.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-2">No bowler stats recorded for Season {selectedSeason} yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {topWickets.slice(0, 3).map((p, idx) => (
                      <div
                        key={p.playerId}
                        onClick={() => {
                          const pl = findPlayer(p.playerId)
                          if (pl) setSelectedPlayer(pl)
                        }}
                        className="flex justify-between items-center p-3 rounded-xl bg-white border border-gray-150 text-xs shadow-2xs hover:border-indigo-400 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[10px] flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <div>
                            <p className="font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">{p.name}</p>
                            <p className="text-[10px] text-gray-500">{p.teamName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-indigo-700 text-sm">{p.wickets} <span className="text-[10px] text-gray-400">wkts</span></span>
                          <p className="text-[10px] text-gray-400">Econ {p.economy}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fixtures Tab */}
      {activeTab === 'fixtures' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-gray-200 pb-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-900">
              Season {selectedSeason} Full Match Schedule ({filteredMatchesBySearch.length})
            </h3>
          </div>

          {filteredMatchesBySearch.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-gray-200 text-gray-400 text-xs">
              No matches found for Season {selectedSeason}.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredMatchesBySearch.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setSelectedMatch(m)}
                  className="p-6 rounded-2xl bg-white border border-gray-200 hover:border-blue-500/40 hover:shadow-md transition-all cursor-pointer space-y-4 group"
                >
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span className="flex items-center gap-1 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    {new Date(m.match_date).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1 text-gray-500">
                    <MapPin className="w-3.5 h-3.5" /> {m.venue}
                  </span>
                </div>

                <div className="space-y-2 py-1">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-gray-900 text-base">{m.team1?.name}</span>
                    <span className="font-black text-blue-600">{m.team1_runs}/{m.team1_wickets}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-gray-900 text-base">{m.team2?.name}</span>
                    <span className="font-black text-indigo-600">{m.team2_runs}/{m.team2_wickets}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-xs font-bold">
                  <span className="text-gray-600">{m.result_desc || m.status.toUpperCase()}</span>
                  <span className="text-blue-600 group-hover:translate-x-1 transition-transform">
                    Scorecard Details &rarr;
                  </span>
                </div>
              </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Standings Tab with Form Guide */}
      {activeTab === 'standings' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-gray-200 pb-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-900">
              Official Points Standings Table - Season {selectedSeason}
            </h3>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 font-bold uppercase text-[9px] tracking-wider border-b border-gray-200">
                    <th className="p-4 pl-6 text-center w-14">Pos</th>
                    <th className="p-4">Team</th>
                    <th className="p-4 text-center">Played</th>
                    <th className="p-4 text-center">Won</th>
                    <th className="p-4 text-center">Lost</th>
                    <th className="p-4 text-center">Tied</th>
                    <th className="p-4 text-center">NRR</th>
                    <th className="p-4 text-center">Form (Last 5)</th>
                    <th className="p-4 text-center pr-6 font-black text-blue-600 text-sm">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-semibold text-gray-900">
                  {pointsTable.map((row, idx) => (
                    <tr
                      key={row.team.id}
                      className={`hover:bg-gray-50/50 transition-colors ${
                        idx < 3 ? 'border-l-4 border-l-blue-600' : ''
                      }`}
                    >
                      <td className="p-4 pl-6 text-center font-bold">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${
                          idx === 0 ? 'bg-amber-100 text-amber-800' :
                          idx === 1 ? 'bg-slate-100 text-slate-700' :
                          idx === 2 ? 'bg-amber-50 text-amber-900/60' :
                          'text-gray-400'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-gray-900">
                        <button
                          onClick={() => setSelectedTeam(row.team)}
                          className="hover:text-blue-600 transition-colors flex items-center gap-3 text-left"
                        >
                          <div className="w-8 h-8 rounded bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 font-bold text-xs">
                            {row.team.logo_url ? <img src={row.team.logo_url} alt="" className="w-full h-full object-cover" /> : row.team.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm font-extrabold">{row.team.name}</span>
                        </button>
                      </td>
                      <td className="p-4 text-center text-gray-500">{row.played}</td>
                      <td className="p-4 text-center text-emerald-600 font-black">{row.won}</td>
                      <td className="p-4 text-center text-rose-600 font-black">{row.lost}</td>
                      <td className="p-4 text-center text-gray-500">{row.tied}</td>
                      <td className={`p-4 text-center font-bold ${row.nrr > 0 ? 'text-emerald-600' : row.nrr < 0 ? 'text-rose-600' : 'text-gray-500'}`}>
                        {row.nrr > 0 ? `+${row.nrr.toFixed(3)}` : row.nrr.toFixed(3)}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {row.form.length === 0 ? (
                            <span className="text-[10px] text-gray-400 italic">-</span>
                          ) : (
                            row.form.map((res, fIdx) => (
                              <span
                                key={fIdx}
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white ${
                                  res === 'W' ? 'bg-emerald-600' : res === 'L' ? 'bg-rose-600' : 'bg-gray-400'
                                }`}
                              >
                                {res}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center pr-6 font-black text-blue-600 text-base">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* FULL STATS TAB - IPL Style with Most Runs, Most Wickets, Most Fours, Most Sixes */}
      {activeTab === 'stats' && (
        <div className="space-y-8">
          <div className="flex justify-between items-center border-b border-gray-200 pb-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" /> Season {selectedSeason} Complete Player Statistics & Leaderboards
            </h3>
          </div>

          {completedMatches.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-gray-200 text-gray-400 text-xs space-y-2">
              <BarChart3 className="w-8 h-8 text-gray-300 mx-auto" />
              <p>No completed matches in Season {selectedSeason} yet. Stats will appear after matches are played and scored.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* 🏏 Most Runs (Orange Cap) */}
              <div className="bg-gradient-to-br from-white to-amber-50/50 p-6 rounded-2xl border border-amber-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" /> Most Runs (Orange Cap)
                  </h4>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-black">Top Batsmen</span>
                </div>

                {topRuns.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-2">No batsman stats recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {topRuns.map((p, idx) => (
                      <div
                        key={p.playerId}
                        onClick={() => {
                          const pl = findPlayer(p.playerId)
                          if (pl) setSelectedPlayer(pl)
                        }}
                        className={`flex justify-between items-center p-3 rounded-xl border text-xs transition-all cursor-pointer group ${
                          idx === 0 ? 'bg-amber-50 border-amber-300 shadow-sm' : 'bg-white border-gray-150 hover:border-amber-400'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`w-6 h-6 rounded-full font-bold text-[10px] flex items-center justify-center ${
                            idx === 0 ? 'bg-amber-500 text-white' :
                            idx === 1 ? 'bg-slate-200 text-slate-700' :
                            idx === 2 ? 'bg-amber-100 text-amber-800' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-bold text-gray-900 group-hover:text-amber-700 transition-colors">{p.name}</p>
                            <p className="text-[10px] text-gray-500">{p.teamName} • {p.matchesPlayed} matches</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-amber-700 text-sm">{p.runs}</p>
                          <p className="text-[10px] text-gray-400">SR {p.strikeRate}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 🎯 Most Wickets (Purple Cap) */}
              <div className="bg-gradient-to-br from-white to-indigo-50/50 p-6 rounded-2xl border border-indigo-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-indigo-600" /> Most Wickets (Purple Cap)
                  </h4>
                  <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-black">Top Bowlers</span>
                </div>

                {topWickets.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-2">No bowler stats recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {topWickets.map((p, idx) => (
                      <div
                        key={p.playerId}
                        onClick={() => {
                          const pl = findPlayer(p.playerId)
                          if (pl) setSelectedPlayer(pl)
                        }}
                        className={`flex justify-between items-center p-3 rounded-xl border text-xs transition-all cursor-pointer group ${
                          idx === 0 ? 'bg-indigo-50 border-indigo-300 shadow-sm' : 'bg-white border-gray-150 hover:border-indigo-400'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`w-6 h-6 rounded-full font-bold text-[10px] flex items-center justify-center ${
                            idx === 0 ? 'bg-indigo-600 text-white' :
                            idx === 1 ? 'bg-slate-200 text-slate-700' :
                            idx === 2 ? 'bg-indigo-100 text-indigo-800' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">{p.name}</p>
                            <p className="text-[10px] text-gray-500">{p.teamName} • {p.matchesPlayed} matches</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-indigo-700 text-sm">{p.wickets}</p>
                          <p className="text-[10px] text-gray-400">Econ {p.economy}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4️⃣ Most Fours */}
              <div className="bg-gradient-to-br from-white to-emerald-50/50 p-6 rounded-2xl border border-emerald-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" /> Most Fours
                  </h4>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-black">Boundary Kings</span>
                </div>

                {topFours.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-2">No fours recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {topFours.map((p, idx) => (
                      <div
                        key={p.playerId}
                        onClick={() => {
                          const pl = findPlayer(p.playerId)
                          if (pl) setSelectedPlayer(pl)
                        }}
                        className={`flex justify-between items-center p-3 rounded-xl border text-xs transition-all cursor-pointer group ${
                          idx === 0 ? 'bg-emerald-50 border-emerald-300 shadow-sm' : 'bg-white border-gray-150 hover:border-emerald-400'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`w-6 h-6 rounded-full font-bold text-[10px] flex items-center justify-center ${
                            idx === 0 ? 'bg-emerald-600 text-white' :
                            idx === 1 ? 'bg-slate-200 text-slate-700' :
                            idx === 2 ? 'bg-emerald-100 text-emerald-800' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">{p.name}</p>
                            <p className="text-[10px] text-gray-500">{p.teamName} • {p.runs} runs</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-emerald-700 text-sm">{p.fours}</p>
                          <p className="text-[10px] text-gray-400">fours</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 6️⃣ Most Sixes */}
              <div className="bg-gradient-to-br from-white to-rose-50/50 p-6 rounded-2xl border border-rose-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-rose-600" /> Most Sixes
                  </h4>
                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-black">Power Hitters</span>
                </div>

                {topSixes.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-2">No sixes recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {topSixes.map((p, idx) => (
                      <div
                        key={p.playerId}
                        onClick={() => {
                          const pl = findPlayer(p.playerId)
                          if (pl) setSelectedPlayer(pl)
                        }}
                        className={`flex justify-between items-center p-3 rounded-xl border text-xs transition-all cursor-pointer group ${
                          idx === 0 ? 'bg-rose-50 border-rose-300 shadow-sm' : 'bg-white border-gray-150 hover:border-rose-400'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`w-6 h-6 rounded-full font-bold text-[10px] flex items-center justify-center ${
                            idx === 0 ? 'bg-rose-600 text-white' :
                            idx === 1 ? 'bg-slate-200 text-slate-700' :
                            idx === 2 ? 'bg-rose-100 text-rose-800' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-bold text-gray-900 group-hover:text-rose-700 transition-colors">{p.name}</p>
                            <p className="text-[10px] text-gray-500">{p.teamName} • {p.runs} runs</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-rose-700 text-sm">{p.sixes}</p>
                          <p className="text-[10px] text-gray-400">sixes</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Teams Tab */}
      {activeTab === 'teams' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-gray-200 pb-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-900">
              Competing Teams &amp; Squad Rosters ({teams.length} Teams)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => {
              const tPlayers = players.filter((p) => p.team_id === team.id)
              return (
                <div
                  key={team.id}
                  onClick={() => setSelectedTeam(team)}
                  className="p-6 rounded-2xl bg-white border border-gray-200 hover:border-blue-500/40 hover:shadow-md transition-all cursor-pointer space-y-4 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-200 p-1 flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform">
                      {team.logo_url ? (
                        <img src={team.logo_url} alt="" className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Shield className="w-7 h-7 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900 text-lg group-hover:text-blue-600 transition-colors">{team.name}</h4>
                      <p className="text-xs text-gray-500 font-semibold">Capt. {team.captain_name}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex justify-between items-center text-xs font-bold text-gray-500">
                    <span>{tPlayers.length} Registered Players</span>
                    <span className="text-blue-600 group-hover:translate-x-1 transition-transform">
                      View Squad &rarr;
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Knockouts Bracket Tab (Matching User Playoff Rule: #1 Direct Final, #2 vs #3 Semi Final) */}
      {activeTab === 'bracket' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-gray-200 pb-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-900">
              Tournament Knockout Tree - Season {selectedSeason} (Rank #1 Direct Final, #2 vs #3 Semi Final)
            </h3>
          </div>

          {/* Season 1 Champion display in bracket view */}
          {selectedSeason === 1 && season1Winner && (
            <div className="flex items-center justify-center gap-4 bg-gradient-to-r from-amber-50 to-amber-100 border-2 border-amber-300 rounded-2xl p-6 shadow-sm">
              <Crown className="w-12 h-12 text-amber-600 flex-shrink-0" />
              <div className="text-center">
                <p className="text-[10px] text-amber-700 font-black uppercase tracking-widest">🏆 Season 1 Champions 🏆</p>
                <p className="text-2xl font-black text-amber-900">{season1Winner.name}</p>
                <p className="text-xs text-amber-700 font-semibold">{season1FinalMatch?.result_desc || 'Grand Final Winners'}</p>
              </div>
              <Trophy className="w-12 h-12 text-amber-600 flex-shrink-0 fill-amber-300" />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-4xl mx-auto py-4">
            {/* Semi Final Match Card */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" /> Semi-Final Match
                </h4>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-black uppercase">
                  Rank #2 vs Rank #3
                </span>
              </div>

              <div
                onClick={() => sfMatch && setSelectedMatch(sfMatch)}
                className="p-6 rounded-2xl bg-white border border-gray-200 hover:border-blue-500/40 hover:shadow-md transition-all cursor-pointer space-y-4 relative group"
              >
                <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold uppercase">
                  <span>Semi Final</span>
                  <span className="text-blue-600">{sfMatch?.status || 'Scheduled'}</span>
                </div>

                <div className="space-y-2 py-1 font-bold text-sm text-gray-900">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black flex items-center justify-center">#2</span>
                      {sfMatch?.team1?.name || rank2Team?.name || 'Rank #2 Team'}
                    </span>
                    <span className="text-blue-600">{sfMatch ? `${sfMatch.team1_runs}/${sfMatch.team1_wickets}` : '-'}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black flex items-center justify-center">#3</span>
                      {sfMatch?.team2?.name || rank3Team?.name || 'Rank #3 Team'}
                    </span>
                    <span className="text-indigo-600">{sfMatch ? `${sfMatch.team2_runs}/${sfMatch.team2_wickets}` : '-'}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-xs font-bold text-gray-500">
                  <span>{sfMatch?.result_desc || 'Winner advances to Grand Final'}</span>
                  <span className="text-blue-600 group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
              </div>
            </div>

            {/* Championship Final Match Card */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 fill-amber-500 text-amber-500" /> KPL Grand Final
                </h4>
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
                  Championship
                </span>
              </div>

              <div
                onClick={() => finalMatch && setSelectedMatch(finalMatch)}
                className="p-6 rounded-2xl bg-gradient-to-br from-white to-amber-50/60 border-2 border-amber-300 shadow-md hover:border-amber-400 transition-all cursor-pointer space-y-4 relative group"
              >
                <div className="flex justify-between items-center text-[10px] text-amber-800 font-black uppercase">
                  <span>Grand Final</span>
                  <span className="text-amber-800">{finalMatch?.status || 'Scheduled'}</span>
                </div>

                <div className="space-y-2 py-1 font-bold text-sm text-gray-900">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black flex items-center justify-center">#1</span>
                      {finalMatch?.team1?.name || rank1Team?.name || 'Rank #1 Team (Direct)'}
                    </span>
                    <span className="text-amber-700">{finalMatch ? `${finalMatch.team1_runs}/${finalMatch.team1_wickets}` : '-'}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black flex items-center justify-center">SF</span>
                      {finalMatch?.team2?.name || sfWinner?.name || 'Semi Final Winner'}
                    </span>
                    <span className="text-amber-700">{finalMatch ? `${finalMatch.team2_runs}/${finalMatch.team2_wickets}` : '-'}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-amber-200/60 flex justify-between items-center text-xs font-bold text-amber-800">
                  <span>{grandChampion ? `🎉 Champion: ${grandChampion.name}` : finalMatch?.result_desc || 'Winner takes the KPL Trophy'}</span>
                  <span className="text-amber-800 group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modals for Quick Viewing */}
      <QuickScorecardModal
        match={selectedMatch}
        teams={teams}
        players={players}
        onClose={() => setSelectedMatch(null)}
        onSelectPlayer={(p) => setSelectedPlayer(p)}
      />

      <QuickTeamModal
        team={selectedTeam}
        players={players}
        matches={seasonMatches}
        onClose={() => setSelectedTeam(null)}
        onSelectPlayer={(p) => setSelectedPlayer(p)}
      />

      <QuickPlayerModal
        player={selectedPlayer}
        teams={teams}
        onClose={() => setSelectedPlayer(null)}
      />
    </div>
  )
}
