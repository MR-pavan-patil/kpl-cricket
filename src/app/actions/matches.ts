'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createMatch(formData: FormData) {
  const team1_id = formData.get('team1_id') as string
  const team2_id = formData.get('team2_id') as string
  const match_date = formData.get('match_date') as string
  const venue = formData.get('venue') as string
  const status = formData.get('status') as string

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
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/matches')
  revalidatePath('/schedule')
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

  if (!team1_id || !team2_id || !match_date || !venue || !status) {
    return { error: 'All fields are required.' }
  }

  if (team1_id === team2_id) {
    return { error: 'Team A and Team B cannot be the same team.' }
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
      winner_id: winner_id || null,
      result_desc: result_desc || null,
    })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/matches')
  revalidatePath('/schedule')
  revalidatePath(`/matches/${id}`)
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
  revalidatePath('/')
  return { success: true }
}
