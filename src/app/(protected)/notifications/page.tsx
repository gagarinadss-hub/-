export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import type { Notification } from '@/lib/types'
import Link from 'next/link'
import { Bell, Heart, MessageCircle, Calendar, Star, Coffee } from 'lucide-react'
import MarkNotifsRead from '@/components/MarkNotifsRead'

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  match_found:       { icon: Heart,         color: 'text-pink-200',    bg: 'bg-pink-500/20'    },
  new_message:       { icon: MessageCircle, color: 'text-blue-200',    bg: 'bg-blue-500/20'    },
  meeting_proposed:  { icon: Calendar,      color: 'text-purple-200',  bg: 'bg-purple-500/20'  },
  meeting_confirmed: { icon: Coffee,        color: 'text-green-200',   bg: 'bg-green-500/20'   },
  feedback_request:  { icon: Star,          color: 'text-amber-200',   bg: 'bg-amber-500/20'   },
  default:           { icon: Bell,          color: 'text-[var(--text-2)]', bg: 'bg-white/25'    },
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
          <h1 className="text-[28px] font-bold text-[var(--text)] tracking-tight">Уведомления</h1>
          <p className="text-sm text-[var(--text-2)]">
            {unreadCount > 0 ? `${unreadCount} новых` : 'Всё прочитано'}
          </p>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="rk-fade-up-1 glass rounded-2xl border-2 border-dashed border-white/25 p-12 text-center">
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
                    ? 'glass border-white/35'
                    : 'glass-sm border-white/20'
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
                    className="shrink-0 text-xs font-bold px-3 py-2.5 glow-btn rounded-xl min-h-[44px] flex items-center">
                    Открыть →
                  </Link>
                )}
                {!n.is_read && (
                  <div className="w-2 h-2 rounded-full bg-white/60 shrink-0 mt-2" />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
