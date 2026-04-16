'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowRight, ArrowLeft, AlertCircle, Eye, EyeOff, Mail } from 'lucide-react'

type Mode = 'login' | 'register' | 'forgot'

function AuthForm() {
  const searchParams = useSearchParams()

  const [mode, setMode]                   = useState<Mode>(
    searchParams.get('forgot') === '1' ? 'forgot' : 'login'
  )
  const [email, setEmail]                 = useState('')
  const [password, setPassword]           = useState('')
  const [showPassword, setShowPassword]   = useState(false)
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState('')
  const [info, setInfo]                   = useState('')
  const [resetSent, setResetSent]         = useState(false)
  const [showResetHint, setShowResetHint] = useState(false)
  const [otpSent, setOtpSent]             = useState(false)
  const [forgotSent, setForgotSent]       = useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
    setInfo('')
    setResetSent(false)
    setShowResetHint(false)
    setOtpSent(false)
    setForgotSent(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setInfo('')
    setShowResetHint(false)
    const supabase = createClient()

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        const msg = error.message
        if (msg.includes('Invalid login credentials')) {
          setError('Неверный email или пароль')
          setShowResetHint(true)
        } else if (msg.includes('Email not confirmed')) {
          setError('Email не подтверждён — проверь почту или воспользуйся входом по ссылке')
        } else {
          setError(msg)
        }
        setLoading(false)
      } else {
        window.location.href = '/dashboard'
      }
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        const msg = error.message
        setError(
          msg.includes('already registered') || msg.includes('User already registered')
            ? 'Этот email уже зарегистрирован — войди на вкладке «Войти»'
            : msg
        )
        setLoading(false)
      } else if (data.session) {
        window.location.href = '/dashboard'
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
        if (!signInErr) {
          window.location.href = '/dashboard'
        } else if (signInErr.message.includes('Email not confirmed')) {
          setLoading(false)
          setMode('login')
          setInfo('Аккаунт создан! Подтверди email по ссылке в письме, затем войди.')
        } else {
          setLoading(false)
          setMode('login')
          setInfo('Аккаунт создан! Войди с тем же email и паролем.')
        }
      }
    }
  }

  async function sendResetEmail() {
    if (!email.trim()) { setError('Введи email выше, чтобы сбросить пароль'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    })
    setLoading(false)
    return true
  }

  async function handleResetPassword() {
    const ok = await sendResetEmail()
    if (ok) { setResetSent(true); setShowResetHint(false) }
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setError('Введи свой email'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    })
    setLoading(false)
    setForgotSent(true)
  }

  async function handleOtp() {
    if (!email.trim()) { setError('Введи email выше'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    if (error) setError(error.message)
    else setOtpSent(true)
  }

  // ── Forgot password view ──────────────────────────────────────────────────────

  if (mode === 'forgot') {
    return (
      <div className="glass rounded-3xl p-7 space-y-5">
        <button
          type="button"
          onClick={() => switchMode('login')}
          className="flex items-center gap-1.5 text-sm text-[var(--text-2)] hover:text-[var(--text)] transition-colors"
        >
          <ArrowLeft size={14} />
          Вернуться ко входу
        </button>

        <div>
          <h2 className="font-bold text-[var(--text)] text-lg">Восстановление пароля</h2>
          <p className="text-sm text-[var(--text-2)] mt-1">
            Введи свой email — пришлём ссылку для входа
          </p>
        </div>

        {!forgotSent ? (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <div>
              <label htmlFor="forgot-email" className="block text-sm font-semibold text-[var(--text)] mb-1.5">
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoComplete="email"
                className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/15 rounded-2xl border border-red-400/30">
                <AlertCircle size={15} className="text-red-200 mt-0.5 shrink-0" />
                <p className="text-sm text-red-100">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 glow-btn"
            >
              {loading
                ? 'Отправляем…'
                : <><span>Отправить ссылку</span><ArrowRight size={15} /></>}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-500/15 rounded-2xl border border-green-400/30">
              <p className="text-sm font-semibold text-green-100 mb-1">Письмо отправлено!</p>
              <p className="text-xs text-green-200/80 mt-1">
                Мы отправили ссылку для восстановления пароля на{' '}
                <strong>{email}</strong>
              </p>
              <p className="text-xs text-green-200/60 mt-2">
                Не пришло? Проверь папку «Спам» или подожди минуту.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setForgotSent(false); setEmail('') }}
              className="w-full py-2.5 glass-sm rounded-2xl text-sm font-semibold text-[var(--text-2)] hover:text-[var(--text)] hover:bg-white/35 transition-all"
            >
              Отправить на другой email
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Login / Register view ─────────────────────────────────────────────────────

  return (
    <div className="glass rounded-3xl p-7 space-y-5">

      {searchParams.get('error') && (
        <div className="flex items-start gap-3 p-3 bg-red-500/15 rounded-2xl border border-red-400/30">
          <AlertCircle size={16} className="text-red-200 mt-0.5 shrink-0" />
          <p className="text-sm text-red-100">Что-то пошло не так. Попробуй снова.</p>
        </div>
      )}

      {info && (
        <div className="p-3 bg-green-500/15 rounded-2xl border border-green-400/30">
          <p className="text-sm text-green-100">{info}</p>
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex rounded-2xl bg-black/8 p-1">
        <button type="button" onClick={() => switchMode('login')}
          className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
            mode === 'login'
              ? 'bg-white/50 shadow text-[var(--text)]'
              : 'text-[var(--text-2)] hover:text-[var(--text)]'
          }`}>
          Войти
        </button>
        <button type="button" onClick={() => switchMode('register')}
          className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
            mode === 'register'
              ? 'bg-white/50 shadow text-[var(--text)]'
              : 'text-[var(--text-2)] hover:text-[var(--text)]'
          }`}>
          Зарегистрироваться
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="auth-email" className="block text-sm font-semibold text-[var(--text)] mb-1.5">Email</label>
          <input
            id="auth-email" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com" required autoComplete="email"
            className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="auth-password" className="text-sm font-semibold text-[var(--text)]">Пароль</label>
            {mode === 'login' && (
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="text-xs text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
              >
                Забыли пароль?
              </button>
            )}
          </div>
          <div className="relative">
            <input
              id="auth-password"
              type={showPassword ? 'text' : 'password'}
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'Минимум 6 символов' : '••••••••'}
              required minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="glass-input w-full px-4 py-2.5 pr-10 rounded-xl text-sm"
            />
            <button type="button" onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-2)]"
              aria-label={showPassword ? 'Скрыть' : 'Показать'}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-500/15 rounded-2xl border border-red-400/30">
            <AlertCircle size={15} className="text-red-200 mt-0.5 shrink-0" />
            <p className="text-sm text-red-100">{error}</p>
          </div>
        )}

        {showResetHint && !resetSent && (
          <div className="p-3 bg-amber-500/15 rounded-2xl border border-amber-400/30 text-sm text-amber-100">
            <p className="font-semibold mb-1">Не помнишь пароль?</p>
            <p className="text-xs mb-2 text-amber-200/80">Если ты раньше входил по ссылке — пароль не был установлен.</p>
            <button type="button" onClick={handleResetPassword} disabled={loading}
              className="text-xs font-bold underline disabled:opacity-40">
              Отправить письмо для сброса →
            </button>
          </div>
        )}

        {resetSent && (
          <div className="p-3 bg-green-500/15 rounded-2xl border border-green-400/30">
            <p className="text-sm text-green-100 font-semibold">Письмо отправлено!</p>
            <p className="text-xs text-green-200/80 mt-1">Проверь <strong>{email}</strong> — нажми ссылку в письме.</p>
          </div>
        )}

        <button type="submit"
          disabled={loading || !email.trim() || password.length < 6}
          className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 glow-btn">
          {loading
            ? (mode === 'login' ? 'Входим…' : 'Создаём аккаунт…')
            : <>{mode === 'login' ? 'Войти' : 'Зарегистрироваться'}<ArrowRight size={15} /></>}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[var(--border)]" />
        <span className="text-xs text-[var(--text-3)]">или</span>
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>

      {otpSent ? (
        <div className="p-3 bg-blue-500/15 rounded-2xl border border-blue-400/30 text-center">
          <p className="text-sm font-semibold text-blue-100">Письмо отправлено!</p>
          <p className="text-xs text-blue-200/80 mt-1">Проверь <strong>{email}</strong> и нажми ссылку для входа.</p>
        </div>
      ) : (
        <button type="button" onClick={handleOtp} disabled={loading || !email.trim()}
          className="w-full py-2.5 glass-sm rounded-2xl text-sm font-semibold text-[var(--text-2)] hover:text-[var(--text)] hover:bg-white/35 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
          <Mail size={15} />
          Войти по ссылке в email
        </button>
      )}

      <p className="text-center text-xs text-[var(--text-3)]">
        Отправим одноразовую ссылку — без пароля
      </p>
    </div>
  )
}

export default function AuthPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 font-black text-[var(--text)] text-xl mb-6">
            <div className="w-9 h-9 rounded-2xl glass flex items-center justify-center text-lg">☕</div>
            Random Coffee
          </Link>
          <h1 className="text-3xl font-bold text-[var(--text)] tracking-tight">Добро пожаловать</h1>
          <p className="text-[var(--text-2)] mt-1.5 text-sm">Войди или создай аккаунт</p>
        </div>

        <Suspense fallback={<div className="glass rounded-3xl p-7 animate-pulse h-72" />}>
          <AuthForm />
        </Suspense>
      </div>
    </main>
  )
}
