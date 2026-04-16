'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import { Avatar } from '@/components/ProfileCard'
import Link from 'next/link'
import type { Profile } from '@/lib/types'

// ── Constants ──────────────────────────────────────────────────────────────────

const CARD_W  = 280   // px — fits mobile (375px) with ~50px peeks each side
const GAP     = 20    // px gap between cards
const STRIDE  = CARD_W + GAP

const GOAL_LABELS: Record<string, string> = {
  нетворк:     'Нетворкинг',
  партнёрство: 'Партнёрство',
  менторство:  'Менторство',
  дружба:      'Дружба',
  инвестиции:  'Инвестиции',
  найм:        'Найм',
}

// ── Carousel card ──────────────────────────────────────────────────────────────

function CarouselCard({ profile, active }: { profile: Profile; active: boolean }) {
  const interests  = profile.interests   ?? []
  const lookingFor = profile.looking_for ?? []

  const tags = [
    ...interests.slice(0, 2),
    ...lookingFor.slice(0, 1).map((g) => GOAL_LABELS[g] ?? g),
  ].slice(0, 3)

  const snippet = profile.bio ?? profile.goals ?? profile.help_with

  return (
    <div
      style={{ width: `${CARD_W}px` }}
      className={`h-[360px] shrink-0 rounded-3xl p-5 flex flex-col transition-[background,box-shadow] duration-350 select-none ${
        active
          ? 'glass shadow-[0_24px_64px_rgba(0,0,0,0.15),0_4px_16px_rgba(0,0,0,0.08)]'
          : 'glass-sm shadow-none'
      }`}
    >
      {/* Avatar + identity */}
      <div className="flex flex-col items-center text-center gap-3 pt-3">
        <div className={`rounded-full transition-all duration-350 ${active ? 'ring-2 ring-white/70 ring-offset-2 ring-offset-transparent' : ''}`}>
          <Avatar name={profile.full_name} avatarUrl={profile.avatar_url} size="lg" />
        </div>
        <div>
          <h3 className="font-bold text-[17px] text-[var(--text)] leading-tight tracking-tight">
            {profile.full_name}
          </h3>
          {(profile.profession || profile.city) && (
            <p className="text-[13px] text-[var(--text-2)] mt-0.5 leading-snug">
              {profile.profession ?? ''}
              {profile.city ? ` · ${profile.city}` : ''}
            </p>
          )}
        </div>
      </div>

      {/* Snippet */}
      <div className="flex-1 flex items-center justify-center py-3">
        {snippet ? (
          <p className="text-[13px] text-[var(--text-2)] text-center line-clamp-3 leading-relaxed px-1">
            {snippet}
          </p>
        ) : (
          <p className="text-[13px] text-[var(--text-3)] text-center italic">
            Участник сообщества
          </p>
        )}
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center mb-4">
          {tags.map((tag) => (
            <span key={tag} className="rk-tag text-[11px] px-2.5 py-1">{tag}</span>
          ))}
        </div>
      )}

      {/* CTA */}
      <Link
        href="/matches"
        tabIndex={active ? 0 : -1}
        className={`w-full py-2.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all duration-200 ${
          active
            ? 'glow-btn'
            : 'bg-white/20 text-[var(--text-2)] pointer-events-none'
        }`}
      >
        Предложить встречу <ArrowRight size={13} />
      </Link>
    </div>
  )
}

// ── Main carousel ──────────────────────────────────────────────────────────────

