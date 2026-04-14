export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Profile, Announcement, Event, Match } from '@/lib/types'
import MatchClient from '@/app/(protected)/matches/MatchClient'
import { Calendar, Trophy, CalendarPlus, ArrowRight } from 'lucide-react'
import { moscowDay, moscowMonth, toMoscowDisplay } from '@/lib/moscow-time'
import Link from 'next/link'

const FORMAT_BADGE: Record<string, { label: string; cls: string }> = {
  online:  { label: 'Онлайн',  cls: 'text-blue-400 bg-blue-950/40' },
  offline: { label: 'Офлайн', cls: 'text-green-400 bg-green-950/40' },
  hybrid:  { label: 'Гибрид',  cls: 'text-purple-400 bg-purple-950/40' },
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
      supabase.from('meetings').select('proposed_by, match_id'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase
        .from('profiles')
        .select('id, full_name, avatar_url, profession, updated_at')
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
  allMeetings.forEach((m: { proposed_by: string }) => {
    meetingCounts[m.proposed_by] = (meetingCounts[m.proposed_by] ?? 0) + 1
  })
  const topIds = Object.entries(meetingCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id)
  const { data: topProfilesData } = topIds.length
    ? await supabase.from('profiles').select('*').in('id', topIds)
    : { data: [] }
  const topParticipants = (topProfilesData ?? []).sort(
    (a: Profile, b: Profile) => (meetingCounts[b.id] ?? 0) - (meetingCounts[a.id] ?? 0)
  )

  const firstName = profile?.full_name?.split(' ')[0] ?? null

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
              <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
            ) : (
              (profile.full_name ?? '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <h1 className="text-lg font-black text-[var(--text)] tracking-tight leading-tight">
              {firstName ? `Привет, ${firstName} 👋` : 'Привет 👋'}
            </h1>
            <p className="text-[13px] text-[var(--text-3)] mt-0.5">
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
                <div key={p.id} className="w-7 h-7 rounded-full bg-[var(--accent)] border-2 border-[var(--surface)] flex items-center justify-center text-[9px] font-black text-[var(--text)] overflow-hidden shadow-sm">
                  {p.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatar_url} alt={p.full_name} className="w-full h-full object-cover" />
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
              className="flex items-start gap-3 bg-[var(--surface)] border border-[var(--border)] rounded-[16px] px-4 py-3 shadow-[var(--shadow)]">
              <span className="text-base shrink-0 mt-0.5">📌</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text)] leading-snug">{a.title}</p>
                <p className="text-xs text-[var(--text-2)] mt-0.5 leading-relaxed line-clamp-2">{a.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}

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
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[20px] p-5 shadow-[var(--shadow)]">
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
                      <div className="shrink-0 w-9 text-center bg-[var(--accent)] rounded-xl py-1.5 self-start">
                        <p className="text-sm font-black text-[var(--text)] leading-none">{moscowDay(event.event_date)}</p>
                        <p className="text-[9px] text-black/40 uppercase font-bold leading-tight">{moscowMonth(event.event_date)}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-semibold text-[var(--text)] text-xs leading-tight">{event.title}</p>
                          {badge && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--text-3)] mt-0.5">
                          {toMoscowDisplay(event.event_date, { hour: '2-digit', minute: '2-digit', day: undefined, month: undefined, year: undefined })} МСК
                        </p>
                        {event.location_or_link?.startsWith('http') ? (
                          <a href={event.location_or_link} target="_blank" rel="noopener noreferrer"
                            className="text-[11px] text-[var(--blue)] hover:underline">Открыть →</a>
                        ) : event.location_or_link ? (
                          <p className="text-[11px] text-[var(--text-3)]">📍 {event.location_or_link}</p>
                        ) : null}
                        <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1 text-[10px] text-[var(--text-3)] hover:text-[var(--blue)] transition-colors">
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
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[20px] p-5 shadow-[var(--shadow)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-[var(--text)] text-sm flex items-center gap-1.5">
                  <Trophy size={14} className="text-[var(--warning)]" /> Топ встреч
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

          {/* Why it works */}
          <div className="border border-[var(--border)] rounded-[20px] px-5 py-4 rk-fade-up-3"
            style={{ background: 'rgba(200,162,124,0.07)' }}>
            <p className="text-[11px] font-bold text-[var(--text)] uppercase tracking-widest mb-3">Как это работает</p>
            <div className="space-y-2.5">
              {[
                { icon: '🔒', text: 'Только из сообщества' },
                { icon: '☕', text: '30 минут — новый человек' },
                { icon: '🚀', text: 'Рост, связи, возможности' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-2.5">
                  <span className="text-sm">{icon}</span>
                  <span className="text-xs text-[var(--text-2)]">{text}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
