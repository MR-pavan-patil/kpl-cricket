'use client'

import { useState } from 'react'
import { Match, Player, Team } from '@/types'
import { calculateScorecard, formatOvers } from '@/utils/scorecard'
import { X, Trophy, MapPin, Calendar, Activity, Shield, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface QuickScorecardModalProps {
  match: Match | null
  teams: Team[]
  players: Player[]
  onClose: () => void
  onSelectPlayer?: (player: Player) => void
}

export default function QuickScorecardModal({
  match,
  teams,
  players,
  onClose,
  onSelectPlayer,
}: QuickScorecardModalProps) {
  if (!match) return null

  const team1 = match.team1 || teams.find((t) => t.id === match.team1_id)
  const team2 = match.team2 || teams.find((t) => t.id === match.team2_id)

  const [activeTab, setActiveTab] = useState<'summary' | 'inn1' | 'inn2' | 'balls'>('summary')

  const scInn1 = calculateScorecard(match.balls_log || [], players, 1)
  const scInn2 = calculateScorecard(match.balls_log || [], players, 2)
  const currentSc = calculateScorecard(match.balls_log || [], players, match.innings_number)

  const curBatTeam = match.current_batting_team_id === match.team1_id ? team1 : team2
  const isLive = match.status === 'live'
  const isCompleted = match.status === 'completed'

  const curStriker = players.find((p) => p.id === match.current_striker_id)
  const curNonStriker = players.find((p) => p.id === match.current_non_striker_id)
  const curBowler = players.find((p) => p.id === match.current_bowler_id)

  const strikerStat = currentSc.batting.find((b) => b.playerId === match.current_striker_id)
  const nonStrikerStat = currentSc.batting.find((b) => b.playerId === match.current_non_striker_id)
  const bowlerStat = currentSc.bowling.find((b) => b.playerId === match.current_bowler_id)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-white border border-gray-200 rounded-3xl shadow-2xl flex flex-col text-gray-900 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-blue-100 border border-blue-200 text-blue-800 text-xs font-black uppercase tracking-wider">
              {match.season ? `Season ${match.season}` : 'Season 1'}
            </span>
            <span className="text-xs font-extrabold text-gray-600 uppercase tracking-widest flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              {new Date(match.match_date).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-gray-400" /> {match.venue}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/matches/${match.id}`}
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm"
            >
              Full Match View <ExternalLink className="w-3 h-3" />
            </Link>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scorecard Hero Banner */}
        <div className="bg-gradient-to-r from-gray-900 via-slate-900 to-blue-950 px-6 py-6 text-white border-b border-gray-800">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
            {/* Team 1 */}
            <div className="flex items-center sm:justify-end gap-4">
              <div className="text-left sm:text-right">
                <h3 className="text-lg font-black text-white">{team1?.name}</h3>
                <p className="text-2xl font-black text-blue-300 mt-0.5">
                  {match.team1_runs}/{match.team1_wickets}
                  <span className="text-xs text-gray-300 font-semibold ml-1">
                    ({formatOvers(match.team1_balls)} ov)
                  </span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 p-1 flex items-center justify-center overflow-hidden flex-shrink-0">
                {team1?.logo_url ? (
                  <img src={team1.logo_url} alt="" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <Shield className="w-6 h-6 text-blue-300" />
                )}
              </div>
            </div>

            {/* Match Status / VS */}
            <div className="text-center space-y-2 py-2 sm:py-0 border-y sm:border-y-0 sm:border-x border-white/10 px-4">
              {isLive ? (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-red-500/20 border border-red-400/40 text-red-300 text-xs font-black uppercase tracking-widest animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-500" /> LIVE - Innings {match.innings_number}
                </div>
              ) : isCompleted ? (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black uppercase tracking-wider">
                  <Trophy className="w-3.5 h-3.5 text-emerald-300" /> COMPLETED
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-gray-300 text-xs font-bold uppercase tracking-wider">
                  UPCOMING
                </div>
              )}

              <p className="text-xs font-extrabold text-blue-200">
                {match.result_desc || (isLive ? `${curBatTeam?.name} Batting` : 'Match Scheduled')}
              </p>
            </div>

            {/* Team 2 */}
            <div className="flex items-center sm:justify-start gap-4 flex-row-reverse sm:flex-row">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 p-1 flex items-center justify-center overflow-hidden flex-shrink-0">
                {team2?.logo_url ? (
                  <img src={team2.logo_url} alt="" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <Shield className="w-6 h-6 text-indigo-300" />
                )}
              </div>
              <div className="text-left">
                <h3 className="text-lg font-black text-white">{team2?.name}</h3>
                <p className="text-2xl font-black text-indigo-300 mt-0.5">
                  {match.team2_runs}/{match.team2_wickets}
                  <span className="text-xs text-gray-300 font-semibold ml-1">
                    ({formatOvers(match.team2_balls)} ov)
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-6 gap-2 pt-3 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2.5 rounded-t-xl border-b-2 transition-all ${
              activeTab === 'summary'
                ? 'border-blue-600 text-blue-600 bg-white shadow-xs'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Match Summary
          </button>
          <button
            onClick={() => setActiveTab('inn1')}
            className={`px-4 py-2.5 rounded-t-xl border-b-2 transition-all ${
              activeTab === 'inn1'
                ? 'border-blue-600 text-blue-600 bg-white shadow-xs'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {team1?.name} Scorecard
          </button>
          <button
            onClick={() => setActiveTab('inn2')}
            className={`px-4 py-2.5 rounded-t-xl border-b-2 transition-all ${
              activeTab === 'inn2'
                ? 'border-blue-600 text-blue-600 bg-white shadow-xs'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {team2?.name} Scorecard
          </button>
          <button
            onClick={() => setActiveTab('balls')}
            className={`px-4 py-2.5 rounded-t-xl border-b-2 transition-all ${
              activeTab === 'balls'
                ? 'border-blue-600 text-blue-600 bg-white shadow-xs'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Ball-by-Ball Log ({match.balls_log?.length || 0})
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* Live Status Widget if match is Live */}
              {isLive && (
                <div className="bg-red-50/60 rounded-2xl p-5 border border-red-200 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-red-700 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-red-600 animate-pulse" /> Live On Pitch
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {/* Striker & Non Striker */}
                    <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-2">
                      <p className="text-[10px] text-gray-400 font-extrabold uppercase">Batting</p>
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-gray-900 flex items-center gap-1.5">
                          ⭐ {curStriker?.name || 'Striker'}
                        </span>
                        <span className="text-blue-600">
                          {strikerStat?.runs || 0} ({strikerStat?.balls || 0}b, {strikerStat?.fours || 0}x4, {strikerStat?.sixes || 0}x6)
                        </span>
                      </div>
                      <div className="flex justify-between items-center font-semibold text-gray-500">
                        <span>{curNonStriker?.name || 'Non-Striker'}</span>
                        <span>
                          {nonStrikerStat?.runs || 0} ({nonStrikerStat?.balls || 0}b)
                        </span>
                      </div>
                    </div>

                    {/* Current Bowler */}
                    <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-2">
                      <p className="text-[10px] text-gray-400 font-extrabold uppercase">Bowling</p>
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-gray-900">{curBowler?.name || 'Bowler'}</span>
                        <span className="text-indigo-600">
                          {bowlerStat?.wickets || 0}/{bowlerStat?.runsConceded || 0}{' '}
                          <span className="text-gray-400 text-[10px]">
                            ({formatOvers(bowlerStat?.balls || 0)} ov)
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Match Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-3">
                  <h4 className="text-xs font-black uppercase text-gray-600 tracking-wider">
                    {team1?.name} Top Batting
                  </h4>
                  {scInn1.batting.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No batting log recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {scInn1.batting
                        .sort((a, b) => b.runs - a.runs)
                        .slice(0, 3)
                        .map((b) => {
                          const pObj = players.find((p) => p.id === b.playerId)
                          return (
                            <div
                              key={b.playerId}
                              onClick={() => pObj && onSelectPlayer && onSelectPlayer(pObj)}
                              className="flex justify-between text-xs font-semibold py-1 border-b border-gray-200 hover:text-blue-600 cursor-pointer"
                            >
                              <span className="text-gray-900 font-bold">{b.name}</span>
                              <span className="font-bold text-blue-600">
                                {b.runs} <span className="text-[10px] text-gray-400">({b.balls}b)</span>
                              </span>
                            </div>
                          )
                        })}
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-3">
                  <h4 className="text-xs font-black uppercase text-gray-600 tracking-wider">
                    {team2?.name} Top Batting
                  </h4>
                  {scInn2.batting.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No batting log recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {scInn2.batting
                        .sort((a, b) => b.runs - a.runs)
                        .slice(0, 3)
                        .map((b) => {
                          const pObj = players.find((p) => p.id === b.playerId)
                          return (
                            <div
                              key={b.playerId}
                              onClick={() => pObj && onSelectPlayer && onSelectPlayer(pObj)}
                              className="flex justify-between text-xs font-semibold py-1 border-b border-gray-200 hover:text-blue-600 cursor-pointer"
                            >
                              <span className="text-gray-900 font-bold">{b.name}</span>
                              <span className="font-bold text-indigo-600">
                                {b.runs} <span className="text-[10px] text-gray-400">({b.balls}b)</span>
                              </span>
                            </div>
                          )
                        })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {(activeTab === 'inn1' || activeTab === 'inn2') && (
            <div className="space-y-6">
              {(() => {
                const sc = activeTab === 'inn1' ? scInn1 : scInn2
                const teamName = activeTab === 'inn1' ? team1?.name : team2?.name

                return (
                  <>
                    <div className="space-y-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-blue-600">
                        {teamName} Batting Scorecard
                      </h4>
                      {sc.batting.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No batters recorded yet.</p>
                      ) : (
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto shadow-2xs">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] border-b border-gray-200">
                                <th className="p-3 pl-4">Batter</th>
                                <th className="p-3">Dismissal</th>
                                <th className="p-3 text-center">R</th>
                                <th className="p-3 text-center">B</th>
                                <th className="p-3 text-center">4s</th>
                                <th className="p-3 text-center">6s</th>
                                <th className="p-3 text-center pr-4">SR</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-gray-900 font-semibold">
                              {sc.batting.map((b) => {
                                const pObj = players.find((p) => p.id === b.playerId)
                                return (
                                  <tr
                                    key={b.playerId}
                                    onClick={() => pObj && onSelectPlayer && onSelectPlayer(pObj)}
                                    className="hover:bg-blue-50/40 cursor-pointer"
                                  >
                                    <td className="p-3 pl-4 font-bold text-gray-900 hover:text-blue-600">{b.name}</td>
                                    <td className="p-3 text-gray-500 text-[11px]">{b.howOut}</td>
                                    <td className="p-3 text-center font-black text-blue-600">{b.runs}</td>
                                    <td className="p-3 text-center text-gray-600">{b.balls}</td>
                                    <td className="p-3 text-center text-gray-600">{b.fours}</td>
                                    <td className="p-3 text-center text-gray-600">{b.sixes}</td>
                                    <td className="p-3 text-center pr-4 text-gray-500">
                                      {b.strikeRate.toFixed(1)}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-indigo-600">
                        Bowling Analysis
                      </h4>
                      {sc.bowling.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No bowlers recorded yet.</p>
                      ) : (
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto shadow-2xs">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] border-b border-gray-200">
                                <th className="p-3 pl-4">Bowler</th>
                                <th className="p-3 text-center">Overs</th>
                                <th className="p-3 text-center">Runs</th>
                                <th className="p-3 text-center">Wkts</th>
                                <th className="p-3 text-center pr-4">Econ</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-gray-900 font-semibold">
                              {sc.bowling.map((bw) => {
                                const pObj = players.find((p) => p.id === bw.playerId)
                                return (
                                  <tr
                                    key={bw.playerId}
                                    onClick={() => pObj && onSelectPlayer && onSelectPlayer(pObj)}
                                    className="hover:bg-blue-50/40 cursor-pointer"
                                  >
                                    <td className="p-3 pl-4 font-bold text-gray-900 hover:text-blue-600">{bw.name}</td>
                                    <td className="p-3 text-center">{formatOvers(bw.balls)}</td>
                                    <td className="p-3 text-center text-gray-600">{bw.runsConceded}</td>
                                    <td className="p-3 text-center font-black text-indigo-600">
                                      {bw.wickets}
                                    </td>
                                    <td className="p-3 text-center pr-4 text-gray-500">
                                      {bw.economy.toFixed(2)}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )
              })()}
            </div>
          )}

          {activeTab === 'balls' && (
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">
                Ball-by-Ball Activity Timeline
              </h4>
              {(!match.balls_log || match.balls_log.length === 0) ? (
                <div className="text-center py-10 text-gray-400 text-xs italic">
                  No balls logged for this match yet.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {match.balls_log.map((evt, idx) => {
                    const isWicket = evt.is_wicket
                    const isSix = evt.runs === 6
                    const isFour = evt.runs === 4

                    return (
                      <span
                        key={idx}
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-xl font-black text-xs border ${
                          isWicket
                            ? 'bg-red-600 text-white border-red-700 shadow-xs'
                            : isSix
                            ? 'bg-purple-600 text-white border-purple-700'
                            : isFour
                            ? 'bg-blue-600 text-white border-blue-700'
                            : 'bg-gray-100 text-gray-800 border-gray-200'
                        }`}
                        title={`Ball ${idx + 1}: ${evt.label}`}
                      >
                        {evt.label}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 text-center flex justify-between items-center text-xs text-gray-500 px-6 font-semibold">
          <span>KPL Cricket Real-time Match Center</span>
          <Link
            href={`/matches/${match.id}`}
            className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
          >
            Open Dedicated Scorecard &rarr;
          </Link>
        </div>
      </div>
    </div>
  )
}
