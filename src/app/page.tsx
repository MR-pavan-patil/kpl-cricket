import Link from 'next/link'
import Header from '@/components/public/Header'
import { createClient } from '@/utils/supabase/server'
import { Trophy, Users, Calendar, ArrowRight, Activity, MapPin, Award, User, Shield, AlertTriangle, ArrowUpRight } from 'lucide-react'
import { Team, Player, Match } from '@/types'
import LiveMatchesRealtime from '@/components/public/LiveMatchesRealtime'

export const revalidate = 0

export default async function Home() {
  let teams: Team[] = []
  let matches: Match[] = []
  let players: Player[] = []
  let dbError = false

  try {
    const supabase = await createClient()

    // Fetch teams
    const { data: teamsData, error: teamsError } = await supabase.from('teams').select('*')
    if (teamsError) throw teamsError
    teams = teamsData || []

    // Fetch players
    const { data: playersData } = await supabase.from('players').select('*')
    players = playersData || []

    // Fetch matches
    const { data: matchesData } = await supabase.from('matches').select('*')
    const rawMatches = matchesData || []
    matches = rawMatches.map((m: any) => ({
      ...m,
      team1: teams.find((t) => t.id === m.team1_id),
      team2: teams.find((t) => t.id === m.team2_id),
    }))
  } catch (err) {
    console.error('Database connection or query error:', err)
    dbError = true
  }

  // Filter matches
  const liveMatches = matches.filter((m) => m.status === 'live')
  const upcomingMatches = matches.filter((m) => m.status === 'upcoming').slice(0, 3)
  const completedMatches = matches.filter((m) => m.status === 'completed')

  // Calculate Points Table Standing
  const pointsTable = teams.map((team) => {
    const teamMatches = completedMatches.filter(
      (m) => m.team1_id === team.id || m.team2_id === team.id
    )
    const won = completedMatches.filter((m) => m.winner_id === team.id).length
    const drawn = teamMatches.filter((m) => !m.winner_id).length
    const lost = teamMatches.length - won - drawn
    const points = won * 2 + drawn * 1

    return {
      team,
      played: teamMatches.length,
      won,
      lost,
      drawn,
      points,
    }
  })

  // Sort by points desc, then won desc
  pointsTable.sort((a, b) => b.points - a.points || b.won - a.won)
  const pointsTablePreview = pointsTable.slice(0, 4)

  // Find Top Performers
  const activePlayers = players.filter((p) => p.matches_played > 0)
  const topBatsman = activePlayers.length > 0
    ? [...activePlayers].sort((a, b) => b.runs - a.runs)[0]
    : null
  const topBowler = activePlayers.length > 0
    ? [...activePlayers].sort((a, b) => b.wickets - a.wickets)[0]
    : null

  const formatOvers = (balls: number) => {
    return `${Math.floor(balls / 6)}.${balls % 6}`
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 font-sans">
      <Header />

      {/* 3. Hero Section - Cricket themed premium overlay */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-slate-900 to-blue-950 text-white py-20 px-4 sm:px-6 lg:px-8 shadow-inner">
        {/* Stadium Image Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-20 pointer-events-none"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1600&q=80')`,
          }}
        />
        {/* Subtle decorative grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:3rem_3rem]" />

        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6 animate-fade-in-up">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-500/25 border border-blue-400/40 text-blue-300 text-xs font-black uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Live Tournament
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight font-display text-white">
            KPL Cricket Tournament 2026
          </h1>
          <p className="max-w-2xl mx-auto text-gray-300 text-sm sm:text-base leading-relaxed font-medium">
            Experience the excitement of the premier corporate league. Realtime ball-by-ball scorecards, tournament standings, leaderboards, and squad statistics.
          </p>
          <div className="pt-4 flex flex-wrap justify-center gap-4">
            <Link
              href="/schedule"
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm uppercase tracking-wider transition-all hover:shadow-[0_0_15px_rgba(37,99,235,0.4)]"
            >
              View Live Matches
            </Link>
            <Link
              href="/stats"
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-extrabold text-sm uppercase tracking-wider transition-all"
            >
              Tournament Stats
            </Link>
          </div>
        </div>
      </section>

      {/* Database warning if schema not loaded */}
      {dbError && (
        <div className="max-w-7xl mx-auto px-4 mt-6 w-full animate-fade-in-up">
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800">
            <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-sm">Supabase Connection Alert</h4>
              <p className="text-xs mt-1">
                Failed to retrieve tournament records. Please check database tables structure in <code className="px-1.5 py-0.5 rounded bg-white text-rose-700 font-mono text-[10px] border border-rose-200">schema.sql</code>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. Live Matches Grid - Cricbuzz Inspired Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 w-full animate-fade-in-up">
        <LiveMatchesRealtime initialMatches={matches} teams={teams} players={players} />
      </section>

      {/* Grid Stats counters card */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full animate-fade-in-up">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3 sm:gap-4 hover:border-blue-500/30 transition-all">
            <div className="p-2.5 sm:p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-105/40 flex-shrink-0"><Users className="h-5 w-5" /></div>
            <div>
              <p className="text-gray-400 text-[9px] font-bold uppercase tracking-wider">Total Teams</p>
              <h3 className="text-lg sm:text-xl font-black text-gray-900 mt-0.5">{teams.length} Teams</h3>
            </div>
          </div>
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3 sm:gap-4 hover:border-blue-500/30 transition-all">
            <div className="p-2.5 sm:p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-105/40 flex-shrink-0"><Calendar className="h-5 w-5" /></div>
            <div>
              <p className="text-gray-400 text-[9px] font-bold uppercase tracking-wider">Total Matches</p>
              <h3 className="text-lg sm:text-xl font-black text-gray-900 mt-0.5">{matches.length} Matches</h3>
            </div>
          </div>
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3 sm:gap-4 hover:border-blue-500/30 transition-all">
            <div className="p-2.5 sm:p-3 rounded-xl bg-red-50 text-red-650 border border-red-105/40 flex-shrink-0"><Activity className="h-5 w-5" /></div>
            <div>
              <p className="text-gray-400 text-[9px] font-bold uppercase tracking-wider">Live Matches</p>
              <h3 className="text-lg sm:text-xl font-black text-gray-900 mt-0.5">{liveMatches.length} Live</h3>
            </div>
          </div>
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3 sm:gap-4 hover:border-blue-500/30 transition-all">
            <div className="p-2.5 sm:p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-105/40 flex-shrink-0"><Trophy className="h-5 w-5" /></div>
            <div>
              <p className="text-gray-400 text-[9px] font-bold uppercase tracking-wider">Upcoming</p>
              <h3 className="text-lg sm:text-xl font-black text-gray-900 mt-0.5">{matches.filter((m) => m.status === 'upcoming').length} scheduled</h3>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Columns: Standings & Leaderboards */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 flex-1 w-full grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Standings Table Card Preview */}
        <section className="lg:col-span-2 space-y-4 animate-fade-in-up">
          <div className="flex justify-between items-center border-b border-gray-200 pb-2">
            <h2 className="text-base font-bold text-gray-950 flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" /> Points Table Standing
            </h2>
            <Link href="/stats" className="text-xs font-bold text-blue-600 hover:text-blue-500 flex items-center gap-0.5 transition-colors">
              Full Table <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {pointsTablePreview.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 text-gray-400 text-xs shadow-sm">
              No points standings recorded.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto shadow-sm">
              <table className="min-w-[500px] sm:w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                    <th className="p-3.5 pl-5 w-10 text-center">Pos</th>
                    <th className="p-3.5">Team</th>
                    <th className="p-3.5 text-center">Played</th>
                    <th className="p-3.5 text-center">Won</th>
                    <th className="p-3.5 text-center">Lost</th>
                    <th className="p-3.5 text-center font-bold text-blue-600 w-16">PTS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-900 font-semibold">
                  {pointsTablePreview.map((row, idx) => (
                    <tr key={row.team.id} className="hover:bg-gray-50/40 transition-colors">
                      <td className="p-3.5 pl-5 text-center font-bold text-gray-400">{idx + 1}</td>
                      <td className="p-3.5 font-bold text-gray-900 flex items-center gap-2.5">
                        <div className="w-6.5 h-6.5 rounded bg-gray-50 border border-gray-150 flex items-center justify-center font-bold text-[9px] overflow-hidden flex-shrink-0">
                          {row.team.logo_url ? <img src={row.team.logo_url} alt="" className="w-full h-full object-cover" /> : row.team.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="truncate max-w-[150px]">{row.team.name}</span>
                      </td>
                      <td className="p-3.5 text-center text-gray-500">{row.played}</td>
                      <td className="p-3.5 text-center text-emerald-650">{row.won}</td>
                      <td className="p-3.5 text-center text-red-600">{row.lost}</td>
                      <td className="p-3.5 text-center font-black text-blue-600 text-xs">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Top Performers leaderboard previews */}
        <section className="space-y-4 lg:col-span-1 animate-fade-in-up">
          <h2 className="text-base font-bold text-gray-950 flex items-center gap-2 border-b border-gray-200 pb-2">
            <Award className="h-5 w-5 text-blue-600" /> Leaderboard Preview
          </h2>

          <div className="space-y-4">
            {/* Top Batsman */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
              <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-wider">Orange Cap Leader</span>
              {topBatsman ? (
                <div className="mt-2.5 space-y-1">
                  <h4 className="text-base font-black text-gray-900">{topBatsman.name}</h4>
                  <p className="text-xs text-gray-500 font-semibold">
                    {teams.find((t) => t.id === topBatsman.team_id)?.name}
                  </p>
                  <div className="flex gap-4 text-xs font-bold text-gray-700 pt-3 border-t border-gray-100 mt-3">
                    <div>Runs: <span className="text-blue-600 font-black">{topBatsman.runs}</span></div>
                    <div>4s: <span className="text-gray-500">{topBatsman.fours}</span></div>
                    <div>6s: <span className="text-gray-500">{topBatsman.sixes}</span></div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic mt-2">No data yet.</p>
              )}
            </div>

            {/* Top Bowler */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
              <span className="text-[10px] text-amber-600 font-extrabold uppercase tracking-wider">Purple Cap Leader</span>
              {topBowler ? (
                <div className="mt-2.5 space-y-1">
                  <h4 className="text-base font-black text-gray-900">{topBowler.name}</h4>
                  <p className="text-xs text-gray-500 font-semibold">
                    {teams.find((t) => t.id === topBowler.team_id)?.name}
                  </p>
                  <div className="flex gap-4 text-xs font-bold text-gray-700 pt-3 border-t border-gray-100 mt-3">
                    <div>Wickets: <span className="text-amber-600 font-black">{topBowler.wickets}</span></div>
                    <div>Matches: <span className="text-gray-500">{topBowler.matches_played}</span></div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic mt-2">No data yet.</p>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Mock Sponsors Grid - Adds incredible realism */}
      <section className="bg-white border-t border-gray-200 py-10 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Official League Partners &amp; Sponsors</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center justify-items-center opacity-45">
            <span className="font-extrabold text-xs text-gray-500 tracking-wider">KPL INFRASTRUCTURE</span>
            <span className="font-extrabold text-xs text-gray-500 tracking-wider">ROYAL BEVERAGES</span>
            <span className="font-extrabold text-xs text-gray-500 tracking-wider">EXCEL SPORTSWEAR</span>
            <span className="font-extrabold text-xs text-gray-500 tracking-wider">DELTA FINANCE</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-450 py-12 w-full border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-xs">
          <div className="space-y-3">
            <h4 className="font-extrabold text-white text-sm">KPL Cricket League</h4>
            <p className="leading-relaxed">
              The premier cricket tournament system bringing you real-time ball scoring, leaderboard rankings, fixtures schedules, and complete stats.
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="font-extrabold text-white text-sm">Quick Links</h4>
            <div className="grid grid-cols-2 gap-2 font-semibold">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <Link href="/teams" className="hover:text-white transition-colors">Teams</Link>
              <Link href="/schedule" className="hover:text-white transition-colors">Schedule</Link>
              <Link href="/stats" className="hover:text-white transition-colors">Standings</Link>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="font-extrabold text-white text-sm">Organizer Admin</h4>
            <p>Authorized personnel can login to score live match fixtures and announce Playing XI squads.</p>
            <Link href="/admin" className="inline-block mt-1.5 px-3 py-1.5 rounded-lg bg-gray-850 hover:bg-gray-800 text-white font-bold transition-colors">
              Access Editor Panel
            </Link>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-gray-800/80 pt-6 mt-8 text-center text-[10px] text-gray-500">
          <p>&copy; 2026 KPL Cricket League. All rights reserved. Built for maximum premium live scoring experience.</p>
        </div>
      </footer>
    </div>
  )
}
