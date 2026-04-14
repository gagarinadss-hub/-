export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types'
import ProfileCard from '@/components/ProfileCard'
import { Users } from 'lucide-react'

export default async function ParticipantsPage() {
  const supabase = await createClient()
  const { data: participants } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  const list = (participants ?? []) as Profile[]

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center gap-4 rk-fade-up">
        <div className="w-12 h-12 rounded-2xl bg-[var(--accent)] flex items-center justify-center shrink-0">
          <Users size={20} className="text-[var(--text)]" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-[var(--text)]">Участники</h1>
          <p className="text-sm text-[var(--text-2)]">
            {list.length > 0
              ? `${list.length} человек в сообществе`
              : 'Будьте первым участником'}
          </p>
        </div>
      </div>

      {/* Info chips */}
      {list.length > 0 && (
        <div className="flex flex-wrap gap-2 rk-fade-up-1">
          <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-full text-[var(--text-2)] font-semibold shadow-sm">
            👥 {list.length} участников в сообществе
          </span>
          <span className="text-xs px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-full text-[var(--text-2)] font-semibold shadow-sm">
            🔒 Только из сообщества
          </span>
        </div>
      )}

      {list.length === 0 ? (
        <div className="rk-fade-up-1 bg-[var(--surface)] rounded-2xl border-2 border-dashed border-[var(--border)] p-12 text-center">
          <div className="w-16 h-16 bg-[var(--accent)] rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Users size={28} className="text-[var(--text)]" />
          </div>
          <h2 className="font-black text-[var(--text)] text-xl mb-2">Пока нет участников</h2>
          <p className="text-[var(--text-3)] text-sm">Создай профиль и стань первым!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rk-fade-up-2">
          {list.map((profile, idx) => (
            <div key={profile.id} className="rk-fade-up" style={{ animationDelay: `${idx * 0.04}s` }}>
              <ProfileCard profile={profile} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
