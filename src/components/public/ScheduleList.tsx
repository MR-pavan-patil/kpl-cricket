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

  return (
    <div className="space-y-6">
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

      {/* Matches List */}
      {filteredMatches.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-150 text-slate-400 text-sm font-medium shadow-sm">
          No matches found for this status.
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in-up">
          {filteredMatches.map((match) => {
            const isLive = match.status === 'live'
            const isCompleted = match.status === 'completed'
            const isUpcoming = match.status === 'upcoming'

            let borderClass = 'border-l-4 border-l-slate-300'
            let bgHover = 'hover:bg-slate-50/30'
            if (isLive) {
              borderClass = 'border-l-4 border-l-red-500'
              bgHover = 'hover:bg-red-50/5'
            } else if (isCompleted) {
              borderClass = 'border-l-4 border-l-emerald-500'
              bgHover = 'hover:bg-emerald-50/5'
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
                <div className="sm:w-1/5 flex sm:flex-col items-end justify-between sm:justify-center self-stretch sm:self-auto border-t border-slate-100 sm:border-0 pt-4 sm:pt-0 gap-2.5">
                  <div>
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
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-250/50 text-emerald-600 text-[10px] font-black uppercase tracking-wider">
                        <CheckCircle2 className="h-3 w-3" /> Result
                      </span>
                    )}
                  </div>

                  {isCompleted && match.result_desc && (
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
          })}
        </div>
      )}
    </div>
  )
}
