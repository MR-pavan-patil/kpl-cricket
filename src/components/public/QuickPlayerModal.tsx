'use client'

import { Player, Team } from '@/types'
import { X, User, Trophy, Target, Zap, Shield } from 'lucide-react'

interface QuickPlayerModalProps {
  player: Player | null
  teams: Team[]
  onClose: () => void
}

export default function QuickPlayerModal({
  player,
  teams,
  onClose,
}: QuickPlayerModalProps) {
  if (!player) return null

  const playerTeam = teams.find((t) => t.id === player.team_id)
  const strikeRate = player.matches_played > 0 && player.runs > 0 ? ((player.runs / Math.max(1, player.runs)) * 100).toFixed(1) : '0.0'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white border border-gray-200 rounded-3xl shadow-2xl flex flex-col text-gray-900 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            <span className="text-xs font-black uppercase tracking-wider text-gray-700">
              Player Profile &amp; Statistics
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-6 text-white flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border-2 border-white/30 flex items-center justify-center font-black text-xl text-white shadow-md flex-shrink-0">
            #{player.jersey_number}
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight">{player.name}</h2>
            <p className="text-xs text-blue-100 font-semibold flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-300" /> {playerTeam?.name || 'KPL Team'}
            </p>
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider mt-1">
              {player.role}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Matches Played */}
            <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 space-y-1 text-center">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Matches</p>
              <p className="text-xl font-black text-gray-900">{player.matches_played}</p>
            </div>

            {/* Total Runs */}
            <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200 space-y-1 text-center">
              <p className="text-[10px] font-black uppercase text-amber-700 tracking-wider flex items-center justify-center gap-1">
                <Trophy className="w-3 h-3 text-amber-600" /> Total Runs
              </p>
              <p className="text-xl font-black text-amber-700">{player.runs}</p>
            </div>

            {/* Total Wickets */}
            <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-200 space-y-1 text-center">
              <p className="text-[10px] font-black uppercase text-indigo-700 tracking-wider flex items-center justify-center gap-1">
                <Target className="w-3 h-3 text-indigo-600" /> Wickets
              </p>
              <p className="text-xl font-black text-indigo-700">{player.wickets}</p>
            </div>

            {/* Boundaries */}
            <div className="bg-blue-50/60 p-3.5 rounded-2xl border border-blue-200 space-y-1 text-center">
              <p className="text-[10px] font-black uppercase text-blue-700 tracking-wider flex items-center justify-center gap-1">
                <Zap className="w-3 h-3 text-blue-600" /> 4s / 6s
              </p>
              <p className="text-xl font-black text-blue-700">{player.fours} <span className="text-xs text-gray-400 font-normal">/</span> {player.sixes}</p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 text-center text-xs text-gray-500 font-semibold">
          Official KPL Player Career Record
        </div>
      </div>
    </div>
  )
}
