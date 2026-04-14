'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Coffee, ArrowRight, AlertCircle, Eye, EyeOff, Mail } from 'lucide-react'

// ── Auth form ─────────────────────────────────────────────────────────────────

function AuthForm() {
  const searchParams = useSearchParams()

  const [mode, setMode]                   = useState<'login' | 'register'>('login')
  const [email, setEmail]                 = useState('')
  const [password, setPassword]           = useState('')
  const [showPassword, setShowPassword]   = useState(false)
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState('')
  const [info, setInfo]                   = useState('')
  const [resetSent, setResetSent]         = useState(false)
  const [showResetHint, setShowResetHint] = useState(false)
  const [otpSent, setOtpSent]             = useState(false)

  function switchMode(next: 'login' | 'register') {
    setMode(next)
    setError('')
    setInfo('')
    setResetSent(false)
    setShowResetHint(false)
    setOtpSent(false)
  }

  // ── Password login / register ──────────────────────────────────────────────

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
          setShowResetHint(true)   // ← показываем подсказку про сброс
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
        // Email confirmation may be on — try signing in immediately
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

  // ── Password reset ─────────────────────────────────────────────────────────

  async function handleResetPassword() {
    if (!email.trim()) {
      setError('Введи email выше, чтобы сбросить пароль')
      return
    }
    setLoading(true)
    setError('')
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    })
    setLoading(false)
    setResetSent(true)
    setShowResetHint(false)
  }

  // ── Magic link (OTP) ───────────────────────────────────────────────────────

  async function handleOtp() {
    if (!email.trim()) {
      setError('Введи email выше')
      return
    }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setOtpSent(true)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="bg-[#1A1A1A] rounded-2xl border border-[rgba(255,255,255,0.10)] p-6 shadow-sm space-y-5">

      {searchParams.get('error') && (
        <div className="flex items-start gap-3 p-3 bg-red-950/30 rounded-xl border border-red-800/40">
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-600">Что-то пошло не так. Попробуй снова.</p>
        </div>
      )}

      {info && (
        <div className="p-3 bg-green-950/30 rounded-xl border border-green-800/40">
          <p className="text-sm text-green-400">{info}</p>
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex rounded-xl bg-[#111111] p-1">
        <button type="button" onClick={() => switchMode('login')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'login' ? 'bg-[#2A2A2A] shadow-sm text-[#F0EDE8]' : 'text-[#6B6560] hover:text-[#F0EDE8]'}`}>
          Войти
        </button>
        <button type="button" onClick={() => switchMode('register')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'register' ? 'bg-[#2A2A2A] shadow-sm text-[#F0EDE8]' : 'text-[#6B6560] hover:text-[#F0EDE8]'}`}>
          Зарегистрироваться
        </button>
      </div>

      {/* Email + Password form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="auth-email" className="block text-sm font-medium text-[#F0EDE8] mb-1.5">Email</label>
          <input
            id="auth-email" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com" required autoComplete="email"
            className="w-full px-3.5 py-2.5 rounded-xl border border-[rgba(255,255,255,0.10)] text-[#F0EDE8] placeholder-[#6B6560] focus:outline-none focus:ring-2 focus:ring-[#C8A27C] focus:border-transparent text-sm bg-[#242420]"
          />
        </div>

        <div>
          <label htmlFor="auth-password" className="block text-sm font-medium text-[#F0EDE8] mb-1.5">Пароль</label>
          <div className="relative">
            <input
              id="auth-password"
              type={showPassword ? 'text' : 'password'}
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'Минимум 6 символов' : '••••••••'}
              required minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-[rgba(255,255,255,0.10)] text-[#F0EDE8] placeholder-[#6B6560] focus:outline-none focus:ring-2 focus:ring-[#C8A27C] focus:border-transparent text-sm bg-[#242420]"
            />
            <button type="button" onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6560] hover:text-[#F0EDE8]"
              aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-950/30 rounded-xl border border-red-800/40">
            <AlertCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Reset hint after wrong password */}
        {showResetHint && !resetSent && (
          <div className="p-3 bg-amber-950/30 rounded-xl border border-amber-800/40 text-sm text-amber-300">
            <p className="font-semibold mb-1">Не помнишь пароль?</p>
            <p className="text-xs mb-2 text-amber-400">Если ты раньше входил по ссылке в email — пароль не был установлен. Сбрось его или войди по ссылке ниже.</p>
            <button type="button" onClick={handleResetPassword} disabled={loading}
              className="text-xs font-bold underline disabled:opacity-40">
              Отправить письмо для сброса пароля →
            </button>
          </div>
        )}

        {resetSent && (
          <div className="p-3 bg-green-950/30 rounded-xl border border-green-800/40">
            <p className="text-sm text-green-400 font-semibold">Письмо отправлено!</p>
            <p className="text-xs text-green-500 mt-1">Проверь <strong>{email}</strong> — нажми ссылку в письме, чтобы установить новый пароль.</p>
          </div>
        )}

        <button type="submit"
          disabled={loading || !email.trim() || password.length < 6}
          className="w-full py-3 bg-[#C8A27C] text-[#0F0F0F] rounded-xl font-bold hover:opacity-85 transition-opacity disabled:opacity-40 text-sm flex items-center justify-center gap-2">
          {loading
            ? (mode === 'login' ? 'Входим…' : 'Создаём аккаунт…')
            : <>{mode === 'login' ? 'Войти' : 'Зарегистрироваться'}<ArrowRight size={15} /></>}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[rgba(255,255,255,0.08)]" />
        <span className="text-xs text-[#6B6560]">или</span>
        <div className="flex-1 h-px bg-[rgba(255,255,255,0.08)]" />
      </div>

      {/* OTP / magic link fallback */}
      {otpSent ? (
        <div className="p-3 bg-blue-950/30 rounded-xl border border-blue-800/40 text-center">
          <p className="text-sm font-semibold text-blue-300">Письмо отправлено!</p>
          <p className="text-xs text-blue-400 mt-1">Проверь <strong>{email}</strong> и нажми ссылку для входа.</p>
        </div>
      ) : (
        <button type="button" onClick={handleOtp} disabled={loading || !email.trim()}
          className="w-full py-2.5 border-2 border-[rgba(255,255,255,0.10)] rounded-xl text-sm font-semibold text-[#A8A39E] hover:border-[#C8A27C] hover:text-[#F0EDE8] transition-all disabled:opacity-40 flex items-center justify-center gap-2">
          <Mail size={15} />
          Войти по ссылке в email
        </button>
      )}

      <p className="text-center text-xs text-[#6B6560]">
        Отправим одноразовую ссылку — без пароля
      </p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 font-black text-[#F0EDE8] text-xl mb-6 group">
            <div className="w-9 h-9 rounded-xl bg-[#C8A27C] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Coffee size={17} className="text-[#0F0F0F]" />
            </div>
            Random Coffee
          </Link>
          <h1 className="text-3xl font-black text-[#F0EDE8]">Добро пожаловать</h1>
          <p className="text-[#A8A39E] mt-1.5 text-sm">Войди или создай аккаунт</p>
        </div>

        <Suspense fallback={
          <div className="bg-[#1A1A1A] rounded-2xl border border-[rgba(255,255,255,0.10)] p-6 shadow-sm animate-pulse h-72" />
        }>
          <AuthForm />
        </Suspense>
      </div>
    </div>
  )
}
