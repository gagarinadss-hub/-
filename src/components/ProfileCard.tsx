import type { Profile } from '@/lib/types'
import { Target, Lightbulb } from 'lucide-react'
import NextImage from 'next/image'

type Props = { profile: Profile; compact?: boolean }

export function Avatar({
  name,
  avatarUrl,
  size = 'md',
}: {
  name: string
  avatarUrl: string | null
  size?: 'sm' | 'md' | 'lg'
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
        className={`${sizeClass} rounded-full object-cover border-2 border-[var(--border)]`}
        loading="lazy"
        unoptimized={!avatarUrl.startsWith(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')}
      />
    )
  }
  return (
    <div className={`${sizeClass} rounded-full bg-[var(--accent)] text-[var(--text)] flex items-center justify-center font-black shrink-0`}
      aria-label={name} role="img">
      {initials}
    </div>
  )
}

const GOAL_LABELS: Record<string, string> = {
  нетворк:     '🤝 Нетворкинг',
  партнёрство: '🚀 Партнёрство',
  менторство:  '🧠 Менторство',
  дружба:      '😊 Дружба',
  инвестиции:  '💰 Инвестиции',
  найм:        '👥 Найм',
}

export default function ProfileCard({ profile, compact = false }: Props) {
  const interests   = profile.interests   ?? []
  const lookingFor  = profile.looking_for ?? []

  if (compact) {
    return (
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 flex items-center gap-3 rk-card">
        <Avatar name={profile.full_name} avatarUrl={profile.avatar_url} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-[var(--text)] truncate">{profile.full_name}</p>
          <p className="text-sm text-[var(--text-2)] truncate">
            {profile.profession ?? ''}
            {profile.city ? ` · ${profile.city}` : ''}
          </p>
          {lookingFor.length > 0 && (
            <p className="text-xs text-[var(--text-3)] mt-0.5 truncate">
              {lookingFor.slice(0, 2).map((g) => GOAL_LABELS[g] ?? g).join(' · ')}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow)] rk-card rk-fade-up">
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <Avatar name={profile.full_name} avatarUrl={profile.avatar_url} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="font-black text-lg text-[var(--text)]">{profile.full_name}</h3>
          <p className="text-[var(--text-2)] text-sm">
            {profile.profession ?? ''}
            {profile.city ? ` · 📍 ${profile.city}` : ''}
          </p>
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="text-sm text-[var(--text-2)] mb-4 leading-relaxed">{profile.bio}</p>
      )}

      {/* Interests tags */}
      {interests.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {interests.slice(0, 6).map((tag) => (
            <span key={tag} className="text-xs px-2.5 py-1 bg-[var(--sand-light)] text-[var(--text-2)] rounded-full font-medium border border-[var(--sand)]">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Goals & help */}
      <div className="space-y-2.5">
        {lookingFor.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {lookingFor.map((g) => (
              <span key={g} className="text-xs px-2.5 py-1 bg-[var(--sand-light)] text-[var(--text-2)] rounded-full font-medium">
                {GOAL_LABELS[g] ?? g}
              </span>
            ))}
          </div>
        )}
        {profile.goals && (
          <div className="flex gap-2.5 bg-[var(--sand-light)] rounded-xl p-3">
            <Target size={15} className="text-[var(--text)] shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-[var(--text)] uppercase tracking-wide">Цели</span>
              <p className="text-sm text-[var(--text)] mt-0.5">{profile.goals}</p>
            </div>
          </div>
        )}
        {profile.help_with && (
          <div className="flex gap-2.5 bg-[var(--surface-2)] rounded-xl p-3">
            <Lightbulb size={15} className="text-[var(--text)] shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-[var(--text)] uppercase tracking-wide">Чем могу помочь</span>
              <p className="text-sm text-[var(--text)] mt-0.5">{profile.help_with}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
