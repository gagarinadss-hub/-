'use client'

import Link from 'next/link'
import NextImage from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useNotifications } from '@/contexts/NotificationContext'
import { Coffee, Home, Users, Heart, Clock, User, LogOut, Shield, MessageCircle, Bell } from 'lucide-react'

type NavbarProps = {
  isAdmin?: boolean
  userName?: string | null
  userAvatar?: string | null
}

const navItems = [
  { href: '/dashboard',    label: 'Главная',    icon: Home },
  { href: '/participants', label: 'Участники',  icon: Users },
  { href: '/matches',      label: 'Найти пару', icon: Heart },
  { href: '/chat',         label: 'Сообщения',  icon: MessageCircle },
  { href: '/history',      label: 'История',    icon: Clock },
  { href: '/profile',      label: 'Профиль',    icon: User },
]

function Badge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center leading-none rk-pop-in">
      {count > 99 ? '99+' : count}
    </span>
  )
}

export default function Navbar({ isAdmin = false, userName, userAvatar }: NavbarProps) {
  const pathname = usePathname()
  const router   = useRouter()

  const { msgCount, notifCount, markMsgRead, markAllNotifsRead } = useNotifications()

  // Auto-clear badge when user is on the relevant page
  useEffect(() => {
    if (pathname.startsWith('/chat'))     markMsgRead()
    if (pathname === '/notifications')   markAllNotifsRead()
  }, [pathname]) // eslint-disable-line

  // ── Auth ──────────────────────────────────────────────────────────────────
  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const isActive = (href: string) =>
    href === '/admin' ? pathname.startsWith('/admin') :
    href === '/chat'  ? pathname.startsWith('/chat')  :
    pathname === href

  return (
    <>
      {/* ── Desktop: left sidebar ─────────────────────────────────────────── */}
      <aside aria-label="Боковая навигация" className="rk-sidebar hidden lg:flex flex-col fixed left-0 top-0 bottom-0 glass border-r z-40 overflow-y-auto overflow-x-hidden" style={{ borderColor: 'rgba(255,255,255,0.20)', boxShadow: '1px 0 0 rgba(255,255,255,0.12), 4px 0 32px rgba(0,0,0,0.12)' }}>

        {/* Logo */}
        <div className="px-4 pt-5 pb-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 group focus-visible:ring-2 focus-visible:ring-[var(--accent-dark)] focus-visible:ring-offset-2 rounded-xl">
            <div className="w-8 h-8 rounded-xl glass-sm flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform" aria-hidden="true">
              <Coffee size={16} className="text-[var(--text)]" />
            </div>
            <p className="font-black text-[var(--text)] text-sm">Random Coffee</p>
          </Link>
        </div>

        {/* User identity */}
        {userName && (
          <div className="mx-3 mb-3 px-3 py-2.5 rounded-2xl glass-sm flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/40 flex items-center justify-center font-black text-xs text-[var(--text)] shrink-0 overflow-hidden">
              {userAvatar ? (
                <NextImage src={userAvatar} alt={userName} width={32} height={32} className="w-full h-full object-cover" unoptimized />
              ) : (
                userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[var(--text)] truncate">{userName.split(' ')[0]}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                <span className="text-[10px] text-[var(--text-3)]">В сети</span>
              </div>
            </div>
          </div>
        )}

        <div className="mx-4 h-px bg-[var(--border)]" />

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            const badge  = href === '/chat' ? msgCount : 0
            return (
              <Link key={href} href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 min-h-[44px] ${
                  active
                    ? 'bg-white/40 text-[var(--text)] font-semibold shadow-sm'
                    : 'text-[var(--text-2)] hover:bg-white/25 hover:text-[var(--text)]'
                }`}
              >
                <div className="relative shrink-0">
                  <Icon size={16} />
                  <Badge count={badge} />
                </div>
                <span className="flex-1 text-[13px]">{label}</span>
                {badge > 0 && (
                  <span className="text-[10px] font-bold text-white bg-red-500/80 px-1.5 py-0.5 rounded-full">
                    {badge}
                  </span>
                )}
              </Link>
            )
          })}

          {/* Notifications */}
          <Link href="/notifications"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 min-h-[44px] ${
              pathname === '/notifications'
                ? 'bg-white/40 text-[var(--text)] font-semibold shadow-sm'
                : 'text-[var(--text-2)] hover:bg-white/25 hover:text-[var(--text)]'
            }`}
          >
            <div className="relative shrink-0">
              <Bell size={16} />
              <Badge count={notifCount} />
            </div>
            <span className="flex-1 text-[13px]">Уведомления</span>
            {notifCount > 0 && (
              <span className="text-[10px] font-bold text-white bg-red-500/80 px-1.5 py-0.5 rounded-full">
                {notifCount}
              </span>
            )}
          </Link>

          {isAdmin && (
            <>
              <div className="my-2 mx-1 h-px bg-[var(--border)]" />
              <Link href="/admin"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 min-h-[44px] ${
                  isActive('/admin')
                    ? 'bg-white/40 text-[var(--text)] font-semibold shadow-sm'
                    : 'text-[var(--text-2)] hover:bg-white/25 hover:text-[var(--text)]'
                }`}
              >
                <Shield size={16} />
                <span className="text-[13px]">Админ</span>
              </Link>
            </>
          )}
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-[var(--border)]">
          <button onClick={handleSignOut} aria-label="Выйти из аккаунта"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--text-3)] hover:bg-white/25 hover:text-[var(--text)] transition-all"
          >
            <LogOut size={17} aria-hidden="true" />
            Выйти
          </button>
        </div>
      </aside>

      {/* ── Mobile: bottom bar ────────────────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 glass border-t z-40 safe-area-bottom" aria-label="Основная навигация">
        <div className="flex items-center justify-around px-1 pt-1.5 pb-1.5">
          {[
            { href: '/dashboard',     label: 'Главная',  icon: Home,          badge: 0 },
            { href: '/matches',       label: 'Найти',    icon: Heart,         badge: 0 },
            { href: '/chat',          label: 'Чат',      icon: MessageCircle, badge: msgCount },
            { href: '/notifications', label: 'Уведомл.', icon: Bell,          badge: notifCount },
            { href: '/profile',       label: 'Профиль',  icon: User,          badge: 0 },
          ].map(({ href, label, icon: Icon, badge }) => {
            const active = isActive(href)
            return (
              <Link key={href} href={href}
                className={`flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-xl transition-all min-h-[52px] justify-center ${
                  active ? 'text-[var(--text)]' : 'text-[var(--text-2)]'
                }`}
              >
                <div className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  active ? 'bg-white/40 scale-110' : ''
                }`}>
                  <Icon size={18} />
                  <Badge count={badge} />
                </div>
                <span className="text-[9px] font-semibold tracking-tight leading-tight">{label}</span>
              </Link>
            )
          })}
          <button onClick={handleSignOut} aria-label="Выйти из аккаунта"
            className="flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-xl text-[var(--text-3)] hover:text-[var(--text)] transition-all min-h-[52px] justify-center"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center">
              <LogOut size={18} aria-hidden="true" />
            </div>
            <span className="text-[9px] font-semibold tracking-tight" aria-hidden="true">Выйти</span>
          </button>
        </div>
      </nav>
    </>
  )
}
