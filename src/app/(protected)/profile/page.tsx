export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Мой профиль',
  description: 'Редактируй своё имя, интересы и цели для лучших совпадений.',
}
import type { Profile } from '@/lib/types'
import ProfileForm from './ProfileForm'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user!.id)
    .single()

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-4 mb-6 rk-fade-up">
        <div className="w-12 h-12 rounded-2xl bg-[var(--accent)] flex items-center justify-center shrink-0">
          <span className="text-xl">👤</span>
        </div>
        <div>
          <h1 className="text-[28px] font-bold text-[var(--text)] tracking-tight">
            {profile ? 'Мой профиль' : 'Создать карточку'}
          </h1>
          <p className="text-sm text-[var(--text-2)]">
            {profile ? 'Редактируй анкету — другие увидят её в каталоге' : 'Расскажи о себе — мы найдём тебе идеальную пару'}
          </p>
        </div>
      </div>
      <div className="rk-fade-up-1">
        <ProfileForm profile={profile as Profile | null} userId={user!.id} />
      </div>
    </div>
  )
}
