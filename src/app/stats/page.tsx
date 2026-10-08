import Header from '@/components/public/Header'
import { createClient } from '@/utils/supabase/server'
import { Team, Player, Match } from '@/types'
import PublicDashboard from '@/components/public/PublicDashboard'

export const revalidate = 30

interface PageProps {
  searchParams?: Promise<{ season?: string }>
}

export default async function StatsPage({ searchParams }: PageProps) {
  const resolvedParams = searchParams ? await searchParams : {}
  const seasonParam = resolvedParams.season ? parseInt(resolvedParams.season, 10) : 2

  let teams: Team[] = []
  let players: Player[] = []
  let matches: Match[] = []
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

    // Fetch match players
    const { data: matchPlayersData } = await supabase.from('match_players').select('match_id, team_id')
    matchPlayers = matchPlayersData || []
  } catch (err) {
    console.error('Failed to fetch stats page data:', err)
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
          initialTab="standings"
        />
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-10 text-center pb-24 md:pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2">
          <p>&copy; 2026 KPL Cricket League. All rights reserved. Precision standings, leaderboards &amp; net run rates.</p>
        </div>
      </footer>
    </div>
  )
}
