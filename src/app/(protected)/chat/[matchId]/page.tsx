export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import type { Profile, Message } from '@/lib/types'
import ChatWindow from '@/components/ChatWindow'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

type Props = { params: Promise<{ matchId: string }> }

export default async function ChatPage({ params }: Props) {
  const { matchId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user!.id)
    .single()

  if (!myProfile) redirect('/profile')

  // Verify user is a participant & load partner profile
  const { data: match } = await supabase
    .from('matches')
    .select(`
      id, status, user_a_id, user_b_id,
      profile_a:profiles!matches_user_a_id_fkey(*),
      profile_b:profiles!matches_user_b_id_fkey(*)
    `)
    .eq('id', matchId)
    .single()

  if (!match) notFound()

  const matchTyped = match as unknown as {
    user_a_id: string
    user_b_id: string
    profile_a: Profile
    profile_b: Profile
  }

  const isParticipant =
    matchTyped.profile_a?.id === myProfile.id ||
    matchTyped.profile_b?.id === myProfile.id

  if (!isParticipant) notFound()

  const partner: Profile =
    matchTyped.profile_a?.id === myProfile.id
      ? matchTyped.profile_b
      : matchTyped.profile_a

  // Load messages
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true })

  return (
    <div className="space-y-3 rk-fade-up">
      <Link href="/chat"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-2)] hover:text-[var(--text)] transition-colors font-medium">
        <ArrowLeft size={15} /> Все диалоги
      </Link>

      <ChatWindow
        matchId={matchId}
        myProfile={myProfile as Profile}
        partner={partner}
        initialMessages={(messages ?? []) as Message[]}
      />
    </div>
  )
}
