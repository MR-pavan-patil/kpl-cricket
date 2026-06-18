'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Match, Team, BallLogEvent, Player } from '@/types'
import { recordMatchEngineBall, undoMatchEngineBall, setScoringState, selectNextBatsman } from '@/app/actions/matchEngine'
import { calculateScorecard, formatOvers } from '@/utils/scorecard'
import { createClient } from '@/utils/supabase/client'
import {
  Play,
  RotateCcw,
  AlertCircle,
  Calendar,
  MapPin,
  Activity,
  Loader2,
  Settings,
  User,
  Users,
  Award,
  ChevronRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react'

interface ScoringPanelProps {
  initialMatch: Match
  teamA: Team
  teamB: Team
  matchPlayers: Player[]
}

export default function ScoringPanel({ initialMatch, teamA, teamB, matchPlayers }: ScoringPanelProps) {
  const router = useRouter()
  const [match, setMatch] = useState<Match>(initialMatch)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Modals / Selection States
  const [showPlayerModal, setShowPlayerModal] = useState<boolean>(false)
  const [playerModalType, setPlayerModalType] = useState<'striker' | 'non_striker' | 'bowler' | null>(null)

  const [showWicketModal, setShowWicketModal] = useState<boolean>(false)
  const [wicketType, setWicketType] = useState<'bowled' | 'caught' | 'run_out' | 'lbw' | 'stumped' | 'retired_hurt'>('bowled')
  const [dismissedBatsmanId, setDismissedBatsmanId] = useState<string>('')

  const [showExtraModal, setShowExtraModal] = useState<'wide' | 'no_ball' | 'bye' | 'leg_bye' | null>(null)

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`scoring-engine-match-${match.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${match.id}`,
        },
        (payload) => {
          setMatch(payload.new as Match)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [match.id])

  // If match players are not configured, show warning redirect
  if (!matchPlayers || matchPlayers.length === 0) {
    return (
      <div className="glass-card rounded-2xl border border-slate-200 p-8 text-center max-w-xl mx-auto space-y-6">
        <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto text-amber-600">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-900 font-black">Playing XI Roster Required</h3>
          <p className="text-slate-650 text-sm">
            To start live scoring, you must first select the Playing XI squad roster for both teams and configure match parameters.
          </p>
        </div>
        <Link
          href={`/admin/matches/${match.id}/setup`}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm transition-all shadow-sm cursor-pointer"
        >
          <Settings className="h-4 w-4" /> Setup Match Engine
        </Link>
      </div>
    )
  }

  // Active teams and stats calculations
  const currentBattingId = match.current_batting_team_id
  const isTeam1Batting = currentBattingId === match.team1_id
  const activeBattingTeam = isTeam1Batting ? teamA : teamB
  const activeFieldingTeam = isTeam1Batting ? teamB : teamA

  // Compute scorecard stats on the fly
  const scorecard = calculateScorecard(match.balls_log || [], matchPlayers, match.innings_number)

  // Get active batsmen & bowler names
  const striker = matchPlayers.find((p) => p.id === match.current_striker_id)
  const nonStriker = matchPlayers.find((p) => p.id === match.current_non_striker_id)
  const currentBowler = matchPlayers.find((p) => p.id === match.current_bowler_id)

  const strikerScore = scorecard.batting.find((b) => b.playerId === match.current_striker_id)
  const nonStrikerScore = scorecard.batting.find((b) => b.playerId === match.current_non_striker_id)
  const bowlerScore = scorecard.bowling.find((b) => b.playerId === match.current_bowler_id)

  // Get dismissed batsman list
  const dismissedIds = new Set(scorecard.batting.filter((b) => b.isOut).map((b) => b.playerId))

  // Determine available players for selections
  const getAvailableBatsmen = () => {
    const activeIds = [match.current_striker_id, match.current_non_striker_id].filter(Boolean)
    return matchPlayers.filter(
      (p) => p.team_id === currentBattingId && !dismissedIds.has(p.id) && !activeIds.includes(p.id)
    )
  }

  const getAvailableBowlers = () => {
    // Cannot bowl consecutive overs (bowler of the very last legal ball in this innings)
    const currentInningsBalls = (match.balls_log || []).filter((b) => b.innings === match.innings_number)
    let lastBowlerId = ''
    if (currentInningsBalls.length > 0) {
      const lastBall = currentInningsBalls[currentInningsBalls.length - 1]
      // Check if over was completed on the last ball
      const legalBallsInInnings = currentInningsBalls.filter((b) => b.is_legal).length
      const isOverCompleted = lastBall.is_legal && legalBallsInInnings % 6 === 0
      if (isOverCompleted) {
        lastBowlerId = lastBall.bowler_id
      }
    }

    return matchPlayers.filter(
      (p) => p.team_id === activeFieldingTeam.id && p.id !== lastBowlerId
    )
  }

  // Action Triggers
  const openPlayerSelection = (type: 'striker' | 'non_striker' | 'bowler') => {
    setPlayerModalType(type)
    setShowPlayerModal(true)
  }

  const handleSelectPlayer = (playerId: string) => {
    setError(null)
    setShowPlayerModal(false)

    let strikerId = match.current_striker_id
    let nonStrikerId = match.current_non_striker_id
    let bowlerId = match.current_bowler_id

    if (playerModalType === 'striker') strikerId = playerId
    if (playerModalType === 'non_striker') nonStrikerId = playerId
    if (playerModalType === 'bowler') bowlerId = playerId

    startTransition(async () => {
      const res = await setScoringState(match.id, strikerId, nonStrikerId, bowlerId)
      if (res.error) {
        setError(res.error)
      }
    })
  }

  const handleRecordBallInput = (
    runs: number,
    extra_runs: number,
    extra_type: 'wide' | 'no_ball' | 'bye' | 'leg_bye' | null,
    is_legal: boolean,
    is_wicket: boolean,
    wType: 'bowled' | 'caught' | 'run_out' | 'lbw' | 'stumped' | 'retired_hurt' | null = null,
    outId: string | null = null
  ) => {
    setError(null)
    setShowExtraModal(null)
    setShowWicketModal(false)

    if (!match.current_striker_id || !match.current_non_striker_id) {
      setError('Please select striker and non-striker batsman first.')
      return
    }

    if (!match.current_bowler_id) {
      setError('Please select a bowler first.')
      return
    }

    // Label determination
    let label = runs.toString()
    if (is_wicket) label = 'W'
    else if (extra_type === 'wide') label = 'Wd'
    else if (extra_type === 'no_ball') label = 'Nb'
    else if (extra_type === 'bye') label = 'B'
    else if (extra_type === 'leg_bye') label = 'Lb'

    const ball: BallLogEvent = {
      runs,
      extra_runs,
      extra_type,
      is_legal,
      is_wicket,
      wicket_type: wType,
      dismissed_batsman_id: outId,
      batsman_id: match.current_striker_id,
      bowler_id: match.current_bowler_id,
      striker_id: match.current_striker_id,
      non_striker_id: match.current_non_striker_id,
      label,
      innings: match.innings_number,
    }

    startTransition(async () => {
      const res = await recordMatchEngineBall(match.id, ball)
      if (res.error) {
        setError(res.error)
      }
    })
  }

  const handleUndoBall = () => {
    setError(null)
    if (!confirm('Are you sure you want to undo the last ball?')) {
      return
    }

    startTransition(async () => {
      const res = await undoMatchEngineBall(match.id)
      if (res.error) {
        setError(res.error)
      }
    })
  }

  // Wicket Trigger
  const triggerWicket = () => {
    if (!match.current_striker_id || !match.current_non_striker_id || !match.current_bowler_id) {
      setError('Please ensure batsmen and bowler are on the pitch before logging a wicket.')
      return
    }
    setDismissedBatsmanId(match.current_striker_id) // Default to striker
    setWicketType('bowled')
    setShowWicketModal(true)
  }

  const handleConfirmWicket = () => {
    handleRecordBallInput(
      0,
      0,
      null,
      true,
      true,
      wicketType,
      dismissedBatsmanId
    )
  }

  // Calculate Run Rate and targets
  const currentRuns = isTeam1Batting ? match.team1_runs : match.team2_runs
  const currentWickets = isTeam1Batting ? match.team1_wickets : match.team2_wickets
  const currentBalls = isTeam1Batting ? match.team1_balls : match.team2_balls

  const calculateCRR = (runs: number, balls: number) => {
    if (balls === 0) return '0.00'
    return ((runs * 6) / balls).toFixed(2)
  }

  const currentCRR = calculateCRR(currentRuns, currentBalls)

  // Last 12 balls
  const currentInningsBalls = (match.balls_log || []).filter((b) => b.innings === match.innings_number)
  const last12Balls = currentInningsBalls.slice(-12)

  // Target details for 2nd innings
  const isSecondInnings = match.innings_number === 2
  const targetRuns = isSecondInnings ? match.team1_runs + 1 : 0
  const runsNeeded = isSecondInnings ? targetRuns - match.team2_runs : 0
  const ballsRemaining = isSecondInnings ? match.overs_limit * 6 - match.team2_balls : 0

  const calculateRRR = () => {
    if (ballsRemaining <= 0) return '0.00'
    return ((runsNeeded * 6) / ballsRemaining).toFixed(2)
  }

  if (match.status === 'completed') {
    return (
      <div className="space-y-6">
        <section className="glass-card rounded-2xl border border-slate-200 p-8 text-center max-w-xl mx-auto space-y-6">
          <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900">Match Completed</h3>
            <p className="text-emerald-600 font-extrabold text-base">{match.result_desc}</p>
            <p className="text-slate-500 text-sm mt-2">
              All statistics have been automatically finalized and career leaderboards updated.
            </p>
          </div>
          <div className="flex justify-center gap-4">
            <Link
              href="/admin/matches"
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-650 hover:text-slate-900 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
            >
              Back to Matches
            </Link>
            <Link
              href={`/matches/${match.id}`}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer"
            >
              View Public Scorecard
            </Link>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Scoring Top Banner */}
      <section className="glass-card rounded-2xl p-6 flex flex-col lg:flex-row justify-between items-center gap-6">
        <div className="text-center lg:text-left space-y-1">
          <div className="flex items-center justify-center lg:justify-start gap-1.5 text-xs font-bold text-red-600 uppercase tracking-widest animate-pulse">
            <Activity className="h-4 w-4" /> Live Match Engine Active
          </div>
          <h2 className="text-xl font-black text-slate-900">
            {teamA.name} <span className="text-slate-400 font-normal">vs</span> {teamB.name}
          </h2>
          <div className="flex items-center justify-center lg:justify-start gap-3 text-xs text-slate-500">
            <span>{match.venue}</span>
            <span>&bull;</span>
            <span>Overs Limit: {match.overs_limit}</span>
            <span>&bull;</span>
            <span className="text-amber-600 font-bold">Innings {match.innings_number}</span>
          </div>
        </div>

        {/* Chasing Target Alert */}
        {isSecondInnings && (
          <div className="bg-slate-50 border border-slate-200 px-5 py-3 rounded-xl text-center text-xs">
            <p className="text-amber-600 font-bold uppercase tracking-wider">Target: {targetRuns}</p>
            <p className="text-slate-605 font-semibold mt-1">
              Need <span className="text-slate-900 font-black text-sm">{runsNeeded}</span> runs in{' '}
              <span className="text-slate-900 font-black text-sm">{ballsRemaining}</span> balls (RRR: {calculateRRR()})
            </p>
          </div>
        )}

        {/* Dynamic Display Score */}
        <div className="bg-blue-600 px-6 py-4 rounded-xl text-center min-w-[220px] text-white shadow-md shadow-blue-100">
          <p className="text-xs text-blue-100 font-bold uppercase tracking-wider">
            {activeBattingTeam.name}
          </p>
          <div className="mt-1">
            <h3 className="text-3xl font-black">
              {currentRuns}/{currentWickets}
            </h3>
            <p className="text-xs text-blue-100 mt-1">
              Overs: {formatOvers(currentBalls)} &bull; CRR: {currentCRR}
            </p>
          </div>
        </div>
      </section>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="h-4.5 w-4.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Pitch Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Pitch & Buttons */}
        <div className="lg:col-span-2 space-y-8">
          {/* Active Pitch Panel */}
          <section className="glass-card rounded-2xl p-6 space-y-6">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Active Pitch Status</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Striker Selector */}
              <div
                onClick={() => !match.current_striker_id && openPlayerSelection('striker')}
                className={`p-4 rounded-xl border transition-all ${
                  match.current_striker_id
                    ? 'bg-slate-50 border-slate-200 text-slate-900 shadow-sm'
                    : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 cursor-pointer'
                }`}
              >
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Striker Batsman *</p>
                {striker ? (
                  <div className="flex justify-between items-center mt-2">
                    <div>
                      <p className="text-sm font-black flex items-center gap-1">
                        {striker.name} <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-200 px-1 py-0.5 rounded font-normal">Striker</span>
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        {strikerScore?.runs || 0} runs ({strikerScore?.balls || 0} balls) &bull; {strikerScore?.fours || 0}x4, {strikerScore?.sixes || 0}x6
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openPlayerSelection('striker')
                      }}
                      className="p-1 text-[10px] text-blue-600 hover:text-blue-750 font-bold cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-2 font-bold text-xs">
                    <User className="h-4 w-4" /> Select Striker
                  </div>
                )}
              </div>

              {/* Non-Striker Selector */}
              <div
                onClick={() => !match.current_non_striker_id && openPlayerSelection('non_striker')}
                className={`p-4 rounded-xl border transition-all ${
                  match.current_non_striker_id
                    ? 'bg-slate-50 border-slate-200 text-slate-900 shadow-sm'
                    : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 cursor-pointer'
                }`}
              >
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Non-Striker *</p>
                {nonStriker ? (
                  <div className="flex justify-between items-center mt-2">
                    <div>
                      <p className="text-sm font-black text-slate-900">{nonStriker.name}</p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        {nonStrikerScore?.runs || 0} runs ({nonStrikerScore?.balls || 0} balls) &bull; {nonStrikerScore?.fours || 0}x4, {nonStrikerScore?.sixes || 0}x6
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openPlayerSelection('non_striker')
                      }}
                      className="p-1 text-[10px] text-blue-600 hover:text-blue-750 font-bold cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-2 font-bold text-xs">
                    <User className="h-4 w-4" /> Select Non-Striker
                  </div>
                )}
              </div>

              {/* Bowler Selector */}
              <div
                onClick={() => !match.current_bowler_id && openPlayerSelection('bowler')}
                className={`p-4 rounded-xl border transition-all ${
                  match.current_bowler_id
                    ? 'bg-slate-50 border-slate-200 text-slate-900 shadow-sm'
                    : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 cursor-pointer'
                }`}
              >
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Current Bowler *</p>
                {currentBowler ? (
                  <div className="flex justify-between items-center mt-2">
                    <div>
                      <p className="text-sm font-black flex items-center gap-1 text-slate-900">
                        {currentBowler.name} <span className="text-[10px] bg-slate-200 text-slate-700 border border-slate-300 px-1 py-0.5 rounded font-normal">Bowler</span>
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Overs: {bowlerScore?.overs || '0.0'} &bull; Wickets: {bowlerScore?.wickets || 0} &bull; Econ: {bowlerScore?.economy || '0.00'}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openPlayerSelection('bowler')
                      }}
                      className="p-1 text-[10px] text-blue-600 hover:text-blue-750 font-bold cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-2 font-bold text-xs">
                    <Users className="h-4 w-4" /> Select Bowler
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Scoring Buttons Grid */}
          <section className="glass-card rounded-2xl p-6 space-y-6">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex justify-between items-center">
              <span>Ball Scoring Deck</span>
              {isPending && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
            </h3>

            {/* Run Deck */}
            <div className="space-y-4">
              <h4 className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Runs off Bat</h4>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                <button
                  onClick={() => handleRecordBallInput(0, 0, null, true, false)}
                  disabled={isPending}
                  className="py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-black text-lg transition-colors cursor-pointer"
                >
                  0
                </button>
                {[1, 2, 3, 4, 6].map((run) => (
                  <button
                    key={run}
                    onClick={() => handleRecordBallInput(run, 0, null, true, false)}
                    disabled={isPending}
                    className={`py-3.5 rounded-xl border text-lg font-black transition-colors cursor-pointer ${
                      run === 4 || run === 6
                        ? 'bg-emerald-50 border-emerald-250 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800'
                        : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
                    }`}
                  >
                    {run}
                  </button>
                ))}
              </div>
            </div>

            {/* Extra and Out Deck */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 pt-2">
              {/* Extras Column */}
              <div className="sm:col-span-2 space-y-3">
                <h4 className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Extras (Wd, Nb, B, Lb)</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowExtraModal('wide')}
                    disabled={isPending}
                    className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Wide (Wd)
                  </button>
                  <button
                    onClick={() => setShowExtraModal('no_ball')}
                    disabled={isPending}
                    className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    No Ball (Nb)
                  </button>
                  <button
                    onClick={() => setShowExtraModal('bye')}
                    disabled={isPending}
                    className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Byes (Bye)
                  </button>
                  <button
                    onClick={() => setShowExtraModal('leg_bye')}
                    disabled={isPending}
                    className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Leg Byes (Lb)
                  </button>
                </div>
              </div>

              {/* Wicket Column */}
              <div className="space-y-3">
                <h4 className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Out</h4>
                <button
                  onClick={triggerWicket}
                  disabled={isPending}
                  className="w-full py-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Play className="h-3.5 w-3.5 fill-current rotate-90" /> Out / Wicket
                </button>
              </div>

              {/* Undo Column */}
              <div className="space-y-3">
                <h4 className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Undo</h4>
                <button
                  onClick={handleUndoBall}
                  disabled={isPending || (match.balls_log || []).length === 0}
                  className="w-full py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-slate-900 font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Undo Last
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Right 1 Col: Over history & stats summary */}
        <div className="space-y-8">
          {/* Over Logs */}
          <section className="glass-card rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Current Over</h3>
            <p className="text-[10px] text-slate-500">History of the last 12 balls in this innings.</p>

            <div className="flex flex-wrap gap-2.5 pt-2">
              {last12Balls.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-3">No balls logged in this over yet.</p>
              ) : (
                last12Balls.map((ball, i) => (
                  <div
                    key={i}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black border ${
                      ball.is_wicket
                        ? 'bg-rose-100 border-rose-350 text-rose-700'
                        : ball.runs === 4 || ball.runs === 6
                        ? 'bg-emerald-100 border-emerald-350 text-emerald-700'
                        : ball.label === 'Wd' || ball.label === 'Nb'
                        ? 'bg-amber-100 border-amber-350 text-amber-700'
                        : 'bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                    title={`Striker: ${matchPlayers.find((p) => p.id === ball.striker_id)?.name || 'Unknown'} | Bowler: ${matchPlayers.find((p) => p.id === ball.bowler_id)?.name || 'Unknown'}`}
                  >
                    {ball.label}
                  </div>
                ))
              )}
            </div>

            {/* Inning details checklist */}
            <div className="border-t border-slate-150 pt-4 mt-6 space-y-3">
              <h4 className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Innings details</h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                  <p className="text-slate-500 text-[10px] uppercase">Extras</p>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {scorecard.extras.total}{' '}
                    <span className="text-[10px] text-slate-500 font-normal block mt-0.5">
                      (Wd {scorecard.extras.wides}, Nb {scorecard.extras.noBalls}, B {scorecard.extras.byes}, Lb {scorecard.extras.legByes})
                    </span>
                  </p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                  <p className="text-slate-500 text-[10px] uppercase">Total overs</p>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {scorecard.overs} <span className="text-[10px] text-slate-500 font-normal">/ {match.overs_limit}</span>
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Scorecard Preview */}
          <section className="glass-card rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Innings Batsmen</h3>
            <div className="divide-y divide-slate-100">
              {scorecard.batting.map((entry) => (
                <div key={entry.playerId} className="flex justify-between py-2.5 text-xs items-center">
                  <div>
                    <span className="font-bold text-slate-900">{entry.name}</span>
                    <span className="text-[10px] text-slate-500 block">{entry.howOut}</span>
                  </div>
                  <span className="font-bold text-slate-800">
                    {entry.runs} <span className="text-[10px] text-slate-500 font-normal">({entry.balls})</span>
                  </span>
                </div>
              ))}
              {scorecard.batting.length === 0 && (
                <p className="text-xs text-slate-500 italic py-2">No batsmen faced balls yet.</p>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* MODAL 1: STRIKER / NON-STRIKER / BOWLER SELECTION */}
      {showPlayerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowPlayerModal(false)} />
          <div className="relative bg-white rounded-2xl border border-slate-200 w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-150 pb-2 flex items-center gap-1.5">
              <Users className="h-4.5 w-4.5 text-blue-650" />
              Select {playerModalType === 'striker' ? 'Striker' : playerModalType === 'non_striker' ? 'Non-Striker' : 'Bowler'}
            </h3>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {(playerModalType === 'striker' || playerModalType === 'non_striker') ? (
                getAvailableBatsmen().length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4">No available batsmen left in the squad Playing XI.</p>
                ) : (
                  getAvailableBatsmen().map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPlayer(p.id)}
                      className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-slate-350 hover:bg-slate-50 transition-all flex justify-between items-center text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      <div>
                        <p>{p.name}</p>
                        <p className="text-[10px] text-slate-500 font-normal mt-0.5">{p.role} &bull; #{p.jersey_number}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </button>
                  ))
                )
              ) : (
                getAvailableBowlers().length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4">No available bowlers (consecutive overs limit reached).</p>
                ) : (
                  getAvailableBowlers().map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPlayer(p.id)}
                      className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-slate-350 hover:bg-slate-50 transition-all flex justify-between items-center text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      <div>
                        <p>{p.name}</p>
                        <p className="text-[10px] text-slate-500 font-normal mt-0.5">{p.role} &bull; #{p.jersey_number}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </button>
                  ))
                )
              )}
            </div>

            <button
              onClick={() => setShowPlayerModal(false)}
              className="mt-4 w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: WICKET FORMULATION */}
      {showWicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowWicketModal(false)} />
          <div className="relative bg-white rounded-2xl border border-slate-200 w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
              Log Wicket Details
            </h3>

            <div className="space-y-4">
              {/* Who was out */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Dismissed Batsman *</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {striker && (
                    <button
                      onClick={() => setDismissedBatsmanId(striker.id)}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        dismissedBatsmanId === striker.id
                          ? 'bg-rose-50 border-rose-200 text-rose-700'
                          : 'bg-slate-55 border-slate-200 text-slate-600'
                      }`}
                    >
                      {striker.name} (Striker)
                    </button>
                  )}
                  {nonStriker && (
                    <button
                      onClick={() => setDismissedBatsmanId(nonStriker.id)}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        dismissedBatsmanId === nonStriker.id
                          ? 'bg-rose-50 border-rose-200 text-rose-700'
                          : 'bg-slate-55 border-slate-200 text-slate-600'
                      }`}
                    >
                      {nonStriker.name} (Non-Striker)
                    </button>
                  )}
                </div>
              </div>

              {/* Wicket Type */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">How Out (Type) *</label>
                <select
                  value={wicketType}
                  onChange={(e) => setWicketType(e.target.value as any)}
                  className="mt-2 block w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-bold focus:ring-2 focus:ring-rose-500/20 cursor-pointer focus:outline-none"
                >
                  <option value="bowled">Bowled</option>
                  <option value="caught">Caught</option>
                  <option value="lbw">LBW</option>
                  <option value="stumped">Stumped</option>
                  <option value="run_out">Run Out</option>
                  <option value="retired_hurt">Retired Hurt</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowWicketModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmWicket}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Confirm Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EXTRAS (WIDE, NO BALL, BYES, LEG BYES) SUB-OPTIONS */}
      {showExtraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowExtraModal(null)} />
          <div className="relative bg-white rounded-2xl border border-slate-200 w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-150 pb-2">
              Log {showExtraModal === 'wide' ? 'Wide' : showExtraModal === 'no_ball' ? 'No Ball' : showExtraModal === 'bye' ? 'Bye' : 'Leg Bye'} Extra
            </h3>

            {/* Wides Sub-options */}
            {showExtraModal === 'wide' && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleRecordBallInput(0, 1, 'wide', false, false)}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                >
                  1 Wide
                </button>
                <button
                  onClick={() => handleRecordBallInput(0, 2, 'wide', false, false)}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                >
                  2 Wides
                </button>
                <button
                  onClick={() => handleRecordBallInput(0, 3, 'wide', false, false)}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                >
                  3 Wides
                </button>
                <button
                  onClick={() => handleRecordBallInput(0, 5, 'wide', false, false)}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                >
                  5 Wides (boundary)
                </button>
              </div>
            )}

            {/* No Ball Sub-options */}
            {showExtraModal === 'no_ball' && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleRecordBallInput(0, 1, 'no_ball', false, false)}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                >
                  NB + 0 (1 run total)
                </button>
                <button
                  onClick={() => handleRecordBallInput(1, 1, 'no_ball', false, false)}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                >
                  NB + 1 Run (2 runs total)
                </button>
                <button
                  onClick={() => handleRecordBallInput(2, 1, 'no_ball', false, false)}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                >
                  NB + 2 Runs (3 runs total)
                </button>
                <button
                  onClick={() => handleRecordBallInput(4, 1, 'no_ball', false, false)}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                >
                  NB + 4 Boundary (5 runs total)
                </button>
                <button
                  onClick={() => handleRecordBallInput(6, 1, 'no_ball', false, false)}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                >
                  NB + 6 Boundary (7 runs total)
                </button>
              </div>
            )}

            {/* Byes Sub-options */}
            {showExtraModal === 'bye' && (
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((b) => (
                  <button
                    key={b}
                    onClick={() => handleRecordBallInput(0, b, 'bye', true, false)}
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                  >
                    {b} Bye{b > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
            )}

            {/* Leg Byes Sub-options */}
            {showExtraModal === 'leg_bye' && (
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((lb) => (
                  <button
                    key={lb}
                    onClick={() => handleRecordBallInput(0, lb, 'leg_bye', true, false)}
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                  >
                    {lb} Leg Bye{lb > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowExtraModal(null)}
              className="mt-4 w-full py-2.5 rounded-xl border border-slate-200 text-slate-650 hover:text-slate-900 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

