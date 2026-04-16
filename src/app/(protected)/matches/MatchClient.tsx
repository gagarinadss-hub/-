'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Match, Meeting, MeetingStatus } from '@/lib/types'
import ProfileCard from '@/components/ProfileCard'
import {
  Shuffle, Check, X, Star, Calendar, Wifi, MapPin,
  ChevronRight, Sparkles, MessageCircle, Clock, RefreshCw,
} from 'lucide-react'
import {
  playMatchSound, unlockAudio,
  playMeetingConfirmedSound, playMeetingRequestSound,
} from '@/lib/sounds'
import Link from 'next/link'

type Props = {
  myProfile:       Profile | null
  matches:         Match[]
  searchersCount?: number
  embedded?:       boolean
  recentProfiles?: Profile[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const SEARCH_PHRASES = [
  'Анализируем цели и интересы…',
  'Сравниваем экспертизу участников…',
  'Ищем наилучшее совпадение…',
  'Почти готово! Финальная проверка…',
]

function parseKeywords(text: string): string[] {
  return text.toLowerCase().split(/[\s,;]+/).filter((w) => w.length > 2)
}
function arrOrText(val: string[] | string | null | undefined): string[] {
  if (!val) return []
  if (Array.isArray(val)) return val.map((v) => v.toLowerCase().trim()).filter(Boolean)
  return parseKeywords(val)
}
function overlap(a: string[], b: string[]): number {
  return a.filter((x) => b.some((y) => y.includes(x) || x.includes(y))).length
}
function scoreCandidate(me: Profile, candidate: Profile, daysSinceLast: number): number {
  let score = 0
  score += overlap(arrOrText(me.interests ?? me.bio),   arrOrText(candidate.interests ?? candidate.bio))   * 3
  score += overlap(arrOrText(me.looking_for ?? me.goals), arrOrText(candidate.looking_for ?? candidate.goals)) * 2
  if (daysSinceLast > 30) score += 2
  return score
}
function buildWhyMatched(me: Profile, partner: Profile): string {
  const topics = [
    { kw: ['ai','искусственный','нейро','ml'],  label: 'AI и технологии' },
    { kw: ['запуск','стартап','проект'],          label: 'запуск проектов' },
    { kw: ['продажи','sales'],                    label: 'продажи' },
    { kw: ['маркетинг','продвижение'],            label: 'маркетинг' },
    { kw: ['нетворк','знакомства'],               label: 'нетворкинг' },
    { kw: ['инвестиц','финанс'],                  label: 'финансы' },
    { kw: ['команда','найм','hr'],                label: 'построение команды' },
    { kw: ['продукт','product','ux'],             label: 'продуктовое мышление' },
    { kw: ['рост','масштаб','growth'],            label: 'рост бизнеса' },
    { kw: ['предприним','бизнес','founder'],      label: 'предпринимательство' },
  ]
  const myText    = `${me.goals} ${me.help_with} ${me.bio} ${(me.interests ?? []).join(' ')} ${(me.looking_for ?? []).join(' ')}`.toLowerCase()
  const theirText = `${partner.goals} ${partner.help_with} ${partner.bio} ${(partner.interests ?? []).join(' ')} ${(partner.looking_for ?? []).join(' ')}`.toLowerCase()
  const shared    = topics.filter(({ kw }) => kw.some((k) => myText.includes(k)) && kw.some((k) => theirText.includes(k)))
  if (shared.length >= 2) return `Вы оба развиваетесь в ${shared[0].label} и ${shared[1].label}`
  if (shared.length === 1) return `У вас общий интерес: ${shared[0].label}`
  const sharedG = arrOrText(me.looking_for ?? me.goals).filter((g) =>
    arrOrText(partner.looking_for ?? partner.goals).some((t) => t.includes(g) || g.includes(t))
  )
  if (sharedG.length > 0) return `Схожие цели: ${sharedG[0]}`
  return 'Алгоритм нашёл взаимодополняющую экспертизу'
}

function fmtDate(iso: string | null): string {
  if (!iso) return 'дата не указана'
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  })
}
function fmtFormat(fmt: string | null): string {
  if (fmt === 'online')  return '💻 Онлайн'
  if (fmt === 'offline') return '☕ Оффлайн'
  return ''
}

