'use client'

import { useState, useTransition } from 'react'
import { Player, Team } from '@/types'
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
  Award, 
  ShieldAlert,
  Target,
  Trophy,
  Shield
} from 'lucide-react'

interface PlayersManagerProps {
  initialPlayers: Player[]
  teams: Team[]
}

const PLAYER_ROLES = ['Batsman', 'Bowler', 'All Rounder', 'Wicket Keeper']

export default function PlayersManager({ initialPlayers, teams }: PlayersManagerProps) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers)
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all')
  const [selectedRole, setSelectedRole] = useState<string>('all')
  const [search, setSearch] = useState('')
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Form Inputs
  const [name, setName] = useState('')
  const [teamId, setTeamId] = useState('')
  const [role, setRole] = useState(PLAYER_ROLES[0])
  const [jerseyNumber, setJerseyNumber] = useState('')
  const [runs, setRuns] = useState('0')
  const [wickets, setWickets] = useState('0')
  const [fours, setFours] = useState('0')
  const [sixes, setSixes] = useState('0')
  const [matchesPlayed, setMatchesPlayed] = useState('0')

  // Filter players by team, role, and search query
  const filteredPlayers = players.filter((player) => {
    const matchesTeam = selectedTeamId === 'all' || player.team_id === selectedTeamId
    const matchesRole = selectedRole === 'all' || player.role.toLowerCase() === selectedRole.toLowerCase()
    const matchesSearch = player.name.toLowerCase().includes(search.toLowerCase())
    return matchesTeam && matchesRole && matchesSearch
  })

  // Count players for each role based on team filter
  const getRoleCount = (roleId: string) => {
    return players.filter(p => {
      const matchesTeam = selectedTeamId === 'all' || p.team_id === selectedTeamId
      const matchesRole = roleId === 'all' || p.role.toLowerCase() === roleId.toLowerCase()
      return matchesTeam && matchesRole
    }).length
  }

  const roleFilterOptions = [
    { id: 'all', name: 'All Roles' },
    ...PLAYER_ROLES.map(r => ({ id: r.toLowerCase(), name: r }))
  ]

  const openAddModal = () => {
    setEditingPlayer(null)
    setName('')
    setTeamId(selectedTeamId !== 'all' ? selectedTeamId : teams[0]?.id || '')
    setRole(PLAYER_ROLES[0])
    setJerseyNumber('')
    setRuns('0')
    setWickets('0')
    setFours('0')
    setSixes('0')
    setMatchesPlayed('0')
    setError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (player: Player) => {
    setEditingPlayer(player)
    setName(player.name)
    setTeamId(player.team_id)
    setRole(player.role)
    setJerseyNumber(player.jersey_number.toString())
    setRuns((player.runs ?? 0).toString())
    setWickets((player.wickets ?? 0).toString())
    setFours((player.fours ?? 0).toString())
    setSixes((player.sixes ?? 0).toString())
    setMatchesPlayed((player.matches_played ?? 0).toString())
    setError(null)
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!teamId) {
      setError('Please select a team.')
      return
    }

    const formData = new FormData()
    formData.append('name', name)
    formData.append('team_id', teamId)
    formData.append('role', role)
    formData.append('jersey_number', jerseyNumber)

    startTransition(async () => {
      let result
      if (editingPlayer) {
        result = await updatePlayer(editingPlayer.id, formData)
        if (!result.error) {
          const statsFormData = new FormData()
          statsFormData.append('runs', runs)
          statsFormData.append('wickets', wickets)
          statsFormData.append('fours', fours)
          statsFormData.append('sixes', sixes)
          statsFormData.append('matches_played', matchesPlayed)

          const statsResult = await updatePlayerStats(editingPlayer.id, statsFormData)
          if (statsResult.error) {
            setError(statsResult.error)
            return
          }
        }
      } else {
        result = await createPlayer(formData)
      }

      if (result.error) {
        setError(result.error)
      } else {
        window.location.reload()
      }
    })
  }

  const handleDelete = async (id: string, name: string) => {
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

  // Dynamic role icons & styling matching sport aesthetics
  const getRoleIconAndStyle = (roleName: string) => {
    const r = roleName.toLowerCase()
    if (r.includes('batsman')) {
      return {
        icon: Trophy,
        style: 'bg-blue-50 text-blue-700 border-blue-150'
      }
    } else if (r.includes('bowler')) {
      return {
        icon: Target,
        style: 'bg-emerald-50 text-emerald-700 border-emerald-150'
      }
    } else if (r.includes('keeper')) {
      return {
        icon: Shield,
        style: 'bg-amber-50 text-amber-700 border-amber-150'
      }
    } else {
      // All Rounder
      return {
        icon: Award,
        style: 'bg-purple-50 text-purple-700 border-purple-150'
      }
    }
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

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col xl:flex-row justify-between gap-4 items-stretch xl:items-center animate-fade-in-up">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center flex-1">
          {/* Team filter dropdown */}
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="block px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all cursor-pointer font-bold shrink-0"
          >
            <option value="all">All Teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Search input */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder="Search player name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm font-medium"
            />
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          <p className="text-xs text-slate-400 font-semibold">
            Showing {filteredPlayers.length} of {players.length} players
          </p>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all shadow-md shadow-blue-200 cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5" /> Add Player
          </button>
        </div>
      </div>

      {/* Role Filter Chips */}
      <div className="flex flex-wrap gap-2 pb-1 animate-fade-in-up">
        {roleFilterOptions.map((roleOpt) => {
          const isActive = selectedRole === roleOpt.id
          const count = getRoleCount(roleOpt.id)
          return (
            <button
              key={roleOpt.id}
              onClick={() => setSelectedRole(roleOpt.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                isActive
                  ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-105'
                  : 'bg-white border-slate-200 text-slate-650 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>{roleOpt.name}</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Grid of Players */}
      {filteredPlayers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 animate-fade-in-up">
          <ShieldAlert className="h-10 w-10 text-slate-350 mx-auto mb-3" />
          <p className="text-slate-455 text-sm font-semibold">No players found matching your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
          {filteredPlayers.map((player) => {
            const team = teams.find((t) => t.id === player.team_id)
            const teamName = team?.name || 'No Team'
            const teamGradient = getTeamColor(teamName)
            const glowClass = getTeamGlowClass(teamName)
            const { icon: RoleIcon, style: roleBadgeStyle } = getRoleIconAndStyle(player.role)

            return (
              <div
                key={player.id}
                className={`bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1.5 transition-all duration-300 flex flex-col relative group ${glowClass}`}
              >
                {/* Jersey Number Watermark in the background */}
                <div className="absolute right-4 bottom-16 text-8xl font-black italic text-slate-500/5 select-none pointer-events-none tracking-tighter">
                  #{player.jersey_number}
                </div>

                {/* Visual Header Accent strip with team colors */}
                <div className={`h-14 bg-gradient-to-r ${teamGradient} relative flex justify-between items-center px-4.5 text-white`}>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_60%)]" />
                  <span className="text-[10px] font-black uppercase tracking-widest relative z-10 opacity-90 truncate max-w-[60%]">{teamName}</span>
                  <div className="flex items-center gap-1.5 relative z-10">
                    <button
                      onClick={() => openEditModal(player)}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                      title="Edit Player"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(player.id, player.name)}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white hover:text-red-300 transition-colors cursor-pointer"
                      title="Delete Player"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="p-5.5 space-y-4.5 flex-1 flex flex-col justify-between relative z-10">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {/* Jersey badge that changes color on card hover */}
                      <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 text-blue-650 flex items-center justify-center font-black text-sm shadow-inner flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                        #{player.jersey_number}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-black text-slate-900 tracking-tight leading-tight truncate">
                          {player.name}
                        </h3>
                        <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded text-[8px] font-extrabold border uppercase tracking-wider ${roleBadgeStyle}`}>
                          <RoleIcon className="h-3 w-3" /> {player.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Career Stats Grid */}
                  <div className="space-y-3">
                    <div className="bg-slate-50 border border-slate-105 p-3.5 rounded-2xl grid grid-cols-3 gap-2 text-center text-xs text-slate-500 font-bold shadow-inner">
                      <div className="border-r border-slate-200/60 py-0.5">
                        <p className="text-[8px] text-slate-400 uppercase tracking-widest">Matches</p>
                        <p className="text-sm font-black text-slate-800 mt-0.5">{player.matches_played ?? 0}</p>
                      </div>
                      <div className="border-r border-slate-200/60 py-0.5">
                        <p className="text-[8px] text-slate-400 uppercase tracking-widest">Runs</p>
                        <p className="text-sm font-black text-slate-800 mt-0.5">{player.runs ?? 0}</p>
                      </div>
                      <div className="py-0.5">
                        <p className="text-[8px] text-slate-400 uppercase tracking-widest">Wickets</p>
                        <p className="text-sm font-black text-slate-850 mt-0.5">{player.wickets ?? 0}</p>
                      </div>
                    </div>

                    {/* Secondary boundaries stats bar */}
                    <div className="flex justify-between items-center px-2 text-[10px] text-slate-400 font-bold">
                      <div className="flex gap-3">
                        <span>4s: <strong className="text-slate-700">{player.fours ?? 0}</strong></span>
                        <span>6s: <strong className="text-slate-700">{player.sixes ?? 0}</strong></span>
                      </div>
                      {player.runs > 0 && player.matches_played > 0 && (
                        <span>Avg: <strong className="text-slate-700">{(player.runs / player.matches_played).toFixed(1)}</strong></span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit/Add Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />

          <div className="relative bg-white rounded-3xl border border-slate-200 w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-lg font-black text-slate-900">
                {editingPlayer ? 'Edit Player Profile' : 'Add New Player'}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Player Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MS Dhoni"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-2 block w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-250 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Select Team *</label>
                  <select
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    className="mt-2 block w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-250 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-bold cursor-pointer"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Player Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="mt-2 block w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-250 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-bold cursor-pointer"
                  >
                    {PLAYER_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Jersey Number *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 7"
                    value={jerseyNumber}
                    onChange={(e) => setJerseyNumber(e.target.value)}
                    className="mt-2 block w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-250 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition-all"
                  />
                </div>
              </div>

              {/* Editable Statistics (Only when editing) */}
              {editingPlayer && (
                <div className="border-t border-slate-150 pt-4 mt-4 space-y-4">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Override Career Stats</h4>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Matches Played</label>
                      <input
                        type="number"
                        min="0"
                        value={matchesPlayed}
                        onChange={(e) => setMatchesPlayed(e.target.value)}
                        className="mt-1.5 block w-full px-3 py-2 rounded-xl bg-white border border-slate-250 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Runs</label>
                      <input
                        type="number"
                        min="0"
                        value={runs}
                        onChange={(e) => setRuns(e.target.value)}
                        className="mt-1.5 block w-full px-3 py-2 rounded-xl bg-white border border-slate-250 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Wickets</label>
                      <input
                        type="number"
                        min="0"
                        value={wickets}
                        onChange={(e) => setWickets(e.target.value)}
                        className="mt-1.5 block w-full px-3 py-2 rounded-xl bg-white border border-slate-250 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Fours (4s)</label>
                      <input
                        type="number"
                        min="0"
                        value={fours}
                        onChange={(e) => setFours(e.target.value)}
                        className="mt-1.5 block w-full px-3 py-2 rounded-xl bg-white border border-slate-250 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Sixes (6s)</label>
                      <input
                        type="number"
                        min="0"
                        value={sixes}
                        onChange={(e) => setSixes(e.target.value)}
                        className="mt-1.5 block w-full px-3 py-2 rounded-xl bg-white border border-slate-250 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      />
                    </div>
                  </div>
                </div>
              )}

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
                  {editingPlayer ? 'Save Changes' : 'Create Player'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
