import { createClient } from '@/utils/supabase/server'
import PlayersManager from '@/components/admin/PlayersManager'
import { Trophy } from 'lucide-react'

export const revalidate = 0

export default async function AdminPlayersPage() {
  let players: any[] = []
  let teams: any[] = []

  try {
    const supabase = await createClient()

    // Fetch players
    const { data: playersData } = await supabase
      .from('players')
      .select('*')
      .order('jersey_number', { ascending: true })
    players = playersData || []

    // Fetch teams
    const { data: teamsData } = await supabase
      .from('teams')
      .select('*')
      .order('name', { ascending: true })
    teams = teamsData || []
  } catch (err) {
    console.error('Failed to load players for admin:', err)
  }

  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <Trophy className="h-8 w-8 text-blue-650" />
          Manage Players
        </h1>
        <p className="text-slate-505 text-sm mt-1 font-medium">
          Add, edit, and delete players, and assign them to team rosters.
        </p>
      </div>

      <PlayersManager initialPlayers={players} teams={teams} />
    </main>
  )
}
