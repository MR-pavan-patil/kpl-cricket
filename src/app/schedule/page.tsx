import Header from '@/components/public/Header'
import { createClient } from '@/utils/supabase/server'
import { Calendar } from 'lucide-react'
import { Team, Match } from '@/types'
import ScheduleList from '@/components/public/ScheduleList'

export const revalidate = 0

export default async function SchedulePage() {
  let matches: Match[] = []
  let teams: Team[] = []

  try {
    const supabase = await createClient()

    // Fetch teams
    const { data: teamsData } = await supabase.from('teams').select('*')
    teams = teamsData || []

    // Fetch matches
    const { data: matchesData } = await supabase
      .from('matches')
      .select('*')
      .order('match_date', { ascending: true })
    const rawMatches = matchesData || []

    // Map matches
    matches = rawMatches.map((m: any) => ({
      ...m,
      team1: teams.find((t) => t.id === m.team1_id),
      team2: teams.find((t) => t.id === m.team2_id),
    }))
  } catch (err) {
    console.error('Failed to fetch matches:', err)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 font-sans">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-8 animate-fade-in-up">
        {/* Page Header */}
        <div className="space-y-1.5 border-b border-slate-200 pb-5">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Calendar className="h-7 w-7 text-blue-600" />
            Tournament Schedule
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm">
            Keep track of live match cards, upcoming schedules, and previous match outcomes.
          </p>
        </div>

        <ScheduleList initialMatches={matches} />
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 w-full border-t border-gray-800 text-xs mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <p>&copy; 2026 KPL Cricket Tournament. All rights reserved. Premium live scoring experiences.</p>
        </div>
      </footer>
    </div>
  )
}
