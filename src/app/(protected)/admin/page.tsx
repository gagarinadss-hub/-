export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import AdminClient from './AdminClient'
import type { Profile, Announcement, Event } from '@/lib/types'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user!.id)
    .single()

  const [
    { data: announcements },
    { data: events },
    { data: profiles },
    { data: meetings },
    { count: matchCount },
  ] = await Promise.all([
    supabase.from('announcements').select('*').order('created_at', { ascending: false }),
    supabase.from('events').select('*').order('event_date', { ascending: true }),
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('meetings').select('proposed_by'),
    supabase.from('matches').select('*', { count: 'exact', head: true }),
  ])

  const meetingCounts: Record<string, number> = {}
  ;(meetings ?? []).forEach((m: { proposed_by: string }) => {
    meetingCounts[m.proposed_by] = (meetingCounts[m.proposed_by] ?? 0) + 1
  })

  return (
    <AdminClient
      myProfile={myProfile as Profile}
      announcements={(announcements ?? []) as Announcement[]}
      events={(events ?? []) as Event[]}
      profiles={(profiles ?? []) as Profile[]}
      meetingCounts={meetingCounts}
      totalMatches={matchCount ?? 0}
    />
  )
}
