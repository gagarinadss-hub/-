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
  { Icon: Users,  value: '40+',    label: 'участников',    rotate: '-3deg',  translateY: '8px',  w: 'w-32 sm:w-40', delay: 'rk-fade-up-1' },
  { Icon: Coffee, value: '100+',   label: 'встреч проведено', rotate: '1deg', translateY: '-4px', w: 'w-36 sm:w-44', delay: 'rk-fade-up-2' },
  { Icon: Heart,  value: '98%',    label: 'хотят снова',   rotate: '-1.5deg', translateY: '12px', w: 'w-32 sm:w-40', delay: 'rk-fade-up-3' },
  { Icon: Zap,    value: '30 мин', label: 'и новый контакт', rotate: '2.5deg', translateY: '4px', w: 'w-32 sm:w-40', delay: 'rk-fade-up-4 hidden sm:block' },
]

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ── Nav ── */}
      <nav aria-label="Основная навигация" className="max-w-6xl mx-auto w-full px-6 py-5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3 font-bold text-xl text-[var(--text)]">
          <div className="w-9 h-9 rounded-2xl glass flex items-center justify-center" aria-hidden="true">
            <Coffee size={18} className="text-[var(--text)]" />
          </div>
          Random Coffee
        </div>
        <Link
          href="/auth"
          className="px-5 py-2.5 glass rounded-full text-sm font-semibold text-[var(--text)] hover:bg-white/50 transition-all focus-visible:ring-2 focus-visible:ring-[var(--accent-dark)] focus-visible:ring-offset-2"
        >
          Войти →
        </Link>
      </nav>

      {/* ── Hero ── */}
      <main id="main-content">
        <section className="flex-1 flex flex-col justify-center max-w-5xl mx-auto w-full px-6 pt-4 pb-16 relative z-10">

          {/* Text block */}
          <div className="text-center max-w-3xl mx-auto">

            <div className="inline-flex items-center gap-2 glass-sm px-4 py-1.5 rounded-full text-sm font-semibold mb-8 text-[var(--text)]">
              <span aria-hidden="true">✨</span> Для участников Мастермайнда
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-[var(--text)] leading-[1.05] mb-6 tracking-tight">
              Знакомься.<br />
              <span className="rk-gradient-text">Общайся.</span>{' '}
              Расти.
            </h1>

            <p className="text-lg text-[var(--text-2)] max-w-xl mx-auto mb-10 leading-relaxed">
              Умные кофе-встречи с участниками твоего Мастермайнда.
              30 минут — и новый человек, новая идея, новая возможность
            </p>

            <Link
              href="/auth"
              className="inline-flex items-center justify-center px-9 py-4 rounded-2xl font-bold text-base glow-btn focus-visible:ring-2 focus-visible:ring-[var(--accent-dark)] focus-visible:ring-offset-2"
            >
              Начать знакомства →
            </Link>

            <p className="mt-4 text-sm text-[var(--text-3)]">Бесплатно · Только для участников сообщества</p>
          </div>

          {/* Stat cards */}
          <div className="mt-16 flex justify-center items-end gap-3 sm:gap-5 flex-wrap">
            {STATS.map(({ Icon, value, label, rotate, translateY, w, delay }) => (
              <div
                key={label}
                className={`glass rounded-3xl p-4 sm:p-6 ${w} text-center ${delay}`}
                style={{ transform: `rotate(${rotate}) translateY(${translateY})` }}
              >
                <div className="flex justify-center mb-2" aria-hidden="true">
                  <Icon size={24} className="text-[var(--accent-dark)]" />
                </div>
                <p className="font-black text-xl sm:text-2xl text-[var(--text)]">{value}</p>
                <p className="text-xs sm:text-sm font-medium text-[var(--text-2)] mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="py-6 px-6 text-center border-t border-white/10 relative z-10">
        <p className="text-sm text-[var(--text-3)]">Random Coffee · Платформа встреч для Мастермайнда</p>
      </footer>
    </div>
  )
}
