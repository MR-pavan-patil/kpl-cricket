'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Match, Team, Player } from '@/types'
import { saveMatchSettings, savePlayingXI, updateToss } from '@/app/actions/matchEngine'
import { Settings, Users, Coins, Check, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react'

interface SetupClientFormProps {
  match: Match
  team1: Team
  team2: Team
  team1Players: Player[]
  team2Players: Player[]
  initialSelectedTeam1: string[]
  initialSelectedTeam2: string[]
}

export default function SetupClientForm({
  match,
  team1,
  team2,
  team1Players,
  team2Players,
  initialSelectedTeam1,
  initialSelectedTeam2,
}: SetupClientFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null)

  const [xiError, setXiError] = useState<string | null>(null)
  const [xiSuccess, setXiSuccess] = useState<string | null>(null)

  const [tossError, setTossError] = useState<string | null>(null)

  // 1. Settings state
  const [oversLimit, setOversLimit] = useState(match.overs_limit)
  const [playersCount, setPlayersCount] = useState(match.players_count)
  const [powerplayOvers, setPowerplayOvers] = useState(match.powerplay_overs || '')

  // 2. Playing XI state
  const [selectedTeam1, setSelectedTeam1] = useState<string[]>(initialSelectedTeam1)
  const [selectedTeam2, setSelectedTeam2] = useState<string[]>(initialSelectedTeam2)

  // 3. Toss state
  const [tossWinnerId, setTossWinnerId] = useState(match.toss_winner_id || '')
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl' | ''>(match.toss_decision || '')

  const handleSaveSettings = () => {
    setSettingsError(null)
    setSettingsSuccess(null)
    startTransition(async () => {
      const res = await saveMatchSettings(match.id, oversLimit, playersCount, powerplayOvers)
      if (res.error) {
        setSettingsError(res.error)
      } else {
        setSettingsSuccess('Match parameters saved successfully!')
      }
    })
  }

  const handleToggleTeam1 = (id: string) => {
    if (selectedTeam1.includes(id)) {
      setSelectedTeam1(selectedTeam1.filter((pid) => pid !== id))
    } else {
      setSelectedTeam1([...selectedTeam1, id])
    }
  }

  const handleToggleTeam2 = (id: string) => {
    if (selectedTeam2.includes(id)) {
      setSelectedTeam2(selectedTeam2.filter((pid) => pid !== id))
    } else {
      setSelectedTeam2([...selectedTeam2, id])
    }
  }

  const handleSaveXI = () => {
    setXiError(null)
    setXiSuccess(null)

    if (selectedTeam1.length !== playersCount) {
      setXiError(`Please select exactly ${playersCount} players for ${team1.name} (currently ${selectedTeam1.length} selected).`)
      return
    }

    if (selectedTeam2.length !== playersCount) {
      setXiError(`Please select exactly ${playersCount} players for ${team2.name} (currently ${selectedTeam2.length} selected).`)
      return
    }

    startTransition(async () => {
      // Save Team 1 XI
      const res1 = await savePlayingXI(match.id, team1.id, selectedTeam1)
      if (res1.error) {
        setXiError(res1.error)
        return
      }

      // Save Team 2 XI
      const res2 = await savePlayingXI(match.id, team2.id, selectedTeam2)
      if (res2.error) {
        setXiError(res2.error)
        return
      }

      setXiSuccess('Playing XI roster squads saved successfully!')
    })
  }

  const handleStartMatch = () => {
    setTossError(null)

    if (!tossWinnerId || !tossDecision) {
      setTossError('Please select both Toss Winner and Toss Decision.')
      return
    }

    if (selectedTeam1.length !== playersCount || selectedTeam2.length !== playersCount) {
      setTossError('You must save the Playing XI squads matching the Players count first.')
      return
    }

    startTransition(async () => {
      const res = await updateToss(match.id, tossWinnerId, tossDecision as 'bat' | 'bowl')
      if (res.error) {
        setTossError(res.error)
      } else {
        router.push(`/admin/scoring/${match.id}`)
      }
    })
  }

  const isXISavedAndValid = selectedTeam1.length === playersCount && selectedTeam2.length === playersCount

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start animate-fade-in-up">
      {/* 1. Match Parameters Configuration */}
      <div className="xl:col-span-1 space-y-6">
        <section className="bg-white rounded-3xl border border-slate-150 p-6 space-y-6 shadow-md">
          <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-100">
            <Settings className="h-4.5 w-4.5 text-blue-600" />
            1. Match Settings
          </h2>

          {settingsError && (
            <div className="p-3 text-xs font-semibold rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
              {settingsError}
            </div>
          )}

          {settingsSuccess && (
            <div className="p-3 text-xs font-semibold rounded-xl bg-emerald-50 border border-emerald-250 text-emerald-600 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" /> {settingsSuccess}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Overs limit *</label>
              <select
                value={oversLimit}
                onChange={(e) => setOversLimit(parseInt(e.target.value, 10))}
                className="mt-2 block w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-255 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-600 font-bold cursor-pointer"
              >
                {Array.from({ length: 50 }, (_, i) => i + 1).map((ov) => (
                  <option key={ov} value={ov}>
                    {ov} {ov === 1 ? 'Over' : 'Overs'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Players Count per Team *</label>
              <select
                value={playersCount}
                onChange={(e) => setPlayersCount(parseInt(e.target.value, 10))}
                className="mt-2 block w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-255 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-600 font-bold cursor-pointer"
              >
                {Array.from({ length: 10 }, (_, i) => i + 2).map((pc) => (
                  <option key={pc} value={pc}>
                    {pc} Players
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">Both Playing XIs must match this count.</p>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Powerplay Overs (Optional)</label>
              <input
                type="text"
                placeholder="e.g. 1-2 or 1-6"
                value={powerplayOvers}
                onChange={(e) => setPowerplayOvers(e.target.value)}
                className="mt-2 block w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-255 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-600 text-sm transition-all"
              />
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={isPending}
              className="w-full py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save settings
            </button>
          </div>
        </section>

        {/* 3. Toss Setup */}
        <section className="bg-white rounded-3xl border border-slate-150 p-6 space-y-6 shadow-md">
          <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-100">
            <Coins className="h-4.5 w-4.5 text-blue-600" />
            3. Toss Winner & Decision
          </h2>

          {tossError && (
            <div className="p-3 text-xs font-semibold rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" /> {tossError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Toss Winner *</label>
              <select
                value={tossWinnerId}
                onChange={(e) => setTossWinnerId(e.target.value)}
                className="mt-2 block w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-255 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-600 font-bold cursor-pointer"
              >
                <option value="">-- Choose Toss Winner --</option>
                <option value={team1.id}>{team1.name}</option>
                <option value={team2.id}>{team2.name}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Toss Decision *</label>
              <select
                value={tossDecision}
                onChange={(e) => setTossDecision(e.target.value as any)}
                className="mt-2 block w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-255 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-600 font-bold cursor-pointer"
              >
                <option value="">-- Choose Option --</option>
                <option value="bat">Elected to BAT</option>
                <option value="bowl">Elected to BOWL</option>
              </select>
            </div>

            {!isXISavedAndValid && (
              <p className="text-xs text-amber-705 font-bold flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Please select and save Playing XI rosters.
              </p>
            )}

            <button
              onClick={handleStartMatch}
              disabled={isPending || !isXISavedAndValid}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-widest transition-all hover:shadow-[0_0_15px_rgba(37,99,235,0.3)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Update Toss & Start Match
            </button>
          </div>
        </section>
      </div>

      {/* 2. Squad playing XI selection */}
      <div className="xl:col-span-2 space-y-6">
        <section className="bg-white rounded-3xl border border-slate-150 p-6 space-y-6 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-4">
            <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Users className="h-4.5 w-4.5 text-blue-600" />
              2. Select Squad Playing XIs
            </h2>
            <button
              onClick={handleSaveXI}
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-all hover:shadow-[0_0_12px_rgba(37,99,235,0.3)] cursor-pointer flex items-center gap-1.5 justify-center shadow-md shadow-blue-200"
            >
              {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              Save Playing XI Squads
            </button>
          </div>

          {xiError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
              {xiError}
            </div>
          )}

          {xiSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-250 text-emerald-600 text-xs font-semibold flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" /> {xiSuccess}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Team 1 Roster */}
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-150">
                <span className="font-extrabold text-sm text-slate-800 truncate max-w-[150px]">{team1.name}</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider border ${selectedTeam1.length === playersCount ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  {selectedTeam1.length} / {playersCount} selected
                </span>
              </div>

              {team1Players.length === 0 ? (
                <p className="text-xs text-slate-450 italic py-4">No players registered for this team.</p>
              ) : (
                <div className="max-h-[400px] overflow-y-auto pr-1 space-y-2 border border-slate-100 p-2 rounded-2xl bg-slate-50/20">
                  {team1Players.map((p) => {
                    const isSelected = selectedTeam1.includes(p.id)
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleToggleTeam1(p.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/50 border-blue-400/50 hover:bg-blue-50 text-slate-905 font-bold shadow-sm'
                            : 'bg-white border-slate-150 hover:border-slate-250 text-slate-500 hover:text-slate-850'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center border text-xs ${isSelected ? 'bg-blue-600 border-blue-550 text-white' : 'bg-white border-slate-200 text-transparent'}`}>
                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                          <div>
                            <p className="text-xs font-bold">{p.name}</p>
                            <p className="text-[10px] text-slate-450 font-semibold">{p.role} &bull; #{p.jersey_number}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Team 2 Roster */}
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-150">
                <span className="font-extrabold text-sm text-slate-800 truncate max-w-[150px]">{team2.name}</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider border ${selectedTeam2.length === playersCount ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  {selectedTeam2.length} / {playersCount} selected
                </span>
              </div>

              {team2Players.length === 0 ? (
                <p className="text-xs text-slate-450 italic py-4">No players registered for this team.</p>
              ) : (
                <div className="max-h-[400px] overflow-y-auto pr-1 space-y-2 border border-slate-100 p-2 rounded-2xl bg-slate-50/20">
                  {team2Players.map((p) => {
                    const isSelected = selectedTeam2.includes(p.id)
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleToggleTeam2(p.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/50 border-blue-400/50 hover:bg-blue-50 text-slate-905 font-bold shadow-sm'
                            : 'bg-white border-slate-150 hover:border-slate-250 text-slate-500 hover:text-slate-850'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center border text-xs ${isSelected ? 'bg-blue-600 border-blue-550 text-white' : 'bg-white border-slate-200 text-transparent'}`}>
                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                          <div>
                            <p className="text-xs font-bold">{p.name}</p>
                            <p className="text-[10px] text-slate-450 font-semibold">{p.role} &bull; #{p.jersey_number}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
