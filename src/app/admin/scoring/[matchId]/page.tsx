import { createClient } from '@/utils/supabase/server'
import ScoringPanel from '@/components/admin/ScoringPanel'
import { redirect } from 'next/navigation'
import { Trophy } from 'lucide-react'
import { Match, Team, Player } from '@/types'

export const revalidate = 0

interface PageProps {
  params: Promise<{ matchId: string }>
}

export default async function AdminScoringPage({ params }: PageProps) {
  const { matchId } = await params
  let match: Match | null = null
  let team1: Team | null = null
  let team2: Team | null = null
  let mPlayers: any[] = []

  try {
    const supabase = await createClient()

    // Fetch match details
    const { data: matchData } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single()

    if (!matchData) {
      redirect('/admin/matches')
    }

    match = matchData as Match

    // Fetch teams
    const { data: t1Data } = await supabase.from('teams').select('*').eq('id', match.team1_id).single()
    const { data: t2Data } = await supabase.from('teams').select('*').eq('id', match.team2_id).single()

    team1 = t1Data as Team
    team2 = t2Data as Team

    // Fetch match players
    const { data: matchPlayersData } = await supabase
      .from('match_players')
      .select('*, player:players(*)')
      .eq('match_id', match.id)
    mPlayers = matchPlayersData || []
  } catch (err) {
    console.error('Failed to load scoring dashboard:', err)
    redirect('/admin/matches')
  }

  if (!match || !team1 || !team2) {
    redirect('/admin/matches')
  }

  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="border-b border-slate-200 pb-6 flex items-center gap-3">
        <Trophy className="h-8 w-8 text-blue-650" />
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Live Score Editor</h1>
          <p className="text-slate-505 text-sm mt-1 font-medium">
            Log balls, runs, extras, wickets, and update the match scorecard in real-time.
          </p>
        </div>
      </div>

      <ScoringPanel
        initialMatch={match}
        teamA={team1}
        teamB={team2}
        matchPlayers={mPlayers.map((mp: any) => ({
          ...mp.player,
          team_id: mp.team_id
        }))}
      />
    </main>
  )
}
