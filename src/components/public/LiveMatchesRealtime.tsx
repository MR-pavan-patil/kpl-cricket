'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MapPin, ArrowRight, Calendar, Activity, Trophy } from 'lucide-react'
import { Match, Team, Player } from '@/types'
import { createClient } from '@/utils/supabase/client'
import { calculateScorecard, formatOvers } from '@/utils/scorecard'

interface LiveMatchesRealtimeProps {
  initialMatches: Match[]
  teams: Team[]
  players: Player[]
}

export default function LiveMatchesRealtime({
  initialMatches,
  teams,
  players,
}: LiveMatchesRealtimeProps) {
  const [matches, setMatches] = useState<Match[]>(() => {
    return initialMatches.map((m) => ({
      ...m,
      team1: teams.find((t) => t.id === m.team1_id),
      team2: teams.find((t) => t.id === m.team2_id),
    }))
  })

  // Subscribe to realtime matches updates
  useEffect(() => {
    const supabase = createClient()
    const matchChannel = supabase
      .channel('public-homepage-matches')
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
            const deletedMatch = payload.old as Match
            setMatches((prev) => prev.filter((m) => m.id !== deletedMatch.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(matchChannel)
    }
  }, [teams])

  const liveMatches = matches.filter((m) => m.status === 'live')
  const upcomingMatches = matches.filter((m) => m.status === 'upcoming').slice(0, 3)

  function calculateCRR(r: number, b: number) {
    if (b === 0) return '0.00'
    return ((r * 6) / b).toFixed(2)
  }

  return (
    <>
      {liveMatches.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-red-600 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" /> Live Scoring Matches
            </h2>
          </div>
          <div
            className={`grid grid-cols-1 ${
              liveMatches.length > 1 ? 'md:grid-cols-2' : 'max-w-2xl mx-auto'
            } gap-6`}
          >
            {liveMatches.map((match) => {
              const sc = calculateScorecard(match.balls_log || [], players, match.innings_number)
              const isSecInnings = match.innings_number === 2
              const matchTarget = isSecInnings
                ? match.current_batting_team_id === match.team1_id
                  ? match.team2_runs + 1
                  : match.team1_runs + 1
                : null
              const runsRequired = matchTarget
                ? matchTarget -
                  (match.current_batting_team_id === match.team1_id
                    ? match.team1_runs
                    : match.team2_runs)
                : null
              const ballsLeft = matchTarget
                ? match.overs_limit * 6 -
                  (match.current_batting_team_id === match.team1_id
                    ? match.team1_balls
                    : match.team2_balls)
                : null

              const curStriker = players.find((p) => p.id === match.current_striker_id)
              const curNonStriker = players.find((p) => p.id === match.current_non_striker_id)
              const curBowler = players.find((p) => p.id === match.current_bowler_id)

              const strScore = sc.batting.find((b) => b.playerId === match.current_striker_id)
              const nStrScore = sc.batting.find((b) => b.playerId === match.current_non_striker_id)
              const bowlScore = sc.bowling.find((b) => b.playerId === match.current_bowler_id)

              const curBatTeam =
                match.current_batting_team_id === match.team1_id ? match.team1 : match.team2
              const curCRR = calculateCRR(
                match.current_batting_team_id === match.team1_id
                  ? match.team1_runs
                  : match.team2_runs,
                match.current_batting_team_id === match.team1_id
                  ? match.team1_balls
                  : match.team2_balls
              )

              const rrr =
                runsRequired !== null && ballsLeft !== null && ballsLeft > 0
                  ? ((runsRequired * 6) / ballsLeft).toFixed(2)
                  : '0.00'

              const isT1YetToBat =
                match.team1_balls === 0 &&
                match.team1_runs === 0 &&
                match.current_batting_team_id !== match.team1_id &&
                match.innings_number === 1
              const isT2YetToBat =
                match.team2_balls === 0 &&
                match.team2_runs === 0 &&
                match.current_batting_team_id !== match.team2_id &&
                match.innings_number === 1

              // Build Toss Text
              let tossText = ''
              if (match.toss_winner_id) {
                const tossWinner =
                  match.toss_winner_id === match.team1_id ? match.team1 : match.team2
                if (tossWinner) {
                  tossText = `${tossWinner.name} won toss & elected to ${match.toss_decision === 'bat' ? 'bat' : 'bowl'}`
                }
              }

              return (
                <Link
                  href={`/matches/${match.id}`}
                  key={match.id}
                  className="bg-white rounded-3xl border border-slate-100 shadow-md shadow-slate-150/40 hover:shadow-xl hover:scale-[1.01] hover:border-blue-500/20 transition-all duration-300 flex flex-col justify-between overflow-hidden relative p-6 group"
                >
                  {/* Top Bar Venue & Status */}
                  <div className="flex justify-between items-center text-xs text-gray-500 border-b border-gray-100 pb-3.5 mb-4">
                    <span className="flex items-center gap-1 font-semibold text-slate-500">
                      <MapPin className="h-3.5 w-3.5 text-blue-500" /> {match.venue}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200/50 text-red-600 text-[10px] font-black uppercase tracking-widest relative">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping absolute" />
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                      Live
                    </span>
                  </div>

                  {/* Team Logos & Scores */}
                  <div className="space-y-4 mb-4">
                    {/* Team 1 Row */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full border border-slate-150 bg-slate-50 flex items-center justify-center font-bold text-xs text-slate-650 overflow-hidden shadow-inner flex-shrink-0">
                          {match.team1?.logo_url ? (
                            <img
                              src={match.team1.logo_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            match.team1?.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span
                            className={`text-base font-bold text-slate-800 ${
                              match.current_batting_team_id === match.team1_id
                                ? 'text-blue-600 font-extrabold flex items-center gap-1.5'
                                : ''
                            }`}
                          >
                            {match.team1?.name}
                            {match.current_batting_team_id === match.team1_id && (
                              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                            )}
                          </span>
                        </div>
                      </div>
                      <span className="font-black text-base text-slate-900 tracking-tight">
                        {isT1YetToBat ? (
                          <span className="text-xs text-slate-450 font-semibold bg-slate-100 px-2 py-1 rounded-lg">
                            Yet to Bat
                          </span>
                        ) : (
                          <>
                            {match.team1_runs}/{match.team1_wickets}
                            <span className="text-xs text-slate-400 font-medium ml-1.5">
                              ({formatOvers(match.team1_balls)} ov)
                            </span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Team 2 Row */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full border border-slate-150 bg-slate-50 flex items-center justify-center font-bold text-xs text-slate-650 overflow-hidden shadow-inner flex-shrink-0">
                          {match.team2?.logo_url ? (
                            <img
                              src={match.team2.logo_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            match.team2?.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span
                            className={`text-base font-bold text-slate-800 ${
                              match.current_batting_team_id === match.team2_id
                                ? 'text-blue-600 font-extrabold flex items-center gap-1.5'
                                : ''
                            }`}
                          >
                            {match.team2?.name}
                            {match.current_batting_team_id === match.team2_id && (
                              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                            )}
                          </span>
                        </div>
                      </div>
                      <span className="font-black text-base text-slate-900 tracking-tight">
                        {isT2YetToBat ? (
                          <span className="text-xs text-slate-450 font-semibold bg-slate-100 px-2 py-1 rounded-lg">
                            Yet to Bat
                          </span>
                        ) : (
                          <>
                            {match.team2_runs}/{match.team2_wickets}
                            <span className="text-xs text-slate-400 font-medium ml-1.5">
                              ({formatOvers(match.team2_balls)} ov)
                            </span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Toss Result Snippet */}
                  {tossText && !isSecInnings && (
                    <div className="text-[11px] text-slate-500 font-bold bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 mb-4">
                      🏏 {tossText}
                    </div>
                  )}

                  {/* Second Innings Status & Targets */}
                  {isSecInnings &&
                    runsRequired !== null &&
                    ballsLeft !== null &&
                    runsRequired > 0 && (
                      <div className="bg-blue-50/50 border border-blue-100/60 p-3 rounded-2xl text-[11px] text-blue-900 font-bold mb-4 flex justify-between items-center shadow-inner">
                        <span>
                          Need{' '}
                          <strong className="text-blue-600 font-black text-sm">{runsRequired}</strong>{' '}
                          runs in{' '}
                          <strong className="text-blue-600 font-black text-sm">{ballsLeft}</strong>{' '}
                          balls
                        </span>
                        <div className="flex gap-2.5 text-[10px] text-blue-800 font-extrabold uppercase">
                          <span>CRR: {curCRR}</span>
                          <span className="text-blue-300">|</span>
                          <span>RRR: {rrr}</span>
                        </div>
                      </div>
                    )}

                  {/* Pitch Batsman/Bowler Compact Grid */}
                  {curStriker && curNonStriker && (
                    <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 text-[10px] space-y-3.5 mb-4 shadow-sm">
                      {/* Batsmen Header & Rows */}
                      <div>
                        <div className="grid grid-cols-12 gap-1 text-[9px] text-slate-400 font-bold uppercase tracking-wider pb-1.5 border-b border-slate-200/50">
                          <span className="col-span-5">Batsman</span>
                          <span className="col-span-3 text-center">R (B)</span>
                          <span className="col-span-2 text-center">4s / 6s</span>
                          <span className="col-span-2 text-right">SR</span>
                        </div>
                        <div className="divide-y divide-slate-100 font-semibold">
                          {/* Striker */}
                          <div className="grid grid-cols-12 gap-1 py-1.5 text-slate-800 items-center font-bold">
                            <span className="col-span-5 flex items-center gap-1 text-slate-900 truncate">
                              <span className="text-amber-500 flex-shrink-0">⭐</span>
                              {curStriker.name}
                            </span>
                            <span className="col-span-3 text-center font-black text-slate-950">
                              {strScore?.runs ?? 0}
                              <span className="text-slate-400 font-semibold text-[9px] ml-0.5">
                                ({strScore?.balls ?? 0})
                              </span>
                            </span>
                            <span className="col-span-2 text-center text-slate-500 text-[9px]">
                              {strScore?.fours ?? 0} / {strScore?.sixes ?? 0}
                            </span>
                            <span className="col-span-2 text-right text-slate-500 font-black">
                              {strScore?.strikeRate ?? '0.0'}
                            </span>
                          </div>
                          {/* Non-Striker */}
                          <div className="grid grid-cols-12 gap-1 py-1.5 text-slate-700 items-center">
                            <span className="col-span-5 pl-4 truncate">{curNonStriker.name}</span>
                            <span className="col-span-3 text-center font-black text-slate-900">
                              {nStrScore?.runs ?? 0}
                              <span className="text-slate-400 font-semibold text-[9px] ml-0.5">
                                ({nStrScore?.balls ?? 0})
                              </span>
                            </span>
                            <span className="col-span-2 text-center text-slate-500 text-[9px]">
                              {nStrScore?.fours ?? 0} / {nStrScore?.sixes ?? 0}
                            </span>
                            <span className="col-span-2 text-right text-slate-500 font-bold">
                              {nStrScore?.strikeRate ?? '0.0'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bowler Header & Row */}
                      {curBowler && (
                        <div className="border-t border-slate-200/50 pt-2.5">
                          <div className="grid grid-cols-12 gap-1 text-[9px] text-slate-400 font-bold uppercase tracking-wider pb-1.5">
                            <span className="col-span-5">Bowler</span>
                            <span className="col-span-3 text-center">O - M - R - W</span>
                            <span className="col-span-4 text-right">Econ</span>
                          </div>
                          <div className="grid grid-cols-12 gap-1 py-1 text-slate-700 font-semibold items-center">
                            <span className="col-span-5 text-slate-900 font-bold truncate">
                              {curBowler.name}
                            </span>
                            <span className="col-span-3 text-center font-black text-slate-900">
                              {bowlScore?.overs ?? '0.0'}
                              <span className="text-slate-400 font-normal mx-0.5">-</span>
                              {bowlScore?.maidens ?? 0}
                              <span className="text-slate-400 font-normal mx-0.5">-</span>
                              {bowlScore?.runsConceded ?? 0}
                              <span className="text-slate-400 font-normal mx-0.5">-</span>
                              <span className="text-rose-600 font-black">
                                {bowlScore?.wickets ?? 0}
                              </span>
                            </span>
                            <span className="col-span-4 text-right text-slate-500 font-black">
                              {bowlScore?.economy ?? '0.0'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Over Timeline Events */}
                  {sc.overs !== '0.0' && (
                    <div className="flex gap-1.5 items-center mb-4 border-t border-slate-100 pt-3">
                      <span className="text-[9px] text-slate-450 font-bold uppercase mr-1">
                        Recent:
                      </span>
                      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                        {match.balls_log.slice(-6).map((b, i) => {
                          let c = 'bg-slate-100 text-slate-700 border border-slate-200/60'
                          if (b.is_wicket)
                            c = 'bg-rose-500 text-white font-black border border-rose-600 shadow-sm shadow-rose-100'
                          else if (b.runs === 4)
                            c = 'bg-blue-600 text-white font-black border border-blue-700 shadow-sm shadow-blue-100'
                          else if (b.runs === 6)
                            c = 'bg-emerald-600 text-white font-black border border-emerald-700 shadow-sm shadow-emerald-100'
                          else if (b.extra_type)
                            c = 'bg-amber-50 text-amber-800 font-bold border border-amber-200'

                          return (
                            <span
                              key={i}
                              className={`w-6.5 h-6.5 rounded-full flex items-center justify-center text-[10px] select-none ${c}`}
                              title={`Striker: ${players.find((p) => p.id === b.striker_id)?.name || 'Unknown'} | Bowler: ${players.find((p) => p.id === b.bowler_id)?.name || 'Unknown'}`}
                            >
                              {b.label}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Footer Line */}
                  <div className="border-t border-slate-100 pt-3.5 text-[11px] font-bold text-blue-600 flex justify-between items-center hover:text-blue-700 transition-colors">
                    <span className="flex items-center gap-1.5 text-slate-500 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      {curBatTeam ? `${curBatTeam.name} batting` : 'Scoring active'}
                    </span>
                    <span className="flex items-center gap-1 font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
                      Live Scorecard <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      ) : (
        /* Next Fixture card */
        <div className="bg-white rounded-3xl border border-slate-150 p-6 flex flex-col sm:flex-row justify-between items-center gap-6 shadow-md shadow-slate-100/50">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-650 text-[10px] font-black uppercase tracking-widest border border-blue-100">
              Next Fixture
            </span>
            {upcomingMatches.length > 0 ? (
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1.5">
                  {upcomingMatches[0].team1?.name}{' '}
                  <span className="text-slate-400 font-normal">vs</span>{' '}
                  {upcomingMatches[0].team2?.name}
                </h3>
                <p className="text-xs text-slate-500 flex items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-1 font-medium">
                    <MapPin className="h-3.5 w-3.5 text-blue-500" /> {upcomingMatches[0].venue}
                  </span>
                  <span className="text-slate-300">&bull;</span>
                  <span className="flex items-center gap-1 font-medium">
                    <Calendar className="h-3.5 w-3.5 text-blue-500" />{' '}
                    {new Date(upcomingMatches[0].match_date).toLocaleString()}
                  </span>
                </p>
              </div>
            ) : (
              <h3 className="text-slate-500 text-xs font-bold mt-1.5">
                No upcoming matches scheduled.
              </h3>
            )}
          </div>
          {upcomingMatches.length > 0 && (
            <Link
              href={`/matches/${upcomingMatches[0].id}`}
              className="px-6 py-3 rounded-2xl bg-slate-950 text-white font-extrabold text-xs uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
            >
              Match Details
            </Link>
          )}
        </div>
      )}
    </>
  )
}
