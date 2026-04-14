'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import { Upload, X, Camera } from 'lucide-react'
import NextImage from 'next/image'

type Props = {
  profile: Profile | null
  userId: string
}

const GOAL_OPTIONS = [
  { value: 'нетворк',      label: '🤝 Нетворкинг' },
  { value: 'партнёрство',  label: '🚀 Партнёрство' },
  { value: 'менторство',   label: '🧠 Менторство' },
  { value: 'дружба',       label: '😊 Дружба' },
  { value: 'инвестиции',   label: '💰 Инвестиции' },
  { value: 'найм',         label: '👥 Найм / команда' },
]

export default function ProfileForm({ profile, userId }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState('')

  const [form, setForm] = useState({
    full_name:  profile?.full_name  ?? '',
    username:   profile?.username   ?? '',
    city:       profile?.city       ?? '',
    profession: profile?.profession ?? '',
    bio:        profile?.bio        ?? '',
    goals:      profile?.goals      ?? '',
    help_with:  profile?.help_with  ?? '',
    avatar_url: profile?.avatar_url ?? '',
    // arrays
    interests:   (profile?.interests   ?? []).join(', '),
    looking_for: (profile?.looking_for ?? []) as string[],
  })

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function toggleGoal(g: string) {
    setForm((prev) => {
      const has = prev.looking_for.includes(g)
      return {
        ...prev,
        looking_for: has
          ? prev.looking_for.filter((x) => x !== g)
          : [...prev.looking_for, g],
      }
    })
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload-avatar', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) {
        setError('Ошибка загрузки фото: ' + (json.error ?? res.statusText))
      } else {
        setForm((prev) => ({ ...prev, avatar_url: json.url }))
      }
    } catch (err: unknown) {
      setError('Ошибка загрузки фото: ' + (err instanceof Error ? err.message : 'неизвестная ошибка'))
    }
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()

    const interestsArr = form.interests
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)

    const payload = {
      user_id:     userId,
      full_name:   form.full_name,
      username:    form.username   || null,
      city:        form.city       || null,
      profession:  form.profession || null,
      bio:         form.bio        || null,
      goals:       form.goals      || null,
      help_with:   form.help_with  || null,
      avatar_url:  form.avatar_url || null,
      interests:   interestsArr,
      looking_for: form.looking_for,
      is_active:   true,
      updated_at:  new Date().toISOString(),
    }

    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert(profile ? { ...payload, id: profile.id } : payload, { onConflict: 'user_id' })

    if (upsertError) {
      setError(upsertError.message)
      setLoading(false)
    } else {
      // Hard redirect so server re-fetches fresh profile data
      window.location.href = '/dashboard'
    }
  }

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:ring-2 focus:ring-[var(--text)] focus:border-transparent text-sm bg-[var(--surface-2)]"

  const textFields = [
    { key: 'full_name',  label: 'Имя и фамилия',   placeholder: 'Иван Иванов',                               required: true,  type: 'input'    },
    { key: 'username',   label: 'Username',          placeholder: '@ivanov (необязательно)',                   required: false, type: 'input'    },
    { key: 'profession', label: 'Должность / роль',  placeholder: 'CEO, Product Manager, Founder...',         required: false, type: 'input'    },
    { key: 'city',       label: 'Город',             placeholder: 'Москва, Санкт-Петербург...',                required: false, type: 'input'    },
    { key: 'bio',        label: 'О себе',            placeholder: 'Коротко о том, чем занимаешься',           required: false, type: 'textarea' },
    { key: 'goals',      label: 'Цели и запросы',    placeholder: 'Что хочешь получить от встреч?',           required: false, type: 'textarea' },
    { key: 'help_with',  label: 'Чем могу помочь',   placeholder: 'В чём ты силён и чем можешь поделиться?', required: false, type: 'textarea' },
  ] as const

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Avatar */}
      <div>
        <label className="block text-sm font-bold text-[var(--text)] mb-2">Фото профиля</label>
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {form.avatar_url ? (
              <div className="relative">
                <NextImage src={form.avatar_url} alt="Фото профиля"
                  width={80} height={80} unoptimized
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-[var(--border)]" />
                <button type="button"
                  onClick={() => setForm((p) => ({ ...p, avatar_url: '' }))}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                  <X size={11} />
                </button>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-[var(--accent)] flex items-center justify-center">
                <Camera size={24} className="text-[var(--text)] opacity-60" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="inline-flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-[var(--border)] rounded-xl text-sm text-[var(--text-2)] hover:border-[var(--text)] hover:text-[var(--text)] hover:bg-[var(--accent-light)] transition-all disabled:opacity-50 w-full justify-center">
              <Upload size={15} />
              {uploading ? 'Загружаем...' : 'Загрузить фото'}
            </button>
            <p className="text-xs text-[var(--text-3)] mt-1.5 text-center">JPG, PNG, WebP — до 5 МБ</p>
          </div>
        </div>
      </div>

      {/* Text fields */}
      {textFields.map((field) => (
        <div key={field.key}>
          <label htmlFor={`field-${field.key}`} className="block text-sm font-bold text-[var(--text)] mb-1.5">
            {field.label}
            {field.required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
          </label>
          {field.type === 'textarea' ? (
            <textarea id={`field-${field.key}`} value={form[field.key]}
              onChange={(e) => update(field.key, e.target.value)}
              placeholder={field.placeholder} rows={3}
              aria-required={field.required}
              className={`${inputCls} resize-none`} />
          ) : (
            <input id={`field-${field.key}`} type="text" value={form[field.key]}
              onChange={(e) => update(field.key, e.target.value)}
              placeholder={field.placeholder} required={field.required}
              aria-required={field.required}
              className={inputCls} />
          )}
        </div>
      ))}

      {/* Matching section */}
      <div className="border-t border-[var(--border)] pt-5 space-y-5">
        <p className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider">Для умного подбора пары</p>

        {/* Interests */}
        <div>
          <label htmlFor="field-interests" className="block text-sm font-bold text-[var(--text)] mb-1.5">
            Интересы <span className="text-[var(--text-3)] font-normal">(через запятую)</span>
          </label>
          <input
            id="field-interests"
            type="text"
            value={form.interests}
            onChange={(e) => update('interests', e.target.value)}
            placeholder="AI, маркетинг, стартапы, продажи…"
            className={inputCls}
          />
        </div>

        {/* Looking for (goals) */}
        <div>
          <p className="block text-sm font-bold text-[var(--text)] mb-2" id="looking-for-label">Ищу встречи для</p>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="looking-for-label">
            {GOAL_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={form.looking_for.includes(value)}
                onClick={() => toggleGoal(value)}
                className={`px-3 py-1.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  form.looking_for.includes(value)
                    ? 'border-[var(--text)] bg-[var(--accent)] text-[var(--text)]'
                    : 'border-[var(--border)] text-[var(--text-2)] hover:border-[var(--text)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || uploading}
        className="w-full py-3 bg-[var(--accent)] text-[var(--text)] rounded-xl font-black hover:bg-[var(--accent-dark)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? 'Сохраняем...' : profile ? 'Сохранить изменения' : 'Создать карточку'}
      </button>
    </form>
  )
}
