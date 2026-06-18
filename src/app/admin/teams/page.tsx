import { createClient } from '@/utils/supabase/server'
import TeamsManager from '@/components/admin/TeamsManager'
import { Users } from 'lucide-react'

export const revalidate = 0

export default async function AdminTeamsPage() {
  let teams: any[] = []

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('teams')
      .select('*, players(*)')
      .order('created_at', { ascending: false })
    teams = data || []
  } catch (err) {
    console.error('Failed to load teams for admin:', err)
  }

  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <Users className="h-8 w-8 text-blue-650" />
          Manage Teams
        </h1>
        <p className="text-slate-505 text-sm mt-1 font-medium">
          Create, edit, and delete participating cricket tournament teams.
        </p>
      </div>

      <TeamsManager initialTeams={teams} />
    </main>
  )
}
