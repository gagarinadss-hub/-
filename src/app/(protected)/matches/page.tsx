export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import type { Profile, Match } from '@/lib/types'
import MatchClient from './MatchClient'

export default async function MatchesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user!.id)
    .single()

  let matches: Match[] = []
  if (myProfile) {
    const { data } = await supabase
      .from('matches')
      .select(`
        *,
        profile_a:profiles!matches_user_a_id_fkey(*),
        profile_b:profiles!matches_user_b_id_fkey(*)
      `)
      .or(`user_a_id.eq.${myProfile.id},user_b_id.eq.${myProfile.id}`)
      .order('created_at', { ascending: false })
    matches = (data ?? []) as Match[]
  }

  // Count profiles in search (without active pending match)
  const { count: totalProfiles } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  const { count: activeMatchesCount } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  const searchersCount = Math.max(0, (totalProfiles ?? 0) - (activeMatchesCount ?? 0) * 2)

  return (
    <MatchClient
      myProfile={myProfile as Profile | null}
      matches={matches}
      searchersCount={searchersCount}
    />
  )
}
