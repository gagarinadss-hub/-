'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Coffee, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react'

function ResetForm() {
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
      if (session) {
        setHasSession(true)
        setChecking(false)
        return
      }
      tries++
      if (tries < maxTries) {
        setTimeout(checkSession, 500)
      } else {
        setChecking(false)
        setError('Ссылка недействительна или истекла. Запроси сброс пароля заново.')
      }
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
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setDone(true)
      setTimeout(() => { window.location.href = '/dashboard' }, 2000)
    }
  }

  if (checking) {
    return (
      <div className="bg-[#1A1A1A] rounded-2xl border border-[rgba(255,255,255,0.10)] p-8 shadow-sm text-center">
        <div className="w-8 h-8 border-2 border-[#C8A27C] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-[#A8A39E]">Проверяем ссылку…</p>
      </div>
    )
  }

  if (done) {
    return (
      <div className="bg-[#1A1A1A] rounded-2xl border border-[rgba(255,255,255,0.10)] p-8 shadow-sm text-center">
        <div className="w-14 h-14 bg-[#C8A27C] rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
        <h2 className="font-bold text-[#F0EDE8] mb-2">Пароль установлен!</h2>
        <p className="text-sm text-[#A8A39E]">Перенаправляем в продукт…</p>
      </div>
    )
  }

  if (!hasSession) {
    return (
      <div className="bg-[#1A1A1A] rounded-2xl border border-[rgba(255,255,255,0.10)] p-6 shadow-sm">
        <div className="flex items-start gap-3 p-3 bg-red-950/30 rounded-xl border border-red-800/40 mb-4">
          <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
        <Link href="/auth"
          className="w-full py-3 bg-[#C8A27C] text-[#0F0F0F] rounded-xl font-bold hover:opacity-85 transition-opacity text-sm flex items-center justify-center gap-2">
          Запросить новую ссылку
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-[#1A1A1A] rounded-2xl border border-[rgba(255,255,255,0.10)] p-6 shadow-sm">
      <h2 className="font-bold text-[#F0EDE8] mb-1">Установить новый пароль</h2>
      <p className="text-sm text-[#A8A39E] mb-5">После сохранения сразу войдёшь в продукт</p>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-950/30 rounded-xl border border-red-800/40 mb-4">
          <AlertCircle size={15} className="text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="new-password" className="block text-sm font-medium text-[#F0EDE8] mb-1.5">
            Новый пароль
          </label>
          <div className="relative">
            <input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 6 символов"
              required minLength={6} autoComplete="new-password"
              className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-[rgba(255,255,255,0.10)] text-[#F0EDE8] placeholder-[#6B6560] focus:outline-none focus:ring-2 focus:ring-[#C8A27C] focus:border-transparent text-sm bg-[#242420]"
            />
            <button type="button" onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6560] hover:text-[#F0EDE8]">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading || password.length < 6}
          className="w-full py-3 bg-[#C8A27C] text-[#0F0F0F] rounded-xl font-bold hover:opacity-85 transition-opacity disabled:opacity-40 text-sm flex items-center justify-center gap-2">
          {loading ? 'Сохраняем…' : <><span>Сохранить пароль</span><ArrowRight size={15} /></>}
        </button>
      </form>
    </div>
  )
}

export default function ResetPage() {
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
          <h1 className="text-2xl font-black text-[#F0EDE8]">Сброс пароля</h1>
        </div>
        <Suspense fallback={
          <div className="bg-[#1A1A1A] rounded-2xl border border-[rgba(255,255,255,0.10)] p-8 shadow-sm animate-pulse h-48" />
        }>
          <ResetForm />
        </Suspense>
        <p className="text-center mt-4">
          <Link href="/auth" className="text-xs text-[#6B6560] hover:text-[#F0EDE8] underline">
            Вернуться к входу
          </Link>
        </p>
      </div>
    </div>
  )
}
