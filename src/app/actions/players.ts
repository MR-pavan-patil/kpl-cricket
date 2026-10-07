'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createPlayer(formData: FormData) {
  const name = formData.get('name') as string
  const raw_team_id = formData.get('team_id') as string | null
  const team_id = raw_team_id && raw_team_id !== 'none' && raw_team_id.trim() !== '' ? raw_team_id : null
  const role = formData.get('role') as string
  const jersey_number_str = formData.get('jersey_number') as string

  if (!name || !role || !jersey_number_str) {
    return { error: 'Name, role, and jersey number are required.' }
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
  const raw_team_id = formData.get('team_id') as string | null
  const team_id = raw_team_id && raw_team_id !== 'none' && raw_team_id.trim() !== '' ? raw_team_id : null
  const role = formData.get('role') as string
  const jersey_number_str = formData.get('jersey_number') as string

  if (!name || !role || !jersey_number_str) {
    return { error: 'Name, role, and jersey number are required.' }
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

// Safely release a player from a team without deleting any data or stats
export async function releasePlayerFromTeam(playerId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('players')
    .update({ team_id: null })
    .eq('id', playerId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/players')
  revalidatePath('/admin/teams')
  revalidatePath('/teams')
  revalidatePath('/')
  return { success: true, message: 'Player successfully released to free agents pool. All historical stats preserved.' }
}

// Transfer a player to a new team
export async function transferPlayer(playerId: string, newTeamId: string | null) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('players')
    .update({ team_id: newTeamId && newTeamId !== 'none' ? newTeamId : null })
    .eq('id', playerId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/players')
  revalidatePath('/admin/teams')
  revalidatePath('/teams')
  revalidatePath('/')
  return { success: true }
}

// Assign an unassigned player to a team
export async function assignPlayerToTeam(playerId: string, teamId: string) {
  return transferPlayer(playerId, teamId)
}

// Smart Delete: protects historical stats from being deleted
export async function deletePlayer(id: string) {
  const supabase = await createClient()

  // Check if player has match history in match_players
  const { data: matchHistory } = await supabase
    .from('match_players')
    .select('id')
    .eq('player_id', id)
    .limit(1)

  // Also check if player has any recorded stats
  const { data: playerInfo } = await supabase
    .from('players')
    .select('runs, wickets, matches_played, name')
    .eq('id', id)
    .single()

  const hasStats = playerInfo && (
    (playerInfo.runs ?? 0) > 0 ||
    (playerInfo.wickets ?? 0) > 0 ||
    (playerInfo.matches_played ?? 0) > 0
  )

  if ((matchHistory && matchHistory.length > 0) || hasStats) {
    // DO NOT DELETE from DB - simply release from the team so Season 1 stats and scorecards are preserved!
    const { error: updateError } = await supabase
      .from('players')
      .update({ team_id: null, is_active: false })
      .eq('id', id)

    if (updateError) {
      return { error: updateError.message }
    }

    revalidatePath('/admin/players')
    revalidatePath('/admin/teams')
    revalidatePath('/teams')
    revalidatePath('/')
    return {
      success: true,
      preserved: true,
      message: `Player "${playerInfo?.name || 'Player'}" has match records from previous matches. To protect tournament history and scorecards, they have been released from the squad instead of permanently deleted.`
    }
  }

  // Safe to permanently delete only if player has never played any match
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
