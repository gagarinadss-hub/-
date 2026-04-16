export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Участники',
  description: 'Все участники сообщества Random Coffee.',
}

import type { Profile } from '@/lib/types'
import ProfileCard from '@/components/ProfileCard'
import ParticipantsCarousel from '@/components/ParticipantsCarousel'
import { Users } from 'lucide-react'

// Profiles with enough content to look great in the carousel
function isFeatured(p: Profile): boolean {
  return !!(p.bio || p.profession || p.goals || p.help_with) &&
    (p.interests?.length ?? 0) + (p.looking_for?.length ?? 0) > 0
}

export default async function ParticipantsPage() {
  const supabase = await createClient()

  const [participantsResult, meetingsResult, feedbackResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false }),
    supabase
      .from('meetings')
      .select('proposed_by, status'),
    supabase
      .from('meeting_feedback')
      .select('user_id, rating'),
  ])

  const list = (participantsResult.data ?? []) as Profile[]

  // Build meeting count per profile (only completed meetings count)
  const meetingCounts: Record<string, number> = {}
  ;(meetingsResult.data ?? []).forEach((m: { proposed_by: string; status: string }) => {
    if (m.status === 'completed') {
      meetingCounts[m.proposed_by] = (meetingCounts[m.proposed_by] ?? 0) + 1
    }
  })

  // Build average rating per profile
  const ratingMap: Record<string, { sum: number; count: number }> = {}
  ;(feedbackResult.data ?? []).forEach((f: { user_id: string; rating: number | null }) => {
    if (f.rating !== null) {
      if (!ratingMap[f.user_id]) ratingMap[f.user_id] = { sum: 0, count: 0 }
      ratingMap[f.user_id].sum   += f.rating
      ratingMap[f.user_id].count += 1
    }
  })
  const avgRating = (profileId: string): number | null => {
    const r = ratingMap[profileId]
    if (!r || r.count === 0) return null
    return r.sum / r.count
  }

  // Featured = rich profiles first, fallback to any if too few
  const featured: Profile[] = (() => {
    const rich = list.filter(isFeatured)
    const pool = rich.length >= 3 ? rich : list
    return pool.slice(0, 8)
  })()

  return (
    <div className="space-y-8">

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 rk-fade-up">
        <div className="w-12 h-12 rounded-2xl glass-sm flex items-center justify-center shrink-0">
          <Users size={20} className="text-[var(--text)]" />
        </div>
        <div>
          <h1 className="text-[28px] font-bold text-[var(--text)] tracking-tight">Участники</h1>
          <p className="text-sm text-[var(--text-2)]">
            {list.length > 0
              ? `${list.length} человек в сообществе`
              : 'Будьте первым участником'}
          </p>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="rk-fade-up-1 glass rounded-2xl border-2 border-dashed border-white/25 p-12 text-center">
          <div className="w-16 h-16 bg-[var(--accent)] rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Users size={28} className="text-[var(--text)]" />
          </div>
          <h2 className="font-black text-[var(--text)] text-xl mb-2">Пока нет участников</h2>
          <p className="text-[var(--text-3)] text-sm">Создай профиль и стань первым!</p>
        </div>
      ) : (
        <>
          {/* ── Featured carousel ──────────────────────────────────────── */}
          {featured.length >= 2 && (
            <ParticipantsCarousel profiles={featured} />
          )}

          {/* ── Divider ────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 rk-fade-up-2">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-xs font-semibold text-[var(--text-3)] px-2 flex items-center gap-1.5">
              <Users size={11} />
              Все {list.length} участников
            </span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          {/* Info chips */}
          <div className="flex flex-wrap gap-2 -mt-3 rk-fade-up-2">
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 glass rounded-full text-[var(--text-2)] font-semibold">
              👥 {list.length} участников
            </span>
            <span className="text-xs px-3 py-1.5 glass rounded-full text-[var(--text-2)] font-semibold">
              🔒 Только из сообщества
            </span>
          </div>

          {/* ── Full grid ──────────────────────────────────────────────── */}
          <div className="columns-1 sm:columns-2 gap-4 rk-fade-up-3">
            {list.map((profile, idx) => {
              const mc = meetingCounts[profile.id]
              const rt = avgRating(profile.id)
              return (
                <div
                  key={profile.id}
                  className="break-inside-avoid mb-4 rk-fade-up"
                  style={{ animationDelay: `${idx * 0.03}s` }}
                >
                  <ProfileCard
                    profile={profile}
                    meetingCount={mc !== undefined ? mc : undefined}
                    rating={rt}
                  />
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
