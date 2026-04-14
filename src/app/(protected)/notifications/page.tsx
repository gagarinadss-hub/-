export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import type { Notification } from '@/lib/types'
import Link from 'next/link'
import { Bell, Heart, MessageCircle, Calendar, Star, Coffee } from 'lucide-react'
import MarkNotifsRead from '@/components/MarkNotifsRead'

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  match_found:       { icon: Heart,         color: 'text-[var(--accent)]',   bg: 'bg-[var(--accent-light)]'  },
  new_message:       { icon: MessageCircle, color: 'text-[var(--blue)]',     bg: 'bg-[var(--blue-light)]'    },
  meeting_proposed:  { icon: Calendar,      color: 'text-[var(--purple)]',   bg: 'bg-[var(--purple-light)]'  },
  meeting_confirmed: { icon: Coffee,        color: 'text-green-400',         bg: 'bg-green-950/30'           },
  feedback_request:  { icon: Star,          color: 'text-[var(--warning)]',  bg: 'bg-amber-950/30'           },
  default:           { icon: Bell,          color: 'text-[var(--text-2)]',   bg: 'bg-[var(--surface-2)]'     },
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const list = (notifications ?? []) as Notification[]
  const unreadCount = list.filter((n) => !n.is_read).length

  // Mark all as read in DB
  if (unreadCount > 0) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user!.id)
      .eq('is_read', false)
  }

  return (
    <div className="space-y-5">
      {/* Clear badge in sidebar */}
      <MarkNotifsRead />

      {/* Header */}
      <div className="flex items-center gap-4 rk-fade-up">
        <div className="w-12 h-12 rounded-2xl bg-[var(--accent)] flex items-center justify-center shrink-0">
          <Bell size={20} className="text-[var(--text)]" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-[var(--text)]">Уведомления</h1>
          <p className="text-sm text-[var(--text-2)]">
            {unreadCount > 0 ? `${unreadCount} новых` : 'Всё прочитано'}
          </p>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="rk-fade-up-1 bg-[var(--surface)] rounded-2xl border-2 border-dashed border-[var(--border)] p-12 text-center">
          <div className="w-16 h-16 bg-[var(--accent)] rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Bell size={28} className="text-[var(--text)]" />
          </div>
          <h2 className="font-black text-[var(--text)] text-xl mb-2">Пока нет уведомлений</h2>
          <p className="text-[var(--text-3)] text-sm">
            Они появятся, когда тебе найдут пару или напишут сообщение
          </p>
        </div>
      ) : (
        <div className="space-y-2 rk-fade-up-1">
          {list.map((n, idx) => {
            const config = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.default
            const Icon   = config.icon
            return (
              <div
                key={n.id}
                className={`flex items-start gap-4 p-4 rounded-2xl border transition-all rk-fade-up ${
                  !n.is_read
                    ? 'bg-[var(--accent-light)] border-[var(--accent)]/30'
                    : 'bg-[var(--surface)] border-[var(--border)]'
                }`}
                style={{ animationDelay: `${idx * 0.04}s` }}
              >
                <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={config.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.is_read ? 'font-bold' : 'font-semibold'} text-[var(--text)]`}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-xs text-[var(--text-2)] mt-0.5 leading-relaxed">{n.body}</p>
                  )}
                  <p className="text-[10px] text-[var(--text-3)] mt-1">
                    {new Date(n.created_at).toLocaleDateString('ru-RU', {
                      day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                {n.link && (
                  <Link href={n.link}
                    className="shrink-0 text-xs font-bold px-3 py-1.5 bg-[var(--accent)] text-[var(--text)] rounded-xl hover:bg-[var(--accent-dark)] transition-colors">
                    Открыть →
                  </Link>
                )}
                {!n.is_read && (
                  <div className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0 mt-2" />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
