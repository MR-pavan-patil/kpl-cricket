import Header from '@/components/public/Header'
import { createClient } from '@/utils/supabase/server'
import { Team, Player, Match } from '@/types'
import PublicDashboard from '@/components/public/PublicDashboard'
import Link from 'next/link'

export const revalidate = 30

interface PageProps {
  searchParams?: Promise<{ season?: string; tab?: string }>
}

export default async function Home({ searchParams }: PageProps) {
  const resolvedParams = searchParams ? await searchParams : {}
  const seasonParam = resolvedParams.season ? parseInt(resolvedParams.season, 10) : 1
  const tabParam = (resolvedParams.tab as any) || 'overview'

  let teams: Team[] = []
  let matches: Match[] = []
  let players: Player[] = []
  let matchPlayers: { match_id: string; team_id: string }[] = []

  try {
    const supabase = await createClient()

    // Fetch teams
    const { data: teamsData } = await supabase.from('teams').select('*').order('name', { ascending: true })
    teams = teamsData || []

    // Fetch players
    const { data: playersData } = await supabase.from('players').select('*')
    players = playersData || []

    // Fetch matches
    const { data: matchesData } = await supabase.from('matches').select('*').order('match_date', { ascending: false })
    const rawMatches = matchesData || []
    matches = rawMatches.map((m: any) => ({
      ...m,
      team1: teams.find((t) => t.id === m.team1_id),
      team2: teams.find((t) => t.id === m.team2_id),
    }))

    // Fetch match players for NRR
    const { data: matchPlayersData } = await supabase.from('match_players').select('match_id, team_id')
    matchPlayers = matchPlayersData || []
  } catch (err) {
    console.error('Database query error on Home page:', err)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col font-sans">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <PublicDashboard
          initialMatches={matches}
          teams={teams}
          players={players}
          matchPlayers={matchPlayers}
          initialSeason={seasonParam}
          initialTab={tabParam}
        />
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 w-full border-t border-slate-800 text-xs pb-24 md:pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <h4 className="font-extrabold text-white text-sm">KPL Cricket League</h4>
            <p className="leading-relaxed">
              The premier cricket tournament system bringing you real-time ball scoring, leaderboard rankings, fixtures schedules, and complete stats across Season 1 and Season 2.
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
            <h4 className="font-extrabold text-white text-sm">Organizer Portal</h4>
            <p>Authorized league admins can schedule matches, set up Season 2 fixtures, and score live balls.</p>
            <Link href="/admin" className="inline-block mt-1 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all border border-slate-700">
              Access Admin Panel
            </Link>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-800/80 pt-6 mt-8 text-center text-[10px] text-slate-500">
          <p>&copy; 2026 KPL Cricket League. All rights reserved. Preserving Season 1 history &amp; powering Season 2.</p>
        </div>
      </footer>
    </div>
  )
}
