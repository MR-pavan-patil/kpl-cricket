import Header from '@/components/public/Header'
import { createClient } from '@/utils/supabase/server'
import { Trophy, BarChart3, Award, Shield, User, Star } from 'lucide-react'
import { Team, Player, Match } from '@/types'
import { calculateTeamNRR } from '@/utils/nrr'

export const revalidate = 0

export default async function StatsPage() {
  let teams: Team[] = []
  let players: Player[] = []
  let completedMatches: Match[] = []
  let matchPlayers: { match_id: string; team_id: string }[] = []

  try {
    const supabase = await createClient()

    // Fetch teams
    const { data: teamsData } = await supabase.from('teams').select('*')
    teams = teamsData || []

    // Fetch completed matches
    const { data: matchesData } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'completed')
    completedMatches = matchesData || []

    // Fetch players with stats who played matches
    const { data: playersData } = await supabase
      .from('players')
      .select('*')
      .gt('matches_played', 0)
    players = playersData || []

    // Fetch match players for NRR calculation
    const { data: matchPlayersData } = await supabase.from('match_players').select('match_id, team_id')
    matchPlayers = matchPlayersData || []
  } catch (err) {
    console.error('Failed to load stats page data:', err)
  }

  // Calculate Points Table Standing
  const pointsTable = teams.map((team) => {
    const teamMatches = completedMatches.filter(
      (m) => m.team1_id === team.id || m.team2_id === team.id
    )
    const won = completedMatches.filter((m) => m.winner_id === team.id).length
    const drawn = teamMatches.filter((m) => !m.winner_id).length
    const lost = teamMatches.length - won - drawn
    const points = won * 2 + drawn * 1
    const nrr = calculateTeamNRR(team.id, completedMatches, matchPlayers)

    return {
      team,
      played: teamMatches.length,
      won,
      lost,
      drawn,
      points,
      nrr,
    }
  })

  // Sort by points desc, then won desc, then nrr desc
  pointsTable.sort((a, b) => b.points - a.points || b.won - a.won || b.nrr - a.nrr)

  // Batting Leaderboards
  const topRuns = [...players].sort((a, b) => b.runs - a.runs).slice(0, 5)
  const topSixes = [...players].sort((a, b) => b.sixes - a.sixes).slice(0, 5)
  const topFours = [...players].sort((a, b) => b.fours - a.fours).slice(0, 5)

  // Bowling Leaderboard
  const topWickets = [...players].sort((a, b) => b.wickets - a.wickets).slice(0, 5)

  // Helper for rendering player row
  const PlayerStatRow = ({
    player,
    rank,
    value,
    label,
  }: {
    player: Player
    rank: number
    value: number
    label: string
  }) => {
    const teamName = teams.find((t) => t.id === player.team_id)?.name || ''
    return (
      <div className="flex justify-between items-center p-3 rounded-2xl bg-white border border-slate-100 hover:border-blue-200/60 hover:shadow-md transition-all duration-300 font-semibold text-xs">
        <div className="flex items-center gap-3">
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
              rank === 1
                ? 'bg-amber-100 text-amber-800'
                : rank === 2
                ? 'bg-slate-100 text-slate-650'
                : 'bg-slate-50 text-slate-450'
            }`}
          >
            #{rank}
          </span>
          <div>
            <p className="font-extrabold text-slate-800 flex items-center gap-1">
              {player.name}
              {rank === 1 && <Star className="h-3 w-3 fill-amber-500 text-amber-500" />}
            </p>
            <p className="text-[9px] text-slate-450 font-semibold">{teamName}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="font-black text-blue-600 text-sm">{value}</span>
          <span className="text-[9px] font-bold text-slate-450 uppercase ml-1">{label}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 font-sans">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-12 animate-fade-in-up">
        {/* Page Header */}
        <div className="border-b border-slate-200 pb-5">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="h-7 w-7 text-blue-600" />
            Tournament Standings &amp; Stats
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Browse live points standings, batting records, boundaries, and bowling wicket charts.
          </p>
        </div>

        {/* Points Table Standing */}
        <section className="space-y-4">
          <h2 className="text-xs font-black flex items-center gap-2 text-slate-800 uppercase tracking-widest">
            <Shield className="h-4.5 w-4.5 text-blue-600" /> Points Table Standings
          </h2>

          {pointsTable.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-3xl border border-slate-150 text-slate-400 text-xs shadow-sm">
              No points calculated. Points table updates dynamically as matches are completed.
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-150 overflow-hidden shadow-md">
              <div className="overflow-x-auto">
                <table className="min-w-[600px] sm:w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                      <th className="px-2 py-3.5 sm:p-4 sm:pl-6 w-16 text-center">Pos</th>
                      <th className="px-2 py-3.5 sm:p-4">Team</th>
                      <th className="px-2 py-3.5 sm:p-4 text-center">Played</th>
                      <th className="px-2 py-3.5 sm:p-4 text-center">Won</th>
                      <th className="px-2 py-3.5 sm:p-4 text-center">Lost</th>
                      <th className="px-2 py-3.5 sm:p-4 text-center">Tied/N/R</th>
                      <th className="px-2 py-3.5 sm:p-4 text-center text-slate-500 w-24">NRR</th>
                      <th className="px-2 py-3.5 sm:p-4 sm:pr-6 text-center font-black text-blue-650 w-24">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-900 font-semibold">
                    {pointsTable.map((row, index) => {
                      const isFirst = index === 0
                      const isTopFour = index < 4
                      return (
                        <tr
                          key={row.team.id}
                          className={`hover:bg-slate-50/40 transition-colors ${
                            isFirst
                              ? 'bg-blue-50/15'
                              : ''
                          } ${isTopFour ? 'border-l-4 border-l-blue-500' : ''}`}
                        >
                          <td className="px-2 py-3.5 sm:p-4 sm:pl-6 text-center font-black">
                            {isFirst ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                                🥇
                              </span>
                            ) : (
                              <span className="text-slate-400 font-bold">{index + 1}</span>
                            )}
                          </td>
                          <td className="px-2 py-3.5 sm:p-4 font-bold text-slate-900 flex items-center gap-3">
                            <div className="w-8.5 h-8.5 rounded-full bg-slate-50 border border-slate-150 flex items-center justify-center font-black text-xs overflow-hidden shadow-inner flex-shrink-0">
                              {row.team.logo_url ? (
                                <img
                                  src={row.team.logo_url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                row.team.name.slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <span className="text-sm font-extrabold text-slate-900">
                              {row.team.name}
                            </span>
                          </td>
                          <td className="px-2 py-3.5 sm:p-4 text-center text-slate-500">{row.played}</td>
                          <td className="px-2 py-3.5 sm:p-4 text-center text-emerald-600 font-extrabold">
                            {row.won}
                          </td>
                          <td className="px-2 py-3.5 sm:p-4 text-center text-rose-600 font-extrabold">
                            {row.lost}
                          </td>
                          <td className="px-2 py-3.5 sm:p-4 text-center text-slate-500">{row.drawn}</td>
                          <td className={`px-2 py-3.5 sm:p-4 text-center font-semibold text-xs ${row.nrr > 0 ? 'text-emerald-600' : row.nrr < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                            {row.nrr > 0 ? `+${row.nrr.toFixed(3)}` : row.nrr.toFixed(3)}
                          </td>
                          <td className="px-2 py-3.5 sm:p-4 sm:pr-6 text-center font-black text-blue-600 text-base">
                            {row.points}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Statistics Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Batting Stats Grid */}
          <div className="space-y-6">
            <h2 className="text-xs font-black flex items-center gap-2 text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2">
              <Award className="h-4.5 w-4.5 text-blue-600" /> Batting Leaderboards
            </h2>

            {/* Most Runs Card */}
            <div className="bg-gradient-to-br from-white to-amber-55/20 p-6 rounded-3xl border border-amber-250/30 shadow-md space-y-4">
              <h3 className="font-extrabold text-slate-900 border-b border-slate-105 pb-2.5 text-xs uppercase tracking-wider flex items-center justify-between">
                <span>Most Runs</span>
                <span className="px-2.5 py-1 rounded-full bg-amber-100 border border-amber-250 text-amber-800 text-[9px] font-black uppercase tracking-wider">
                  Orange Cap
                </span>
              </h3>
              {topRuns.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">No stats recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {topRuns.map((p, idx) => (
                    <PlayerStatRow
                      key={p.id}
                      player={p}
                      rank={idx + 1}
                      value={p.runs}
                      label="Runs"
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Boundaries Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Most Fours */}
              <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-md space-y-4">
                <h3 className="font-extrabold text-slate-900 border-b border-slate-100 pb-2 text-xs uppercase tracking-wider">
                  Most Fours (4s)
                </h3>
                {topFours.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No stats recorded.</p>
                ) : (
                  <div className="space-y-3">
                    {topFours.map((p, idx) => (
                      <PlayerStatRow
                        key={p.id}
                        player={p}
                        rank={idx + 1}
                        value={p.fours}
                        label="Fours"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Most Sixes */}
              <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-md space-y-4">
                <h3 className="font-extrabold text-slate-900 border-b border-slate-100 pb-2 text-xs uppercase tracking-wider">
                  Most Sixes (6s)
                </h3>
                {topSixes.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No stats recorded.</p>
                ) : (
                  <div className="space-y-3">
                    {topSixes.map((p, idx) => (
                      <PlayerStatRow
                        key={p.id}
                        player={p}
                        rank={idx + 1}
                        value={p.sixes}
                        label="Sixes"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bowling Stats Grid */}
          <div className="space-y-6">
            <h2 className="text-xs font-black flex items-center gap-2 text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2">
              <Trophy className="h-4.5 w-4.5 text-blue-600" /> Bowling Leaderboards
            </h2>

            {/* Most Wickets Card */}
            <div className="bg-gradient-to-br from-white to-indigo-55/20 p-6 rounded-3xl border border-indigo-250/30 shadow-md space-y-4">
              <h3 className="font-extrabold text-slate-900 border-b border-slate-105 pb-2.5 text-xs uppercase tracking-wider flex items-center justify-between">
                <span>Most Wickets</span>
                <span className="px-2.5 py-1 rounded-full bg-indigo-100 border border-indigo-250 text-indigo-800 text-[9px] font-black uppercase tracking-wider">
                  Purple Cap
                </span>
              </h3>
              {topWickets.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">No statistics recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {topWickets.map((p, idx) => (
                    <PlayerStatRow
                      key={p.id}
                      player={p}
                      rank={idx + 1}
                      value={p.wickets}
                      label="Wkts"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-450 py-12 w-full border-t border-gray-800 text-xs mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <p>&copy; 2026 KPL Cricket Tournament. All rights reserved. Precision live statistics.</p>
        </div>
      </footer>
    </div>
  )
}
