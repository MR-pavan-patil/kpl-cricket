import { createClient } from '@/utils/supabase/server'
import MatchesManager from '@/components/admin/MatchesManager'
import { Calendar } from 'lucide-react'

export const revalidate = 0

export default async function AdminMatchesPage() {
  let matches: any[] = []
  let teams: any[] = []

  try {
    const supabase = await createClient()

    // Fetch matches
    const { data: matchesData } = await supabase
      .from('matches')
      .select('*')
      .order('match_date', { ascending: false })
    matches = matchesData || []

    // Fetch teams
    const { data: teamsData } = await supabase
      .from('teams')
      .select('*')
      .order('name', { ascending: true })
    teams = teamsData || []
  } catch (err) {
    console.error('Failed to load matches for admin:', err)
  }

  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <Calendar className="h-8 w-8 text-blue-650" />
          Manage Matches
        </h1>
        <p className="text-slate-550 text-sm mt-1 font-medium">
          Schedule new tournament matches, edit details, delete entries, and update live statuses.
        </p>
      </div>

      <MatchesManager initialMatches={matches} teams={teams} />
    </main>
  )
}
