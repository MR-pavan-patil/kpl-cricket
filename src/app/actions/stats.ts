'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updatePlayerStats(playerId: string, formData: FormData) {
  const runsStr = formData.get('runs') as string
  const wicketsStr = formData.get('wickets') as string
  const foursStr = formData.get('fours') as string
  const sixesStr = formData.get('sixes') as string
  const matchesPlayedStr = formData.get('matches_played') as string

  const runs = parseInt(runsStr, 10)
  const wickets = parseInt(wicketsStr, 10)
  const fours = parseInt(foursStr, 10)
  const sixes = parseInt(sixesStr, 10)
  const matches_played = parseInt(matchesPlayedStr, 10)

  if (isNaN(runs) || isNaN(wickets) || isNaN(fours) || isNaN(sixes) || isNaN(matches_played)) {
    return { error: 'All stats must be valid integers.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('players')
    .update({
      runs,
      wickets,
      fours,
      sixes,
      matches_played,
    })
    .eq('id', playerId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/players')
  revalidatePath('/admin/teams')
  revalidatePath('/teams')
  revalidatePath('/stats')
  revalidatePath('/')
  return { success: true }
}