const historyStatusLabel: Record<string, string> = {
  completed: 'Встреча состоялась ✅',
  declined:  'Пропущено',
  expired:   'Истёк срок',
}
const historyStatusColor: Record<string, string> = {
  completed: 'bg-green-50/80 text-green-700 border-green-200/60',
  declined:  'bg-[var(--surface-2)] text-[var(--text-3)] border-[var(--border)]',
  expired:   'bg-[var(--surface-2)] text-[var(--text-3)] border-[var(--border)]',
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function MatchClient({ myProfile, matches, searchersCount = 0, embedded = false, recentProfiles }: Props) {
  const router = useRouter()

  // Search
  const [loading, setLoading]           = useState(false)
  const [searching, setSearching]       = useState(false)
  const [searchPhrase, setSearchPhrase] = useState(0)
  const [searchError, setSearchError]   = useState('')
  const [celebrating, setCelebrating] = useState(false)

  // Active meeting from DB
  const [dbMeeting, setDbMeeting]         = useState<Meeting | null>(null)
  const [meetingLoading, setMeetingLoading] = useState(false)
  const [alreadyRated, setAlreadyRated]   = useState(false)

  // Propose modal
  const [showPropose, setShowPropose]       = useState(false)
  const [proposeDate, setProposeDate]       = useState('')
  const [proposeFormat, setProposeFormat]   = useState<'online' | 'offline'>('online')
  const [proposeComment, setProposeComment] = useState('')

  // Reschedule modal (partner suggests new time)
  const [showReschedule, setShowReschedule]       = useState(false)
  const [rescheduleDate, setRescheduleDate]       = useState('')
  const [rescheduleFormat, setRescheduleFormat]   = useState<'online' | 'offline'>('online')
  const [rescheduleComment, setRescheduleComment] = useState('')

  // Rating modal
  const [showRating, setShowRating]       = useState(false)
  const [rating, setRating]               = useState(0)
  const [wantAgain, setWantAgain]         = useState<boolean | null>(null)
  const [ratingLoading, setRatingLoading] = useState(false)

  const activeMatch = matches.find((m) => m.status === 'pending')

  // ── Unlock audio ───────────────────────────────────────────────────────────
  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('click', unlock, { once: true })
    return () => window.removeEventListener('click', unlock)
  }, [])

  // ── Load meeting from DB + realtime updates ────────────────────────────────
  const loadMeeting = useCallback(async () => {
    if (!activeMatch || !myProfile) { setDbMeeting(null); return }
    const supabase = createClient()
    const { data } = await supabase
      .from('meetings')
      .select('*')
      .eq('match_id', activeMatch.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setDbMeeting(data ?? null)
    if (data?.status === 'completed') {
      const { data: fb } = await supabase
        .from('meeting_feedback')
        .select('id')
        .eq('meeting_id', data.id)
        .eq('user_id', myProfile.id)
        .maybeSingle()
      setAlreadyRated(!!fb)
    }
  }, [activeMatch?.id, myProfile?.id]) // eslint-disable-line

  useEffect(() => { loadMeeting() }, [loadMeeting])

  // Realtime: listen for meeting INSERT and status changes
  useEffect(() => {
    if (!activeMatch) return
    const supabase = createClient()
    const ch = supabase
      .channel(`meeting-status-${activeMatch.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'meetings', filter: `match_id=eq.${activeMatch.id}` },
        (payload) => {
          const inserted = payload.new as Meeting
          setDbMeeting(inserted)
          // Партнёр слышит звук при новом предложении встречи
          if (myProfile && inserted.proposed_by !== myProfile.id) {
            playMeetingRequestSound()
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'meetings', filter: `match_id=eq.${activeMatch.id}` },
        (payload) => {
          const updated = payload.new as Meeting
          setDbMeeting(updated)
          if (!myProfile) return
          const isProposer = updated.proposed_by === myProfile.id
          // Инициатор: подтверждение или перенос
          if (isProposer) {
            if (updated.status === 'confirmed')            playMeetingConfirmedSound()
            if (updated.status === 'reschedule_requested') playMeetingRequestSound()
          }
          // Партнёр: повторное предложение после decline
          if (!isProposer && updated.status === 'awaiting_response') {
            playMeetingRequestSound()
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [activeMatch?.id, myProfile?.id]) // eslint-disable-line

  // Search animation
  useEffect(() => {
    if (!searching) return
    const iv = setInterval(() => setSearchPhrase((p) => (p + 1) % SEARCH_PHRASES.length), 700)
    return () => clearInterval(iv)
  }, [searching])

  // ── Find new match ─────────────────────────────────────────────────────────
  async function handleNewMatch() {
    if (!myProfile) return
    setSearchError('')
    setSearching(true)
    setSearchPhrase(0)
    await new Promise((r) => setTimeout(r, 2800))
    setLoading(true)

    const supabase  = createClient()
    const { data: all } = await supabase.from('profiles').select('*').neq('id', myProfile.id).eq('is_active', true)
    const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 30)
    const recentIds = matches
      .filter((m) => new Date(m.created_at) > thirtyAgo)
      .map((m) => (m.user_a_id === myProfile.id ? m.user_b_id : m.user_a_id))

    const candidates = (all ?? []).filter((p) => !recentIds.includes(p.id)) as Profile[]
    if (!candidates.length) {
      setSearchError('Нет доступных участников прямо сейчас. Попробуй позже.')
      setSearching(false); setLoading(false); return
    }

    const days   = matches.length > 0 ? Math.floor((Date.now() - new Date(matches[0].created_at).getTime()) / 86_400_000) : 999
    const winner = candidates
      .map((c) => ({ c, s: scoreCandidate(myProfile, c, days) }))
      .sort((a, b) => b.s - a.s)[0].c

    const { error } = await supabase.from('matches').insert({
      user_a_id:    myProfile.id,
      user_b_id:    winner.id,
      status:       'pending',
      created_by:   myProfile.id,
      score:        Math.min(100, scoreCandidate(myProfile, winner, days) * 10),
      match_reason: buildWhyMatched(myProfile, winner),
    })
    setSearching(false); setLoading(false)
    if (error) setSearchError('Ошибка при создании пары. Попробуй снова.')
    else {
      // Send auto first message to break the ice
      const { data: newMatch } = await supabase
        .from('matches')
        .select('id')
        .or(`and(user_a_id.eq.${myProfile.id},user_b_id.eq.${winner.id}),and(user_a_id.eq.${winner.id},user_b_id.eq.${myProfile.id})`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (newMatch) {
        await supabase.from('messages').insert({
          match_id:     newMatch.id,
          sender_id:    myProfile.id,
          receiver_id:  winner.id,
          message_text: `Привет! Нам предложили познакомиться 👋 Рад(а) встретиться — напиши, когда удобно пообщаться ☕`,
        })
      }
      playMatchSound()
      setCelebrating(true)
      setTimeout(() => {
        setCelebrating(false)
        router.refresh()
      }, 2800)
    }
  }

  // ── Helper: send a system-style message to the chat ──────────────────────
  async function sendChatMessage(text: string) {
    if (!activeMatch || !myProfile) return
    const supabase = createClient()
    const partnerId = activeMatch.user_a_id === myProfile.id
      ? activeMatch.user_b_id
      : activeMatch.user_a_id
    await supabase.from('messages').insert({
      match_id:     activeMatch.id,
      sender_id:    myProfile.id,
      receiver_id:  partnerId,
      message_text: text,
    })
  }

  // ── Propose meeting (initiator) ────────────────────────────────────────────
  async function proposeMeeting() {
    if (!activeMatch || !myProfile || !proposeDate) return
    setMeetingLoading(true)
    const supabase = createClient()
    const payload = {
      match_id:     activeMatch.id,
      proposed_by:  myProfile.id,
      format:       proposeFormat,
      scheduled_at: new Date(proposeDate).toISOString(),
      comment:      proposeComment.trim() || null,
      status:       'awaiting_response' as MeetingStatus,
    }
    if (dbMeeting) {
      const { data } = await supabase.from('meetings').update(payload).eq('id', dbMeeting.id).select().single()
      setDbMeeting(data ?? dbMeeting)
    } else {
      const { data } = await supabase.from('meetings').insert(payload).select().single()
      setDbMeeting(data ?? null)
    }
    const dateStr = fmtDate(new Date(proposeDate).toISOString())
    const fmtStr  = proposeFormat === 'online' ? '💻 Онлайн' : '☕ Оффлайн'
    const comment = proposeComment.trim() ? `\n${proposeComment.trim()}` : ''
    await sendChatMessage(`📅 Предлагаю встречу: ${dateStr} · ${fmtStr}${comment}`)
    setMeetingLoading(false)
    setShowPropose(false)
    setProposeComment('')
  }

  // ── Partner: confirm ───────────────────────────────────────────────────────
  async function confirmMeeting() {
    if (!dbMeeting || !activeMatch) return
    setMeetingLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('meetings').update({ status: 'confirmed' }).eq('id', dbMeeting.id).select().single()
    setDbMeeting(data ?? dbMeeting)
    await sendChatMessage(`✅ Подтверждаю встречу: ${fmtDate(dbMeeting.scheduled_at)} · ${fmtFormat(dbMeeting.format)}`)
    setMeetingLoading(false)
  }

  // ── Partner: decline ───────────────────────────────────────────────────────
  async function declineMeeting() {
    if (!dbMeeting || !activeMatch) return
    setMeetingLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('meetings').update({ status: 'declined' }).eq('id', dbMeeting.id).select().single()
    setDbMeeting(data ?? dbMeeting)
    await sendChatMessage('❌ Не смогу встретиться в это время. Предлагай другое!')
    setMeetingLoading(false)
  }

  // ── Partner: suggest new time ──────────────────────────────────────────────
  async function requestReschedule() {
    if (!activeMatch || !myProfile || !rescheduleDate) return
    setMeetingLoading(true)
    const supabase = createClient()
    const payload = {
      proposed_by:  myProfile.id,       // now partner becomes the proposer
      format:       rescheduleFormat,
      scheduled_at: new Date(rescheduleDate).toISOString(),
      comment:      rescheduleComment.trim() || null,
      status:       'reschedule_requested' as MeetingStatus,
    }
    const { data } = await supabase
      .from('meetings').update(payload).eq('id', dbMeeting!.id).select().single()
    setDbMeeting(data ?? dbMeeting)
    const dateStr = fmtDate(new Date(rescheduleDate).toISOString())
    const fmtStr  = rescheduleFormat === 'online' ? '💻 Онлайн' : '☕ Оффлайн'
    const comment = rescheduleComment.trim() ? `\n${rescheduleComment.trim()}` : ''
    await sendChatMessage(`⏰ Предлагаю другое время: ${dateStr} · ${fmtStr}${comment}`)
    setMeetingLoading(false)
    setShowReschedule(false)
    setRescheduleComment('')
  }

  // ── Initiator: accept reschedule (confirm new time) ────────────────────────
  async function acceptReschedule() {
    if (!dbMeeting || !activeMatch) return
    setMeetingLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('meetings').update({ status: 'confirmed' }).eq('id', dbMeeting.id).select().single()
    setDbMeeting(data ?? dbMeeting)
    await sendChatMessage(`✅ Принимаю! Встречаемся: ${fmtDate(dbMeeting.scheduled_at)} · ${fmtFormat(dbMeeting.format)}`)
    setMeetingLoading(false)
  }

  // ── Rating submit ──────────────────────────────────────────────────────────
  async function submitRating() {
    if (!myProfile || !activeMatch || rating === 0 || wantAgain === null) return
    setRatingLoading(true)
    const supabase = createClient()
    let meetingId  = dbMeeting?.id
    if (!meetingId) {
      const { data: m } = await supabase
        .from('meetings')
        .insert({ match_id: activeMatch.id, proposed_by: myProfile.id, format: 'any', scheduled_at: new Date().toISOString(), status: 'completed' })
        .select('id').single()
      meetingId = m?.id
    } else {
      await supabase.from('meetings').update({ status: 'completed' }).eq('id', meetingId)
    }
    if (meetingId) {
      await supabase.from('meeting_feedback').upsert(
        { meeting_id: meetingId, user_id: myProfile.id, rating, want_again: wantAgain },
        { onConflict: 'meeting_id,user_id' }
      )
    }
    await supabase.from('matches').update({ status: 'completed' }).eq('id', activeMatch.id)
    setRatingLoading(false)
    setShowRating(false)
    router.refresh()
  }

  async function markDeclined(matchId: string) {
    const supabase = createClient()
    await supabase.from('matches').update({ status: 'declined' }).eq('id', matchId)
    setDbMeeting(null)
    router.refresh()
  }

  if (!myProfile) {
    return (
      <div className="text-center py-16">
        <p className="text-[var(--text-2)] mb-4">Сначала создай свою карточку участника</p>
        <Link href="/profile" className="inline-flex px-5 py-2.5 bg-[var(--text)] text-white rounded-xl text-sm font-bold hover:opacity-80 transition-opacity">
          Создать профиль
        </Link>
      </div>
    )
  }

  function getPartner(match: Match): Profile | null {
    return match.user_a_id === myProfile!.id
      ? (match.profile_b as Profile) ?? null
      : (match.profile_a as Profile) ?? null
  }

  const isInitiator = dbMeeting ? dbMeeting.proposed_by === myProfile.id : false
  const isPartner   = dbMeeting ? dbMeeting.proposed_by !== myProfile.id : false

  // ── Status banner config ────────────────────────────────────────────────────
  function getStatusBanner() {
    if (!activeMatch) return {
      emoji: '👀', title: 'Ты сейчас в поиске собеседника',
      sub: 'Найди пару прямо сейчас — это займёт меньше минуты ☕',
      cls: 'border-white/20 bg-white/12',
    }
    const s = dbMeeting?.status
    if (!s) return {
      emoji: '🎉', title: 'У тебя есть пара! Пора познакомиться',
      sub: 'Напиши и назначь кофе-встречу на 30 минут ☕',
      cls: 'border-[var(--accent)] bg-[var(--accent-light)]',
    }
    if (s === 'awaiting_response') return isInitiator
      ? { emoji: '⏳', title: 'Ждём ответа собеседника', sub: `Ты предложил встречу ${fmtDate(dbMeeting!.scheduled_at)} · ${fmtFormat(dbMeeting!.format)}`, cls: 'border-amber-300/60 bg-amber-50/80' }
      : { emoji: '📩', title: 'Тебя приглашают на встречу!', sub: `Предложено: ${fmtDate(dbMeeting!.scheduled_at)} · ${fmtFormat(dbMeeting!.format)}`, cls: 'border-[var(--accent)] bg-[var(--accent-light)]' }
    if (s === 'reschedule_requested') return isInitiator
      ? { emoji: '⏰', title: 'Собеседник предложил другое время', sub: `Новое время: ${fmtDate(dbMeeting!.scheduled_at)} · ${fmtFormat(dbMeeting!.format)}`, cls: 'border-blue-300/60 bg-blue-50/80' }
      : { emoji: '⏳', title: 'Ждём ответа на твоё предложение', sub: `Ты предложил: ${fmtDate(dbMeeting!.scheduled_at)} · ${fmtFormat(dbMeeting!.format)}`, cls: 'border-amber-300/60 bg-amber-50/80' }
    if (s === 'confirmed') return {
      emoji: '✅', title: 'Встреча подтверждена!',
      sub: `${fmtDate(dbMeeting!.scheduled_at)} · ${fmtFormat(dbMeeting!.format)}`,
      cls: 'border-green-300/60 bg-green-50/80',
    }
    if (s === 'declined') return {
      emoji: '😔', title: 'Встреча отклонена',
      sub: 'Собеседник не смог, попробуй предложить другое время',
      cls: 'border-white/15 bg-white/8',
    }
    if (s === 'completed') return {
      emoji: alreadyRated ? '🏆' : '☕',
      title: alreadyRated ? 'Встреча завершена, отзыв оставлен!' : 'Встреча состоялась!',
      sub: alreadyRated ? 'Спасибо за отзыв — это улучшит следующий подбор' : 'Оставь оценку, чтобы улучшить следующий подбор',
      cls: 'border-green-300/60 bg-green-50/80',
    }
    return {
      emoji: '📅', title: 'Встреча запланирована',
      sub: `${fmtDate(dbMeeting!.scheduled_at)} · ${fmtFormat(dbMeeting!.format)}`,
      cls: 'border-[var(--blue-mid)] bg-[var(--blue-light)]',
    }
  }

  const banner = getStatusBanner()

  return (
    <div className="space-y-5">

      {/* ── Celebration overlay ── */}
      {celebrating && (
        <div className="fixed inset-0 flex items-center justify-center z-[200] rk-overlay">
          <div className="rk-modal rounded-3xl px-10 py-8 text-center rk-pop-in mx-4 max-w-xs w-full">
            <div className="text-5xl mb-4 rk-celebrate">🎉</div>
            <p className="text-xl font-black text-[var(--text)] mb-1 tracking-tight">+1 новый человек в жизни</p>
            <p className="text-sm text-[var(--text-3)]">Пора написать и назначить кофе ☕</p>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      {!embedded && (
        <div className="flex items-center gap-4 rk-fade-up">
          <div className="w-12 h-12 rounded-2xl bg-[var(--accent)] flex items-center justify-center shrink-0">
            <Shuffle size={20} className="text-[var(--text)]" />
          </div>
          <div>
            <h1 className="text-[28px] font-bold text-[var(--text)] tracking-tight">Найти пару</h1>
            <p className="text-sm text-[var(--text-2)]">Умный подбор собеседника из твоей сферы</p>
          </div>
        </div>
      )}

      {/* ── Status banner ── */}
      <div className={`rounded-[18px] border p-4 rk-fade-up ${banner.cls}`}>
        <div className="flex items-start gap-3">
          <span className="text-xl">{banner.emoji}</span>
          <div>
            <p className="font-semibold text-[var(--text)] text-sm">{banner.title}</p>
            <p className="text-xs text-[var(--text-2)] mt-0.5 leading-relaxed">{banner.sub}</p>
          </div>
        </div>
      </div>

      {/* ── Searching animation ── */}
      {searching && (
        <div className="glass rounded-[24px] px-8 py-14 text-center shadow-[var(--shadow-lg)] rk-pop-in">
          <div className="flex items-center justify-center gap-2.5 mb-8">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] rk-dot" />
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--text)] rk-dot-2" />
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] rk-dot-3" />
          </div>
          <p className="text-xl font-black text-[var(--text)] mb-2 tracking-tight">Ищем идеального собеседника…</p>
          <p className="text-sm text-[var(--text-3)] min-h-[20px] transition-all duration-500">{SEARCH_PHRASES[searchPhrase]}</p>
        </div>
      )}

      {/* ── Find match — главный CTA ── */}
      {!searching && !activeMatch && (
        <div className="glass rounded-[28px] px-8 py-12 text-center rk-fade-up rk-float" style={{ boxShadow: '0 8px 40px rgba(139,92,246,0.12), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px rgba(255,255,255,0.70)' }}>

          {/* Social proof: avatars of community members */}
          {recentProfiles && recentProfiles.length > 0 ? (
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="flex -space-x-3">
                {recentProfiles.slice(0, 5).map((p) => (
                  <div key={p.id}
                    className="w-10 h-10 rounded-full border-2 border-[var(--surface)] bg-[var(--accent)] flex items-center justify-center text-[10px] font-black text-[var(--text)] overflow-hidden shadow-sm"
                  >
                    {p.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatar_url} alt={p.full_name} width={40} height={40} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      p.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)
                    )}
                  </div>
                ))}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-[var(--text)]">
                  {searchersCount > 0 ? `${searchersCount} в поиске` : `${recentProfiles.length}+ участников`}
                </p>
                <p className="text-xs text-[var(--text-3)]">Кто-то из них — твоя пара</p>
              </div>
            </div>
          ) : searchersCount > 0 ? (
            <div className="flex items-center justify-center gap-1.5 mb-8">
              <span className="w-2 h-2 rounded-full bg-green-500 rk-pulse" />
              <p className="text-sm text-[var(--text-3)]">Сейчас в поиске: {searchersCount} человек</p>
            </div>
          ) : (
            <div className="mb-8" />
          )}

          <div className="inline-block px-4 py-1.5 rounded-full text-[12px] font-semibold tracking-wider uppercase mb-5"
            style={{ background: 'rgba(167,139,250,0.18)', color: '#5b21b6', border: '1px solid rgba(167,139,250,0.30)' }}>
            ✦ Нетворкинг нового уровня
          </div>

          <h2 className="text-[28px] font-black mb-3 tracking-tight leading-tight" style={{ color: '#1e1b4b' }}>
            Найди своего человека<br />в бизнесе
          </h2>
          <p className="text-sm max-w-xs mx-auto leading-relaxed mb-8" style={{ color: '#4c1d95', opacity: 0.75 }}>
            Умный алгоритм подберёт человека по ценностям, стилю работы и взаимодополняемости
          </p>

          {searchError && (
            <p className="text-sm text-red-400 bg-red-50/80 border border-red-200/60 px-4 py-2.5 rounded-xl mb-5 text-left">
              {searchError}
            </p>
          )}

          <button
            onClick={handleNewMatch}
            disabled={loading}
            className="inline-flex items-center gap-2.5 px-9 py-3.5 font-semibold text-base tracking-tight glow-btn rk-btn"
          >
            <Sparkles size={16} />
            Запустить подбор
          </button>
        </div>
      )}

      {/* ── Active match ── */}
      {!searching && activeMatch && (() => {
        const partner    = getPartner(activeMatch)
        const whyMatched = partner ? buildWhyMatched(myProfile, partner) : (activeMatch.match_reason ?? null)
        const s          = dbMeeting?.status

        return (
          <div className="space-y-3 rk-fade-up">
            <h2 className="text-[22px] font-bold text-[var(--text)] tracking-tight">Твоя текущая пара 🎉</h2>

            <div className="glass rounded-2xl border-2 border-[var(--accent)] shadow-lg overflow-hidden">
              {/* Why matched */}
              {whyMatched && (
                <div className="bg-white/20 px-5 py-3 flex items-center gap-2">
                  <Sparkles size={14} className="text-[var(--text)] shrink-0" />
                  <p className="text-sm font-bold text-[var(--text)]">Почему вы совпали: {whyMatched}</p>
                </div>
              )}

              <div className="p-5">
                {partner && <ProfileCard profile={partner} />}
              </div>

              {/* Meeting info row */}
              {dbMeeting && s !== 'completed' && (
                <div className={`mx-5 mb-3 flex items-center gap-2 px-4 py-3 rounded-xl border ${
                  s === 'confirmed'
                    ? 'bg-green-50/80 border-green-300/60'
                    : s === 'reschedule_requested'
                    ? 'bg-blue-50/80 border-blue-300/60'
                    : s === 'awaiting_response'
                    ? 'bg-amber-50/80 border-amber-300/60'
                    : s === 'declined'
                    ? 'bg-[var(--surface-2)] border-[var(--border)]'
                    : 'bg-[var(--blue-light)] border-[var(--blue-mid)]'
                }`}>
                  <Calendar size={14} className="shrink-0 text-current opacity-60" />
                  <span className="text-sm flex-1">
                    <span className="font-bold">{
                      s === 'confirmed'            ? 'Встреча подтверждена: ' :
                      s === 'awaiting_response'    ? 'Ждём ответа: ' :
                      s === 'reschedule_requested' ? 'Новое предложение: ' :
                      s === 'declined'             ? 'Отклонено: ' :
                      'Встреча: '
                    }</span>
                    {fmtDate(dbMeeting.scheduled_at)}
                    {dbMeeting.format && dbMeeting.format !== 'any' ? ` · ${fmtFormat(dbMeeting.format)}` : ''}
                  </span>
                  {/* Edit button only for initiator when status allows */}
                  {(s === 'awaiting_response' || s === 'declined') && isInitiator && (
                    <button
                      onClick={() => {
                        if (dbMeeting.scheduled_at) setProposeDate(new Date(dbMeeting.scheduled_at).toISOString().slice(0, 16))
                        if (dbMeeting.format === 'online' || dbMeeting.format === 'offline') setProposeFormat(dbMeeting.format)
                        setShowPropose(true)
                      }}
                      className="text-current opacity-50 hover:opacity-100 transition-opacity"
                      aria-label="Изменить предложение"
                    >
                      <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              )}

              {/* Comment from last proposal */}
              {dbMeeting?.comment && s !== 'completed' && (
                <div className="mx-5 mb-3 px-4 py-2 glass-sm rounded-xl">
                  <p className="text-xs text-[var(--text-2)] leading-relaxed">
                    <span className="font-semibold">Комментарий: </span>{dbMeeting.comment}
                  </p>
                </div>
              )}

              {/* ── ACTION BUTTONS ── */}
              <div className="px-5 pb-5 space-y-2">

                {/* No meeting yet — show propose + message */}
                {!dbMeeting && (
                  <div className="flex gap-2">
                    <Link href={`/chat/${activeMatch.id}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 glass-sm text-[var(--text)] rounded-xl font-bold text-sm hover:bg-white/35 transition-colors">
                      <MessageCircle size={14} /> Написать
                    </Link>
                    <button onClick={() => setShowPropose(true)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-[var(--border)] text-[var(--text)] rounded-xl font-bold text-sm hover:bg-white/25 transition-colors">
                      <Calendar size={14} /> Предложить встречу
                    </button>
                  </div>
                )}

                {/* Awaiting response: INITIATOR sees "cancel" + "message" */}
                {s === 'awaiting_response' && isInitiator && (
                  <div className="flex gap-2">
                    <Link href={`/chat/${activeMatch.id}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 glass-sm text-[var(--text)] rounded-xl font-bold text-sm hover:bg-white/35 transition-colors">
                      <MessageCircle size={14} /> Написать
                    </Link>
                    <div className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/50 border border-white/60 text-[var(--text-2)] rounded-xl text-sm text-center">
                      <Clock size={14} /> Ждём ответа…
                    </div>
                  </div>
                )}

                {/* Awaiting response: PARTNER sees confirm / reschedule / decline */}
                {s === 'awaiting_response' && isPartner && (
                  <>
                    <div className="p-3 glass-accent rounded-xl mb-1">
                      <p className="text-sm font-bold text-[var(--text)] mb-0.5">Тебя приглашают на встречу</p>
                      <p className="text-xs text-[var(--text-2)]">
                        {fmtDate(dbMeeting!.scheduled_at)} · {fmtFormat(dbMeeting!.format)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={confirmMeeting} disabled={meetingLoading}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40">
                        <Check size={14} /> Подтвердить
                      </button>
                      <button onClick={() => { if (dbMeeting?.scheduled_at) setRescheduleDate(new Date(dbMeeting.scheduled_at).toISOString().slice(0, 16)); setShowReschedule(true) }}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 glass-sm text-[var(--text)] rounded-xl font-bold text-sm transition-colors">
                        <RefreshCw size={14} /> Другое время
                      </button>
                    </div>
                    <button onClick={declineMeeting} disabled={meetingLoading}
                      className="w-full flex items-center justify-center gap-2 py-2 border border-[var(--border)] text-[var(--text-3)] rounded-xl text-sm hover:bg-red-50/80 hover:text-red-600 hover:border-red-200/60 transition-all">
                      <X size={13} /> Отклонить встречу
                    </button>
                  </>
                )}

                {/* Reschedule requested: INITIATOR sees confirm new time / propose again / message */}
                {s === 'reschedule_requested' && isInitiator && (
                  <>
                    <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-300/60 mb-1">
                      <p className="text-sm font-bold text-[var(--text)] mb-0.5">Собеседник предлагает другое время</p>
                      <p className="text-xs text-blue-700">
                        {fmtDate(dbMeeting!.scheduled_at)} · {fmtFormat(dbMeeting!.format)}
                        {dbMeeting!.comment ? ` · "${dbMeeting!.comment}"` : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={acceptReschedule} disabled={meetingLoading}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-40 transition-opacity">
                        <Check size={14} /> Принять
                      </button>
                      <button onClick={() => setShowPropose(true)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-[var(--border)] text-[var(--text)] rounded-xl font-bold text-sm hover:bg-white/25 transition-colors">
                        <Calendar size={14} /> Предложить другое
                      </button>
                    </div>
                    <Link href={`/chat/${activeMatch.id}`}
                      className="w-full flex items-center justify-center gap-2 py-2 glass-sm text-[var(--text-2)] rounded-xl text-sm hover:bg-white/35 transition-colors">
                      <MessageCircle size={13} /> Обсудить в чате
                    </Link>
                  </>
                )}

                {/* Reschedule requested: PARTNER waits */}
                {s === 'reschedule_requested' && isPartner && (
                  <div className="flex gap-2">
                    <Link href={`/chat/${activeMatch.id}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 glass-sm text-[var(--text)] rounded-xl font-bold text-sm hover:bg-white/35 transition-colors">
                      <MessageCircle size={14} /> Написать
                    </Link>
                    <div className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/50 border border-white/60 text-[var(--text-2)] rounded-xl text-sm">
                      <Clock size={14} /> Ждём ответа…
                    </div>
                  </div>
                )}

                {/* Declined — initiator can re-propose */}
                {s === 'declined' && isInitiator && (
                  <div className="flex gap-2">
                    <button onClick={() => setShowPropose(true)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 glass-sm text-[var(--text)] rounded-xl font-bold text-sm hover:bg-white/35 transition-colors">
                      <Calendar size={14} /> Предложить другое время
                    </button>
                    <Link href={`/chat/${activeMatch.id}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 glass-sm text-[var(--text-2)] rounded-xl text-sm hover:bg-white/35 transition-colors">
                      <MessageCircle size={13} /> Написать
                    </Link>
                  </div>
                )}

                {/* Confirmed — show chat + "mark completed" */}
                {s === 'confirmed' && (
                  <>
                    <div className="flex gap-2">
                      <Link href={`/chat/${activeMatch.id}`}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 glass-sm text-[var(--text)] rounded-xl font-bold text-sm hover:bg-white/35 transition-colors">
                        <MessageCircle size={14} /> Написать
                      </Link>
                    </div>
                    <div className="pt-1 border-t border-[var(--border)]">
                      <button onClick={() => setShowRating(true)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-500 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">
                        <Check size={14} /> Встреча состоялась
                      </button>
                    </div>
                  </>
                )}

                {/* Completed + not yet rated */}
                {s === 'completed' && !alreadyRated && (
                  <button onClick={() => setShowRating(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-[var(--accent)] text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">
                    <Star size={14} /> Оставить отзыв
                  </button>
                )}
                {s === 'completed' && alreadyRated && (
                  <p className="text-center text-sm text-green-600 font-semibold py-2">✅ Отзыв сохранён — спасибо!</p>
                )}

                {/* Skip — always available (except completed) */}
                {s !== 'completed' && (
                  <div className="pt-0.5">
                    <button onClick={() => markDeclined(activeMatch.id)}
                      className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-[var(--text-3)] hover:text-red-500 transition-colors">
                      <X size={12} /> Пропустить эту пару
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── History ── */}
      {!embedded && matches.filter((m) => m.status !== 'pending').length > 0 && (
        <div>
          <h2 className="text-[20px] font-semibold text-[var(--text)] tracking-tight mb-3">История пар</h2>
          <div className="space-y-3">
            {matches.filter((m) => m.status !== 'pending').map((match) => {
              const partner = getPartner(match)
              return (
                <div key={match.id} className="glass rounded-xl p-4 flex items-center gap-3 rk-card">
                  {partner && (
                    <>
                      <div className="w-10 h-10 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-black text-sm shrink-0">
                        {partner.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[var(--text)] truncate">{partner.full_name}</p>
                        <p className="text-xs text-[var(--text-2)]">
                          {new Date(match.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full border ${historyStatusColor[match.status] ?? 'bg-[var(--surface-2)] text-[var(--text-3)] border-[var(--border)]'}`}>
                        {historyStatusLabel[match.status] ?? match.status}
                      </span>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          MODALS
      ══════════════════════════════════════ */}

      {/* ── Propose meeting modal ── */}
      {showPropose && (
        <div className="fixed inset-0 rk-overlay flex items-end sm:items-center justify-center z-50 sm:p-4"
          role="dialog" aria-modal="true" aria-labelledby="propose-title"
          onClick={() => setShowPropose(false)}>
          <div className="rk-modal w-full sm:max-w-sm p-6 sm:p-7"
            onClick={(e) => e.stopPropagation()}>
            <h3 id="propose-title" className="font-black text-lg">📅 Предложить встречу</h3>
            <p className="text-sm text-[rgba(15,23,42,0.62)] mt-1.5 mb-6">Собеседник получит уведомление и сможет подтвердить</p>
            <div className="space-y-5">
              <div>
                <label htmlFor="propose-date" className="block text-sm font-semibold text-[#0F172A] mb-2">Дата и время</label>
                <input id="propose-date" type="datetime-local"
                  value={proposeDate} onChange={(e) => setProposeDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="rk-modal-input" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0F172A] mb-2" id="propose-format-label">Формат</p>
                <div className="grid grid-cols-2 gap-2.5" role="group" aria-labelledby="propose-format-label">
                  {(['online', 'offline'] as const).map((fmt) => (
                    <button key={fmt} type="button" aria-pressed={proposeFormat === fmt} onClick={() => setProposeFormat(fmt)}
                      className={`flex items-center justify-center gap-2 py-3 rounded-[14px] border-2 text-sm font-semibold transition-all ${
                        proposeFormat === fmt
                          ? 'border-[rgba(15,23,42,0.55)] bg-[rgba(15,23,42,0.06)] text-[#0F172A]'
                          : 'border-[rgba(15,23,42,0.10)] text-[rgba(15,23,42,0.55)] hover:border-[rgba(15,23,42,0.25)]'
                      }`}>
                      {fmt === 'online' ? <><Wifi size={15} /> Онлайн</> : <><MapPin size={15} /> Оффлайн</>}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="propose-comment" className="block text-sm font-semibold text-[#0F172A] mb-2">
                  Комментарий <span className="text-[rgba(15,23,42,0.40)] font-normal">(необязательно)</span>
                </label>
                <input id="propose-comment" type="text"
                  value={proposeComment} onChange={(e) => setProposeComment(e.target.value)}
                  placeholder="Например: Zoom 30 мин, или кофейня…"
                  className="rk-modal-input" />
              </div>
            </div>
            <div className="flex gap-3 mt-7">
              <button onClick={() => setShowPropose(false)}
                className="rk-modal-btn-secondary flex-1 py-3 rounded-[14px] text-sm font-medium">
                Отмена
              </button>
              <button onClick={proposeMeeting} disabled={!proposeDate || meetingLoading}
                className="rk-modal-btn-primary flex-1 py-3 rounded-[14px] text-sm">
                {meetingLoading ? 'Отправляем…' : 'Отправить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reschedule modal (partner) ── */}
      {showReschedule && (
        <div className="fixed inset-0 rk-overlay flex items-end sm:items-center justify-center z-50 sm:p-4"
          role="dialog" aria-modal="true" aria-labelledby="reschedule-title"
          onClick={() => setShowReschedule(false)}>
          <div className="rk-modal w-full sm:max-w-sm p-6 sm:p-7"
            onClick={(e) => e.stopPropagation()}>
            <h3 id="reschedule-title" className="font-black text-lg">⏰ Предложить другое время</h3>
            <p className="text-sm text-[rgba(15,23,42,0.62)] mt-1.5 mb-6">Инициатор встречи получит уведомление</p>
            <div className="space-y-5">
              <div>
                <label htmlFor="reschedule-date" className="block text-sm font-semibold text-[#0F172A] mb-2">Дата и время</label>
                <input id="reschedule-date" type="datetime-local"
                  value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="rk-modal-input" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0F172A] mb-2" id="reschedule-format-label">Формат</p>
                <div className="grid grid-cols-2 gap-2.5" role="group" aria-labelledby="reschedule-format-label">
                  {(['online', 'offline'] as const).map((fmt) => (
                    <button key={fmt} type="button" aria-pressed={rescheduleFormat === fmt} onClick={() => setRescheduleFormat(fmt)}
                      className={`flex items-center justify-center gap-2 py-3 rounded-[14px] border-2 text-sm font-semibold transition-all ${
                        rescheduleFormat === fmt
                          ? 'border-[rgba(15,23,42,0.55)] bg-[rgba(15,23,42,0.06)] text-[#0F172A]'
                          : 'border-[rgba(15,23,42,0.10)] text-[rgba(15,23,42,0.55)] hover:border-[rgba(15,23,42,0.25)]'
                      }`}>
                      {fmt === 'online' ? <><Wifi size={15} /> Онлайн</> : <><MapPin size={15} /> Оффлайн</>}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="reschedule-comment" className="block text-sm font-semibold text-[#0F172A] mb-2">
                  Комментарий <span className="text-[rgba(15,23,42,0.40)] font-normal">(необязательно)</span>
                </label>
                <input id="reschedule-comment" type="text"
                  value={rescheduleComment} onChange={(e) => setRescheduleComment(e.target.value)}
                  placeholder="Почему предлагаешь другое время?"
                  className="rk-modal-input" />
              </div>
            </div>
            <div className="flex gap-3 mt-7">
              <button onClick={() => setShowReschedule(false)}
                className="rk-modal-btn-secondary flex-1 py-3 rounded-[14px] text-sm font-medium">
                Отмена
              </button>
              <button onClick={requestReschedule} disabled={!rescheduleDate || meetingLoading}
                className="rk-modal-btn-primary flex-1 py-3 rounded-[14px] text-sm">
                {meetingLoading ? 'Отправляем…' : 'Предложить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rating modal ── */}
      {showRating && (
        <div className="fixed inset-0 rk-overlay flex items-end sm:items-center justify-center z-50 sm:p-4"
          role="dialog" aria-modal="true" aria-labelledby="rating-title"
          onClick={() => setShowRating(false)}>
          <div className="rk-modal w-full sm:max-w-sm p-6 sm:p-7"
            onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">☕</div>
              <h3 id="rating-title" className="font-black text-xl">Как прошло?</h3>
              <p className="text-sm text-[rgba(15,23,42,0.62)] mt-1.5">Это улучшит подбор следующей пары</p>
            </div>
            <div className="flex justify-center gap-1 mb-6" role="group" aria-label="Оценка встречи">
              {[1,2,3,4,5].map((star) => (
                <button key={star} onClick={() => setRating(star)}
                  aria-label={`${star} из 5`} aria-pressed={star <= rating}
                  className="transition-transform hover:scale-110 active:scale-95">
                  <Star size={38}
                    className={star <= rating ? 'text-amber-400' : 'text-[rgba(15,23,42,0.15)]'}
                    fill={star <= rating ? 'currentColor' : 'none'}
                    strokeWidth={1.5} />
                </button>
              ))}
            </div>
            <p className="text-sm font-semibold text-[#0F172A] text-center mb-3">Хочешь ещё встретиться с этим человеком?</p>
            <div className="grid grid-cols-2 gap-2.5" role="group" aria-label="Повторная встреча">
              <button onClick={() => setWantAgain(true)} aria-pressed={wantAgain === true}
                className={`py-3 rounded-[14px] border-2 text-sm font-semibold transition-all ${
                  wantAgain === true
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-[rgba(15,23,42,0.10)] text-[rgba(15,23,42,0.55)] hover:border-green-400'
                }`}>
                👍 Да, хочу
              </button>
              <button onClick={() => setWantAgain(false)} aria-pressed={wantAgain === false}
                className={`py-3 rounded-[14px] border-2 text-sm font-semibold transition-all ${
                  wantAgain === false
                    ? 'border-[rgba(15,23,42,0.22)] bg-[rgba(15,23,42,0.05)] text-[rgba(15,23,42,0.55)]'
                    : 'border-[rgba(15,23,42,0.10)] text-[rgba(15,23,42,0.55)] hover:border-[rgba(15,23,42,0.22)]'
                }`}>
                🔄 Другого
              </button>
            </div>
            <div className="flex gap-3 mt-7">
              <button onClick={() => setShowRating(false)}
                className="rk-modal-btn-secondary flex-1 py-3 rounded-[14px] text-sm font-medium">
                Позже
              </button>
              <button onClick={submitRating} disabled={rating === 0 || wantAgain === null || ratingLoading}
                className="rk-modal-btn-primary flex-1 py-3 rounded-[14px] text-sm">
                {ratingLoading ? 'Сохраняем…' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
