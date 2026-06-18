'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Match, Team } from '@/types'
import { createMatch, updateMatch, deleteMatch } from '@/app/actions/matches'
import { Plus, Edit2, Trash2, Search, X, Loader2, Calendar, MapPin, Play, CheckCircle2, ShieldAlert, Settings } from 'lucide-react'

interface MatchesManagerProps {
  initialMatches: Match[]
  teams: Team[]
}

const STATUS_OPTIONS = ['upcoming', 'live', 'completed']

export default function MatchesManager({ initialMatches, teams }: MatchesManagerProps) {
  const [matches, setMatches] = useState<Match[]>(initialMatches)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Form Inputs
  const [team1Id, setTeam1Id] = useState('')
  const [team2Id, setTeam2Id] = useState('')
  const [matchDateOnly, setMatchDateOnly] = useState('')
  const [matchTimeOnly, setMatchTimeOnly] = useState('')
  const [venue, setVenue] = useState('')
  const [status, setStatus] = useState(STATUS_OPTIONS[0])
  const [winnerId, setWinnerId] = useState('')
  const [resultDesc, setResultDesc] = useState('')

  // Filter matches by teams search
  const filteredMatches = matches.filter((match) => {
    const t1 = teams.find((t) => t.id === match.team1_id)?.name || ''
    const t2 = teams.find((t) => t.id === match.team2_id)?.name || ''
    const v = match.venue || ''
    const term = search.toLowerCase()
    return t1.toLowerCase().includes(term) || t2.toLowerCase().includes(term) || v.toLowerCase().includes(term)
  })

  const openAddModal = () => {
    setEditingMatch(null)
    setTeam1Id(teams[0]?.id || '')
    setTeam2Id(teams[1]?.id || '')
    setMatchDateOnly('')
    setMatchTimeOnly('')
    setVenue('')
    setStatus(STATUS_OPTIONS[0])
    setWinnerId('')
    setResultDesc('')
    setError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (match: Match) => {
    setEditingMatch(match)
    setTeam1Id(match.team1_id)
    setTeam2Id(match.team2_id)
    const d = new Date(match.match_date)
    const tzoffset = d.getTimezoneOffset() * 60000
    const localISO = new Date(d.getTime() - tzoffset).toISOString()
    setMatchDateOnly(localISO.split('T')[0])
    setMatchTimeOnly(d.toTimeString().slice(0, 5))
    setVenue(match.venue)
    setStatus(match.status)
    setWinnerId(match.winner_id || '')
    setResultDesc(match.result_desc || '')
    setError(null)
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (team1Id === team2Id) {
      setError('Team A and Team B must be different teams.')
      return
    }

    const formData = new FormData()
    formData.append('team1_id', team1Id)
    formData.append('team2_id', team2Id)
    
    const combinedDatetime = new Date(`${matchDateOnly}T${matchTimeOnly}`).toISOString()
    formData.append('match_date', combinedDatetime)
    formData.append('venue', venue)
    formData.append('status', status)
    formData.append('winner_id', winnerId)
    formData.append('result_desc', resultDesc)

    startTransition(async () => {
      let result
      if (editingMatch) {
        result = await updateMatch(editingMatch.id, formData)
      } else {
        result = await createMatch(formData)
      }

      if (result.error) {
        setError(result.error)
      } else {
        window.location.reload()
      }
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this match? All match player assignments will be deleted.')) {
      return
    }

    startTransition(async () => {
      const result = await deleteMatch(id)
      if (result.error) {
        alert(result.error)
      } else {
        window.location.reload()
      }
    })
  }

  const formatOvers = (balls: number) => {
    return `${Math.floor(balls / 6)}.${balls % 6}`
  }

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
            placeholder="Search team or venue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm font-medium"
          />
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 w-full sm:w-auto justify-center px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all shadow-md shadow-blue-200 cursor-pointer"
        >
          <Plus className="h-4.5 w-4.5" /> Schedule Match
        </button>
      </div>

      {/* Grid of Matches */}
      {filteredMatches.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 animate-fade-in-up">
          <ShieldAlert className="h-10 w-10 text-slate-350 mx-auto mb-3" />
          <p className="text-slate-455 text-sm font-semibold">No matches scheduled matching your query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
          {filteredMatches.map((match) => {
            const team1 = teams.find((t) => t.id === match.team1_id)
            const team2 = teams.find((t) => t.id === match.team2_id)
            
            const isLive = match.status === 'live'
            const isCompleted = match.status === 'completed'
            const isUpcoming = match.status === 'upcoming'

            return (
              <div
                key={match.id}
                className={`bg-white rounded-3xl border p-5 flex flex-col justify-between hover:shadow-lg transition-all duration-350 ${
                  isLive ? 'border-red-300 shadow-md shadow-red-50/50' : 'border-slate-200'
                }`}
              >
                <div className="space-y-4">
                  {/* Card Header Info */}
                  <div className="flex justify-between items-center text-xs text-slate-500 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 font-semibold text-slate-600">
                        <Calendar className="h-3.5 w-3.5 text-blue-600" />
                        {new Date(match.match_date).toLocaleDateString()}
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="flex items-center gap-1 font-semibold text-slate-655">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {match.venue}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isLive && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200/50 text-red-650 text-[10px] font-black uppercase tracking-widest animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" /> Live
                        </span>
                      )}
                      {isUpcoming && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                          Upcoming
                        </span>
                      )}
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-250/50 text-emerald-650 text-[10px] font-black uppercase tracking-wider">
                          <CheckCircle2 className="h-3 w-3" /> Finished
                        </span>
                      )}
                      
                      <button
                        onClick={() => openEditModal(match)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Edit Fixture"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(match.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-55 transition-colors cursor-pointer"
                        title="Delete Fixture"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Teams / Scores Grid */}
                  <div className="space-y-3.5 py-1">
                    {/* Team 1 */}
                    <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="w-6.5 h-6.5 rounded-full bg-slate-50 border border-slate-150 flex items-center justify-center font-bold text-[10px] overflow-hidden shadow-inner flex-shrink-0">
                          {team1?.logo_url ? <img src={team1.logo_url} alt="" className="w-full h-full object-cover" /> : team1?.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className={isLive && match.current_batting_team_id === match.team1_id ? 'text-blue-600 font-extrabold' : ''}>{team1?.name}</span>
                      </div>
                      {!isUpcoming && (
                        <span className="font-extrabold text-slate-900">
                          {match.team1_runs}/{match.team1_wickets} <span className="text-[10px] text-slate-400 font-normal">({formatOvers(match.team1_balls)} ov)</span>
                        </span>
                      )}
                    </div>

                    {/* Team 2 */}
                    <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="w-6.5 h-6.5 rounded-full bg-slate-50 border border-slate-150 flex items-center justify-center font-bold text-[10px] overflow-hidden shadow-inner flex-shrink-0">
                          {team2?.logo_url ? <img src={team2.logo_url} alt="" className="w-full h-full object-cover" /> : team2?.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className={isLive && match.current_batting_team_id === match.team2_id ? 'text-blue-600 font-extrabold' : ''}>{team2?.name}</span>
                      </div>
                      {!isUpcoming && (
                        <span className="font-extrabold text-slate-900">
                          {match.team2_runs}/{match.team2_wickets} <span className="text-[10px] text-slate-400 font-normal">({formatOvers(match.team2_balls)} ov)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Result Description */}
                  {isCompleted && match.result_desc && (
                    <div className="bg-emerald-50/50 border border-emerald-100/50 p-2.5 rounded-xl text-xs text-emerald-800 font-bold">
                      🏆 {match.result_desc}
                    </div>
                  )}
                </div>

                {/* Footer management links */}
                <div className="pt-4 mt-4 border-t border-slate-105 flex items-center gap-3.5">
                  <Link
                    href={`/admin/matches/${match.id}/setup`}
                    className="flex-1 flex justify-center items-center gap-1.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    <Settings className="h-3.5 w-3.5 text-blue-650" /> Setup XI
                  </Link>

                  {(isLive || isCompleted) && (
                    <Link
                      href={`/admin/scoring/${match.id}`}
                      className="flex-1 flex justify-center items-center gap-1.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" /> Scoring
                    </Link>
                  )}
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

          <div className="relative bg-white rounded-3xl border border-slate-200 w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-lg font-black text-slate-900">
                {editingMatch ? 'Edit Match Details' : 'Schedule New Match'}
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
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Team A (Home) *</label>
                  <select
                    value={team1Id}
                    onChange={(e) => setTeam1Id(e.target.value)}
                    className="mt-2 block w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-250 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-bold cursor-pointer"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Team B (Away) *</label>
                  <select
                    value={team2Id}
                    onChange={(e) => setTeam2Id(e.target.value)}
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
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Match Date *</label>
                  <input
                    type="date"
                    required
                    value={matchDateOnly}
                    onChange={(e) => setMatchDateOnly(e.target.value)}
                    className="mt-2 block w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-250 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Match Time *</label>
                  <input
                    type="time"
                    required
                    value={matchTimeOnly}
                    onChange={(e) => setMatchTimeOnly(e.target.value)}
                    className="mt-2 block w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-250 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Venue *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wankhede Stadium, Mumbai"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="mt-2 block w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-250 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition-all"
                />
              </div>

              {editingMatch && (
                <div className="border-t border-slate-150 pt-4 mt-4 space-y-4">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Override Match Status & Results</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Match Status</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="mt-1.5 block w-full px-3 py-2 rounded-xl bg-white border border-slate-250 text-slate-900 text-xs focus:outline-none font-bold"
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o} value={o}>
                            {o.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Select Winner</label>
                      <select
                        value={winnerId}
                        onChange={(e) => setWinnerId(e.target.value)}
                        className="mt-1.5 block w-full px-3 py-2 rounded-xl bg-white border border-slate-250 text-slate-900 text-xs focus:outline-none font-bold"
                      >
                        <option value="">No Winner (Draw/Upcoming)</option>
                        <option value={editingMatch.team1_id}>{teams.find((t) => t.id === editingMatch.team1_id)?.name}</option>
                        <option value={editingMatch.team2_id}>{teams.find((t) => t.id === editingMatch.team2_id)?.name}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Result Description</label>
                    <input
                      type="text"
                      placeholder="e.g. Mumbai won by 5 wickets"
                      value={resultDesc}
                      onChange={(e) => setResultDesc(e.target.value)}
                      className="mt-1.5 block w-full px-3 py-2 rounded-xl bg-white border border-slate-250 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
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
                  {editingMatch ? 'Save Changes' : 'Schedule Match'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
