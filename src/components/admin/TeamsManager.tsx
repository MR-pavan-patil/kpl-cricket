'use client'

import { useState, useTransition } from 'react'
import { Team, Player } from '@/types'
import { createTeam, updateTeam, deleteTeam } from '@/app/actions/teams'
import { createPlayer, updatePlayer, deletePlayer } from '@/app/actions/players'
import { updatePlayerStats } from '@/app/actions/stats'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  X, 
  Loader2, 
  User, 
  ShieldAlert, 
  Award, 
  Star, 
  Shield, 
  Trophy, 
  Target, 
  ChevronRight, 
  Users,
  UserPlus
} from 'lucide-react'

interface TeamsManagerProps {
  initialTeams: Team[]
}

const PLAYER_ROLES = ['Batsman', 'Bowler', 'All Rounder', 'Wicket Keeper']

export default function TeamsManager({ initialTeams }: TeamsManagerProps) {
  const [teams, setTeams] = useState<Team[]>(initialTeams)
  const [search, setSearch] = useState('')
  
  // Team Modal States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  
  // Team Form inputs
  const [name, setName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [captainName, setCaptainName] = useState('')
  
  // Image URL loading error fallbacks
  const [logoErrors, setLogoErrors] = useState<Record<string, boolean>>({})

  // Drawer / Squad view state
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)

  // Player Modal States (inside Squad Drawer)
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  
  // Player Form inputs
  const [playerName, setPlayerName] = useState('')
  const [playerRole, setPlayerRole] = useState(PLAYER_ROLES[0])
  const [playerJersey, setPlayerJersey] = useState('')
  const [playerRuns, setPlayerRuns] = useState('0')
  const [playerWickets, setPlayerWickets] = useState('0')
  const [playerFours, setPlayerFours] = useState('0')
  const [playerSixes, setPlayerSixes] = useState('0')
  const [playerMatchesPlayed, setPlayerMatchesPlayed] = useState('0')

  const [error, setError] = useState<string | null>(null)
  const [playerError, setPlayerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Get active team details
  const activeTeam = teams.find(t => t.id === selectedTeamId)
  // Squad players of active team
  const squadPlayers = activeTeam?.players || []

  // Filtered teams based on search query
  const filteredTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(search.toLowerCase()) ||
    team.captain_name.toLowerCase().includes(search.toLowerCase())
  )

  const openAddModal = () => {
    setEditingTeam(null)
    setName('')
    setLogoUrl('')
    setCaptainName('')
    setError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (team: Team) => {
    setEditingTeam(team)
    setName(team.name)
    setLogoUrl(team.logo_url || '')
    setCaptainName(team.captain_name)
    setError(null)
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData()
    formData.append('name', name)
    formData.append('logo_url', logoUrl)
    formData.append('captain_name', captainName)

    startTransition(async () => {
      let result
      if (editingTeam) {
        result = await updateTeam(editingTeam.id, formData)
      } else {
        result = await createTeam(formData)
      }

      if (result.error) {
        setError(result.error)
      } else {
        window.location.reload()
      }
    })
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will also delete all players in this team.`)) {
      return
    }

    startTransition(async () => {
      const result = await deleteTeam(id)
      if (result.error) {
        alert(result.error)
      } else {
        window.location.reload()
      }
    })
  }

  // Player Add / Edit Handlers
  const openAddPlayerModal = () => {
    if (!selectedTeamId) return
    setEditingPlayer(null)
    setPlayerName('')
    setPlayerRole(PLAYER_ROLES[0])
    setPlayerJersey('')
    setPlayerRuns('0')
    setPlayerWickets('0')
    setPlayerFours('0')
    setPlayerSixes('0')
    setPlayerMatchesPlayed('0')
    setPlayerError(null)
    setIsPlayerModalOpen(true)
  }

  const openEditPlayerModal = (player: Player) => {
    setEditingPlayer(player)
    setPlayerName(player.name)
    setPlayerRole(player.role)
    setPlayerJersey(player.jersey_number.toString())
    setPlayerRuns((player.runs ?? 0).toString())
    setPlayerWickets((player.wickets ?? 0).toString())
    setPlayerFours((player.fours ?? 0).toString())
    setPlayerSixes((player.sixes ?? 0).toString())
    setPlayerMatchesPlayed((player.matches_played ?? 0).toString())
    setPlayerError(null)
    setIsPlayerModalOpen(true)
  }

  const handlePlayerSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setPlayerError(null)

    if (!selectedTeamId) {
      setPlayerError('No active team selected.')
      return
    }

    const formData = new FormData()
    formData.append('name', playerName)
    formData.append('team_id', selectedTeamId)
    formData.append('role', playerRole)
    formData.append('jersey_number', playerJersey)

    startTransition(async () => {
      let result
      if (editingPlayer) {
        result = await updatePlayer(editingPlayer.id, formData)
        if (!result.error) {
          const statsFormData = new FormData()
          statsFormData.append('runs', playerRuns)
          statsFormData.append('wickets', playerWickets)
          statsFormData.append('fours', playerFours)
          statsFormData.append('sixes', playerSixes)
          statsFormData.append('matches_played', playerMatchesPlayed)

          const statsResult = await updatePlayerStats(editingPlayer.id, statsFormData)
          if (statsResult.error) {
            setPlayerError(statsResult.error)
            return
          }
        }
      } else {
        result = await createPlayer(formData)
      }

      if (result.error) {
        setPlayerError(result.error)
      } else {
        window.location.reload()
      }
    })
  }

  const handlePlayerDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete player "${name}"?`)) {
      return
    }

    startTransition(async () => {
      const result = await deletePlayer(id)
      if (result.error) {
        alert(result.error)
      } else {
        window.location.reload()
      }
    })
  }

  // Helper to determine team colors
  const getTeamColor = (teamName: string) => {
    const n = teamName.toLowerCase()
    if (n.includes('mi') || n.includes('mumbai')) return 'from-blue-600 to-indigo-800'
    if (n.includes('rcb') || n.includes('bangalore') || n.includes('royal')) return 'from-rose-600 to-red-800'
    if (n.includes('csk') || n.includes('chennai')) return 'from-yellow-500 to-amber-600'
    if (n.includes('kkr') || n.includes('kolkata')) return 'from-purple-750 to-indigo-900'
    if (n.includes('srh') || n.includes('hyderabad')) return 'from-orange-500 to-red-655'
    if (n.includes('dc') || n.includes('delhi')) return 'from-sky-600 to-blue-800'
    return 'from-blue-600 to-indigo-600'
  }

  // Helper to get hover glow effects matching team colors
  const getTeamGlowClass = (teamName: string) => {
    const n = teamName.toLowerCase()
    if (n.includes('mi') || n.includes('mumbai')) return 'hover:shadow-blue-500/10 hover:border-blue-500/30'
    if (n.includes('rcb') || n.includes('bangalore') || n.includes('royal')) return 'hover:shadow-rose-500/10 hover:border-rose-500/30'
    if (n.includes('csk') || n.includes('chennai')) return 'hover:shadow-yellow-500/10 hover:border-yellow-500/30'
    if (n.includes('kkr') || n.includes('kolkata')) return 'hover:shadow-purple-500/10 hover:border-purple-500/30'
    if (n.includes('srh') || n.includes('hyderabad')) return 'hover:shadow-orange-500/10 hover:border-orange-500/30'
    if (n.includes('dc') || n.includes('delhi')) return 'hover:shadow-sky-500/10 hover:border-sky-500/30'
    return 'hover:shadow-blue-500/10 hover:border-blue-500/30'
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
      return 'bg-purple-50 text-purple-700 border-purple-150'
    }
  }

  // Statistics calculation for the drawer
  const squadStats = (() => {
    if (squadPlayers.length === 0) return { runs: 0, wickets: 0, matches: 0 }
    return squadPlayers.reduce((acc, curr) => ({
      runs: acc.runs + (curr.runs || 0),
      wickets: acc.wickets + (curr.wickets || 0),
      matches: acc.matches + (curr.matches_played || 0)
    }), { runs: 0, wickets: 0, matches: 0 })
  })()

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-center animate-fade-in-up">
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Search teams or captains..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-600 transition-all text-sm font-medium"
          />
        </div>
        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2 items-center">
          <p className="text-xs text-slate-400 font-semibold">
            Showing {filteredTeams.length} of {teams.length} teams
          </p>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 w-full sm:w-auto justify-center px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all shadow-md shadow-blue-200 cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5" /> Add Team
          </button>
        </div>
      </div>

      {/* Grid of Teams */}
      {filteredTeams.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 animate-fade-in-up">
          <ShieldAlert className="h-10 w-10 text-slate-350 mx-auto mb-3" />
          <p className="text-slate-455 text-sm font-semibold">No teams found matching your query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
          {filteredTeams.map((team) => {
            const colorGradient = getTeamColor(team.name)
            const glowClass = getTeamGlowClass(team.name)
            const teamPlayers = team.players || []

            return (
              <div
                key={team.id}
                onClick={() => setSelectedTeamId(team.id)}
                className={`bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer ${glowClass}`}
              >
                {/* Mini Header Accent */}
                <div className={`h-16 bg-gradient-to-r ${colorGradient} relative`}>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_60%)]" />
                  <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditModal(team)
                      }}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                      title="Edit Team"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(team.id, team.name)
                      }}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white hover:text-red-300 transition-colors cursor-pointer"
                      title="Delete Team"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-8 relative flex-1 flex flex-col justify-between">
                  {/* Logo wrapper */}
                  <div className="absolute -top-7 left-5 w-14 h-14 rounded-xl bg-white border-2 border-white shadow-md flex items-center justify-center font-black text-md text-slate-700 overflow-hidden flex-shrink-0">
                    {team.logo_url && !logoErrors[team.id] ? (
                      <img
                        src={team.logo_url}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={() => setLogoErrors((prev) => ({ ...prev, [team.id]: true }))}
                      />
                    ) : (
                      team.name.slice(0, 2).toUpperCase()
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 tracking-tight">{team.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-semibold">
                        <User className="h-3.5 w-3.5 text-slate-400" /> Captain: {team.captain_name}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-105 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <span suppressHydrationWarning>Created: {new Date(team.created_at).toLocaleDateString()}</span>
                      <span className="flex items-center gap-0.5 text-blue-600 hover:text-blue-500 font-extrabold transition-colors">
                        Squad ({teamPlayers.length}) <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Drawer Overlay for Squad View */}
      {selectedTeamId && activeTeam && (
        <div className="fixed inset-0 z-40 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setSelectedTeamId(null)}
          />

          {/* Drawer Panel */}
          <div className="relative w-full sm:w-[480px] bg-white border-l border-slate-200 shadow-2xl z-40 flex flex-col h-full animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className={`bg-gradient-to-r ${getTeamColor(activeTeam.name)} p-6 text-white relative flex-shrink-0`}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_60%)]" />
              <button
                onClick={() => setSelectedTeamId(null)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4 relative z-10">
                <div className="w-14 h-14 rounded-xl bg-white border border-white/20 flex items-center justify-center font-black text-lg text-slate-800 overflow-hidden shadow-md flex-shrink-0">
                  {activeTeam.logo_url && !logoErrors[`drawer-${activeTeam.id}`] ? (
                    <img
                      src={activeTeam.logo_url}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={() => setLogoErrors(prev => ({ ...prev, [`drawer-${activeTeam.id}`]: true }))}
                    />
                  ) : (
                    activeTeam.name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-black leading-tight">{activeTeam.name}</h3>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-white/80 font-semibold">
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> Captain: {activeTeam.captain_name}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="bg-slate-50 border-b border-slate-200 p-4 grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-500 shadow-inner flex-shrink-0">
              <div className="border-r border-slate-200/60">
                <p className="text-[9px] text-slate-400 uppercase tracking-wider">Players</p>
                <p className="text-sm font-black text-slate-800 mt-0.5">{squadPlayers.length}</p>
              </div>
              <div className="border-r border-slate-200/60">
                <p className="text-[9px] text-slate-400 uppercase tracking-wider">Total Runs</p>
                <p className="text-sm font-black text-slate-800 mt-0.5">{squadStats.runs}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 uppercase tracking-wider">Total Wkts</p>
                <p className="text-sm font-black text-slate-800 mt-0.5">{squadStats.wickets}</p>
              </div>
            </div>

            {/* Players List Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" /> Squad Members
                </h4>
                <button
                  onClick={openAddPlayerModal}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer animate-pulse"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Add Player
                </button>
              </div>

              {squadPlayers.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                  <ShieldAlert className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-450 text-xs font-semibold">No players in this team yet.</p>
                  <button
                    onClick={openAddPlayerModal}
                    className="mt-3 text-xs text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Add the first player
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {squadPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between shadow-xs hover:border-slate-305 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-105 text-blue-650 flex items-center justify-center font-black text-xs flex-shrink-0">
                          #{player.jersey_number}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 text-sm">{player.name}</p>
                          <span className={`inline-flex items-center gap-0.5 mt-0.5 px-1 py-0.2 rounded text-[7px] font-black border uppercase tracking-wider ${getRoleBadgeStyle(player.role)}`}>
                            <Award className="h-2.5 w-2.5" /> {player.role}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Stats Summary */}
                        <div className="text-[10px] text-slate-500 font-bold flex gap-3.5 border-r border-slate-100 pr-4">
                          <div className="text-center">
                            <span className="block text-[8px] text-slate-400 uppercase tracking-widest">Runs</span>
                            <span className="font-black text-slate-800">{player.runs ?? 0}</span>
                          </div>
                          <div className="text-center">
                            <span className="block text-[8px] text-slate-400 uppercase tracking-widest">Wkts</span>
                            <span className="font-black text-slate-800">{player.wickets ?? 0}</span>
                          </div>
                          <div className="text-center">
                            <span className="block text-[8px] text-slate-400 uppercase tracking-widest">Mch</span>
                            <span className="font-black text-slate-800">{player.matches_played ?? 0}</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => openEditPlayerModal(player)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                            title="Edit Player"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handlePlayerDelete(player.id, player.name)}
                            className="p-1.5 rounded-lg text-slate-405 hover:bg-red-50 hover:text-red-650 transition-colors cursor-pointer"
                            title="Delete Player"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit/Add Team Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />

          <div className="relative bg-white rounded-3xl border border-slate-200 w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-lg font-black text-slate-900">
                {editingTeam ? 'Edit Team Profile' : 'Add New Team'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-55 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/60 text-rose-800 text-xs font-semibold">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Team Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mumbai Indians"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 block w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-250 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Captain Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rohit Sharma"
                  value={captainName}
                  onChange={(e) => setCaptainName(e.target.value)}
                  className="mt-2 block w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-250 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Logo Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="mt-2 block w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-250 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition-all"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-650 hover:text-slate-900 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-blue-200 cursor-pointer"
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editingTeam ? 'Save Changes' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Player Add/Edit Modal Overlay */}
      {isPlayerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsPlayerModalOpen(false)} />

          <div className="relative bg-white rounded-3xl border border-slate-200 w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-lg font-black text-slate-900">
                {editingPlayer ? 'Edit Squad Player' : 'Add Player to Squad'}
              </h3>
              <button
                onClick={() => setIsPlayerModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-55 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePlayerSave} className="space-y-4">
              {playerError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/60 text-rose-800 text-xs font-semibold">
                  {playerError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Player Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hardik Pandya"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="mt-2 block w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-250 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Jersey Number *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 33"
                    value={playerJersey}
                    onChange={(e) => setPlayerJersey(e.target.value)}
                    className="mt-2 block w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-250 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Player Role *</label>
                <select
                  value={playerRole}
                  onChange={(e) => setPlayerRole(e.target.value)}
                  className="mt-2 block w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-250 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-bold cursor-pointer"
                >
                  {PLAYER_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Editable Statistics (Only when editing) */}
              {editingPlayer && (
                <div className="border-t border-slate-150 pt-4 mt-4 space-y-4">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Career Statistics</h4>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Matches Played</label>
                      <input
                        type="number"
                        min="0"
                        value={playerMatchesPlayed}
                        onChange={(e) => setPlayerMatchesPlayed(e.target.value)}
                        className="mt-1.5 block w-full px-3 py-2 rounded-xl bg-white border border-slate-250 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Runs</label>
                      <input
                        type="number"
                        min="0"
                        value={playerRuns}
                        onChange={(e) => setPlayerRuns(e.target.value)}
                        className="mt-1.5 block w-full px-3 py-2 rounded-xl bg-white border border-slate-250 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Wickets</label>
                      <input
                        type="number"
                        min="0"
                        value={playerWickets}
                        onChange={(e) => setPlayerWickets(e.target.value)}
                        className="mt-1.5 block w-full px-3 py-2 rounded-xl bg-white border border-slate-250 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Fours (4s)</label>
                      <input
                        type="number"
                        min="0"
                        value={playerFours}
                        onChange={(e) => setPlayerFours(e.target.value)}
                        className="mt-1.5 block w-full px-3 py-2 rounded-xl bg-white border border-slate-250 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Sixes (6s)</label>
                      <input
                        type="number"
                        min="0"
                        value={playerSixes}
                        onChange={(e) => setPlayerSixes(e.target.value)}
                        className="mt-1.5 block w-full px-3 py-2 rounded-xl bg-white border border-slate-250 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsPlayerModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-650 hover:text-slate-900 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-blue-200 cursor-pointer"
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editingPlayer ? 'Save Changes' : 'Add Player'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
