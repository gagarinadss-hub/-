export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Главная',
  description: 'Твои встречи, участники и события в Random Coffee.',
}
import { redirect } from 'next/navigation'
import type { Profile, Announcement, Event, Match } from '@/lib/types'
import MatchClient from '@/app/(protected)/matches/MatchClient'
import ProfileCard from '@/components/ProfileCard'
import { Calendar, Trophy, CalendarPlus, ArrowRight, Zap, Users, MessageCircle, CheckCircle2 } from 'lucide-react'
import { moscowDay, moscowMonth, toMoscowDisplay } from '@/lib/moscow-time'
import Link from 'next/link'

const FORMAT_BADGE: Record<string, { label: string; cls: string }> = {
  online:  { label: 'Онлайн',  cls: 'text-blue-600 bg-blue-500/12 border border-blue-400/20' },
  offline: { label: 'Офлайн', cls: 'text-green-700 bg-green-500/12 border border-green-400/20' },
  hybrid:  { label: 'Гибрид',  cls: 'text-purple-600 bg-purple-500/12 border border-purple-400/20' },
}

function googleCalendarUrl(event: Event): string {
  const start = new Date(event.event_date ?? Date.now())
  const end   = new Date(start.getTime() + 60 * 60 * 1000)
  const fmt   = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const p     = new URLSearchParams({
    action:   'TEMPLATE',
    text:     event.title,
    dates:    `${fmt(start)}/${fmt(end)}`,
    details:  event.description ?? '',
    location: event.location_or_link ?? '',
    sf:       'true',
    output:   'xml',
  })
  return `https://calendar.google.com/calendar/render?${p}`
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user!.id)
    .single()

  if (!profile) redirect('/profile')

  const [matchesResult, eventsResult, announcementsResult, meetingsResult, participantsResult, activeMatchesResult, recentProfilesResult] =
    await Promise.all([
      supabase
        .from('matches')
        .select(`*, profile_a:profiles!matches_user_a_id_fkey(*), profile_b:profiles!matches_user_b_id_fkey(*)`)
        .or(`user_a_id.eq.${profile.id},user_b_id.eq.${profile.id}`)
        .order('created_at', { ascending: false }),
      supabase
        .from('events')
        .select('*')
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(3),
      supabase
        .from('announcements')
        .select('*, author:profiles(*)')
        .eq('pinned', true)
        .order('created_at', { ascending: false })
        .limit(2),
      supabase.from('meetings').select('proposed_by, match_id, status'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .neq('user_id', user!.id)
        .order('updated_at', { ascending: false })
        .limit(6),
    ])

  const allMatches         = (matchesResult.data ?? []) as Match[]
  const events             = eventsResult.data ?? []
  const announcements      = announcementsResult.data ?? []
  const allMeetings        = meetingsResult.data ?? []
  const totalParticipants  = participantsResult.count ?? 0
  const activeMatchesCount = activeMatchesResult.count ?? 0
  const searchersCount     = Math.max(0, totalParticipants - activeMatchesCount * 2)
  const recentProfiles = (recentProfilesResult.data ?? []) as Profile[]

  const userMatchIds  = new Set(allMatches.map((m) => m.id))
  const totalMeetings = allMeetings.filter((m: { match_id: string }) => userMatchIds.has(m.match_id)).length

  const meetingCounts: Record<string, number> = {}
  allMeetings.forEach((m: { proposed_by: string; status: string }) => {
    if (m.status === 'completed') {
      meetingCounts[m.proposed_by] = (meetingCounts[m.proposed_by] ?? 0) + 1
    }
  })
  const topIds = Object.entries(meetingCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id)
  const { data: topProfilesData } = topIds.length
    ? await supabase.from('profiles').select('*').in('id', topIds).eq('is_active', true)
    : { data: [] }
  const topParticipants = (topProfilesData ?? []).sort(
    (a: Profile, b: Profile) => (meetingCounts[b.id] ?? 0) - (meetingCounts[a.id] ?? 0)
  )

  const firstName = profile?.full_name?.split(' ')[0] ?? null

  // ── Compatibility hint computation ──────────────────────────────────────────
  const MATCH_TOPICS = [
    { kw: ['ai', 'нейро', 'ml', 'искусственный', 'chatgpt', 'gpt'], label: 'AI' },
    { kw: ['стартап', 'запуск', 'запускает', 'проект', 'launch'],   label: 'запуски' },
    { kw: ['маркетинг', 'продвижение', 'smm', 'контент'],           label: 'маркетинг' },
    { kw: ['продажи', 'sales', 'crm'],                              label: 'продажи' },
    { kw: ['нетворк', 'знакомства', 'community'],                   label: 'нетворкинг' },
    { kw: ['дизайн', 'ux', 'ui', 'figma'],                         label: 'дизайн' },
    { kw: ['код', 'программ', 'разработ', 'dev', 'engineer'],       label: 'разработку' },
    { kw: ['инвестиц', 'финанс', 'венчур', 'фонд'],                 label: 'инвестиции' },
    { kw: ['продукт', 'product', 'pm', 'менеджер продукта'],        label: 'продукт' },
    { kw: ['предприним', 'бизнес', 'founder', 'основател'],         label: 'предпринимательство' },
  ]

  function profileText(p: Profile) {
    return [p.bio, p.goals, p.help_with, ...(p.interests ?? []), ...(p.looking_for ?? [])]
      .filter(Boolean).join(' ').toLowerCase()
  }

  function computeHint(viewer: Profile, candidate: Profile): string | null {
    const myText    = profileText(viewer)
    const theirText = profileText(candidate)
    const shared    = MATCH_TOPICS.filter(t =>
      t.kw.some(k => myText.includes(k)) && t.kw.some(k => theirText.includes(k))
    )
    if (shared.length >= 2) return `🔥 Общие темы: ${shared[0].label}, ${shared[1].label}`
    if (shared.length === 1) return `⚡ Общий интерес: ${shared[0].label}`
    const myGoals    = (viewer.looking_for ?? []).map(g => g.toLowerCase())
    const theirGoals = (candidate.looking_for ?? []).map(g => g.toLowerCase())
    const sharedGoals = myGoals.filter(g => theirGoals.includes(g))
    if (sharedGoals.length > 0) return `🤝 Ищете похожее: ${sharedGoals[0]}`
    if (candidate.looking_for?.length) return `🤝 ${candidate.looking_for.slice(0, 2).join(', ')}`
    return null
  }

  function computeBadges(p: Profile, mCounts: Record<string, number>): string[] {
    const badges: string[] = []
    const mc = mCounts[p.id] ?? 0
    if (mc >= 5)       badges.push('🔥 Часто знакомится')
    else if (mc >= 2)  badges.push('☕ Любит встречи')
    const hourAgo = Date.now() - 60 * 60 * 1000
    if (new Date(p.updated_at).getTime() > hourAgo) badges.push('💬 Активен сейчас')
    return badges.slice(0, 2)
  }

  // Recommendations with hints (exclude already-matched)
  const matchedIds = new Set(allMatches.flatMap(m => [m.user_a_id, m.user_b_id]))
  const recommendations = recentProfiles
    .filter(p => !matchedIds.has(p.id))
    .slice(0, 3)
    .map(p => ({
      profile: p,
      hint:   computeHint(profile as Profile, p),
      badges: computeBadges(p, meetingCounts),
    }))

  // Today's action list
  const hasPendingMatch = allMatches.some(m => m.status === 'pending')
  const pendingMatchId  = allMatches.find(m => m.status === 'pending')?.id

  return (
    <div className="space-y-6">

      {/* ─── Hero — social feel ──────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap pt-1 rk-fade-up">
        {/* Left: user identity */}
        <div className="flex items-center gap-3">
          {/* User avatar */}
          <div className="w-11 h-11 rounded-full bg-[var(--accent)] flex items-center justify-center font-black text-sm text-[var(--text)] shrink-0 overflow-hidden ring-2 ring-white shadow-sm">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={profile.full_name} width={44} height={44} className="w-full h-full object-cover" />
            ) : (
              (profile.full_name ?? '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <h1 className="text-[28px] sm:text-[34px] font-bold text-[var(--text)] tracking-tight leading-tight">
              {firstName ? `Привет, ${firstName} 👋` : 'Привет 👋'}
            </h1>
            <p className="text-sm text-[var(--text-3)] mt-1">
              {allMatches.some((m) => m.status === 'pending')
                ? '🎉 У тебя есть пара — пора познакомиться'
                : 'Готов к новому знакомству?'}
            </p>
          </div>
        </div>

        {/* Right: community stats */}
        <div className="flex items-center gap-4">
          {/* Recent member avatars strip */}
          {recentProfiles.length > 0 && (
            <div className="hidden sm:flex -space-x-2">
              {recentProfiles.slice(0, 4).map((p) => (
                <div key={p.id} className="w-7 h-7 rounded-full bg-white/25 border-2 border-white/20 flex items-center justify-center text-[9px] font-black text-[var(--text)] overflow-hidden shadow-sm">
                  {p.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatar_url} alt={p.full_name} width={28} height={28} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    p.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="text-right">
            <p className="text-lg font-black text-[var(--text)]">{totalParticipants}</p>
            <p className="text-[11px] text-[var(--text-3)]">участников</p>
          </div>
          <div className="w-px h-6 bg-[var(--border)]" />
          <div className="text-right">
            <p className="text-lg font-black text-[var(--text)]">{totalMeetings}</p>
            <p className="text-[11px] text-[var(--text-3)]">встреч</p>
          </div>
        </div>
      </div>

      {/* ─── Pinned announcements ───────────────────────────────────── */}
      {announcements.length > 0 && (
        <div className="space-y-2 rk-fade-up">
          {(announcements as Announcement[]).map((a) => (
            <div key={a.id}
              className="flex items-start gap-3 glass rounded-[16px] px-4 py-3">
              <span className="text-base shrink-0 mt-0.5">📌</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text)] leading-snug">{a.title}</p>
                <p className="text-xs text-[var(--text-2)] mt-0.5 leading-relaxed line-clamp-2">{a.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Today's actions ──────────────────────────────────────── */}
      <div className="glass rounded-[20px] p-5 rk-fade-up">
        <h2 className="font-bold text-[var(--text)] text-sm mb-4 flex items-center gap-1.5">
          <CheckCircle2 size={14} className="text-[var(--text-3)]" /> Сегодня тебе стоит сделать
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {hasPendingMatch ? (
            <>
              <Link href={`/chat/${pendingMatchId}`}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-white/30 hover:bg-white/45 transition-colors group">
                <div className="w-9 h-9 rounded-xl bg-[var(--accent)] flex items-center justify-center shrink-0">
                  <MessageCircle size={16} className="text-[var(--text)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[var(--text)] leading-tight">Написать паре</p>
                  <p className="text-[11px] text-[var(--text-3)] mt-0.5">Начни разговор первым ☕</p>
                </div>
              </Link>
              <Link href="/matches"
                className="flex items-center gap-3 p-3.5 rounded-xl bg-white/30 hover:bg-white/45 transition-colors group">
                <div className="w-9 h-9 rounded-xl bg-[var(--text)] flex items-center justify-center shrink-0">
                  <Calendar size={16} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[var(--text)] leading-tight">Назначить встречу</p>
                  <p className="text-[11px] text-[var(--text-3)] mt-0.5">Предложи удобное время</p>
                </div>
              </Link>
            </>
          ) : (
            <Link href="/matches"
              className="flex items-center gap-3 p-3.5 rounded-xl bg-white/30 hover:bg-white/45 transition-colors group">
              <div className="w-9 h-9 rounded-xl bg-[var(--accent)] flex items-center justify-center shrink-0">
                <Zap size={16} className="text-[var(--text)]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--text)] leading-tight">Найти пару</p>
                <p className="text-[11px] text-[var(--text-3)] mt-0.5">Умный подбор за 1 клик ✨</p>
              </div>
            </Link>
          )}
          <Link href="/participants"
            className="flex items-center gap-3 p-3.5 rounded-xl bg-white/30 hover:bg-white/45 transition-colors group">
            <div className="w-9 h-9 rounded-xl bg-white/40 flex items-center justify-center shrink-0">
              <Users size={16} className="text-[var(--text)]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[var(--text)] leading-tight">Посмотреть участников</p>
              <p className="text-[11px] text-[var(--text-3)] mt-0.5">Кто-то новый появился</p>
            </div>
          </Link>
        </div>
      </div>

      {/* ─── Main grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* Left 2/3: главный CTA */}
        <div className="lg:col-span-2 min-w-0 rk-fade-up-1">
          <MatchClient
            myProfile={profile as Profile}
            matches={allMatches}
            searchersCount={searchersCount}
            embedded={true}
            recentProfiles={recentProfiles}
          />
        </div>

        {/* Right 1/3: контекст */}
        <div className="space-y-4 rk-fade-up-2">

          {/* Events */}
          <div className="glass rounded-[20px] p-5 opacity-80">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[var(--text)] text-sm flex items-center gap-1.5">
                <Calendar size={14} className="text-[var(--text-3)]" /> События
              </h2>
              <a
                href="webcal://random-coffee-lyart.vercel.app/api/calendar"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text-3)] hover:text-[var(--text)] transition-colors"
              >
                <CalendarPlus size={10} /> Подписаться
              </a>
            </div>

            {events.length === 0 ? (
              <p className="text-sm text-[var(--text-3)] text-center py-4">Событий пока нет</p>
            ) : (
              <div className="space-y-3">
                {(events as Event[]).map((event) => {
                  const badge = event.format ? FORMAT_BADGE[event.format] : null
                  return (
                    <div key={event.id} className="flex gap-3">
                      <div className="shrink-0 w-10 text-center glass-sm rounded-xl py-2 self-start">
                        <p className="text-[15px] font-bold leading-none" style={{ background: 'linear-gradient(90deg,#FFB86B,#FF6B6B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{moscowDay(event.event_date)}</p>
                        <p className="text-[9px] text-[rgba(20,20,30,0.45)] uppercase font-semibold leading-tight mt-0.5">{moscowMonth(event.event_date)}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[rgba(20,20,30,0.85)] text-[13px] leading-tight mb-1">{event.title}</p>
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <p className="text-[12px] text-[rgba(20,20,30,0.60)]">
                            {toMoscowDisplay(event.event_date, { hour: '2-digit', minute: '2-digit', day: undefined, month: undefined, year: undefined })} МСК
                          </p>
                          {badge && (
                            <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${badge.cls}`}>{badge.label}</span>
                          )}
                        </div>
                        {event.location_or_link?.startsWith('http') ? (
                          <a href={event.location_or_link} target="_blank" rel="noopener noreferrer"
                            className="text-[12px] text-[#2563EB] font-medium hover:underline transition-colors">Открыть →</a>
                        ) : event.location_or_link ? (
                          <p className="text-[12px] text-[rgba(20,20,30,0.60)]">📍 {event.location_or_link}</p>
                        ) : null}
                        <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1 text-[11px] text-[#2563EB] font-medium hover:underline transition-colors">
                          <CalendarPlus size={9} /> В календарь
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Top participants */}
          {topParticipants.length > 0 && (
            <div className="glass rounded-[20px] p-5 opacity-80">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-[var(--text)] text-sm flex items-center gap-1.5">
                  <Trophy size={14} className="text-amber-300" /> Топ встреч
                </h2>
                <Link href="/participants"
                  className="inline-flex items-center gap-0.5 text-[11px] text-[var(--text-3)] hover:text-[var(--text)] transition-colors">
                  Все <ArrowRight size={10} />
                </Link>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {topParticipants.map((p: Profile, i: number) => (
                  <div key={p.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="text-sm w-4 shrink-0">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-[var(--accent)] flex items-center justify-center text-[var(--text)] text-[10px] font-black shrink-0">
                      {(p.full_name ?? '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <p className="text-xs font-medium text-[var(--text)] truncate flex-1">{p.full_name}</p>
                    <span className="text-[11px] text-[var(--text-3)] shrink-0 tabular-nums">{meetingCounts[p.id] ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended participants */}
          {recommendations.length > 0 && (
            <div className="glass rounded-[20px] p-5 rk-fade-up-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-[var(--text)] text-sm flex items-center gap-1.5">
                  <Zap size={14} className="text-amber-400" /> Тебе могут подойти
                </h2>
                <Link href="/participants"
                  className="inline-flex items-center gap-0.5 text-[11px] text-[var(--text-3)] hover:text-[var(--text)] transition-colors">
                  Все <ArrowRight size={10} />
                </Link>
              </div>
              <div className="space-y-3">
                {recommendations.map(({ profile: rec, hint, badges }) => (
                  <ProfileCard
                    key={rec.id}
                    profile={rec}
                    matchReason={hint ?? undefined}
                    meetingCount={meetingCounts[rec.id]}
                    badges={badges.length ? badges : undefined}
                  />
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
