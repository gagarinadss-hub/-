export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'История встреч',
  description: 'Все завершённые знакомства и отзывы о встречах.',
}
import type { Profile, Meeting, MeetingFeedback } from '@/lib/types'
import { Avatar } from '@/components/ProfileCard'
import Link from 'next/link'
import { Clock, Coffee, Shuffle } from 'lucide-react'

type MeetingRow = Meeting & {
  match: {
    user_a_id: string
    user_b_id: string
    profile_a: Profile
    profile_b: Profile
  }
  feedback: MeetingFeedback[]
}

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user!.id)
    .single()

  let meetings: MeetingRow[] = []

  if (myProfile) {
    // Get matches for this user
    const { data: myMatchIds } = await supabase
      .from('matches')
      .select('id')
      .or(`user_a_id.eq.${myProfile.id},user_b_id.eq.${myProfile.id}`)

    const matchIds = (myMatchIds ?? []).map((m) => m.id)

    if (matchIds.length > 0) {
      const { data: meetingData } = await supabase
        .from('meetings')
        .select(`
          *,
          match:matches(
            user_a_id, user_b_id,
            profile_a:profiles!matches_user_a_id_fkey(*),
            profile_b:profiles!matches_user_b_id_fkey(*)
          ),
          feedback:meeting_feedback(*)
        `)
        .in('match_id', matchIds)
        .order('created_at', { ascending: false })

      meetings = (meetingData ?? []) as MeetingRow[]
    }
  }

  function getPartner(m: MeetingRow): Profile | null {
    if (!m.match) return null
    return m.match.profile_a?.id === myProfile?.id
      ? m.match.profile_b
      : m.match.profile_a
  }

  function getMyFeedback(m: MeetingRow): MeetingFeedback | null {
    return m.feedback?.find((f) => f.user_id === myProfile?.id) ?? null
  }

  const formatLabel = (fmt: string | null) =>
    fmt === 'online' ? '💻 Онлайн' : fmt === 'offline' ? '☕ Оффлайн' : null

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center gap-4 rk-fade-up">
        <div className="w-12 h-12 rounded-2xl bg-[var(--accent)] flex items-center justify-center shrink-0">
          <Clock size={20} className="text-[var(--text)]" />
        </div>
        <div>
          <h1 className="text-[28px] font-bold text-[var(--text)] tracking-tight">История встреч</h1>
          <p className="text-sm text-[var(--text-2)]">
            {meetings.length > 0
              ? `${meetings.length} ${meetings.length === 1 ? 'встреча' : meetings.length < 5 ? 'встречи' : 'встреч'} проведено`
              : 'Твои встречи будут здесь'}
          </p>
        </div>
      </div>

      {meetings.length === 0 ? (
        <div className="rk-fade-up-1 glass rounded-2xl border-2 border-dashed border-white/25 p-12 text-center">
          <div className="w-16 h-16 bg-[var(--accent)] rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Coffee size={28} className="text-[var(--text)]" />
          </div>
          <h2 className="font-black text-[var(--text)] text-xl mb-2">Ещё нет встреч</h2>
          <p className="text-[var(--text-2)] text-sm mb-1 leading-relaxed">
            Найди пару и проведи первую кофе-встречу!
          </p>
          <p className="text-[var(--text-3)] text-xs mb-6">30 минут — и новый человек в жизни ☕</p>
          <Link href="/matches"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] text-[var(--text)] rounded-xl text-sm font-black hover:bg-[var(--accent-dark)] transition-colors rk-btn"
          >
            <Shuffle size={14} /> Найти собеседника
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting, idx) => {
            const partner  = myProfile ? getPartner(meeting) : null
            const feedback = myProfile ? getMyFeedback(meeting) : null

            return (
              <div
                key={meeting.id}
                className="glass rounded-2xl p-5 rk-card rk-fade-up"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                {/* Partner info */}
                <div className="flex items-center gap-3">
                  {partner ? (
                    <Avatar name={partner.full_name} avatarUrl={partner.avatar_url} size="sm" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[var(--surface-2)] shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-[var(--text)]">
                      {partner?.full_name ?? 'Участник'}
                    </p>
                    <p className="text-sm text-[var(--text-2)] truncate">
                      {partner?.profession ?? ''}
                      {partner?.city ? ` · ${partner.city}` : ''}
                    </p>
                  </div>
                  {meeting.scheduled_at && (
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-[var(--text)]">
                        {new Date(meeting.scheduled_at).toLocaleDateString('ru-RU', {
                          day: 'numeric', month: 'short',
                        })}
                      </p>
                      <p className="text-xs text-[var(--text-3)]">
                        {new Date(meeting.scheduled_at).getFullYear()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Meeting details */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {meeting.format && formatLabel(meeting.format) && (
                    <span className="text-xs px-3 py-1 rounded-full bg-[var(--surface-2)] text-[var(--text-2)] font-semibold border border-[var(--border)]">
                      {formatLabel(meeting.format)}
                    </span>
                  )}
                  {meeting.status === 'completed' && (
                    <span className="text-xs px-3 py-1 rounded-full bg-green-100/80 text-green-700 font-semibold border border-green-200/60">
                      ✅ Состоялась
                    </span>
                  )}
                  {feedback?.rating && (
                    <span className="text-xs px-3 py-1 rounded-full bg-[var(--accent-light)] text-[var(--text)] font-bold border border-[var(--accent)]/30">
                      {'⭐'.repeat(feedback.rating)} {feedback.rating}/5
                    </span>
                  )}
                  {feedback?.want_again !== undefined && feedback?.want_again !== null && (
                    <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${
                      feedback.want_again
                        ? 'bg-green-500/20 text-green-100 border-green-400/30'
                        : 'bg-white/20 text-[var(--text-3)] border-[var(--border)]'
                    }`}>
                      {feedback.want_again ? '👍 Хочет встретиться снова' : '🔄 Попробует с другим'}
                    </span>
                  )}
                </div>

                {/* Comment */}
                {feedback?.comment && (
                  <p className="mt-3 text-sm text-[var(--text-2)] bg-[var(--surface-2)] rounded-xl px-3 py-2 leading-relaxed">
                    {feedback.comment}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
