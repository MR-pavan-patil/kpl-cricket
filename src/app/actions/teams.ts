'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createTeam(formData: FormData) {
  const name = formData.get('name') as string
  const logo_url = formData.get('logo_url') as string
  const captain_name = formData.get('captain_name') as string

  if (!name || !captain_name) {
    return { error: 'Team name and captain name are required.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('teams').insert({
    name,
    logo_url: logo_url || null,
    captain_name,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/teams')
  revalidatePath('/teams')
  revalidatePath('/')
  return { success: true }
}

export async function updateTeam(id: string, formData: FormData) {
  const name = formData.get('name') as string
  const logo_url = formData.get('logo_url') as string
  const captain_name = formData.get('captain_name') as string

  if (!name || !captain_name) {
    return { error: 'Team name and captain name are required.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('teams')
    .update({
      name,
      logo_url: logo_url || null,
      captain_name,
    })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/teams')
  revalidatePath('/teams')
  revalidatePath('/')
  return { success: true }
}

export async function deleteTeam(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('teams').delete().eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/teams')
  revalidatePath('/teams')
  revalidatePath('/')
  return { success: true }
}
