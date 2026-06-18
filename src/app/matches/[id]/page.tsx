import Header from '@/components/public/Header'
import { createClient } from '@/utils/supabase/server'
import { ChevronLeft, ShieldAlert, Trophy } from 'lucide-react'
import Link from 'next/link'
import LiveScoreboard from '@/components/public/LiveScoreboard'
import { Team, Player, Match } from '@/types'

export const revalidate = 0

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function MatchDetailsPage({ params }: PageProps) {
  const { id } = await params
  let match: Match | null = null
  let team1: Team | null = null
  let team2: Team | null = null
  let team1Players: Player[] = []
  let team2Players: Player[] = []
  let errorMsg = ''

  try {
    const supabase = await createClient()

    // Fetch match details
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', id)
      .single()

    if (matchError || !matchData) {
      errorMsg = 'Match not found.'
    } else {
      match = matchData as Match

      // Fetch team details
      const { data: t1Data } = await supabase.from('teams').select('*').eq('id', match.team1_id).single()
      const { data: t2Data } = await supabase.from('teams').select('*').eq('id', match.team2_id).single()

      team1 = t1Data as Team
      team2 = t2Data as Team

      // Fetch squads
      const { data: p1Data } = await supabase.from('players').select('*').eq('team_id', match.team1_id).order('name', { ascending: true })
      const { data: p2Data } = await supabase.from('players').select('*').eq('team_id', match.team2_id).order('name', { ascending: true })

      team1Players = p1Data as Player[] || []
      team2Players = p2Data as Player[] || []
    }
  } catch (err) {
    console.error('Failed to load match details:', err)
    errorMsg = 'Failed to load match details.'
  }

  if (errorMsg || !match || !team1 || !team2) {
    return (
      <div className="min-h-screen bg-white flex flex-col text-gray-900">
        <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Link href="/" className="flex items-center gap-2 text-xl font-bold text-gray-900 group">
                  <Trophy className="h-6 w-6 text-emerald-600 group-hover:rotate-12 transition-transform duration-300" />
                  <span>
                    KPL <span className="text-emerald-600 font-extrabold">CRICKET</span>
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-20 flex-1 text-center">
          <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold">{errorMsg || 'Match details unavailable'}</h2>
          <Link href="/schedule" className="text-emerald-600 hover:text-emerald-500 mt-4 inline-block font-semibold">
            &larr; Return to Schedule
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col text-gray-900">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center gap-2 text-xl font-bold text-gray-900 group">
                <Trophy className="h-6 w-6 text-emerald-600 group-hover:rotate-12 transition-transform duration-300" />
                <span>
                  KPL <span className="text-emerald-600 font-extrabold">CRICKET</span>
                </span>
              </Link>
            </div>
            <nav className="flex items-center gap-6">
              <Link href="/" className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">Home</Link>
              <Link href="/teams" className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">Teams</Link>
              <Link href="/schedule" className="text-sm font-semibold text-gray-900 transition-colors">Schedule</Link>
              <Link href="/stats" className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">Stats</Link>
              <Link
                href="/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold transition-all"
              >
                Admin
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        <div>
          <Link href="/schedule" className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-950 transition-colors">
            <ChevronLeft className="h-4 w-4" /> Back to Schedule
          </Link>
        </div>

        <LiveScoreboard
          initialMatch={match}
          teamA={team1}
          teamB={team2}
          team1Players={team1Players}
          team2Players={team2Players}
        />
      </main>

      <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-500 bg-white">
        <p>&copy; 2026 KPL Cricket Tournament. All rights reserved.</p>
      </footer>
    </div>
  )
}
