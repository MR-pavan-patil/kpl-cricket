import Header from '@/components/public/Header'
import { createClient } from '@/utils/supabase/server'
import { Trophy, Calendar, MapPin, ArrowRight, Shield, Award, Users } from 'lucide-react'
import { Team, Match } from '@/types'
import Link from 'next/link'

export const revalidate = 0

export default async function BracketPage() {
  let teams: Team[] = []
  let matches: Match[] = []
  let dbError = false

  try {
    const supabase = await createClient()

    // Fetch teams
    const { data: teamsData } = await supabase.from('teams').select('*')
    teams = teamsData || []

    // Fetch matches
    const { data: matchesData } = await supabase
      .from('matches')
      .select('*')
      .in('stage', ['semi_final_1', 'semi_final_2', 'final'])
      .order('match_date', { ascending: true })
    const rawMatches = matchesData || []

    // Map matches
    matches = rawMatches.map((m: any) => ({
      ...m,
      team1: teams.find((t) => t.id === m.team1_id),
      team2: teams.find((t) => t.id === m.team2_id),
    }))
  } catch (err) {
    console.error('Failed to fetch bracket data:', err)
    dbError = true
  }

  // Find matches by stage
  const sf1 = matches.find((m) => m.stage === 'semi_final_1')
  const sf2 = matches.find((m) => m.stage === 'semi_final_2')
  const finalMatch = matches.find((m) => m.stage === 'final')

  // Derive winners
  const getWinnerTeam = (match?: Match) => {
    if (!match || !match.winner_id) return null
    return teams.find((t) => t.id === match.winner_id) || null
  }

  const sf1Winner = getWinnerTeam(sf1)
  const sf2Winner = getWinnerTeam(sf2)
  const champion = getWinnerTeam(finalMatch)

  // Derive Runner Up and Margin
  let runnerUp: Team | null = null
  let winningMargin = ''
  if (finalMatch && champion) {
    const runnerUpId = finalMatch.team1_id === champion.id ? finalMatch.team2_id : finalMatch.team1_id
    runnerUp = teams.find((t) => t.id === runnerUpId) || null
    winningMargin = finalMatch.result_desc || 'Won match'
  }

  const formatOvers = (balls: number) => {
    return `${Math.floor(balls / 6)}.${balls % 6}`
  }

  const renderBracketCard = (title: string, match?: Match, fallbackTeam1?: string, fallbackTeam2?: string) => {
    if (!match) {
      return (
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm opacity-60">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">{title}</p>
          <div className="text-xs text-slate-450 italic py-6 text-center">
            Match not scheduled yet
          </div>
        </div>
      )
    }

    const isLive = match.status === 'live'
    const isCompleted = match.status === 'completed'
    const isUpcoming = match.status === 'upcoming'

    const t1Name = match.team1?.name || fallbackTeam1 || 'TBD'
    const t2Name = match.team2?.name || fallbackTeam2 || 'TBD'

    const winnerId = match.winner_id

    return (
      <div className={`bg-white rounded-3xl p-5 border transition-all duration-300 relative ${
        isLive ? 'border-red-300 shadow-md shadow-red-50/50 scale-[1.01]' : 'border-slate-200 shadow-sm'
      }`}>
        <div className="flex justify-between items-center mb-3">
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{title}</p>
          {isLive && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200/50 text-red-600 text-[9px] font-black uppercase tracking-widest animate-pulse">
              <span className="w-1 h-1 rounded-full bg-red-600" /> Live
            </span>
          )}
          {isCompleted && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-wider">
              Finished
            </span>
          )}
          {isUpcoming && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-wider">
              Scheduled
            </span>
          )}
        </div>

        <div className="space-y-3.5 py-1">
          {/* Team 1 */}
          <div className={`flex justify-between items-center text-xs font-bold ${
            isCompleted && winnerId === match.team1_id ? 'text-slate-900 font-black' : 'text-slate-650'
          }`}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-50 border border-slate-150 flex items-center justify-center font-bold text-[10px] overflow-hidden flex-shrink-0">
                {match.team1?.logo_url ? <img src={match.team1.logo_url} alt="" className="w-full h-full object-cover" /> : t1Name.slice(0, 2).toUpperCase()}
              </div>
              <span className={isLive && match.current_batting_team_id === match.team1_id ? 'text-blue-600 font-black' : ''}>
                {t1Name}
              </span>
            </div>
            {!isUpcoming && (
              <span>
                {match.team1_runs}/{match.team1_wickets}
                <span className="text-[9px] text-slate-400 font-normal ml-1">({formatOvers(match.team1_balls)} ov)</span>
              </span>
            )}
          </div>

          {/* Team 2 */}
          <div className={`flex justify-between items-center text-xs font-bold ${
            isCompleted && winnerId === match.team2_id ? 'text-slate-900 font-black' : 'text-slate-650'
          }`}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-50 border border-slate-150 flex items-center justify-center font-bold text-[10px] overflow-hidden flex-shrink-0">
                {match.team2?.logo_url ? <img src={match.team2.logo_url} alt="" className="w-full h-full object-cover" /> : t2Name.slice(0, 2).toUpperCase()}
              </div>
              <span className={isLive && match.current_batting_team_id === match.team2_id ? 'text-blue-600 font-black' : ''}>
                {t2Name}
              </span>
            </div>
            {!isUpcoming && (
              <span>
                {match.team2_runs}/{match.team2_wickets}
                <span className="text-[9px] text-slate-400 font-normal ml-1">({formatOvers(match.team2_balls)} ov)</span>
              </span>
            )}
          </div>
        </div>

        {/* Date / Venue */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-bold">
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(match.match_date).toLocaleDateString()}</span>
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {match.venue}</span>
        </div>

        {/* Link to details */}
        <div className="mt-3.5 flex justify-end">
          <Link href={`/matches/${match.id}`} className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-wider flex items-center gap-0.5">
            Match Center <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 font-sans">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-12 animate-fade-in-up">
        {/* Page Header */}
        <div className="space-y-1.5 border-b border-slate-200 pb-5">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Trophy className="h-7 w-7 text-blue-600" />
            Tournament Bracket
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm">
            Track the tournament knockout path from the Semi Finals to the Grand Final and the Champion crowning.
          </p>
        </div>

        {dbError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-800 text-xs font-bold">
            Failed to load bracket fixtures. Please ensure the stage fields are migrated in Supabase.
          </div>
        )}

        {/* 10. Champion Card (Stunning Gold Ribbon Layout) */}
        {finalMatch && finalMatch.status === 'completed' && champion && runnerUp && (
          <section className="bg-gradient-to-br from-yellow-450 via-amber-500 to-amber-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden max-w-2xl mx-auto border-2 border-white/20 animate-fade-in">
            {/* Glossy Overlay and radial glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15),transparent_70%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-30" />
            
            <div className="relative z-10 text-center space-y-5 flex flex-col items-center">
              {/* Trophy Header */}
              <div className="w-16 h-16 rounded-full bg-white/20 border border-white/35 flex items-center justify-center shadow-lg relative group">
                <Trophy className="h-9 w-9 text-yellow-100 fill-yellow-500 animate-bounce" />
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-black tracking-widest text-amber-100 uppercase bg-amber-700/40 px-3 py-1 rounded-full border border-amber-400/30">
                  Tournament Champion
                </span>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight">{champion.name}</h2>
              </div>

              {/* Champion vs Runner Up Visual */}
              <div className="w-full flex items-center justify-center gap-6 sm:gap-8 py-3 border-t border-b border-white/10 mt-2">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border-2 border-amber-300 shadow-md overflow-hidden">
                    {champion.logo_url ? <img src={champion.logo_url} alt="" className="w-full h-full object-cover" /> : champion.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-[9px] text-amber-100 font-extrabold mt-1 uppercase tracking-wider">Champion</span>
                </div>
                
                <span className="text-amber-100 font-extrabold text-xs">VS</span>
                
                <div className="flex flex-col items-center opacity-85">
                  <div className="w-11 h-11 rounded-full bg-white/95 flex items-center justify-center border border-white/20 shadow-md overflow-hidden">
                    {runnerUp.logo_url ? <img src={runnerUp.logo_url} alt="" className="w-full h-full object-cover" /> : runnerUp.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-[9px] text-amber-100/90 font-extrabold mt-1.5 uppercase tracking-wider">Runner Up</span>
                  <span className="text-[10px] font-black text-white">{runnerUp.name}</span>
                </div>
              </div>

              <div className="space-y-1 mt-1 text-center">
                <p className="text-sm font-black text-yellow-50">{winningMargin}</p>
                <p className="text-[10px] text-amber-100 font-bold opacity-80">Venue: {finalMatch.venue} &bull; Date: {new Date(finalMatch.match_date).toLocaleDateString()}</p>
              </div>
            </div>
          </section>
        )}

        {/* 9. Bracket View Diagram */}
        <div className="grid grid-cols-1 lg:grid-cols-3 items-center gap-8 relative max-w-5xl mx-auto py-4">
          
          {/* Column 1: Semi Finals */}
          <div className="space-y-8 flex flex-col justify-center h-full">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-450 border-b border-slate-200 pb-2 flex items-center gap-1.5">
              <Users className="h-4 w-4 text-blue-650" /> Semi Finals
            </h3>
            
            {/* SF 1 Card */}
            <div className="relative group">
              {renderBracketCard('Semi Final 1', sf1)}
              {/* Connector lines (Desktop Only) */}
              <div className="hidden lg:block absolute -right-4 top-1/2 w-4 h-0.5 bg-slate-250 z-0" />
            </div>

            {/* SF 2 Card */}
            <div className="relative group">
              {renderBracketCard('Semi Final 2', sf2)}
              {/* Connector lines (Desktop Only) */}
              <div className="hidden lg:block absolute -right-4 top-1/2 w-4 h-0.5 bg-slate-250 z-0" />
            </div>
          </div>

          {/* Bracket Connector Center lines (Desktop Only) */}
          <div className="hidden lg:flex flex-col items-center justify-center h-full relative w-full h-[320px]">
            {/* Vertical connector line combining SF1 & SF2 to Final */}
            <div className="absolute left-0 top-[20%] bottom-[20%] w-0.5 bg-slate-250" />
            {/* Horizontal line extending to Final card */}
            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-250" />
          </div>

          {/* Column 3: Grand Final & Champion Preview */}
          <div className="space-y-8 flex flex-col justify-center h-full">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-450 border-b border-slate-200 pb-2 flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-amber-500 fill-amber-50" /> Grand Final
            </h3>

            <div className="relative group">
              {renderBracketCard('Grand Final', finalMatch, sf1Winner?.name || 'SF1 Winner', sf2Winner?.name || 'SF2 Winner')}
              
              {/* Champion connector line extending from Final (Desktop Only) */}
              {finalMatch && finalMatch.status === 'completed' && (
                <div className="hidden lg:block absolute -right-8 top-1/2 w-8 h-0.5 bg-amber-400 z-0" />
              )}
            </div>

            {/* Winner Spotlight card below if not showing champion card yet */}
            {finalMatch && finalMatch.status !== 'completed' && (
              <div className="bg-gradient-to-br from-slate-50 to-slate-100/80 rounded-3xl p-5 border border-slate-200 text-center shadow-inner">
                <Trophy className="h-6 w-6 text-slate-400 mx-auto mb-2" />
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Champion Trophy</p>
                <p className="text-xs text-slate-400 font-medium mt-1">Awaiting Final Match Outcome</p>
              </div>
            )}
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-450 py-12 w-full border-t border-gray-800 text-xs mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <p>&copy; 2026 KPL Cricket Tournament. All rights reserved. Professional live brackets.</p>
        </div>
      </footer>
    </div>
  )
}
