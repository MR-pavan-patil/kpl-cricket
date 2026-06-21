'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { recalculateAllPlayerStats } from './matchEngine'

export async function createMatch(formData: FormData) {
  const team1_id = formData.get('team1_id') as string
  const team2_id = formData.get('team2_id') as string
  const match_date = formData.get('match_date') as string
  const venue = formData.get('venue') as string
  const status = formData.get('status') as string
  const stage = formData.get('stage') as string || 'league'

  if (!team1_id || !team2_id || !match_date || !venue || !status) {
    return { error: 'All fields are required.' }
  }

  if (team1_id === team2_id) {
    return { error: 'Team 1 and Team 2 cannot be the same team.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('matches').insert({
    team1_id,
    team2_id,
    match_date,
    venue,
    status,
    stage,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/matches')
  revalidatePath('/schedule')
  revalidatePath('/stats')
  revalidatePath('/bracket')
  revalidatePath('/')
  return { success: true }
}

export async function updateMatch(id: string, formData: FormData) {
  const team1_id = formData.get('team1_id') as string
  const team2_id = formData.get('team2_id') as string
  const match_date = formData.get('match_date') as string
  const venue = formData.get('venue') as string
  const status = formData.get('status') as string
  const winner_id = formData.get('winner_id') as string
  const result_desc = formData.get('result_desc') as string
  const stage = formData.get('stage') as string || 'league'
  const result_type = formData.get('result_type') as string || null
  const match_abandon_reason = formData.get('match_abandon_reason') as string || null

  if (!team1_id || !team2_id || !match_date || !venue || !status) {
    return { error: 'All fields are required.' }
  }

  if (team1_id === team2_id) {
    return { error: 'Team A and Team B cannot be the same team.' }
  }

  let updatedWinnerId = winner_id || null
  let updatedResultDesc = result_desc || null

  if (status === 'completed') {
    if (result_type === 'no_result') {
      updatedWinnerId = null
      updatedResultDesc = `No Result (${match_abandon_reason || 'Abandoned'})`
    } else if (result_type === 'tie') {
      updatedWinnerId = null
      updatedResultDesc = 'Match Tied'
    }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('matches')
    .update({
      team1_id,
      team2_id,
      match_date,
      venue,
      status,
      winner_id: updatedWinnerId,
      result_desc: updatedResultDesc,
      stage,
      result_type,
      match_abandon_reason: result_type === 'no_result' ? match_abandon_reason : null,
    })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  // Recalculate player stats if match is completed
  if (status === 'completed') {
    await recalculateAllPlayerStats()
  }

  // Knockout progression check
  if (status === 'completed' && updatedWinnerId) {
    if (stage === 'semi_final_1' || stage === 'semi_final_2') {
      const { data: finalMatches } = await supabase
        .from('matches')
        .select('*')
        .eq('stage', 'final')
      if (finalMatches && finalMatches.length > 0) {
        const finalMatch = finalMatches[0]
        const updateField = stage === 'semi_final_1' ? { team1_id: updatedWinnerId } : { team2_id: updatedWinnerId }
        await supabase.from('matches').update(updateField).eq('id', finalMatch.id)
      }
    }
  }

  revalidatePath('/admin/matches')
  revalidatePath('/schedule')
  revalidatePath(`/matches/${id}`)
  revalidatePath('/stats')
  revalidatePath('/bracket')
  revalidatePath('/')
  return { success: true }
}

export async function deleteMatch(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('matches').delete().eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/matches')
  revalidatePath('/schedule')
  revalidatePath('/stats')
  revalidatePath('/bracket')
  revalidatePath('/')
  return { success: true }
}
