'use client'

import type { Profile } from '@/lib/types'
import { Target, Lightbulb, Send, MessageCircle, Calendar, Star } from 'lucide-react'
import NextImage from 'next/image'
import Link from 'next/link'

// ── Telegram link ──────────────────────────────────────────────────────────────
function TelegramLink({ username, compact = false }: { username: string; compact?: boolean }) {
  const handle = username.startsWith('@') ? username.slice(1) : username
  const url    = `https://t.me/${handle}`
  const label  = username.startsWith('@') ? username : `@${username}`

  if (compact) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1 text-[10px] font-bold text-[#229ED9] hover:text-[#1a8bbf] transition-colors mt-1.5"
        aria-label={`Написать в Telegram: ${label}`}
      >
        <Send size={10} />
        {label}
      </a>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-[#229ED9]/12 text-[#229ED9] hover:bg-[#229ED9]/20 border border-[#229ED9]/25 transition-all"
      aria-label={`Написать в Telegram: ${label}`}
    >
      <Send size={12} />
      {label}
    </a>
  )
}

// ── Avatar ─────────────────────────────────────────────────────────────────────

type AvatarSize = 'sm' | 'md' | 'lg'
export function Avatar({
  name,
  avatarUrl,
  size = 'md',
}: {
  name: string
  avatarUrl: string | null
  size?: AvatarSize
}) {
  const sizeClass =
    size === 'lg' ? 'w-20 h-20 text-2xl'
    : size === 'sm' ? 'w-10 h-10 text-sm'
    : 'w-14 h-14 text-lg'
  const px = size === 'lg' ? 80 : size === 'sm' ? 40 : 56
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  if (avatarUrl) {
    return (
      <NextImage
        src={avatarUrl}
        alt={name}
        width={px}
        height={px}
        className={`${sizeClass} rounded-full object-cover border-2 border-[var(--border)] shrink-0`}
        loading="lazy"
        unoptimized={!avatarUrl.startsWith(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')}
      />
    )
  }
  return (
    <div
      className={`${sizeClass} rounded-full bg-[var(--accent)] text-[var(--text)] flex items-center justify-center font-black shrink-0`}
      aria-label={name}
      role="img"
    >
      {initials}
    </div>
  )
}

// ── Goal labels ────────────────────────────────────────────────────────────────

const GOAL_LABELS: Record<string, string> = {
  нетворк:     '🤝 Нетворкинг',
  партнёрство: '🚀 Партнёрство',
  менторство:  '🧠 Менторство',
  дружба:      '😊 Дружба',
  инвестиции:  '💰 Инвестиции',
  найм:        '👥 Найм',
}

// ── Profile richness detection ─────────────────────────────────────────────────

function isRichProfile(profile: Profile): boolean {
  const interests  = profile.interests   ?? []
  const lookingFor = profile.looking_for ?? []
  return !!(profile.bio || profile.goals || profile.help_with) ||
    interests.length > 2 ||
    lookingFor.length > 0
}

// ── Minimal card (compact auto or forced) ──────────────────────────────────────

function MinimalCard({ profile, hint, badges }: { profile: Profile; hint?: string; badges?: string[] }) {
  const interests  = profile.interests   ?? []
  const lookingFor = profile.looking_for ?? []
  const tags = [
    ...interests.slice(0, 2),
    ...lookingFor.slice(0, 2).map((g) => GOAL_LABELS[g] ?? g),
  ].slice(0, 3)

  return (
    <div className="glass rounded-2xl p-4 flex items-start gap-3.5 cursor-pointer rk-card group">
      <Avatar name={profile.full_name} avatarUrl={profile.avatar_url} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="font-bold text-[15px] text-[var(--text)] truncate leading-snug">
          {profile.full_name}
        </p>
        {(profile.profession || profile.city) && (
          <p className="text-[13px] text-[var(--text-2)] truncate mt-0.5">
            {profile.profession ?? ''}
            {profile.city ? ` · ${profile.city}` : ''}
          </p>
        )}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map((tag) => (
              <span key={tag} className="rk-tag text-[11px] px-2 py-0.5">{tag}</span>
            ))}
          </div>
        )}
        {badges && badges.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {badges.map((b) => (
              <span key={b} className="text-[10px] font-bold px-2 py-0.5 bg-white/30 text-[var(--text)] rounded-full border border-white/40">
                {b}
              </span>
            ))}
          </div>
        )}
        {profile.username && <TelegramLink username={profile.username} compact />}
        {hint && (
          <div className="mt-2">
            <span className="inline-flex text-[10px] font-bold text-[var(--text)] bg-[var(--accent)] px-2.5 py-1 rounded-full">
              {hint}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Expanded card ──────────────────────────────────────────────────────────────

function ExpandedCard({
  profile, hint, badges, matchReason, meetingCount, rating, chatHref,
}: {
  profile: Profile
  hint?: string
  badges?: string[]
  matchReason?: string
  meetingCount?: number
  rating?: number | null
  chatHref?: string
}) {
  const interests  = profile.interests   ?? []
  const lookingFor = profile.looking_for ?? []
  const MAX_TAGS   = 4
  const extraTags  = Math.max(0, interests.length - MAX_TAGS)

  const detailLabel = profile.goals ? 'Цели' : profile.help_with ? 'Помогу с' : null
  const detailIcon  = profile.goals ? Target : Lightbulb
  const detailText  = profile.goals ?? profile.help_with ?? null

  const hasActions = !!(chatHref || profile.username)
  const hasMetrics = meetingCount !== undefined || (rating !== undefined && rating !== null)

  return (
    <div className="glass rounded-2xl p-5 cursor-pointer rk-card">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <Avatar name={profile.full_name} avatarUrl={profile.avatar_url} size="md" />
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="font-bold text-[17px] text-[var(--text)] leading-snug tracking-tight truncate">
            {profile.full_name}
          </h3>
          {(profile.profession || profile.city) && (
            <p className="text-[13px] text-[var(--text-2)] truncate mt-0.5">
              {profile.profession ?? ''}
              {profile.city ? ` · ${profile.city}` : ''}
            </p>
          )}
          {badges && badges.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {badges.map((b) => (
                <span key={b} className="text-[10px] font-bold px-2 py-0.5 bg-white/30 text-[var(--text)] rounded-full border border-white/40">
                  {b}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bio — 2 lines max */}
      {profile.bio && (
        <p className="text-[13px] text-[var(--text-2)] leading-relaxed mb-3 line-clamp-2">
          {profile.bio}
        </p>
      )}

      {/* Interest tags — max 4 + overflow pill */}
      {interests.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {interests.slice(0, MAX_TAGS).map((tag) => (
            <span key={tag} className="rk-tag">{tag}</span>
          ))}
          {extraTags > 0 && (
            <span className="rk-tag text-[var(--text-3)]">+{extraTags}</span>
          )}
        </div>
      )}

      {/* Looking-for goal pills */}
      {lookingFor.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {lookingFor.slice(0, 3).map((g) => (
            <span key={g} className="rk-tag text-[rgba(15,23,42,0.55)]">
              {GOAL_LABELS[g] ?? g}
            </span>
          ))}
        </div>
      )}

      {/* Single detail block */}
      {detailLabel && detailText && !matchReason && (
        <div className="flex gap-2 bg-white/20 rounded-xl px-3 py-2.5 mt-1 mb-3">
          {(() => {
            const Icon = detailIcon
            return <Icon size={13} className="text-[var(--text-3)] shrink-0 mt-0.5" />
          })()}
          <div className="min-w-0">
            <span className="text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-wider">
              {detailLabel}
            </span>
            <p className="text-[12px] text-[var(--text-2)] mt-0.5 line-clamp-2">{detailText}</p>
          </div>
        </div>
      )}

      {/* "Почему вы совпали" block */}
      {matchReason && (
        <div className="bg-[var(--accent-light)] border border-[var(--accent)]/30 rounded-xl px-3 py-2.5 mb-3">
          <p className="text-[10px] font-bold text-[var(--accent-dark)] uppercase tracking-wider mb-1">Почему вы совпали</p>
          <p className="text-[12px] text-[var(--text-2)] leading-relaxed">{matchReason}</p>
        </div>
      )}

      {/* Metrics row */}
      {hasMetrics && (
        <div className="flex gap-4 mb-3">
          {meetingCount !== undefined && (
            <div className="text-center">
              <p className="text-[16px] font-bold text-[var(--text)] leading-none">{meetingCount}</p>
              <p className="text-[11px] text-[var(--text-3)] mt-0.5">встреч</p>
            </div>
          )}
          {rating !== undefined && rating !== null && (
            <div className="text-center flex flex-col items-center">
              <div className="flex items-center gap-0.5">
                <p className="text-[16px] font-bold text-[var(--text)] leading-none">{rating.toFixed(1)}</p>
                <Star size={11} className="text-amber-400 fill-amber-400 mb-0.5" />
              </div>
              <p className="text-[11px] text-[var(--text-3)] mt-0.5">рейтинг</p>
            </div>
          )}
        </div>
      )}

      {/* Action buttons row */}
      {hasActions && (
        <div className="flex gap-2 mt-3">
          {chatHref && (
            <Link
              href={chatHref}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl glass-sm text-[var(--text)] hover:bg-white/45 transition-all"
            >
              <MessageCircle size={12} />
              Написать
            </Link>
          )}
          {chatHref && (
            <Link
              href="/matches"
              onClick={(e) => e.stopPropagation()}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl glass-sm text-[var(--text)] hover:bg-white/45 transition-all"
            >
              <Calendar size={12} />
              Встреча
            </Link>
          )}
          {profile.username && <TelegramLink username={profile.username} />}
        </div>
      )}

      {/* Telegram + hint row (when no chatHref) */}
      {!hasActions && (
        <div className="flex items-center flex-wrap gap-2 mt-3">
          {profile.username && <TelegramLink username={profile.username} />}
          {hint && (
            <span className="inline-flex text-[11px] font-bold text-[var(--text)] bg-[var(--accent)] px-3 py-1.5 rounded-full">
              {hint}
            </span>
          )}
        </div>
      )}

      {/* Hint when hasActions */}
      {hasActions && hint && (
        <div className="mt-2">
          <span className="inline-flex text-[10px] font-bold text-[var(--text)] bg-[var(--accent)] px-2.5 py-1 rounded-full">
            {hint}
          </span>
        </div>
      )}
    </div>
  )
}

// ── Public export ──────────────────────────────────────────────────────────────

type Props = {
  profile: Profile
  compact?: boolean
  hint?: string
  badges?: string[]
  matchReason?: string
  meetingCount?: number
  rating?: number | null
  chatHref?: string
}

export default function ProfileCard({ profile, compact, hint, badges, matchReason, meetingCount, rating, chatHref }: Props) {
  if (compact) return <MinimalCard profile={profile} hint={hint} badges={badges} />
  if (!isRichProfile(profile) && !matchReason && meetingCount === undefined && !chatHref) {
    return <MinimalCard profile={profile} hint={hint} badges={badges} />
  }
  return <ExpandedCard profile={profile} hint={hint} badges={badges} matchReason={matchReason} meetingCount={meetingCount} rating={rating} chatHref={chatHref} />
}
