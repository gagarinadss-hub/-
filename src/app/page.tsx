export const dynamic = 'force-static'

import Link from 'next/link'
import { Coffee, Users, Heart, Zap } from 'lucide-react'

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Random Coffee',
  url: 'https://random-coffee.app',
  description: 'Платформа для случайных 1:1 встреч внутри сообщества.',
  applicationCategory: 'SocialNetworkingApplication',
  operatingSystem: 'Web',
  inLanguage: 'ru',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'RUB' },
}

const STATS = [
  { Icon: Users,  value: '40+',    label: 'участников',       rotate: '-3deg',   translateY: '8px',  w: 'w-32 sm:w-40', delay: 'rk-fade-up-1' },
  { Icon: Coffee, value: '100+',   label: 'встреч проведено', rotate: '1deg',    translateY: '-4px', w: 'w-36 sm:w-44', delay: 'rk-fade-up-2' },
  { Icon: Heart,  value: '98%',    label: 'хотят снова',      rotate: '-1.5deg', translateY: '12px', w: 'w-32 sm:w-40', delay: 'rk-fade-up-3' },
  { Icon: Zap,    value: '30 мин', label: 'и новый контакт',  rotate: '2.5deg',  translateY: '4px',  w: 'w-32 sm:w-40', delay: 'rk-fade-up-4 hidden sm:block' },
]

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden flex flex-col relative">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ── Floating spheres ────────────────────────────────────────────────── */}
      <div aria-hidden="true" className="pointer-events-none select-none fixed inset-0 overflow-hidden">
        {/* Large violet left */}
        <div style={{
          position: 'absolute', width: 320, height: 320,
          top: '-60px', left: '-80px', borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #c4b5fd, #818cf8 55%, #4338ca 100%)',
          boxShadow: '0 24px 80px rgba(139,92,246,0.30), inset -5px -5px 24px rgba(255,255,255,0.16)',
          animation: 'lp-orb1 10s ease-in-out infinite',
        }} />
        {/* Medium indigo right */}
        <div style={{
          position: 'absolute', width: 220, height: 220,
          top: '15%', right: '-40px', borderRadius: '50%',
          background: 'radial-gradient(circle at 36% 32%, #a5b4fc, #6366f1 60%, #3730a3 100%)',
          boxShadow: '0 16px 56px rgba(99,102,241,0.28), inset -4px -4px 18px rgba(255,255,255,0.14)',
          animation: 'lp-orb2 13s ease-in-out infinite',
        }} />
        {/* Small sky bottom left */}
        <div style={{
          position: 'absolute', width: 140, height: 140,
          bottom: '20%', left: '5%', borderRadius: '50%',
          background: 'radial-gradient(circle at 38% 34%, #bae6fd, #7dd3fc 55%, #0284c7 100%)',
          boxShadow: '0 10px 36px rgba(14,165,233,0.20), inset -3px -3px 12px rgba(255,255,255,0.18)',
          animation: 'lp-orb3 15s ease-in-out infinite',
        }} />
        {/* Tiny lilac top right */}
        <div style={{
          position: 'absolute', width: 90, height: 90,
          top: '8%', right: '18%', borderRadius: '50%',
          background: 'radial-gradient(circle at 38% 32%, #e0e7ff, #c4b5fd 55%, #7c3aed 100%)',
          boxShadow: '0 8px 24px rgba(167,139,250,0.22), inset -2px -2px 10px rgba(255,255,255,0.20)',
          animation: 'lp-orb2 8s ease-in-out infinite reverse',
        }} />
        {/* Bottom right mint */}
        <div style={{
          position: 'absolute', width: 160, height: 160,
          bottom: '-30px', right: '8%', borderRadius: '50%',
          background: 'radial-gradient(circle at 36% 32%, #ddd6fe, #a78bfa 55%, #6d28d9 100%)',
          boxShadow: '0 12px 40px rgba(109,40,217,0.22), inset -3px -3px 14px rgba(255,255,255,0.16)',
          animation: 'lp-orb1 12s ease-in-out infinite reverse',
        }} />
      </div>

      <style>{`
        @keyframes lp-orb1 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%  { transform: translate(18px,-26px) scale(1.04); }
          66%  { transform: translate(-10px,18px) scale(0.97); }
        }
        @keyframes lp-orb2 {
          0%,100% { transform: translate(0,0) scale(1); }
          40%  { transform: translate(-20px,14px) scale(1.03); }
          70%  { transform: translate(12px,-10px) scale(0.96); }
        }
        @keyframes lp-orb3 {
          0%,100% { transform: translate(0,0); }
          50%  { transform: translate(14px,-16px); }
        }
      `}</style>

      {/* ── Nav ── */}
      <nav aria-label="Основная навигация" className="max-w-6xl mx-auto w-full px-6 py-5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3 font-bold text-xl" style={{ color: '#1e1b4b' }}>
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
            style={{
              background: 'rgba(255,255,255,0.55)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.45)',
              boxShadow: '0 4px 16px rgba(139,92,246,0.12)',
            }}>
            <Coffee size={18} style={{ color: '#5b21b6' }} />
          </div>
          Random Coffee
        </div>
        <Link
          href="/auth"
          className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all"
          style={{
            background: 'rgba(255,255,255,0.55)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.45)',
            boxShadow: '0 4px 16px rgba(139,92,246,0.10)',
            color: '#1e1b4b',
          }}
        >
          Войти →
        </Link>
      </nav>

      {/* ── Hero ── */}
      <main id="main-content">
        <section className="flex-1 flex flex-col justify-center max-w-5xl mx-auto w-full px-6 pt-4 pb-16 relative z-10">

          {/* Text block */}
          <div className="text-center max-w-3xl mx-auto">

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-8"
              style={{
                background: 'rgba(255,255,255,0.52)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.42)',
                boxShadow: '0 2px 12px rgba(139,92,246,0.10)',
                color: '#5b21b6',
              }}>
              <span aria-hidden="true">✨</span> Для участников Мастермайнда
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] mb-6 tracking-tight" style={{ color: '#1e1b4b' }}>
              Знакомься.<br />
              <span style={{
                background: 'linear-gradient(135deg, #818cf8, #a78bfa)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>Общайся.</span>{' '}
              Расти.
            </h1>

            <p className="text-lg max-w-xl mx-auto mb-10 leading-relaxed" style={{ color: '#4c1d95', opacity: 0.75 }}>
              Умные кофе-встречи с участниками твоего Мастермайнда.
              30 минут — и новый человек, новая идея, новая возможность
            </p>

            <Link
              href="/auth"
              className="inline-flex items-center justify-center px-9 py-4 rounded-2xl font-bold text-base glow-btn"
            >
              Начать знакомства →
            </Link>

            <p className="mt-4 text-sm" style={{ color: '#6d28d9', opacity: 0.55 }}>
              Бесплатно · Только для участников сообщества
            </p>
          </div>

          {/* Stat cards */}
          <div className="mt-16 flex justify-center items-end gap-3 sm:gap-5 flex-wrap">
            {STATS.map(({ Icon, value, label, rotate, translateY, w, delay }) => (
              <div
                key={label}
                className={`rounded-3xl p-4 sm:p-6 ${w} text-center ${delay} rk-card`}
                style={{
                  transform: `rotate(${rotate}) translateY(${translateY})`,
                  background: 'rgba(255,255,255,0.52)',
                  backdropFilter: 'blur(20px) saturate(1.8)',
                  WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
                  border: '1px solid rgba(255,255,255,0.42)',
                  boxShadow: '0 4px 24px rgba(139,92,246,0.10), 0 1px 4px rgba(0,0,0,0.04)',
                }}
              >
                <div className="flex justify-center mb-2" aria-hidden="true">
                  <Icon size={24} style={{ color: '#7c3aed' }} />
                </div>
                <p className="font-black text-xl sm:text-2xl" style={{ color: '#1e1b4b' }}>{value}</p>
                <p className="text-xs sm:text-sm font-medium mt-0.5" style={{ color: '#6d28d9', opacity: 0.75 }}>{label}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="py-6 px-6 text-center relative z-10" style={{ borderTop: '1px solid rgba(255,255,255,0.18)' }}>
        <p className="text-sm" style={{ color: '#6d28d9', opacity: 0.45 }}>Random Coffee · Платформа встреч для Мастермайнда</p>
      </footer>
    </div>
  )
}