export default function ParticipantsCarousel({ profiles }: { profiles: Profile[] }) {
  const [activeIdx, setActiveIdx] = useState(0)

  const touchStartX     = useRef<number | null>(null)
  const touchStartY     = useRef<number | null>(null)
  const wheelCooldown   = useRef(false)

  const len = profiles.length

  const goTo = useCallback((i: number) => {
    setActiveIdx(((i % len) + len) % len)
  }, [len])

  const prev = useCallback(() => goTo(activeIdx - 1), [activeIdx, goTo])
  const next = useCallback(() => goTo(activeIdx + 1), [activeIdx, goTo])

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next])

  // Touch
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - (touchStartY.current ?? 0)
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      dx < 0 ? next() : prev()
    }
    touchStartX.current = null
  }

  // Trackpad / mouse wheel (horizontal)
  function onWheel(e: React.WheelEvent) {
    if (wheelCooldown.current) return
    const isHorizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY)
    if (!isHorizontal) return
    if (e.deltaX > 20) next()
    else if (e.deltaX < -20) prev()
    wheelCooldown.current = true
    setTimeout(() => { wheelCooldown.current = false }, 450)
  }

  if (len < 2) return null

  // Track is anchored at left:50%, then shifted so active card is centered
  const trackShift = -(activeIdx * STRIDE) - CARD_W / 2

  return (
    <section aria-label="Рекомендуемые участники">

      {/* Header row */}
      <div className="flex items-center justify-between mb-5 px-1">
        <div>
          <h2 className="font-bold text-[var(--text)] text-lg leading-tight">Обрати внимание</h2>
          <p className="text-sm text-[var(--text-2)] mt-0.5">Яркие участники сообщества</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={prev}
            aria-label="Предыдущий участник"
            className="w-9 h-9 rounded-full glass flex items-center justify-center hover:bg-white/50 transition-all focus-visible:ring-2 disabled:opacity-30"
          >
            <ChevronLeft size={16} className="text-[var(--text)]" />
          </button>
          <button
            onClick={next}
            aria-label="Следующий участник"
            className="w-9 h-9 rounded-full glass flex items-center justify-center hover:bg-white/50 transition-all focus-visible:ring-2"
          >
            <ChevronRight size={16} className="text-[var(--text)]" />
          </button>
        </div>
      </div>

      {/* Track container */}
      <div
        className="relative overflow-hidden"
        style={{ height: 380 }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onWheel={onWheel}
      >
        {/* Fade masks — left and right edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-12 z-10"
          style={{ background: 'linear-gradient(to right, rgba(255,255,255,0.15), transparent)' }} />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 z-10"
          style={{ background: 'linear-gradient(to left, rgba(255,255,255,0.15), transparent)' }} />

        {/* Flex track — left anchor at 50%, translateX moves it */}
        <div
          className="absolute top-0 h-full flex items-center"
          style={{
            left: '50%',
            gap: `${GAP}px`,
            transform: `translateX(${trackShift}px)`,
            transition: 'transform 0.38s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          {profiles.map((profile, idx) => {
            const dist    = Math.abs(idx - activeIdx)
            const scale   = dist === 0 ? 1 : dist === 1 ? 0.92 : 0.84
            const opacity = dist === 0 ? 1 : dist === 1 ? 0.62 : dist === 2 ? 0.28 : 0
            const blur    = dist === 0 ? 0 : dist === 1 ? 1.5 : 4

            return (
              <div
                key={profile.id}
                style={{
                  transform:      `scale(${scale})`,
                  opacity,
                  filter:         blur ? `blur(${blur}px)` : undefined,
                  transition:     'transform 0.38s cubic-bezier(0.4,0,0.2,1), opacity 0.38s ease, filter 0.38s ease',
                  transformOrigin:'center center',
                  pointerEvents:  dist > 1 ? 'none' : 'auto',
                  cursor:         dist > 0 ? 'pointer' : 'default',
                  willChange:     'transform, opacity',
                }}
                onClick={dist > 0 && dist <= 1 ? () => setActiveIdx(idx) : undefined}
                aria-hidden={dist > 1}
              >
                <CarouselCard profile={profile} active={idx === activeIdx} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 mt-3" role="tablist" aria-label="Карточки участников">
        {profiles.map((p, i) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={i === activeIdx}
            aria-label={`${p.full_name}`}
            onClick={() => goTo(i)}
            className={`rounded-full transition-all duration-300 ${
              i === activeIdx
                ? 'w-5 h-1.5 bg-[var(--accent-dark)]'
                : 'w-1.5 h-1.5 bg-[var(--text-3)] opacity-35 hover:opacity-70'
            }`}
          />
        ))}
      </div>
    </section>
  )
}
