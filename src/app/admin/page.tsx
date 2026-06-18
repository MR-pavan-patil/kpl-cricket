import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { 
  Trophy, 
  Users, 
  Calendar, 
  Plus, 
  ExternalLink, 
  Activity, 
  ShieldCheck, 
  ArrowRight, 
  Settings, 
  Sparkles, 
  Clock, 
  Award,
  Play
} from 'lucide-react'
import { Team, Match } from '@/types'

export const revalidate = 0

export default async function AdminDashboard() {
  let teamsCount = 0
  let playersCount = 0
  let matchesCount = 0
  let liveMatchesCount = 0
  let finishedCount = 0
  let upcomingMatches: Match[] = []
  let liveMatches: Match[] = []

  try {
    const supabase = await createClient()

    // Query stats
    const { count: tc } = await supabase.from('teams').select('*', { count: 'exact', head: true })
    teamsCount = tc || 0

    const { count: pc } = await supabase.from('players').select('*', { count: 'exact', head: true })
    playersCount = pc || 0

    const { count: mc } = await supabase.from('matches').select('*', { count: 'exact', head: true })
    matchesCount = mc || 0

    const { count: lmc } = await supabase.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'live')
    liveMatchesCount = lmc || 0

    const { count: cc } = await supabase.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'completed')
    finishedCount = cc || 0

    // Fetch next few upcoming matches
    const { data: upcomingData } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'upcoming')
      .order('match_date', { ascending: true })
      .limit(3)

    const rawUpcoming = upcomingData || []

    // Fetch live matches
    const { data: liveData } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'live')

    const rawLive = liveData || []

    // Fetch teams to map names
    const { data: teamsData } = await supabase.from('teams').select('id, name, logo_url')
    const teamsList = teamsData || []

    upcomingMatches = rawUpcoming.map((m: any) => ({
      ...m,
      team1: teamsList.find((t) => t.id === m.team1_id),
      team2: teamsList.find((t) => t.id === m.team2_id),
    }))

    liveMatches = rawLive.map((m: any) => ({
      ...m,
      team1: teamsList.find((t) => t.id === m.team1_id),
      team2: teamsList.find((t) => t.id === m.team2_id),
    }))
  } catch (err) {
    console.error('Failed to load dashboard data:', err)
  }

  // Calculate progress
  const completionRate = matchesCount > 0 ? Math.round((finishedCount / matchesCount) * 100) : 0

  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* 1. Header welcome banner */}
      <section className="bg-gradient-to-r from-blue-600 via-indigo-650 to-blue-700 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-md">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:2.5rem_2.5rem]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_60%)]" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-blue-100 text-[10px] font-bold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" /> League Controller Dashboard
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Welcome Back, Administrator
            </h1>
            <p className="text-blue-100/80 text-xs sm:text-sm max-w-xl font-medium">
              Oversee squads, construct match schedules, and log live ball-by-ball actions. Current local schedule matches are active.
            </p>
          </div>
          
          <div className="flex gap-3">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all border border-white/15"
            >
              Public Site <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 2. LIVE MATCH ALERTS (High Visibility Dashboard Widget) */}
      {liveMatches.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
            Live Match Monitor
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {liveMatches.map((m) => (
              <div 
                key={m.id} 
                className="bg-white rounded-3xl border border-red-200 shadow-md p-6 flex flex-col justify-between gap-5 relative overflow-hidden group hover:border-red-300 hover:shadow-lg transition-all duration-300"
              >
                {/* Red pulse glow border */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-500" />
                
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-2 py-0.5 rounded bg-red-50 text-red-650 border border-red-150 text-[9px] font-black uppercase tracking-wider">
                      Live Scoring
                    </span>
                    <p className="text-[10px] text-slate-500 font-bold mt-1.5">{m.venue}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Innings {m.innings_number}</span>
                  </div>
                </div>

                {/* Score Summary */}
                <div className="flex items-center justify-between py-1">
                  <div className="space-y-1">
                    <p className="text-sm font-black text-slate-850 flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-slate-50 border border-slate-200 flex items-center justify-center font-bold text-[8px] overflow-hidden flex-shrink-0">
                        {m.team1?.logo_url ? <img src={m.team1.logo_url} className="w-full h-full object-cover" /> : m.team1?.name.slice(0,2).toUpperCase()}
                      </div>
                      <span>{m.team1?.name}</span>
                    </p>
                    <p className="text-sm font-black text-slate-850 flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-slate-50 border border-slate-200 flex items-center justify-center font-bold text-[8px] overflow-hidden flex-shrink-0">
                        {m.team2?.logo_url ? <img src={m.team2.logo_url} className="w-full h-full object-cover" /> : m.team2?.name.slice(0,2).toUpperCase()}
                      </div>
                      <span>{m.team2?.name}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-slate-900">
                      {m.current_batting_team_id === m.team1_id ? `${m.team1_runs}/${m.team1_wickets}` : `${m.team2_runs}/${m.team2_wickets}`}
                    </p>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                      Overs: {m.current_batting_team_id === m.team1_id ? `${Math.floor(m.team1_balls/6)}.${m.team1_balls%6}` : `${Math.floor(m.team2_balls/6)}.${m.team2_balls%6}`}
                    </p>
                  </div>
                </div>

                {/* scoring CTA */}
                <Link
                  href={`/admin/scoring/${m.id}`}
                  className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <Play className="h-3.5 w-3.5 fill-current" /> Resume Live Scoring Desk
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Grid Stats Analytics */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-fade-in-up">
        {/* Stat Item */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:border-blue-500/10 hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Teams</span>
            <span className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100"><Users className="h-4.5 w-4.5" /></span>
          </div>
          <h3 className="text-3xl font-black text-slate-900 mt-3">{teamsCount}</h3>
          <p className="text-xs text-slate-400 font-semibold mt-1">Registered participating squads</p>
        </div>

        {/* Stat Item */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:border-blue-500/10 hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Registered Players</span>
            <span className="p-2.5 rounded-xl bg-indigo-50 text-indigo-650 border border-indigo-100"><Award className="h-4.5 w-4.5" /></span>
          </div>
          <h3 className="text-3xl font-black text-slate-900 mt-3">{playersCount}</h3>
          <p className="text-xs text-slate-400 font-semibold mt-1">Total squad roster count</p>
        </div>

        {/* Stat Item */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:border-blue-500/10 hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Matches</span>
            <span className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100"><Calendar className="h-4.5 w-4.5" /></span>
          </div>
          <h3 className="text-3xl font-black text-slate-900 mt-3">{matchesCount}</h3>
          <p className="text-xs text-slate-400 font-semibold mt-1">Fixtures in the database</p>
        </div>

        {/* Stat Item */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:border-blue-500/10 hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Live Matches</span>
            <span className="p-2.5 rounded-xl bg-red-50 text-red-650 border border-red-100"><Activity className="h-4.5 w-4.5 animate-pulse" /></span>
          </div>
          <h3 className="text-3xl font-black text-slate-900 mt-3">{liveMatchesCount}</h3>
          <p className="text-xs text-slate-400 font-semibold mt-1">Active matches currently playing</p>
        </div>
      </section>

      {/* 4. Main Columns Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Quick Actions & Progress */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* Quick Management Panel */}
          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-905 flex items-center gap-2">
              <Settings className="w-4 h-4 text-blue-600" /> Quick Management
            </h3>
            <p className="text-xs text-slate-500 font-medium">Perform direct database operations on cricket tournament entities.</p>
            <div className="space-y-3 pt-2">
              <Link
                href="/admin/teams"
                className="flex justify-between items-center w-full px-4 py-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 hover:text-slate-900 transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2.5"><Users className="h-4 w-4 text-blue-650" /> Manage Teams</span>
                <Plus className="h-4 w-4 text-slate-400 font-bold" />
              </Link>
              <Link
                href="/admin/players"
                className="flex justify-between items-center w-full px-4 py-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 hover:text-slate-900 transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2.5"><Trophy className="h-4 w-4 text-blue-650" /> Manage Players</span>
                <Plus className="h-4 w-4 text-slate-400 font-bold" />
              </Link>
              <Link
                href="/admin/matches"
                className="flex justify-between items-center w-full px-4 py-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 hover:text-slate-900 transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2.5"><Calendar className="h-4 w-4 text-blue-650" /> Manage Matches</span>
                <Plus className="h-4 w-4 text-slate-400" />
              </Link>
            </div>
          </section>

          {/* Tournament Progress Bar */}
          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Tournament Progress</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-extrabold">
                <span className="text-slate-500">Completed Matches</span>
                <span className="text-slate-900">{finishedCount} / {matchesCount}</span>
              </div>
              
              {/* Visual Progress Bar */}
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 font-semibold text-right">{completionRate}% finished</p>
            </div>
          </section>
        </div>

        {/* Right Col (2 cols): Upcoming Fixtures */}
        <section className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-4.5 h-4.5 text-blue-600" /> Upcoming Matches
            </h3>
            <Link href="/admin/matches" className="text-xs text-blue-600 hover:text-blue-500 font-extrabold flex items-center gap-1 transition-colors">
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="space-y-4">
            {upcomingMatches.length === 0 ? (
              <div className="text-center py-12 text-slate-500 italic text-xs font-medium">
                No upcoming fixtures scheduled.
              </div>
            ) : (
              upcomingMatches.map((m) => (
                <div 
                  key={m.id} 
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 rounded-2xl bg-slate-50/50 border border-slate-200 hover:border-slate-300 transition-colors gap-4"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-white border border-slate-200 flex items-center justify-center font-bold text-[8px] overflow-hidden">
                        {m.team1?.logo_url ? <img src={m.team1.logo_url} className="w-full h-full object-cover" /> : m.team1?.name.slice(0,2).toUpperCase()}
                      </span>
                      {m.team1?.name}
                      <span className="text-slate-400 font-normal text-xs">vs</span>
                      <span className="w-5 h-5 rounded bg-white border border-slate-200 flex items-center justify-center font-bold text-[8px] overflow-hidden">
                        {m.team2?.logo_url ? <img src={m.team2.logo_url} className="w-full h-full object-cover" /> : m.team2?.name.slice(0,2).toUpperCase()}
                      </span>
                      {m.team2?.name}
                    </p>
                    <p className="text-[10px] text-slate-500 font-semibold">
                      {new Date(m.match_date).toLocaleString()} &bull; {m.venue}
                    </p>
                  </div>
                  
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Link
                      href={`/admin/matches/${m.id}/setup`}
                      className="flex-1 sm:flex-initial px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-250 rounded-xl text-[10px] font-black uppercase text-slate-700 text-center transition-colors"
                    >
                      XI Squad Setup
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
