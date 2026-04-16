'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, RefreshCw, Coffee, Shuffle } from 'lucide-react'
import type { Profile } from '@/lib/types'

type WidgetState = 'idle' | 'searching' | 'found' | 'notFound' | 'error'

interface FindResult {
  profile: Profile | null
  score: number
  commonInterests: string[]
  commonGoals: string[]
}

interface Props {
  myProfileId: string
  myInterests: string[]
}

const SEARCH_TEXTS = [
  'Ищем человека под твой запрос…',
  'Анализируем интересы и цели…',
  'Сопоставляем опыт…',
  'Проверяем совместимость…',
  'Почти нашли идеальный мэтч…',
  'Финальная проверка…',
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function FindPairWidget({ myProfileId, myInterests }: Props) {
  const router = useRouter()
  const [state, setState] = useState<WidgetState>('idle')
  const [result, setResult] = useState<FindResult | null>(null)
  const [textIndex, setTextIndex] = useState(0)
  const [textVisible, setTextVisible] = useState(true)
  const [progress, setProgress] = useState(0)
  const [matchLoading, setMatchLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startSearch = () => {
    setState('searching')
    setTextIndex(0)
    setTextVisible(true)
    setProgress(0)
    setResult(null)
  }

  useEffect(() => {
    if (state !== 'searching') return

    // Text cycling every ~900ms with fade
    let currentIndex = 0
    const textInterval = setInterval(() => {
      setTextVisible(false)
      setTimeout(() => {
        currentIndex = (currentIndex + 1) % SEARCH_TEXTS.length
        setTextIndex(currentIndex)
        setTextVisible(true)
      }, 200)
    }, 900)

    // Total duration: 2500–3500ms
    const duration = 2500 + Math.random() * 1000

    // Progress bar
    const startTime = Date.now()
    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const pct = Math.min(100, (elapsed / duration) * 100)
      setProgress(pct)
    }, 50)

    // Fetch
    const controller = new AbortController()
    abortRef.current = controller

    const fetchAndFinish = async () => {
      try {
        const res = await fetch('/api/find-match', { signal: controller.signal })
        const data: FindResult = await res.json() as FindResult

        // Wait for remainder of animation duration
        const elapsed = Date.now() - startTime
        const remaining = Math.max(0, duration - elapsed)
        await new Promise<void>((r) => setTimeout(r, remaining))

        setProgress(100)
        clearInterval(textInterval)
        if (progressTimerRef.current) clearInterval(progressTimerRef.current)

        if (data.profile) {
          setResult(data)
          setState('found')
        } else {
          setState('notFound')
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return
        clearInterval(textInterval)
        if (progressTimerRef.current) clearInterval(progressTimerRef.current)
        setState('error')
      }
    }

    void fetchAndFinish()

    return () => {
      clearInterval(textInterval)
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)
      controller.abort()
    }
  }, [state])

  const handleFindAnother = () => {
    startSearch()
  }

  const handleScheduleMeeting = async () => {
    if (!result?.profile) return
    setMatchLoading(true)
    try {
      const res = await fetch('/api/find-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetProfileId: result.profile.id }),
      })
      const data = await res.json() as { matchId?: string; error?: string }
      if (data.matchId) {
        router.push(`/chat/${data.matchId}`)
      }
    } finally {
      setMatchLoading(false)
    }
  }

  // ── IDLE ────────────────────────────────────────────
  if (state === 'idle') {
    return (
      <div className="glass rounded-2xl border-2 border-dashed border-white/25 p-8 text-center">
        <div className="w-14 h-14 bg-[var(--accent)] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Shuffle size={22} className="text-[var(--text)]" />
        </div>
        <h3 className="font-black text-[var(--text)] text-lg mb-1">Ищем тебе пару ☕</h3>
        <p className="text-sm text-[var(--text-2)] mb-2 leading-relaxed">
          Мы подбираем собеседника из твоей сферы.<br />Это происходит автоматически каждые 2 недели.
        </p>
        <p className="text-xs text-[var(--text-3)] mb-5">Или найди сам прямо сейчас →</p>
        <button
          onClick={startSearch}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--text)] text-white rounded-xl text-sm font-black hover:opacity-80 transition-opacity rk-btn"
        >
          ✨ Найти мне интересного человека
        </button>
      </div>
    )
  }

  // ── SEARCHING ───────────────────────────────────────
  if (state === 'searching') {
    return (
      <div className="glass rounded-2xl p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="border-4 border-[var(--text-3)] border-t-[var(--text)] rounded-full w-12 h-12 animate-spin" />
          <p
            className="font-bold text-[var(--text)] text-sm text-center transition-opacity duration-200"
            style={{ opacity: textVisible ? 1 : 0 }}
          >
            {SEARCH_TEXTS[textIndex]}
          </p>
          <div className="w-full bg-[var(--text-3)] rounded-full h-1.5 overflow-hidden" style={{ opacity: 0.3 }}>
            <div
              className="h-full bg-[var(--text)] rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  // ── NOT FOUND ───────────────────────────────────────
  if (state === 'notFound') {
    return (
      <div className="glass rounded-2xl p-6 text-center">
        <p className="text-2xl mb-2">🔍</p>
        <p className="font-bold text-[var(--text)] text-base mb-1">Нет участников</p>
        <p className="text-sm text-[var(--text-2)] mb-4">
          Сейчас нет активных участников для подбора. Попробуй позже.
        </p>
        <button
          onClick={() => setState('idle')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-xl text-sm font-bold hover:opacity-80 transition-opacity"
        >
          <RefreshCw size={14} /> Попробовать снова
        </button>
      </div>
    )
  }

  // ── ERROR ───────────────────────────────────────────
  if (state === 'error') {
    return (
      <div className="glass rounded-2xl p-6 text-center">
        <p className="text-2xl mb-2">⚠️</p>
        <p className="font-bold text-[var(--text)] text-base mb-1">Что-то пошло не так</p>
        <p className="text-sm text-[var(--text-2)] mb-4">Произошла ошибка. Попробуй ещё раз.</p>
        <button
          onClick={() => setState('idle')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-xl text-sm font-bold hover:opacity-80 transition-opacity"
        >
          <RefreshCw size={14} /> Попробовать снова
        </button>
      </div>
    )
  }

  // ── FOUND ───────────────────────────────────────────
  if (state === 'found' && result && result.profile) {
    const p = result.profile
    const { score, commonInterests, commonGoals } = result
    const scoreColor = score > 85 ? '#86efac' : score > 70 ? '#fde68a' : 'rgba(255,255,255,0.50)'
    const displayInterests = commonInterests.slice(0, 4)
    const displayGoals = commonGoals.slice(0, 4)

    return (
      <div className="glass rounded-2xl border border-white/35 p-5">
        {/* Badge */}
        <div className="flex justify-end mb-3">
          <span className="text-xs font-semibold bg-white/45 text-[var(--text-2)] px-2.5 py-1 rounded-full">
            ✨ Мэтч найден
          </span>
        </div>

        {/* Score bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-bold text-[var(--text)]">
              🎯{' '}
              <span style={{ color: scoreColor }}>{score}%</span> совпадение
            </span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-white/70 rounded-full"
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        {/* Profile */}
        <div className="flex items-start gap-3 mb-4">
          <div
            className="shrink-0 rounded-full bg-white/40 flex items-center justify-center font-black text-[var(--text)] text-sm"
            style={{ width: 52, height: 52 }}
          >
            {getInitials(p.full_name ?? '?')}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-black text-[var(--text)] text-lg leading-tight">{p.full_name}</p>
            {p.profession && (
              <p className="text-sm text-[var(--text-2)] mt-0.5">{p.profession}</p>
            )}
            {p.city && (
              <p className="text-xs text-[var(--text-3)] mt-0.5">📍 {p.city}</p>
            )}
            {p.bio && (
              <p className="text-sm text-[var(--text-2)] mt-1 line-clamp-2 leading-snug">{p.bio}</p>
            )}
          </div>
        </div>

        {/* Common interests */}
        {displayInterests.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-[var(--text-3)] mb-1.5">Общие темы:</p>
            <div className="flex flex-wrap gap-1.5">
              {displayInterests.map((interest) => (
                <span
                  key={interest}
                  className="rk-tag"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Common goals */}
        {displayGoals.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-[var(--text-3)] mb-1.5">Общие цели:</p>
            <div className="flex flex-wrap gap-1.5">
              {displayGoals.map((goal) => (
                <span
                  key={goal}
                  className="text-xs px-2.5 py-1 bg-[var(--accent)] text-white rounded-full font-semibold"
                >
                  {goal}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleScheduleMeeting}
            disabled={matchLoading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold glow-btn"
          >
            {matchLoading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Coffee size={14} />
            )}
            Назначить встречу ☕
          </button>
          <button
            onClick={handleFindAnother}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 glass-sm text-[var(--text)] rounded-xl text-sm font-bold hover:bg-white/35"
          >
            <Sparkles size={14} /> Найти другого →
          </button>
        </div>
      </div>
    )
  }

  return null
}
