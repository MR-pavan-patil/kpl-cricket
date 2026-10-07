'use client'

import { Team, Player, Match } from '@/types'
import { X, Shield, User, Trophy, ChevronRight } from 'lucide-react'

interface QuickTeamModalProps {
  team: Team | null
  players: Player[]
  matches: Match[]
  onClose: () => void
  onSelectPlayer?: (player: Player) => void
}

export default function QuickTeamModal({
  team,
  players,
  matches,
  onClose,
  onSelectPlayer,
}: QuickTeamModalProps) {
  if (!team) return null

  const teamPlayers = players.filter((p) => p.team_id === team.id)
  const teamMatches = matches.filter(
    (m) => (m.team1_id === team.id || m.team2_id === team.id) && m.status === 'completed'
  )
  const wins = teamMatches.filter((m) => m.winner_id === team.id).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] bg-white border border-gray-200 rounded-3xl shadow-2xl flex flex-col text-gray-900 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <span className="text-xs font-black uppercase tracking-wider text-gray-700">
              Team &amp; Squad Overview
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Team Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-6 text-white flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border-2 border-white/30 p-1 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-lg">
            {team.logo_url ? (
              <img src={team.logo_url} alt="" className="w-full h-full object-cover rounded-xl" />
            ) : (
              <span className="text-xl font-black text-white">
                {team.name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white tracking-tight">{team.name}</h2>
            <p className="text-xs text-blue-100 font-semibold flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-300" /> Captain: {team.captain_name}
            </p>
            <div className="flex items-center gap-3 pt-1 text-[11px] text-blue-100 font-bold">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                {teamPlayers.length} Players
              </span>
              <span>{teamMatches.length} Matches Played</span>
              <span className="text-emerald-300">{wins} Wins</span>
            </div>
          </div>
        </div>

        {/* Squad List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-500">
            Official Squad Roster (Click player for stats)
          </h3>

          {teamPlayers.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-4">No squad players registered for this team yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {teamPlayers.map((player) => {
                const isCaptain = player.name.toLowerCase().includes(team.captain_name.toLowerCase())
                return (
                  <div
                    key={player.id}
                    onClick={() => onSelectPlayer && onSelectPlayer(player)}
                    className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center font-black text-xs text-blue-700">
                        #{player.jersey_number}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-900 group-hover:text-blue-600 transition-colors flex items-center gap-1">
                          {player.name}
                          {isCaptain && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-black border border-amber-300">
                              (C)
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-gray-500 font-semibold">{player.role}</p>
                      </div>
                    </div>

                    <div className="text-right text-xs">
                      <p className="font-black text-blue-600">{player.runs} <span className="text-[9px] text-gray-400 font-normal">runs</span></p>
                      <p className="font-black text-indigo-600">{player.wickets} <span className="text-[9px] text-gray-400 font-normal">wkts</span></p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 text-center text-xs text-gray-500 font-semibold">
          KPL Team &amp; Squad Directory
        </div>
      </div>
    </div>
  )
}
