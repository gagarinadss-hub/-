export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NotificationProvider } from '@/contexts/NotificationContext'
import Navbar from '@/components/Navbar'

// Protected routes — exclude from search engines
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  let isAdmin              = false
  let profileId: string | null = null
  let unreadMessages       = 0
  let unreadNotifications  = 0

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, is_admin, full_name, avatar_url')
    .eq('user_id', user.id)
    .single()

  if (profile) {
    isAdmin   = profile.is_admin  ?? false
    profileId = profile.id        ?? null

    // Run counts in parallel — not sequentially
    const [matchResult, notifResult] = await Promise.all([
      supabase
        .from('matches')
        .select('id')
        .or(`user_a_id.eq.${profile.id},user_b_id.eq.${profile.id}`)
        .eq('status', 'pending'),
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false),
    ])

    if (matchResult.data && matchResult.data.length > 0) {
      const matchIds = matchResult.data.map((m) => m.id)
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('match_id', matchIds)
        .neq('sender_id', profile.id)
        .eq('is_read', false)
      unreadMessages = count ?? 0
    }

    unreadNotifications = notifResult.count ?? 0
  }

  return (
    <NotificationProvider
      initialMsg={unreadMessages}
      initialNotif={unreadNotifications}
      profileId={profileId}
      userId={user.id}
    >
      <div className="min-h-dvh bg-[var(--bg)]">
        <Navbar isAdmin={isAdmin} userName={profile?.full_name ?? null} userAvatar={profile?.avatar_url ?? null} />
        <main className="rk-main py-6 pb-28 lg:pb-10 min-h-dvh">
          <div className="rk-content">
            {children}
          </div>
        </main>
      </div>
    </NotificationProvider>
  )
}
