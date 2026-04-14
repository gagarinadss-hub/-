export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Random Coffee — умные встречи из сообщества',
  description: 'Находи полезных собеседников из своего сообщества. 30 минут — новый человек в жизни. Нетворкинг, менторство, партнёрство.',
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Random Coffee',
  url: 'https://random-coffee.app',
  description: 'Платформа для случайных 1:1 встреч внутри сообщества. Нетворкинг, менторство, партнёрство.',
  applicationCategory: 'SocialNetworkingApplication',
  operatingSystem: 'Web',
  inLanguage: 'ru',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'RUB' },
}

// ── SVG doodles ──────────────────────────────────────────────────────────────

function DoodleCoffee({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="12" y="24" width="32" height="28" rx="4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M44 30h6a6 6 0 010 12h-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M20 24v-4M28 24v-6M36 24v-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M12 52h32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}

function DoodleStar({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M24 4l4.5 13.5H42L31.5 26l4 13.5L24 31.5 12.5 39.5l4-13.5L6 17.5h13.5L24 4z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
    </svg>
  )
}

function DoodleZap({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 40 56" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M22 4L6 28h14L14 52l22-28H22L28 4z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function DoodleHeart({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 44" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M24 38S4 26 4 14a10 10 0 0120-2 10 10 0 0120 2c0 12-20 24-20 24z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function DoodleWave({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M2 12c8-16 16 16 24 0s16-16 24 0 16 16 24 0 16-16 24 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}

function DoodleSparkle({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M20 4v8M20 28v8M4 20h8M28 20h8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M8.7 8.7l5.6 5.6M25.7 25.7l5.6 5.6M31.3 8.7l-5.6 5.6M14.3 25.7l-5.6 5.6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}

function DoodleUsers({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 72 52" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="24" cy="16" r="10" stroke="currentColor" strokeWidth="2.5"/>
      <path d="M4 48c0-11 9-18 20-18s20 7 20 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="50" cy="16" r="8" stroke="currentColor" strokeWidth="2.5"/>
      <path d="M42 48c0-9 6-15 14-15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}

function DoodleChat({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 56 52" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="4" y="4" width="36" height="28" rx="6" stroke="currentColor" strokeWidth="2.5"/>
      <path d="M4 32l6 8v-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="18" y="22" width="34" height="26" rx="6" fill="white" stroke="currentColor" strokeWidth="2.5"/>
      <path d="M52 48l-6 4v-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M26 32h18M26 38h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-[#0F0F0F] overflow-x-hidden flex flex-col">
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Nav ── */}
      <nav className="max-w-6xl mx-auto w-full px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5 font-bold text-xl text-[#F0EDE8]">
          <div className="w-8 h-8 rounded-xl bg-[#C8A27C] flex items-center justify-center">
            <DoodleCoffee className="w-5 h-5 text-[#0F0F0F]" />
          </div>
          Random Coffee
        </div>
        <Link
          href="/auth"
          className="px-5 py-2.5 bg-[#C8A27C] text-[#0F0F0F] rounded-full text-sm font-semibold hover:opacity-85 transition-colors"
        >
          Войти
        </Link>
      </nav>

      {/* ── Hero ── */}
      <section className="flex-1 flex flex-col justify-center max-w-6xl mx-auto w-full px-6 pt-8 pb-16 relative">

        {/* Floating decorations */}
        <DoodleSparkle className="absolute top-2 right-24 w-8 h-8 text-[#C8A27C] hidden md:block" />
        <DoodleStar
          className="absolute top-16 right-8 w-10 h-10 text-[#A88FE8] hidden md:block"
          style={{ transform: 'rotate(20deg)' }}
        />
        <DoodleZap
          className="absolute top-4 left-8 w-7 h-7 text-[#6B9BF0] hidden md:block"
          style={{ transform: 'rotate(-10deg)' }}
        />
        <DoodleWave className="absolute bottom-8 left-0 w-32 text-[#C8A27C] opacity-30 hidden md:block" />

        {/* Text block */}
        <div className="text-center max-w-3xl mx-auto relative">
          <div className="inline-flex items-center gap-2 bg-[rgba(200,162,124,0.15)] text-[#C8A27C] border border-[rgba(200,162,124,0.30)] px-4 py-1.5 rounded-full text-sm font-semibold mb-8">
            <DoodleHeart className="w-4 h-4" />
            Для участников Мастермайнда
          </div>

          <h1 className="text-5xl sm:text-6xl font-black text-[#F0EDE8] leading-[1.08] mb-6 tracking-tight">
            Знакомься.<br />
            <span className="relative inline-block">
              Общайся.
              <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 300 12" fill="none" aria-hidden="true">
                <path d="M2 8c40-8 80-8 148-4s120 4 150 2" stroke="#C8A27C" strokeWidth="5" strokeLinecap="round"/>
              </svg>
            </span>{' '}
            Расти.
          </h1>

          <p className="text-lg text-[#A8A39E] max-w-xl mx-auto mb-10 leading-relaxed">
            Умные кофе-встречи с участниками твоего Мастермайнда.
            30 минут — и новый человек, новая идея, новая возможность ☕
          </p>

          <Link
            href="/auth"
            className="inline-flex items-center justify-center px-8 py-4 bg-[#C8A27C] text-[#0F0F0F] rounded-2xl font-bold text-base hover:opacity-85 transition-colors shadow-lg shadow-black/30"
          >
            Начать знакомства →
          </Link>

          <p className="mt-4 text-sm text-[#6B6560]">Бесплатно · Только для участников сообщества</p>
        </div>

        {/* Hero stat cards */}
        <div className="mt-14 flex justify-center items-end gap-4 sm:gap-6 flex-wrap">
          <div className="bg-[#C8A27C] rounded-3xl p-5 w-40 shadow-lg shadow-black/40" style={{ transform: 'rotate(-4deg) translateY(8px)' }}>
            <DoodleUsers className="w-10 h-8 text-[#0F0F0F] mb-3" />
            <p className="font-black text-2xl text-[#0F0F0F]">40+</p>
            <p className="text-sm font-semibold text-[#0F0F0F]/70">участников</p>
          </div>
          <div className="bg-[#242420] rounded-3xl p-5 w-40 shadow-lg shadow-black/40 border border-[rgba(255,255,255,0.08)]" style={{ transform: 'rotate(2deg) translateY(-4px)' }}>
            <DoodleChat className="w-10 h-8 text-[#C8A27C] mb-3" />
            <p className="font-black text-2xl text-[#F0EDE8]">100+</p>
            <p className="text-sm font-semibold text-[#A8A39E]">встреч проведено</p>
          </div>
          <div className="bg-[#A88FE8] rounded-3xl p-5 w-40 shadow-lg shadow-black/40" style={{ transform: 'rotate(-2deg) translateY(12px)' }}>
            <DoodleHeart className="w-10 h-8 text-white mb-3" />
            <p className="font-black text-2xl text-white">98%</p>
            <p className="text-sm font-semibold text-white/70">хотят снова</p>
          </div>
          <div className="bg-[#6B9BF0] rounded-3xl p-5 w-40 shadow-lg shadow-black/40 hidden sm:block" style={{ transform: 'rotate(3deg) translateY(4px)' }}>
            <DoodleZap className="w-8 h-8 text-white mb-3" />
            <p className="font-black text-2xl text-white">30 мин</p>
            <p className="text-sm font-semibold text-white/70">и новый контакт</p>
          </div>
        </div>
      </section>

      {/* ── Minimal footer ── */}
      <footer className="py-6 px-6 text-center border-t border-[rgba(255,255,255,0.08)]">
        <p className="text-sm text-[#6B6560]">Random Coffee · Платформа встреч для Мастермайнда</p>
      </footer>
    </div>
  )
}
