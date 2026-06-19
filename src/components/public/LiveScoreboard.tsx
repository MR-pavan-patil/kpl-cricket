'use client'

import { useState, useEffect } from 'react'
import { Match, Team, Player } from '@/types'
import { createClient } from '@/utils/supabase/client'
import { calculateScorecard, formatOvers } from '@/utils/scorecard'
import { Calendar, MapPin, Play, Users, Award, Shield, CheckCircle2 } from 'lucide-react'

interface LiveScoreboardProps {
  initialMatch: Match
  teamA: Team
  teamB: Team
  team1Players: Player[]
  team2Players: Player[]
}

type TabType = 'live' | 'scorecard' | 'squads'

export default function LiveScoreboard({
  initialMatch,
  teamA,
  teamB,
  team1Players,
  team2Players,
}: LiveScoreboardProps) {
  const [match, setMatch] = useState<Match>(initialMatch)
  const [activeTab, setActiveTab] = useState<TabType>('live')
  const [matchPlayers, setMatchPlayers] = useState<Player[]>([])
  const [activeScorecardInnings, setActiveScorecardInnings] = useState<1 | 2>(1)

  // Real-time subscription to postgres updates on this match
  useEffect(() => {
    const supabase = createClient()
    const matchChannel = supabase
      .channel(`public-match-page-${match.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${match.id}`,
        },
        (payload) => {
          setMatch((prev) => ({
            ...prev,
            ...payload.new,
          }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(matchChannel)
    }
  }, [match.id])

  // Fetch match Playing XI players and set up realtime updates
  useEffect(() => {
    const supabase = createClient()
    const fetchMatchPlayers = async () => {
      const { data } = await supabase
        .from('match_players')
        .select('*, player:players(*)')
        .eq('match_id', match.id)
      if (data) {
        setMatchPlayers(
          data.map((mp: any) => ({
            ...mp.player,
            team_id: mp.team_id,
          }))
        )
      }
    }
    fetchMatchPlayers()

    const playersChannel = supabase
      .channel(`public-match-players-page-${match.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_players',
          filter: `match_id=eq.${match.id}`,
        },
        () => {
          fetchMatchPlayers()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(playersChannel)
    }
  }, [match.id])

  const currentBattingId = match.current_batting_team_id
  const isActiveTeam1 = currentBattingId === match.team1_id

  const battingTeam = isActiveTeam1 ? teamA : teamB

  const battingRuns = isActiveTeam1 ? match.team1_runs : match.team2_runs
  const battingWickets = isActiveTeam1 ? match.team1_wickets : match.team2_wickets
  const battingBalls = isActiveTeam1 ? match.team1_balls : match.team2_balls

  // Check if 2nd Innings
  const isSecondInnings = match.innings_number === 2
  const target = isSecondInnings
    ? isActiveTeam1
      ? match.team2_runs + 1
      : match.team1_runs + 1
    : null
  const runsNeeded = target ? target - battingRuns : null
  const totalBallsLimit = match.overs_limit * 6
  const ballsRemaining = target ? Math.max(0, totalBallsLimit - battingBalls) : null

  const calculateCRR = (runs: number, balls: number) => {
    if (balls === 0) return '0.00'
    return ((runs * 6) / balls).toFixed(2)
  }

  const calculateRRR = () => {
    if (!ballsRemaining || ballsRemaining <= 0 || !runsNeeded || runsNeeded <= 0) return '0.00'
    return ((runsNeeded * 6) / ballsRemaining).toFixed(2)
  }

  // Filter balls log for current batting team
  const currentBattingBalls = (match.balls_log || []).filter(
    (b) => b.innings === match.innings_number
  )
  const last12Balls = currentBattingBalls.slice(-12)

  // Aggregate scorecard details
  const activeCalculationPlayers =
    matchPlayers.length > 0 ? matchPlayers : [...team1Players, ...team2Players]
  const scorecard1 = calculateScorecard(match.balls_log || [], activeCalculationPlayers, 1)
  const scorecard2 = calculateScorecard(match.balls_log || [], activeCalculationPlayers, 2)

  // Current pitch stats
  const striker = activeCalculationPlayers.find((p) => p.id === match.current_striker_id)
  const nonStriker = activeCalculationPlayers.find((p) => p.id === match.current_non_striker_id)
  const currentBowler = activeCalculationPlayers.find((p) => p.id === match.current_bowler_id)

  const activeScorecard = match.innings_number === 1 ? scorecard1 : scorecard2
  const strikerScore = activeScorecard.batting.find(
    (b) => b.playerId === match.current_striker_id
  )
  const nonStrikerScore = activeScorecard.batting.find(
    (b) => b.playerId === match.current_non_striker_id
  )
  const bowlerScore = activeScorecard.bowling.find(
    (b) => b.playerId === match.current_bowler_id
  )

  const currentCRR = calculateCRR(battingRuns, battingBalls)
  const progressPercent = Math.min(100, (battingBalls / totalBallsLimit) * 100)

  const getRoleBadgeStyle = (role: string) => {
    const r = role.toLowerCase()
    if (r.includes('batsman')) return 'bg-blue-50 text-blue-700 border-blue-100'
    if (r.includes('bowler')) return 'bg-emerald-50 text-emerald-700 border-emerald-100'
    if (r.includes('keeper')) return 'bg-amber-50 text-amber-700 border-amber-100'
    return 'bg-purple-50 text-purple-700 border-purple-100'
  }

  return (
    <div className="space-y-6 text-gray-900">
      {/* 1. Large Score & Live Indicator Top Header Card */}
      <section className="bg-white border border-slate-150 rounded-3xl p-6 sm:p-8 shadow-md flex flex-col items-center relative overflow-hidden">
        {/* Pulsing Live Badge / Status Banner */}
        <div className="flex justify-center mb-6">
          {match.status === 'live' && (
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-rose-50 text-red-650 text-xs font-black border border-rose-200/50 uppercase tracking-widest relative">
              <span className="w-2 h-2 rounded-full bg-red-650 animate-ping absolute" />
              <span className="w-2 h-2 rounded-full bg-red-650" />
              LIVE SCORING
            </span>
          )}
          {match.status === 'upcoming' && (
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-black border border-blue-200/50 uppercase tracking-wider">
              Upcoming Match
            </span>
          )}
          {match.status === 'completed' && (
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-black border border-emerald-250/50 uppercase tracking-wider">
              Match Completed
            </span>
          )}
        </div>

        {/* Completed Match Outcome Result */}
        {match.status === 'completed' && match.result_desc && (
          <div className="w-full text-center bg-emerald-50/40 border border-emerald-100/60 py-3 px-4 rounded-2xl text-xs sm:text-sm font-black text-emerald-850 mb-6 max-w-xl">
            🏆 {match.result_desc}
          </div>
        )}

        {/* Main Teams & Large Score Container */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 items-center gap-6 py-2 max-w-4xl">
          {/* Team A Details */}
          <div className="flex flex-col items-center md:items-end text-center md:text-right gap-3 w-full">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-slate-150 bg-slate-50 flex items-center justify-center font-bold text-sm overflow-hidden shadow-inner flex-shrink-0">
                {teamA.logo_url ? (
                  <img src={teamA.logo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  teamA.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight">{teamA.name}</h2>
            </div>
            <p className="font-extrabold text-sm text-slate-900">
              {match.team1_runs}/{match.team1_wickets}
              <span className="text-xs text-slate-400 font-semibold ml-1.5">
                ({formatOvers(match.team1_balls)} ov)
              </span>
            </p>
          </div>

          {/* Large Live Score Display */}
          <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-150 rounded-2xl text-center w-full min-h-[130px] shadow-inner">
            {currentBattingId ? (
              <div className="space-y-1.5 w-full">
                <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest block">
                  {battingTeam.name} batting
                </span>
                <h1 className="text-4xl font-black text-slate-950 tracking-tight leading-none">
                  {battingRuns}/{battingWickets}
                </h1>
                <p className="text-xs font-bold text-slate-500">
                  Overs:{' '}
                  <span className="text-slate-900 font-black">
                    {formatOvers(battingBalls)} / {match.overs_limit}
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-450 font-bold italic">
                {match.status === 'completed' ? 'Match Finalized' : 'Awaiting Toss & Roster Setup'}
              </p>
            )}
          </div>

          {/* Team B Details */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left gap-3 w-full">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-slate-150 bg-slate-50 flex items-center justify-center font-bold text-sm overflow-hidden shadow-inner flex-shrink-0">
                {teamB.logo_url ? (
                  <img src={teamB.logo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  teamB.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight">{teamB.name}</h2>
            </div>
            <p className="font-extrabold text-sm text-slate-900">
              {match.team2_runs}/{match.team2_wickets}
              <span className="text-xs text-slate-400 font-semibold ml-1.5">
                ({formatOvers(match.team2_balls)} ov)
              </span>
            </p>
          </div>
        </div>

        {/* Chasing Calculations Banner */}
        {isSecondInnings &&
          target &&
          runsNeeded !== null &&
          ballsRemaining !== null &&
          match.status === 'live' && (
            <div className="w-full mt-5 text-center py-3 px-4 rounded-2xl bg-blue-50 border border-blue-100 text-xs font-bold text-blue-900 flex justify-between items-center max-w-xl shadow-inner">
              {runsNeeded <= 0 ? (
                <span className="w-full text-center">Innings complete!</span>
              ) : (
                <>
                  <span>
                    Need <strong className="text-blue-600 font-black text-sm">{runsNeeded}</strong>{' '}
                    runs in{' '}
                    <strong className="text-blue-600 font-black text-sm">{ballsRemaining}</strong>{' '}
                    balls
                  </span>
                  <div className="flex gap-3 text-[10px] text-blue-800 font-black uppercase">
                    <span>CRR: {currentCRR}</span>
                    <span className="text-blue-300">|</span>
                    <span>RRR: {calculateRRR()}</span>
                  </div>
                </>
              )}
            </div>
          )}

        {/* Match Innings Progress Bar */}
        {currentBattingId && (
          <div className="w-full mt-6 border-t border-slate-100 pt-4 max-w-4xl">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/40 shadow-inner">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-slate-400 font-black uppercase mt-1.5 tracking-wider">
              <span>0.0 Ov</span>
              <span>Innings progress: {progressPercent.toFixed(0)}%</span>
              <span>{match.overs_limit}.0 Ov</span>
            </div>
          </div>
        )}
      </section>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-2xl p-1 shadow-sm gap-1">
        {(['live', 'scorecard', 'squads'] as TabType[]).map((tab) => {
          const isActive = activeTab === tab
          const label = tab === 'live' ? 'Live Play' : tab === 'scorecard' ? 'Scorecard' : 'Squads'
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 sm:py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* TAB CONTENT 1: LIVE MATCH INFO */}
      {activeTab === 'live' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fade-in-up">
          {/* Left 2 Cols: On-Field Batsmen, Bowlers, Over timeline */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Play Roster Panel */}
            <section className="bg-white border border-slate-150 rounded-3xl p-6 shadow-md space-y-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 pb-2.5 border-b border-slate-100">
                <Play className="h-4 w-4 text-blue-600 fill-current" /> Active Play Stats
              </h3>

              {match.status === 'live' && striker && nonStriker ? (
                <div className="space-y-6">
                  {/* Batsmen Grid */}
                  <div>
                    <div className="grid grid-cols-12 gap-1 text-[9px] text-slate-450 font-bold uppercase tracking-wider pb-2 border-b border-slate-150">
                      <span className="col-span-5 sm:col-span-6">Batsman</span>
                      <span className="col-span-3 sm:col-span-2 text-center">R (B)</span>
                      <span className="col-span-2 text-center">4s/6s</span>
                      <span className="col-span-2 text-right">SR</span>
                    </div>
                    <div className="divide-y divide-slate-100 font-semibold">
                      {/* Striker */}
                      <div className="grid grid-cols-12 gap-1 py-2.5 text-slate-800 items-center font-bold">
                        <span className="col-span-5 sm:col-span-6 flex items-center gap-1 text-slate-900 truncate">
                          <span className="text-amber-500 flex-shrink-0">⭐</span>
                          <span className="text-xs sm:text-sm font-black">{striker.name}</span>
                        </span>
                        <span className="col-span-3 sm:col-span-2 text-center font-black text-slate-950 text-xs">
                          {strikerScore?.runs ?? 0}
                          <span className="text-slate-400 font-semibold text-[9px] ml-0.5">
                            ({strikerScore?.balls ?? 0})
                          </span>
                        </span>
                        <span className="col-span-2 text-center text-slate-500 text-[10px]">
                          {strikerScore?.fours ?? 0}/{strikerScore?.sixes ?? 0}
                        </span>
                        <span className="col-span-2 text-right text-slate-500 font-black text-xs">
                          {strikerScore?.strikeRate ?? '0.00'}
                        </span>
                      </div>
                      {/* Non-Striker */}
                      <div className="grid grid-cols-12 gap-1 py-2.5 text-slate-700 items-center">
                        <span className="col-span-5 sm:col-span-6 pl-5 truncate text-xs">{nonStriker.name}</span>
                        <span className="col-span-3 sm:col-span-2 text-center font-black text-slate-900 text-xs">
                          {nonStrikerScore?.runs ?? 0}
                          <span className="text-slate-400 font-semibold text-[9px] ml-0.5">
                            ({nonStrikerScore?.balls ?? 0})
                          </span>
                        </span>
                        <span className="col-span-2 text-center text-slate-500 text-[10px]">
                          {nonStrikerScore?.fours ?? 0}/{nonStrikerScore?.sixes ?? 0}
                        </span>
                        <span className="col-span-2 text-right text-slate-500 font-bold text-xs">
                          {nonStrikerScore?.strikeRate ?? '0.00'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bowler Grid */}
                  {currentBowler && (
                    <div className="border-t border-slate-150 pt-4">
                      <div className="grid grid-cols-12 gap-1 text-[9px] text-slate-455 font-bold uppercase tracking-wider pb-2">
                        <span className="col-span-5 sm:col-span-6">Bowler</span>
                        <span className="col-span-4 text-center">O - M - R - W</span>
                        <span className="col-span-3 sm:col-span-2 text-right">Econ</span>
                      </div>
                      <div className="grid grid-cols-12 gap-1 py-2 text-slate-700 font-semibold items-center text-xs">
                        <span className="col-span-5 sm:col-span-6 text-slate-900 font-black truncate text-xs sm:text-sm">
                          {currentBowler.name}
                        </span>
                        <span className="col-span-4 text-center font-black text-slate-955 text-xs">
                          {bowlerScore?.overs ?? '0.0'}
                          <span className="text-slate-300 font-normal mx-0.5 sm:mx-1">-</span>
                          {bowlerScore?.maidens ?? 0}
                          <span className="text-slate-300 font-normal mx-0.5 sm:mx-1">-</span>
                          {bowlerScore?.runsConceded ?? 0}
                          <span className="text-slate-300 font-normal mx-0.5 sm:mx-1">-</span>
                          <span className="text-rose-600 font-black">
                            {bowlerScore?.wickets ?? 0}
                          </span>
                        </span>
                        <span className="col-span-3 sm:col-span-2 text-right text-slate-500 font-black text-xs">
                          {bowlerScore?.economy ?? '0.00'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-450 italic py-6 text-center">
                  {match.status === 'completed'
                    ? 'Match finished. Check the Scorecard tab for complete summaries.'
                    : 'Awaiting players to take the pitch...'}
                </p>
              )}
            </section>

            {/* 5. Last 12 Ball Timeline */}
            {currentBattingId && match.status === 'live' && (
              <section className="bg-white border border-slate-150 rounded-3xl p-6 shadow-md space-y-4">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest pb-2 border-b border-slate-100">
                  Recent Over Timeline
                </h3>
                <div className="flex gap-2 flex-wrap items-center">
                  {last12Balls.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No events logged in this innings yet.</p>
                  ) : (
                    last12Balls.map((ball, i) => {
                      let colorClass = 'bg-slate-105 text-slate-700 border border-slate-200/60'
                      if (ball.is_wicket) {
                        colorClass = 'bg-rose-500 text-white border border-rose-600 font-black shadow-sm shadow-rose-100'
                      } else if (ball.runs === 4) {
                        colorClass = 'bg-blue-600 text-white border border-blue-700 font-black shadow-sm shadow-blue-100'
                      } else if (ball.runs === 6) {
                        colorClass = 'bg-emerald-600 text-white border border-emerald-700 font-black shadow-sm shadow-emerald-100'
                      } else if (ball.extra_type) {
                        colorClass = 'bg-amber-50 text-amber-800 border border-amber-200'
                      }
                      return (
                        <span
                          key={i}
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-xs select-none ${colorClass}`}
                          title={`Bowler: ${matchPlayers.find((p) => p.id === ball.bowler_id)?.name || 'Unknown'}`}
                        >
                          {ball.label}
                        </span>
                      )
                    })
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Right 1 Col: Innings Info, Match Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Innings Details Card */}
            <section className="bg-white border border-slate-150 rounded-3xl p-6 shadow-md space-y-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2.5">
                Innings Info
              </h3>
              <div className="text-xs space-y-3.5">
                <div className="flex justify-between items-center py-1 border-b border-slate-100/50">
                  <span className="text-slate-450 font-bold uppercase text-[9px]">Current Innings</span>
                  <span className="font-extrabold text-slate-800">
                    {match.innings_number === 1 ? '1st Innings' : '2nd Innings'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100/50">
                  <span className="text-slate-450 font-bold uppercase text-[9px]">Current Over</span>
                  <span className="font-extrabold text-slate-800">
                    {formatOvers(battingBalls)} / {match.overs_limit}
                  </span>
                </div>
                {isSecondInnings && target && (
                  <div className="flex justify-between items-center py-1 border-b border-slate-100/50">
                    <span className="text-slate-450 font-bold uppercase text-[9px]">Target Score</span>
                    <span className="font-black text-slate-950 text-sm">{target}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-1 border-b border-slate-100/50">
                  <span className="text-slate-450 font-bold uppercase text-[9px]">Current Run Rate</span>
                  <span className="font-black text-emerald-600 text-sm">{currentCRR}</span>
                </div>
                {isSecondInnings && target && runsNeeded !== null && runsNeeded > 0 && ballsRemaining !== null && ballsRemaining > 0 && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-450 font-bold uppercase text-[9px]">Req. Run Rate</span>
                    <span className="font-black text-blue-600 text-sm">{calculateRRR()}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Match Information Card */}
            <section className="bg-white border border-slate-150 rounded-3xl p-6 shadow-md space-y-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2.5">
                Match Info
              </h3>
              <div className="text-xs space-y-3.5">
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Tournament</p>
                  <p className="font-extrabold text-slate-850 mt-0.5">KPL Cricket Tournament 2026</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Format</p>
                  <p className="font-extrabold text-slate-850 mt-0.5">
                    {match.overs_limit} Overs &bull; {match.players_count} Players a side
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Venue</p>
                  <p className="font-extrabold text-slate-850 mt-0.5">{match.venue}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Toss Outcome</p>
                  <p className="font-extrabold text-slate-800 mt-0.5">
                    {match.toss_winner_id
                      ? `${match.toss_winner_id === teamA.id ? teamA.name : teamB.name} elected to ${match.toss_decision === 'bat' ? 'BAT' : 'BOWL'}`
                      : 'Awaiting Toss Details'}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: FULL SCORECARD */}
      {activeTab === 'scorecard' && (
        <div className="space-y-8 animate-fade-in-up">
          {/* Innings Selection Controls */}
          <div className="flex justify-center gap-2 bg-slate-50 border border-slate-150 p-1.5 rounded-2xl max-w-sm mx-auto shadow-inner">
            <button
              onClick={() => setActiveScorecardInnings(1)}
              className={`flex-1 py-2 text-xs font-black uppercase rounded-xl transition-all cursor-pointer ${
                activeScorecardInnings === 1
                  ? 'bg-slate-950 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-850'
              }`}
            >
              1st Innings
            </button>
            <button
              onClick={() => setActiveScorecardInnings(2)}
              className={`flex-1 py-2 text-xs font-black uppercase rounded-xl transition-all cursor-pointer ${
                activeScorecardInnings === 2
                  ? 'bg-slate-950 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-850'
              }`}
            >
              2nd Innings
            </button>
          </div>

          {/* Innings Card Content */}
          {(() => {
            const activeScorecard = activeScorecardInnings === 1 ? scorecard1 : scorecard2
            const activeInningsBattingTeam =
              match.toss_decision === 'bat'
                ? match.toss_winner_id === teamA.id
                  ? activeScorecardInnings === 1
                    ? teamA
                    : teamB
                  : activeScorecardInnings === 1
                  ? teamB
                  : teamA
                : match.toss_winner_id === teamA.id
                ? activeScorecardInnings === 1
                  ? teamB
                  : teamA
                : activeScorecardInnings === 1
                ? teamA
                : teamB

            const activeInningsBowlingTeam =
              activeInningsBattingTeam.id === teamA.id ? teamB : teamA

            const battingTeamPlayers = activeCalculationPlayers.filter(
              (p) => p.team_id === activeInningsBattingTeam.id
            )
            const battedPlayerIds = new Set(activeScorecard.batting.map((b) => b.playerId))
            const dnbPlayers = battingTeamPlayers.filter((p) => !battedPlayerIds.has(p.id))

            return (
              <div className="space-y-6">
                {/* 6. Full Batting Scorecard Table */}
                <section className="bg-white border border-slate-150 rounded-3xl overflow-hidden shadow-md">
                  <div className="p-4 bg-slate-50/80 border-b border-slate-150 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full border border-slate-150 bg-slate-50 flex items-center justify-center font-bold text-[10px] overflow-hidden shadow-inner flex-shrink-0">
                        {activeInningsBattingTeam.logo_url ? (
                          <img
                            src={activeInningsBattingTeam.logo_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          activeInningsBattingTeam.name.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <h3 className="font-extrabold text-sm text-slate-800">
                        {activeInningsBattingTeam.name} Innings
                      </h3>
                    </div>
                    <span className="font-black text-slate-900 text-sm">
                      {activeScorecard.totalRuns}/{activeScorecard.totalWickets}
                      <span className="text-xs text-slate-400 font-semibold ml-1.5">
                        ({activeScorecard.overs} ov)
                      </span>
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-[650px] sm:w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-white text-slate-400 font-bold border-b border-slate-150 uppercase text-[9px] tracking-wider">
                          <th className="px-2 py-3 sm:p-4 sm:pl-6">Batsman</th>
                          <th className="px-2 py-3 sm:p-4">Dismissal</th>
                          <th className="px-2 py-3 sm:p-4 text-center w-16">Runs</th>
                          <th className="px-2 py-3 sm:p-4 text-center w-16">Balls</th>
                          <th className="px-2 py-3 sm:p-4 text-center w-12">4s</th>
                          <th className="px-2 py-3 sm:p-4 text-center w-12">6s</th>
                          <th className="px-2 py-3 sm:p-4 text-center w-16">SR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800 font-semibold">
                        {activeScorecard.batting.map((entry) => (
                          <tr key={entry.playerId} className="hover:bg-slate-50/20">
                            <td className="px-2 py-3 sm:p-4 sm:pl-6 font-extrabold text-slate-950">
                              {entry.name}
                            </td>
                            <td className="px-2 py-3 sm:p-4 text-slate-505 font-medium">{entry.howOut}</td>
                            <td className="px-2 py-3 sm:p-4 text-center font-black text-slate-950 text-sm">
                              {entry.runs}
                            </td>
                            <td className="px-2 py-3 sm:p-4 text-center text-slate-450">{entry.balls}</td>
                            <td className="px-2 py-3 sm:p-4 text-center text-slate-450">{entry.fours}</td>
                            <td className="px-2 py-3 sm:p-4 text-center text-slate-450">{entry.sixes}</td>
                            <td className="px-2 py-3 sm:p-4 text-center font-black text-blue-650">
                              {entry.strikeRate}
                            </td>
                          </tr>
                        ))}
                        {activeScorecard.batting.length === 0 && (
                          <tr>
                            <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                              Innings has not started yet.
                            </td>
                          </tr>
                        )}

                        {/* Extras Row */}
                        {activeScorecard.batting.length > 0 && (
                          <tr className="bg-slate-50/60 font-bold text-slate-500 text-[10px] uppercase">
                            <td className="p-4 pl-6" colSpan={2}>
                              Extras
                              <span className="text-[9px] text-slate-400 font-bold ml-1.5 lowercase tracking-normal">
                                (wd {activeScorecard.extras.wides}, nb{' '}
                                {activeScorecard.extras.noBalls}, b {activeScorecard.extras.byes},
                                lb {activeScorecard.extras.legByes})
                              </span>
                            </td>
                            <td
                              className="p-4 text-center font-black text-slate-900 text-xs"
                              colSpan={5}
                            >
                              {activeScorecard.extras.total}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Did Not Bat (DNB) List */}
                  {dnbPlayers.length > 0 && activeScorecard.batting.length > 0 && (
                    <div className="p-4 border-t border-slate-150 text-xs bg-white text-slate-600 font-medium">
                      <span className="font-bold text-slate-400">Did Not Bat: </span>
                      <span className="font-bold text-slate-800">
                        {dnbPlayers.map((p) => p.name).join(', ')}
                      </span>
                    </div>
                  )}
                </section>

                {/* 7. Full Bowling Scorecard Table */}
                <section className="bg-white border border-slate-150 rounded-3xl overflow-hidden shadow-md">
                  <div className="p-4 bg-slate-50/80 border-b border-slate-150 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full border border-slate-150 bg-slate-50 flex items-center justify-center font-bold text-[10px] overflow-hidden shadow-inner flex-shrink-0">
                      {activeInningsBowlingTeam.logo_url ? (
                        <img
                          src={activeInningsBowlingTeam.logo_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        activeInningsBowlingTeam.name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <h3 className="font-extrabold text-sm text-slate-850">
                      {activeInningsBowlingTeam.name} Bowling
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-[600px] sm:w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-white text-slate-400 font-bold border-b border-slate-150 uppercase text-[9px] tracking-wider">
                          <th className="px-2 py-3 sm:p-4 sm:pl-6">Bowler</th>
                          <th className="px-2 py-3 sm:p-4 text-center w-20">Overs</th>
                          <th className="px-2 py-3 sm:p-4 text-center w-20">Maidens</th>
                          <th className="px-2 py-3 sm:p-4 text-center w-20">Runs</th>
                          <th className="px-2 py-3 sm:p-4 text-center w-20">Wickets</th>
                          <th className="px-2 py-3 sm:p-4 text-center w-20">Economy</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800 font-semibold">
                        {activeScorecard.bowling.map((entry) => (
                          <tr key={entry.playerId} className="hover:bg-slate-50/20">
                            <td className="px-2 py-3 sm:p-4 sm:pl-6 font-extrabold text-slate-950">
                              {entry.name}
                            </td>
                            <td className="px-2 py-3 sm:p-4 text-center text-slate-450">{entry.overs}</td>
                            <td className="px-2 py-3 sm:p-4 text-center text-slate-450">{entry.maidens}</td>
                            <td className="px-2 py-3 sm:p-4 text-center text-slate-450">
                              {entry.runsConceded}
                            </td>
                            <td className="px-2 py-3 sm:p-4 text-center font-black text-rose-600">
                              {entry.wickets}
                            </td>
                            <td className="px-2 py-3 sm:p-4 text-center font-black text-emerald-600">
                              {entry.economy}
                            </td>
                          </tr>
                        ))}
                        {activeScorecard.bowling.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                              Innings has not started yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* FOW & Partnerships Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Fall of Wickets */}
                  <section className="bg-white border border-slate-150 p-5 rounded-3xl shadow-md space-y-3">
                    <h4 className="font-extrabold text-xs text-slate-950 uppercase tracking-widest border-b border-slate-100 pb-2">
                      Fall of Wickets
                    </h4>
                    <div className="space-y-2.5 text-xs text-slate-700 font-semibold">
                      {activeScorecard.fow.map((row) => (
                        <div
                          key={row.wicketNumber}
                          className="flex justify-between py-2.5 border-b border-slate-100 last:border-0"
                        >
                          <span>
                            {row.wicketNumber} -{' '}
                            <strong className="text-slate-900 font-black">{row.batsmanName}</strong>
                          </span>
                          <span className="text-slate-500 font-black text-slate-950">
                            {row.score}/{row.wickets}{' '}
                            <span className="text-[9px] text-slate-400 font-medium">
                              ({row.overs} ov)
                            </span>
                          </span>
                        </div>
                      ))}
                      {activeScorecard.fow.length === 0 && (
                        <p className="text-slate-400 italic py-2 text-center text-xs">No wickets fallen.</p>
                      )}
                    </div>
                  </section>

                  {/* Partnerships */}
                  <section className="bg-white border border-slate-150 p-5 rounded-3xl shadow-md space-y-3">
                    <h4 className="font-extrabold text-xs text-slate-950 uppercase tracking-widest border-b border-slate-100 pb-2">
                      Partnerships
                    </h4>
                    <div className="space-y-3 text-xs text-slate-750">
                      {activeScorecard.partnerships.map((row, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100 space-y-1.5 shadow-sm"
                        >
                          <div className="flex justify-between font-extrabold text-slate-900 text-xs">
                            <span>
                              {row.batsman1Name}{' '}
                              <span className="text-[10px] text-slate-400 font-medium">
                                ({row.batsman1Runs})
                              </span>
                            </span>
                            <span className="text-slate-300 font-medium">&amp;</span>
                            <span>
                              {row.batsman2Name}{' '}
                              <span className="text-[10px] text-slate-400 font-medium">
                                ({row.batsman2Runs})
                              </span>
                            </span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-200/50 font-bold uppercase tracking-wider">
                            <span>Runs contribution</span>
                            <span className="font-black text-blue-650">
                              {row.totalRuns} runs ({row.totalBalls} balls)
                            </span>
                          </div>
                        </div>
                      ))}
                      {activeScorecard.partnerships.length === 0 && (
                        <p className="text-slate-400 italic py-2 text-center text-xs">No partnerships logged.</p>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* TAB CONTENT 3: SQUADS PLAYING XI */}
      {activeTab === 'squads' && (
        <div className="space-y-6 animate-fade-in-up">
          {matchPlayers.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-150 shadow-sm">
              <Users className="h-10 w-10 text-slate-350 mx-auto mb-3" />
              <p className="text-slate-800 text-sm font-extrabold">
                Playing XI squads are not announced yet.
              </p>
              <p className="text-slate-400 text-xs mt-1">
                Both team rosters will display here once saved in match setup.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
              {/* Team A Playing XI */}
              <div className="bg-white border border-slate-150 p-6 rounded-3xl shadow-md space-y-4">
                <h4 className="font-black text-sm text-slate-900 border-b border-slate-150 pb-2.5 flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    {teamA.logo_url && (
                      <img
                        src={teamA.logo_url}
                        alt=""
                        className="w-6.5 h-6.5 object-cover rounded-full border border-slate-250"
                      />
                    )}
                    <span>{teamA.name} Playing XI</span>
                  </span>
                  <span className="text-[10px] text-slate-405 font-bold uppercase tracking-wider">
                    {matchPlayers.filter((p) => p.team_id === teamA.id).length} Players
                  </span>
                </h4>
                <div className="divide-y divide-slate-100 text-xs font-semibold text-slate-800">
                  {matchPlayers
                    .filter((p) => p.team_id === teamA.id)
                    .map((player) => (
                      <div key={player.id} className="flex justify-between items-center py-3">
                        <span className="font-bold text-slate-850 flex items-center gap-2">
                          <span className="w-5 text-slate-450 font-bold text-[10px]">
                            #{player.jersey_number}
                          </span>
                          {player.name}
                          {teamA.captain_name === player.name && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200/50 font-extrabold text-[8px] scale-[0.8]">
                              CAPT
                            </span>
                          )}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${getRoleBadgeStyle(
                            player.role
                          )}`}
                        >
                          {player.role}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Team B Playing XI */}
              <div className="bg-white border border-slate-150 p-6 rounded-3xl shadow-md space-y-4">
                <h4 className="font-black text-sm text-slate-900 border-b border-slate-150 pb-2.5 flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    {teamB.logo_url && (
                      <img
                        src={teamB.logo_url}
                        alt=""
                        className="w-6.5 h-6.5 object-cover rounded-full border border-slate-250"
                      />
                    )}
                    <span>{teamB.name} Playing XI</span>
                  </span>
                  <span className="text-[10px] text-slate-405 font-bold uppercase tracking-wider">
                    {matchPlayers.filter((p) => p.team_id === teamB.id).length} Players
                  </span>
                </h4>
                <div className="divide-y divide-slate-100 text-xs font-semibold text-slate-800">
                  {matchPlayers
                    .filter((p) => p.team_id === teamB.id)
                    .map((player) => (
                      <div key={player.id} className="flex justify-between items-center py-3">
                        <span className="font-bold text-slate-850 flex items-center gap-2">
                          <span className="w-5 text-slate-450 font-bold text-[10px]">
                            #{player.jersey_number}
                          </span>
                          {player.name}
                          {teamB.captain_name === player.name && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200/50 font-extrabold text-[8px] scale-[0.8]">
                              CAPT
                            </span>
                          )}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${getRoleBadgeStyle(
                            player.role
                          )}`}
                        >
                          {player.role}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
