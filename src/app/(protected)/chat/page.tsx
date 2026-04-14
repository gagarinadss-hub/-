export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Profile } from '@/lib/types'
import { Avatar } from '@/components/ProfileCard'
import { MessageCircle, Heart } from 'lucide-react'

export default async function ChatListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user!.id)
    .single()

  if (!myProfile) {
    return (
      <div className="text-center py-16">
        <p className="text-[var(--text-2)]">Создай профиль, чтобы общаться с участниками</p>
        <Link href="/profile"
          className="inline-flex mt-4 px-5 py-2.5 bg-[var(--text)] text-white rounded-xl text-sm font-bold hover:opacity-80">
          Создать профиль
        </Link>
      </div>
    )
  }

  // ── Single query: matches + both profiles ──────────────────────────────────
  const { data: matches } = await supabase
    .from('matches')
    .select(`
      id, status, created_at,
      profile_a:profiles!matches_user_a_id_fkey(*),
      profile_b:profiles!matches_user_b_id_fkey(*)
    `)
    .or(`user_a_id.eq.${myProfile.id},user_b_id.eq.${myProfile.id}`)
    .order('created_at', { ascending: false })

  const allMatches = matches ?? []
  const matchIds = allMatches.map((m) => m.id)

  // ── 2 bulk queries instead of 2*N ──────────────────────────────────────────
  // Last message per match (via RPC or filter — use subquery via raw SQL isn't available,
  // so we fetch all recent messages in one call and group client-side)
  const [{ data: recentMsgs }, { data: unreadMsgs }] = await Promise.all([
    matchIds.length
      ? supabase
          .from('messages')
          .select('match_id, message_text, created_at, sender_id')
          .in('match_id', matchIds)
          .order('created_at', { ascending: false })
          .limit(matchIds.length * 5) // at most 5 recent per match is enough
      : Promise.resolve({ data: [] }),

    matchIds.length
      ? supabase
          .from('messages')
          .select('match_id, sender_id')
          .in('match_id', matchIds)
          .neq('sender_id', myProfile.id)
          .eq('is_read', false)
      : Promise.resolve({ data: [] }),
  ])

  // Build lookup maps
  type ConvData = { lastMsg: string | null; lastAt: string | null; unread: number }
  const convData: Record<string, ConvData> = {}

  // Initialize all matches
  for (const m of allMatches) {
    convData[m.id] = { lastMsg: null, lastAt: null, unread: 0 }
  }

  // Last message per match (already sorted desc, first occurrence = latest)
  const seenMatch = new Set<string>()
  for (const msg of recentMsgs ?? []) {
    if (!seenMatch.has(msg.match_id)) {
      seenMatch.add(msg.match_id)
      convData[msg.match_id].lastMsg = msg.message_text
      convData[msg.match_id].lastAt  = msg.created_at
    }
  }

  // Unread count per match
  for (const msg of unreadMsgs ?? []) {
    if (convData[msg.match_id] !== undefined) {
      convData[msg.match_id].unread += 1
    }
  }

  function getPartner(match: typeof allMatches[0]): Profile | null {
    const m = match as unknown as { profile_a: Profile; profile_b: Profile }
    if (m.profile_a?.id === myProfile!.id) return m.profile_b ?? null
    return m.profile_a ?? null
  }

  const conversations = allMatches
    .map((m) => ({ match: m, partner: getPartner(m), data: convData[m.id] }))
    .filter((c) => c.partner !== null)
    .sort((a, b) => {
      const ta = a.data.lastAt ?? a.match.created_at
      const tb = b.data.lastAt ?? b.match.created_at
      return new Date(tb).getTime() - new Date(ta).getTime()
    })

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center gap-4 rk-fade-up">
        <div className="w-12 h-12 rounded-2xl bg-[var(--accent)] flex items-center justify-center shrink-0">
          <MessageCircle size={20} className="text-[var(--text)]" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-[var(--text)]">Сообщения</h1>
          <p className="text-sm text-[var(--text-2)]">Переписка с твоими парами</p>
        </div>
      </div>

      {conversations.length === 0 ? (
        <div className="rk-fade-up-1 bg-[var(--surface)] rounded-2xl border-2 border-dashed border-[var(--border)] p-12 text-center">
          <div className="w-16 h-16 bg-[var(--accent)] rounded-2xl flex items-center justify-center mx-auto mb-5">
            <MessageCircle size={28} className="text-[var(--text)]" aria-hidden="true" />
          </div>
          <h2 className="font-black text-[var(--text)] text-xl mb-2">Нет активных диалогов</h2>
          <p className="text-[var(--text-2)] text-sm mb-6 leading-relaxed">
            Найди пару, чтобы начать общаться внутри платформы
          </p>
          <Link href="/matches"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--text)] text-white rounded-xl text-sm font-black hover:opacity-80 rk-btn"
          >
            <Heart size={14} aria-hidden="true" /> Найти пару
          </Link>
        </div>
      ) : (
        <div className="space-y-2 rk-fade-up-1">
          {conversations.map(({ match, partner, data }, idx) => {
            const hasUnread = data.unread > 0
            return (
              <Link
                key={match.id}
                href={`/chat/${match.id}`}
                aria-label={`Чат с ${partner!.full_name}${hasUnread ? `, ${data.unread} непрочитанных` : ''}`}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all rk-card rk-fade-up ${
                  hasUnread
                    ? 'bg-[var(--accent-light)] border-[var(--accent)]/40 shadow-sm'
                    : 'bg-[var(--surface)] border-[var(--border)]'
                }`}
                style={{ animationDelay: `${idx * 0.04}s` }}
              >
                <div className="relative shrink-0">
                  <Avatar name={partner!.full_name} avatarUrl={partner!.avatar_url} size="sm" />
                  {hasUnread && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center"
                      aria-label={`${data.unread} непрочитанных`}>
                      {data.unread}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className={`text-sm truncate ${hasUnread ? 'font-black text-[var(--text)]' : 'font-bold text-[var(--text)]'}`}>
                      {partner!.full_name}
                    </p>
                    {data.lastAt && (
                      <p className="text-[10px] text-[var(--text-3)] shrink-0 ml-2">
                        {new Date(data.lastAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </p>
                    )}
                  </div>
                  <p className={`text-xs truncate ${hasUnread ? 'text-[var(--text-2)] font-semibold' : 'text-[var(--text-3)]'}`}>
                    {data.lastMsg ?? (partner!.profession ?? 'Новый диалог')}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
