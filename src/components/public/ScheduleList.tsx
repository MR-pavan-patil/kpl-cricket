'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calendar, MapPin, Play, CheckCircle2, ChevronRight } from 'lucide-react'
import { Match } from '@/types'

interface ScheduleListProps {
  initialMatches: Match[]
}

type TabType = 'all' | 'live' | 'upcoming' | 'completed'

export default function ScheduleList({ initialMatches }: ScheduleListProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all')

  const liveMatches = initialMatches.filter((m) => m.status === 'live')
  const upcomingMatches = initialMatches.filter((m) => m.status === 'upcoming')
  const completedMatches = initialMatches.filter((m) => m.status === 'completed')

  const getFilteredMatches = () => {
    switch (activeTab) {
      case 'live':
        return liveMatches
      case 'upcoming':
        return upcomingMatches
      case 'completed':
        return completedMatches
      default:
        return initialMatches
    }
  }

  const filteredMatches = getFilteredMatches()

  const formatOvers = (balls: number) => {
    return `${Math.floor(balls / 6)}.${balls % 6}`
  }

  const getStageBadge = (stage: string) => {
    switch (stage) {
      case 'quarter_final':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-black uppercase tracking-wider">
            Quarter Final
          </span>
        )
      case 'semi_final_1':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-orange-50 border border-orange-200/50 text-orange-700 text-[10px] font-black uppercase tracking-wider">
            Semi Final 1
          </span>
        )
      case 'semi_final_2':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-orange-50 border border-orange-200/50 text-orange-700 text-[10px] font-black uppercase tracking-wider">
            Semi Final 2
          </span>
        )
      case 'final':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-250 text-amber-800 text-[10px] font-black uppercase tracking-wider font-extrabold animate-pulse">
            Final
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-black uppercase tracking-wider">
            League
          </span>
        )
    }
  }

  const leagueMatches = filteredMatches.filter(
    (m) => m.stage === 'league' || m.stage === 'quarter_final' || !m.stage
  )
  const semiMatches = filteredMatches.filter(
    (m) => m.stage === 'semi_final_1' || m.stage === 'semi_final_2'
  )
  const finalMatches = filteredMatches.filter(
    (m) => m.stage === 'final'
  )

  const renderMatchCard = (match: Match) => {
    const isLive = match.status === 'live'
    const isCompleted = match.status === 'completed'
    const isUpcoming = match.status === 'upcoming'

    let borderClass = 'border-l-4 border-l-slate-300'
    let bgHover = 'hover:bg-slate-50/30'
    if (isLive) {
      borderClass = 'border-l-4 border-l-red-500'
      bgHover = 'hover:bg-red-50/5'
    } else if (isCompleted) {
      if (match.result_type === 'no_result') {
        borderClass = 'border-l-4 border-l-amber-500'
        bgHover = 'hover:bg-amber-50/5'
      } else {
        borderClass = 'border-l-4 border-l-emerald-500'
        bgHover = 'hover:bg-emerald-50/5'
      }
    } else if (isUpcoming) {
      borderClass = 'border-l-4 border-l-blue-500'
      bgHover = 'hover:bg-blue-50/5'
    }

    return (
      <Link
        href={`/matches/${match.id}`}
        key={match.id}
        className={`bg-white rounded-3xl p-5 sm:p-6 border border-slate-150 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 hover:shadow-lg transition-all duration-350 block relative ${borderClass} ${bgHover} group`}
      >
        {/* Time & Venue */}
        <div className="flex flex-col gap-1 sm:w-1/4">
          <span suppressHydrationWarning className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase tracking-wider">
            <Calendar className="h-3.5 w-3.5 text-blue-600" />
            {new Date(match.match_date).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </span>
          <span suppressHydrationWarning className="text-[10px] text-slate-400 font-bold">
            {new Date(match.match_date).toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-slate-500 mt-1 font-semibold truncate max-w-[170px]">
            <MapPin className="h-3.5 w-3.5 text-slate-450" />
            {match.venue}
          </span>
        </div>

        {/* Score / Teams Grid */}
        <div className="flex-1 flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4 sm:px-6">
          {/* Team 1 */}
          <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-[45%]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-150 flex items-center justify-center font-bold text-xs flex-shrink-0 overflow-hidden shadow-inner">
                {match.team1?.logo_url ? (
                  <img
                    src={match.team1.logo_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  match.team1?.name.slice(0, 2).toUpperCase() || 'T1'
                )}
              </div>
              <span
                className={`font-bold text-sm text-slate-800 ${
                  isLive && match.current_batting_team_id === match.team1_id
                    ? 'text-blue-600 font-extrabold'
                    : ''
                }`}
              >
                {match.team1?.name}
              </span>
            </div>
            {/* Scores for Team 1 */}
            {!isUpcoming && (
              <span className="font-extrabold text-sm text-slate-900 sm:ml-auto">
                {match.team1_runs}/{match.team1_wickets}
                <span className="text-[10px] text-slate-400 font-normal ml-1">
                  ({formatOvers(match.team1_balls)})
                </span>
              </span>
            )}
          </div>

          <span className="hidden sm:block text-slate-350 font-black text-xs px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-150">
            VS
          </span>

          {/* Team 2 */}
          <div className="flex items-center justify-between sm:justify-start sm:flex-row-reverse gap-3 w-full sm:w-[45%]">
            <div className="flex items-center sm:flex-row-reverse gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-150 flex items-center justify-center font-bold text-xs flex-shrink-0 overflow-hidden shadow-inner">
                {match.team2?.logo_url ? (
                  <img
                    src={match.team2.logo_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  match.team2?.name.slice(0, 2).toUpperCase() || 'T2'
                )}
              </div>
              <span
                className={`font-bold text-sm text-slate-800 ${
                  isLive && match.current_batting_team_id === match.team2_id
                    ? 'text-blue-600 font-extrabold'
                    : ''
                }`}
              >
                {match.team2?.name}
              </span>
            </div>
            {/* Scores for Team 2 */}
            {!isUpcoming && (
              <span className="font-extrabold text-sm text-slate-900 sm:mr-auto">
                {match.team2_runs}/{match.team2_wickets}
                <span className="text-[10px] text-slate-400 font-normal ml-1">
                  ({formatOvers(match.team2_balls)})
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Status and Action Link */}
        <div className="sm:w-1/5 flex sm:flex-col items-end justify-between sm:justify-center self-stretch sm:self-auto border-t border-slate-105 sm:border-0 pt-4 sm:pt-0 gap-2.5">
          <div className="flex flex-wrap gap-1.5 justify-end">
            {getStageBadge(match.stage)}
            {isLive && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200/50 text-red-650 text-[10px] font-black uppercase tracking-widest animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600" /> Live
              </span>
            )}
            {isUpcoming && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/50 text-blue-600 text-[10px] font-black uppercase tracking-wider">
                Scheduled
              </span>
            )}
            {isCompleted && (
              match.result_type === 'no_result' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-[10px] font-black uppercase tracking-wider">
                  No Result
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-250/50 text-emerald-600 text-[10px] font-black uppercase tracking-wider">
                  <CheckCircle2 className="h-3 w-3" /> Result
                </span>
              )
            )}
          </div>

          {isCompleted && match.result_type === 'no_result' && match.match_abandon_reason && (
            <span className="text-[10px] text-amber-600 font-extrabold uppercase tracking-wide">
              Reason: {match.match_abandon_reason}
            </span>
          )}

          {isCompleted && match.result_type !== 'no_result' && match.result_desc && (
            <span className="text-[10px] text-slate-500 font-bold truncate max-w-[150px]">
              {match.result_desc}
            </span>
          )}

          <span className="text-xs font-bold text-blue-600 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
            {isLive ? 'Match Center' : 'Details'}{' '}
            <ChevronRight className="h-4 w-4" />
          </span>
        </div>
      </Link>
    )
  }

  return (
    <div className="space-y-8">
      {/* Tab Filters */}
      <div className="flex flex-wrap gap-2 pb-1 border-b border-slate-200">
        {(['all', 'live', 'upcoming', 'completed'] as TabType[]).map((tab) => {
          const count =
            tab === 'all'
              ? initialMatches.length
              : tab === 'live'
              ? liveMatches.length
              : tab === 'upcoming'
              ? upcomingMatches.length
              : completedMatches.length

          const label =
            tab === 'all'
              ? 'All Matches'
              : tab === 'live'
              ? 'Live'
              : tab === 'upcoming'
              ? 'Upcoming'
              : 'Results'

          const isActive = activeTab === tab

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-350 hover:text-slate-800'
              }`}
            >
              {tab === 'live' && liveMatches.length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              )}
              {label}
              <span
                className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Matches List grouped by stage */}
      {filteredMatches.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-150 text-slate-400 text-sm font-medium shadow-sm">
          No matches found for this status.
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in-up">
          {/* League Matches Section */}
          {leagueMatches.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-450 border-b border-slate-200 pb-2.5 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-sm" /> League Stage
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {leagueMatches.map(renderMatchCard)}
              </div>
            </div>
          )}

          {/* Semi Finals Section */}
          {semiMatches.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-450 border-b border-slate-200 pb-2.5 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm" /> Semi Finals
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {semiMatches.map(renderMatchCard)}
              </div>
            </div>
          )}

          {/* Final Section */}
          {finalMatches.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-450 border-b border-slate-200 pb-2.5 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm animate-pulse" /> Tournament Final
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {finalMatches.map(renderMatchCard)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
