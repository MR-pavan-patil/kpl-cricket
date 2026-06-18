import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Trophy, ArrowLeft, Settings2 } from 'lucide-react'
import SetupClientForm from './SetupClientForm'
import { Match, Team, Player } from '@/types'

export const revalidate = 0

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function MatchSetupPage({ params }: PageProps) {
  const { id: matchId } = await params
  const supabase = await createClient()

  // 1. Fetch Match details
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single()

  if (matchError || !match) {
    redirect('/admin/matches')
  }

  // 2. Fetch Teams
  const { data: team1 } = await supabase.from('teams').select('*').eq('id', match.team1_id).single()
  const { data: team2 } = await supabase.from('teams').select('*').eq('id', match.team2_id).single()

  if (!team1 || !team2) {
    redirect('/admin/matches')
  }

  // 3. Fetch Players for both teams
  const { data: team1Players } = await supabase
    .from('players')
    .select('*')
    .eq('team_id', match.team1_id)
    .order('name', { ascending: true })

  const { data: team2Players } = await supabase
    .from('players')
    .select('*')
    .eq('team_id', match.team_id || match.team2_id) // Fallback to team2_id
    .order('name', { ascending: true })

  // 4. Fetch currently selected match_players (Playing XI)
  const { data: currentMatchPlayers } = await supabase
    .from('match_players')
    .select('player_id, team_id')
    .eq('match_id', matchId)

  const selectedTeam1PlayerIds = (currentMatchPlayers || [])
    .filter((mp) => mp.team_id === match.team1_id)
    .map((mp) => mp.player_id)

  const selectedTeam2PlayerIds = (currentMatchPlayers || [])
    .filter((mp) => mp.team_id === match.team2_id)
    .map((mp) => mp.player_id)

  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumb / Header */}
      <div className="border-b border-slate-200 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/matches"
            className="p-2.5 rounded-xl bg-white border border-slate-205 hover:bg-slate-50 text-slate-500 hover:text-slate-805 transition-colors cursor-pointer shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Settings2 className="h-8 w-8 text-blue-650" />
              Match Engine Setup
            </h1>
            <p className="text-slate-505 text-sm mt-1 font-medium">
              Configure overs, select Playing XI squad roster, and toss results for {team1.name} vs {team2.name}.
            </p>
          </div>
        </div>

        {match.status === 'live' && (
          <Link
            href={`/admin/scoring/${match.id}`}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-200 flex items-center gap-2 cursor-pointer"
          >
            <Trophy className="h-4 w-4" /> Open Live Scoring
          </Link>
        )}
      </div>

      <SetupClientForm
        match={match as Match}
        team1={team1 as Team}
        team2={team2 as Team}
        team1Players={(team1Players as Player[]) || []}
        team2Players={(team2Players as Player[]) || []}
        initialSelectedTeam1={selectedTeam1PlayerIds}
        initialSelectedTeam2={selectedTeam2PlayerIds}
      />
    </main>
  )
}
