'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createPlayer(formData: FormData) {
  const name = formData.get('name') as string
  const team_id = formData.get('team_id') as string
  const role = formData.get('role') as string
  const jersey_number_str = formData.get('jersey_number') as string

  if (!name || !team_id || !role || !jersey_number_str) {
    return { error: 'Name, team, role, and jersey number are required.' }
  }

  const jersey_number = parseInt(jersey_number_str, 10)
  if (isNaN(jersey_number)) {
    return { error: 'Jersey number must be a valid number.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('players').insert({
    name,
    team_id,
    role,
    jersey_number,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/players')
  revalidatePath('/admin/teams')
  revalidatePath('/teams')
  revalidatePath('/')
  return { success: true }
}

export async function updatePlayer(id: string, formData: FormData) {
  const name = formData.get('name') as string
  const team_id = formData.get('team_id') as string
  const role = formData.get('role') as string
  const jersey_number_str = formData.get('jersey_number') as string

  if (!name || !team_id || !role || !jersey_number_str) {
    return { error: 'Name, team, role, and jersey number are required.' }
  }

  const jersey_number = parseInt(jersey_number_str, 10)
  if (isNaN(jersey_number)) {
    return { error: 'Jersey number must be a valid number.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('players')
    .update({
      name,
      team_id,
      role,
      jersey_number,
    })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/players')
  revalidatePath('/admin/teams')
  revalidatePath('/teams')
  revalidatePath('/')
  return { success: true }
}

export async function deletePlayer(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('players').delete().eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/players')
  revalidatePath('/admin/teams')
  revalidatePath('/teams')
  revalidatePath('/')
  return { success: true }
}
