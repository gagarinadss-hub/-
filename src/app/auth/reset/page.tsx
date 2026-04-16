'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react'

function ResetForm() {
  const [password, setPassword]         = useState('')
  const [confirm, setConfirm]           = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [loading, setLoading]           = useState(false)
  const [checking, setChecking]         = useState(true)
  const [hasSession, setHasSession]     = useState(false)
  const [error, setError]               = useState('')
  const [done, setDone]                 = useState(false)

  useEffect(() => {
    let tries = 0
    const maxTries = 20

    async function checkSession() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) { setHasSession(true); setChecking(false); return }
      tries++
      if (tries < maxTries) setTimeout(checkSession, 500)
      else { setChecking(false) }
    }

    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        setHasSession(true)
        setChecking(false)
      }
    })

    checkSession()
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Пароли не совпадают — проверь оба поля')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false) }
    else { setDone(true); setTimeout(() => { window.location.href = '/dashboard' }, 1800) }
  }

  // ── Checking link ─────────────────────────────────────────────────────────────

  if (checking) return (
    <div className="glass rounded-3xl p-8 text-center">
      <div className="w-8 h-8 border-2 border-[var(--text-3)] border-t-[var(--text)] rounded-full animate-spin mx-auto mb-3" />
      <p className="text-sm text-[var(--text-2)]">Проверяем ссылку…</p>
    </div>
  )

  // ── Success ───────────────────────────────────────────────────────────────────

  if (done) return (
    <div className="glass rounded-3xl p-8 text-center">
      <div className="text-4xl mb-3">✅</div>
      <h2 className="font-bold text-[var(--text)] text-lg mb-1">Пароль успешно обновлён!</h2>
      <p className="text-sm text-[var(--text-2)]">Входим в аккаунт…</p>
    </div>
  )

  // ── Expired / invalid link ────────────────────────────────────────────────────

  if (!hasSession) return (
    <div className="glass rounded-3xl p-6 space-y-4">
      <div className="text-3xl text-center">🔗</div>
      <div className="text-center">
        <h2 className="font-bold text-[var(--text)] mb-1">Ссылка больше не работает</h2>
        <p className="text-sm text-[var(--text-2)]">
          Ссылки для восстановления пароля действуют один час и работают только один раз.
          Запроси новую — это займёт пару секунд.
        </p>
      </div>
      <Link
        href="/auth?forgot=1"
        className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 glow-btn"
      >
        Запросить новую ссылку <ArrowRight size={15} />
      </Link>
    </div>
  )

  // ── New password form ─────────────────────────────────────────────────────────

  return (
    <div className="glass rounded-3xl p-6">
      <h2 className="font-bold text-[var(--text)] text-lg mb-1">Новый пароль</h2>
      <p className="text-sm text-[var(--text-2)] mb-5">После сохранения сразу войдёшь в продукт</p>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-500/15 rounded-2xl border border-red-400/30 mb-4">
          <AlertCircle size={15} className="text-red-200 mt-0.5 shrink-0" />
          <p className="text-sm text-red-100">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="new-password" className="block text-sm font-semibold text-[var(--text)] mb-1.5">
            Новый пароль
          </label>
          <div className="relative">
            <input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 6 символов"
              required
              minLength={6}
              autoComplete="new-password"
              className="glass-input w-full px-4 py-2.5 pr-10 rounded-xl text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-2)]"
              aria-label={showPassword ? 'Скрыть' : 'Показать'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm font-semibold text-[var(--text)] mb-1.5">
            Повторите новый пароль
          </label>
          <div className="relative">
            <input
              id="confirm-password"
              type={showConfirm ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Повторите пароль"
              required
              minLength={6}
              autoComplete="new-password"
              className={`glass-input w-full px-4 py-2.5 pr-10 rounded-xl text-sm ${
                confirm && confirm !== password ? 'border-red-400/60' : ''
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-2)]"
              aria-label={showConfirm ? 'Скрыть' : 'Показать'}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {confirm && confirm !== password && (
            <p className="text-xs text-red-300 mt-1.5 ml-1">Пароли не совпадают</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || password.length < 6 || confirm.length < 6}
          className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 glow-btn"
        >
          {loading
            ? 'Сохраняем…'
            : <><span>Сохранить новый пароль</span><ArrowRight size={15} /></>}
        </button>
      </form>
    </div>
  )
}

export default function ResetPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 font-black text-[var(--text)] text-xl mb-6">
            <div className="w-9 h-9 rounded-2xl glass flex items-center justify-center text-lg">☕</div>
            Random Coffee
          </Link>
          <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight">Восстановление пароля</h1>
        </div>
        <Suspense fallback={<div className="glass rounded-3xl p-8 animate-pulse h-48" />}>
          <ResetForm />
        </Suspense>
        <p className="text-center mt-4">
          <Link href="/auth" className="text-xs text-[var(--text-3)] hover:text-[var(--text)] underline">
            Вернуться к входу
          </Link>
        </p>
      </div>
    </main>
  )
}
