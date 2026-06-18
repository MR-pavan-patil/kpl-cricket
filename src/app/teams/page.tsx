import Link from 'next/link'
import Header from '@/components/public/Header'
import TeamsList from '@/components/public/TeamsList'
import { createClient } from '@/utils/supabase/server'
import { Users } from 'lucide-react'

export const revalidate = 0

export default async function TeamsPage() {
  let teams: any[] = []
  let players: any[] = []
  let matches: any[] = []

  try {
    const supabase = await createClient()

    // Fetch teams
    const { data: teamsData } = await supabase
      .from('teams')
      .select('*')
      .order('name', { ascending: true })
    teams = teamsData || []

    // Fetch players
    const { data: playersData } = await supabase
      .from('players')
      .select('*')
      .order('name', { ascending: true })
    players = playersData || []

    // Fetch matches
    const { data: matchesData } = await supabase
      .from('matches')
      .select('*')
      .order('match_date', { ascending: false })
    const rawMatches = matchesData || []
    matches = rawMatches.map((m: any) => ({
      ...m,
      team1: teams.find((t) => t.id === m.team1_id),
      team2: teams.find((t) => t.id === m.team2_id),
    }))
  } catch (err) {
    console.error('Failed to fetch teams, players, or matches:', err)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 font-sans">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-8 animate-fade-in-up">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-gray-200 pb-5">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 flex items-center gap-2.5">
              <Users className="h-7 w-7 text-blue-600" />
              Tournament Teams
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm">
              Browse the official squads competing in the KPL Cricket Tournament.
            </p>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-105/50 text-blue-600 text-xs font-black uppercase tracking-wider">
            {teams.length} Teams Competing
          </div>
        </div>

        <TeamsList initialTeams={teams} initialPlayers={players} initialMatches={matches} />
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 w-full border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
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
            <Link href="/admin" className="inline-block mt-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors">
              Access Editor Panel
            </Link>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-800/85 pt-6 mt-8 text-center text-[10px] text-slate-500">
          <p>&copy; 2026 KPL Cricket League. All rights reserved. Built for maximum premium live scoring experience.</p>
        </div>
      </footer>
    </div>
  )
}
