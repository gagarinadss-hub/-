'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Announcement, Event } from '@/lib/types'
import { utcToMoscowInput, moscowInputToUtc, toMoscowDisplay } from '@/lib/moscow-time'
import {
  Bell, Calendar, Users, BarChart3, Plus, Trash2, Edit3,
  Pin, X, Shield, Save, Coffee, Shuffle, CalendarPlus,
  Wifi, MapPin, Layers,
} from 'lucide-react'

const FORMAT_OPTIONS = [
  { value: 'online',  label: 'Онлайн',  icon: Wifi,   color: 'text-blue-400 bg-blue-950/30 border-blue-800/40' },
  { value: 'offline', label: 'Офлайн',  icon: MapPin, color: 'text-green-400 bg-green-950/30 border-green-800/40' },
  { value: 'hybrid',  label: 'Гибрид',  icon: Layers, color: 'text-purple-600 bg-purple-50 border-purple-200' },
] as const

type Tab = 'announcements' | 'events' | 'participants' | 'stats'

type Props = {
  myProfile: Profile
  announcements: Announcement[]
  events: Event[]
  profiles: Profile[]
  meetingCounts: Record<string, number>
  totalMatches: number
}

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'announcements', label: 'Анонсы', icon: Bell },
  { id: 'events', label: 'События', icon: Calendar },
  { id: 'participants', label: 'Участники', icon: Users },
  { id: 'stats', label: 'Статистика', icon: BarChart3 },
]

export default function AdminClient({ myProfile, announcements: initAnnouncements, events: initEvents, profiles: initProfiles, meetingCounts, totalMatches }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('announcements')

  // Announcements state
  const [announcements, setAnnouncements] = useState(initAnnouncements)
  const [editingAnn, setEditingAnn] = useState<Partial<Announcement> | null>(null)
  const [annLoading, setAnnLoading] = useState(false)

  // Events state
  const [events, setEvents] = useState(initEvents)
  const [editingEvent, setEditingEvent] = useState<(Partial<Event> & { _moscowInput?: string }) | null>(null)
  const [eventLoading, setEventLoading] = useState(false)

  // Profiles state
  const [profiles, setProfiles] = useState(initProfiles)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // --- Announcements CRUD ---
  async function saveAnnouncement() {
    if (!editingAnn?.title || !editingAnn?.body) return
    setAnnLoading(true)
    if (editingAnn.id) {
      const { data } = await supabase
        .from('announcements')
        .update({ title: editingAnn.title, body: editingAnn.body, pinned: editingAnn.pinned ?? false })
        .eq('id', editingAnn.id)
        .select()
        .single()
      if (data) setAnnouncements(prev => prev.map(a => a.id === data.id ? data : a))
    } else {
      const { data } = await supabase
        .from('announcements')
        .insert({ title: editingAnn.title, body: editingAnn.body, pinned: editingAnn.pinned ?? false, author_id: myProfile.id })
        .select()
        .single()
      if (data) setAnnouncements(prev => [data, ...prev])
    }
    setEditingAnn(null)
    setAnnLoading(false)
  }

  async function deleteAnnouncement(id: string) {
    await supabase.from('announcements').delete().eq('id', id)
    setAnnouncements(prev => prev.filter(a => a.id !== id))
  }

  async function togglePin(ann: Announcement) {
    const { data } = await supabase
      .from('announcements')
      .update({ pinned: !ann.pinned })
      .eq('id', ann.id)
      .select()
      .single()
    if (data) setAnnouncements(prev => prev.map(a => a.id === data.id ? data : a))
  }

  // --- Events CRUD ---
  async function saveEvent() {
    if (!editingEvent?.title || !editingEvent?._moscowInput) return
    setEventLoading(true)

    const payload = {
      title:            editingEvent.title,
      description:      editingEvent.description || null,
      event_date:       moscowInputToUtc(editingEvent._moscowInput),
      format:           editingEvent.format || null,
      location_or_link: editingEvent.location_or_link || null,
    }

    if (editingEvent.id) {
      const { data } = await supabase.from('events').update(payload).eq('id', editingEvent.id).select().single()
      if (data) setEvents(prev => prev.map(e => e.id === data.id ? data : e))
    } else {
      const { data } = await supabase.from('events').insert(payload).select().single()
      if (data) setEvents(prev =>
        [...prev, data].sort((a, b) => new Date(a.event_date ?? 0).getTime() - new Date(b.event_date ?? 0).getTime())
      )
    }
    setEditingEvent(null)
    setEventLoading(false)
  }

  async function deleteEvent(id: string) {
    await supabase.from('events').delete().eq('id', id)
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  // --- Participants ---
  async function deleteParticipant(profile: Profile) {
    setDeletingId(profile.id)
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.user_id }),
      })
      if (res.ok) {
        setProfiles(prev => prev.filter(p => p.id !== profile.id))
      }
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  async function toggleAdmin(profile: Profile) {
    const { data } = await supabase
      .from('profiles')
      .update({ is_admin: !profile.is_admin })
      .eq('id', profile.id)
      .select()
      .single()
    if (data) setProfiles(prev => prev.map(p => p.id === data.id ? data : p))
  }

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:ring-2 focus:ring-[var(--text)] focus:border-transparent text-sm bg-[var(--surface)]"
  const btnPrimary = "inline-flex items-center gap-2 px-4 py-2 bg-[var(--text)] text-white rounded-xl text-sm font-bold hover:opacity-80 transition-opacity"
  const btnGhost = "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm text-[var(--text-2)] hover:bg-[var(--surface-2)] transition-colors"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[var(--accent)] rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-black/10 flex items-center justify-center">
            <Shield size={20} className="text-[var(--text)]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[var(--text)]">Кабинет администратора</h1>
            <p className="text-[var(--text-2)] text-sm">Управление платформой Random Coffee</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-1 shadow-sm">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all ${
              tab === id
                ? 'bg-[var(--text)] text-white shadow-sm'
                : 'text-[var(--text-2)] hover:bg-[var(--surface-2)]'
            }`}
          >
            <Icon size={15} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Announcements */}
      {tab === 'announcements' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-[var(--text)]">Анонсы ({announcements.length})</h2>
            <button onClick={() => setEditingAnn({ pinned: false })} className={btnPrimary}>
              <Plus size={15} /> Создать
            </button>
          </div>

          {/* Form */}
          {editingAnn && (
            <div className="bg-[var(--surface)] rounded-2xl border-2 border-[var(--text)] p-5 space-y-3 shadow-[var(--shadow)]">
              <h3 className="font-bold text-[var(--text)]">{editingAnn.id ? 'Редактировать' : 'Новый анонс'}</h3>
              <div>
                <label htmlFor="ann-title" className="block text-xs font-medium text-[var(--text-2)] mb-1">Заголовок</label>
                <input id="ann-title" className={inputCls} placeholder="Заголовок" value={editingAnn.title ?? ''} onChange={e => setEditingAnn(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label htmlFor="ann-body" className="block text-xs font-medium text-[var(--text-2)] mb-1">Текст анонса</label>
                <textarea id="ann-body" className={`${inputCls} resize-none`} rows={4} placeholder="Текст анонса" value={editingAnn.body ?? ''} onChange={e => setEditingAnn(p => ({ ...p, body: e.target.value }))} />
              </div>
              <label className="flex items-center gap-2 text-sm text-[var(--text-2)] cursor-pointer">
                <input type="checkbox" checked={editingAnn.pinned ?? false} onChange={e => setEditingAnn(p => ({ ...p, pinned: e.target.checked }))} className="rounded" />
                Закрепить
              </label>
              <div className="flex gap-2 pt-1">
                <button onClick={saveAnnouncement} disabled={annLoading} className={btnPrimary}>
                  <Save size={14} /> {annLoading ? 'Сохраняем...' : 'Сохранить'}
                </button>
                <button onClick={() => setEditingAnn(null)} className={btnGhost}><X size={14} /> Отмена</button>
              </div>
            </div>
          )}

          {announcements.length === 0 && !editingAnn && (
            <div className="text-center py-10 text-[var(--text-3)]">
              <Bell size={32} className="mx-auto mb-2 opacity-30" />
              <p>Анонсов пока нет</p>
            </div>
          )}

          <div className="space-y-3">
            {announcements.map(ann => (
              <div key={ann.id} className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[var(--text)] text-sm">{ann.title}</h3>
                      {ann.pinned && <span className="text-xs bg-[var(--accent)] text-[var(--text)] px-2 py-0.5 rounded-full font-medium">📌 Закреплено</span>}
                    </div>
                    <p className="text-sm text-[var(--text-2)] leading-relaxed">{ann.body}</p>
                    <p className="text-xs text-[var(--text-3)] mt-1.5">{new Date(ann.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => togglePin(ann)} title={ann.pinned ? 'Открепить' : 'Закрепить'}
                      className={`p-1.5 rounded-lg transition-colors ${ann.pinned ? 'text-[var(--text)] bg-[var(--accent)]' : 'text-[var(--text-3)] hover:bg-[var(--surface-2)]'}`}>
                      <Pin size={14} />
                    </button>
                    <button onClick={() => setEditingAnn(ann)} className="p-1.5 rounded-lg text-[var(--text-3)] hover:bg-[var(--surface-2)] transition-colors">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => deleteAnnouncement(ann.id)} className="p-1.5 rounded-lg text-[var(--text-3)] hover:bg-red-950/30 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events */}
      {tab === 'events' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-bold text-[var(--text)]">События ({events.length})</h2>
            <div className="flex items-center gap-2">
              <a
                href="webcal://random-coffee-lyart.vercel.app/api/calendar"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--text-2)] hover:border-[var(--text)] hover:text-[var(--text)] transition-colors bg-[var(--surface)]"
              >
                <CalendarPlus size={13} /> Синхронизация GCal
              </a>
              <button onClick={() => setEditingEvent({ _moscowInput: '' })} className={btnPrimary}>
                <Plus size={15} /> Создать
              </button>
            </div>
          </div>

          {/* ICS hint */}
          <div className="bg-[var(--blue-light)] border border-[var(--blue-mid)] rounded-xl p-3 text-xs text-[var(--blue)]">
            <p className="font-semibold">📅 Автосинхронизация с Google Calendar</p>
            <p className="mt-0.5 text-[var(--text-2)]">Нажми «Синхронизация GCal» — все события появятся в Google Calendar и будут обновляться автоматически.</p>
            <code className="block mt-1.5 bg-[var(--surface)] px-2 py-1 rounded-lg text-[10px] break-all select-all text-[var(--text-2)]">
              https://random-coffee-lyart.vercel.app/api/calendar
            </code>
          </div>

          {/* Event form */}
          {editingEvent && (
            <div className="bg-[var(--surface)] rounded-2xl border-2 border-[var(--text)] p-5 space-y-4 shadow-[var(--shadow)]">
              <h3 className="font-bold text-[var(--text)]">{editingEvent.id ? '✏️ Редактировать событие' : '➕ Новое событие'}</h3>

              {/* Title */}
              <div>
                <label htmlFor="evt-title" className="block text-xs font-semibold text-[var(--text-2)] mb-1">Название *</label>
                <input id="evt-title" className={inputCls} placeholder="Название события" required
                  value={editingEvent.title ?? ''}
                  onChange={e => setEditingEvent(p => ({ ...p, title: e.target.value }))} />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="evt-desc" className="block text-xs font-semibold text-[var(--text-2)] mb-1">Описание</label>
                <textarea id="evt-desc" className={`${inputCls} resize-none`} rows={2}
                  placeholder="О чём это событие? (необязательно)"
                  value={editingEvent.description ?? ''}
                  onChange={e => setEditingEvent(p => ({ ...p, description: e.target.value }))} />
              </div>

              {/* Date/time — always Moscow */}
              <div>
                <label htmlFor="evt-date" className="block text-xs font-semibold text-[var(--text-2)] mb-1">
                  Дата и время * <span className="font-normal text-[var(--text-3)]">(МСК, UTC+3)</span>
                </label>
                <input id="evt-date" type="datetime-local" className={inputCls}
                  value={editingEvent._moscowInput ?? ''}
                  onChange={e => setEditingEvent(p => ({ ...p, _moscowInput: e.target.value }))} />
                {editingEvent._moscowInput && (
                  <p className="text-[10px] text-[var(--text-3)] mt-1">
                    🕐 Будет сохранено как: {moscowInputToUtc(editingEvent._moscowInput)
                      ? new Date(moscowInputToUtc(editingEvent._moscowInput)).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', dateStyle: 'long', timeStyle: 'short' }) + ' МСК'
                      : '—'}
                  </p>
                )}
              </div>

              {/* Format */}
              <div>
                <p className="text-xs font-semibold text-[var(--text-2)] mb-2">Формат</p>
                <div className="flex gap-2 flex-wrap">
                  {FORMAT_OPTIONS.map(({ value, label, icon: Icon, color }) => (
                    <button key={value} type="button"
                      onClick={() => setEditingEvent(p => ({ ...p, format: p?.format === value ? undefined : value as Event['format'] }))}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                        editingEvent.format === value ? color : 'border-[var(--border)] text-[var(--text-3)] hover:border-[var(--text-2)]'
                      }`}>
                      <Icon size={12} /> {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location / link */}
              <div>
                <label htmlFor="evt-location" className="block text-xs font-semibold text-[var(--text-2)] mb-1">
                  {editingEvent.format === 'online' ? 'Ссылка на встречу' : editingEvent.format === 'offline' ? 'Адрес места' : 'Место / ссылка'}
                </label>
                <input id="evt-location" className={inputCls}
                  placeholder={editingEvent.format === 'online' ? 'https://zoom.us/j/...' : editingEvent.format === 'offline' ? 'Москва, ул. Тверская 1' : 'Zoom, офис, адрес...'}
                  value={editingEvent.location_or_link ?? ''}
                  onChange={e => setEditingEvent(p => ({ ...p, location_or_link: e.target.value }))} />
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={saveEvent}
                  disabled={eventLoading || !editingEvent.title || !editingEvent._moscowInput}
                  className={btnPrimary + ' disabled:opacity-40'}>
                  <Save size={14} /> {eventLoading ? 'Сохраняем...' : 'Сохранить'}
                </button>
                <button onClick={() => setEditingEvent(null)} className={btnGhost}><X size={14} /> Отмена</button>
              </div>
            </div>
          )}

          {events.length === 0 && !editingEvent && (
            <div className="text-center py-10 text-[var(--text-3)]">
              <Calendar size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Событий пока нет — создай первое!</p>
            </div>
          )}

          <div className="space-y-3">
            {events.map(event => {
              const fmt = FORMAT_OPTIONS.find(f => f.value === event.format)
              return (
                <div key={event.id} className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-4 shadow-sm">
                  <div className="flex gap-4">
                    {/* Date badge */}
                    <div className="shrink-0 w-14 text-center bg-[var(--accent)] rounded-xl py-2 self-start">
                      <p className="text-xl font-black text-[var(--text)] leading-none">
                        {event.event_date ? new Date(event.event_date).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', day: 'numeric' }) : '?'}
                      </p>
                      <p className="text-[10px] text-black/60 uppercase font-bold mt-0.5">
                        {event.event_date ? new Date(event.event_date).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', month: 'short' }) : ''}
                      </p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap">
                        <h3 className="font-bold text-[var(--text)] text-sm">{event.title}</h3>
                        {fmt && (
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${fmt.color}`}>
                            <fmt.icon size={9} /> {fmt.label}
                          </span>
                        )}
                      </div>
                      {/* Moscow time */}
                      <p className="text-xs text-[var(--text-3)] mt-0.5 font-medium">
                        🕐 {event.event_date ? toMoscowDisplay(event.event_date) + ' МСК' : '—'}
                      </p>
                      {event.description && <p className="text-xs text-[var(--text-2)] mt-1 leading-relaxed">{event.description}</p>}
                      {event.location_or_link && (
                        <div className="mt-1">
                          {event.location_or_link.startsWith('http') ? (
                            <a href={event.location_or_link} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-[var(--blue)] hover:underline font-medium">
                              🔗 {event.location_or_link}
                            </a>
                          ) : (
                            <span className="text-xs text-[var(--text-3)]">📍 {event.location_or_link}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-start gap-1 shrink-0">
                      <button
                        onClick={() => setEditingEvent({ ...event, _moscowInput: utcToMoscowInput(event.event_date) })}
                        className="p-1.5 rounded-lg text-[var(--text-3)] hover:bg-[var(--surface-2)] transition-colors"
                        title="Редактировать"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => deleteEvent(event.id)}
                        className="p-1.5 rounded-lg text-[var(--text-3)] hover:bg-red-950/30 hover:text-red-400 transition-colors"
                        title="Удалить">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Participants */}
      {tab === 'participants' && (
        <div className="space-y-4">
          <h2 className="font-bold text-[var(--text)]">Участники ({profiles.length})</h2>

          {/* Confirm delete dialog */}
          {confirmDeleteId && (() => {
            const target = profiles.find(p => p.id === confirmDeleteId)
            return target ? (
              <div className="bg-red-950/25 border-2 border-red-800/40 rounded-2xl p-4 flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-bold text-red-400 text-sm">Удалить участника?</p>
                  <p className="text-xs text-red-400 mt-0.5">
                    <strong>{target.full_name}</strong> будет удалён безвозвратно вместе со всеми данными.
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => deleteParticipant(target)}
                    disabled={deletingId === target.id}
                    className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {deletingId === target.id ? 'Удаляем...' : 'Удалить'}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-3 py-1.5 bg-[var(--surface)] text-red-400 border border-red-800/40 text-xs font-bold rounded-xl hover:bg-red-950/25 transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : null
          })()}

          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                    <th className="text-left px-4 py-3 font-semibold text-[var(--text-2)]">Участник</th>
                    <th className="text-left px-4 py-3 font-semibold text-[var(--text-2)] hidden sm:table-cell">Роль</th>
                    <th className="text-center px-4 py-3 font-semibold text-[var(--text-2)]">Встреч</th>
                    <th className="text-center px-4 py-3 font-semibold text-[var(--text-2)]">Админ</th>
                    <th className="text-center px-4 py-3 font-semibold text-[var(--text-2)]">Удалить</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map(p => (
                    <tr key={p.id} className={`border-b border-[var(--border)] last:border-0 transition-colors ${confirmDeleteId === p.id ? 'bg-red-950/25' : 'hover:bg-[var(--surface-2)]'}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-[var(--text)] text-xs font-black shrink-0">
                            {(p.full_name ?? '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-[var(--text)]">{p.full_name}</p>
                            {p.city && <p className="text-xs text-[var(--text-3)]">📍 {p.city}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-2)] hidden sm:table-cell">
                        {p.profession ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[var(--accent)] text-[var(--text)] text-xs font-black">
                          {meetingCounts[p.id] ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleAdmin(p)}
                          disabled={p.id === myProfile.id}
                          title={p.id === myProfile.id ? 'Это вы' : p.is_admin ? 'Снять права' : 'Дать права'}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center mx-auto transition-colors ${
                            p.is_admin
                              ? 'bg-[var(--accent)] text-[var(--text)] hover:opacity-80'
                              : 'bg-[var(--surface-2)] text-[var(--text-3)] hover:bg-[var(--border)]'
                          } disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                          <Shield size={14} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setConfirmDeleteId(p.id === confirmDeleteId ? null : p.id)}
                          disabled={p.id === myProfile.id || deletingId === p.id}
                          title={p.id === myProfile.id ? 'Нельзя удалить себя' : 'Удалить участника'}
                          className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto text-[var(--text-3)] hover:bg-red-950/30 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      {tab === 'stats' && (
        <div className="space-y-4">
          <h2 className="font-bold text-[var(--text)]">Статистика платформы</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Участников', value: profiles.length, icon: Users, accent: true },
              { label: 'Встреч', value: Object.values(meetingCounts).reduce((s, v) => s + v, 0), icon: Coffee, accent: false },
              { label: 'Мэтчей', value: totalMatches, icon: Shuffle, accent: true },
              { label: 'Событий', value: events.length, icon: Calendar, accent: false },
            ].map(({ label, value, icon: Icon, accent }) => (
              <div key={label} className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5 shadow-sm">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${accent ? 'bg-[var(--accent)]' : 'bg-[var(--text)]'}`}>
                  <Icon size={18} className={accent ? 'text-[var(--text)]' : 'text-white'} />
                </div>
                <p className="text-3xl font-black text-[var(--text)]">{value}</p>
                <p className="text-sm text-[var(--text-2)] mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <h3 className="font-semibold text-[var(--text)] mb-4">Топ участников по встречам</h3>
            <div className="space-y-2">
              {profiles
                .filter(p => (meetingCounts[p.id] ?? 0) > 0)
                .sort((a, b) => (meetingCounts[b.id] ?? 0) - (meetingCounts[a.id] ?? 0))
                .slice(0, 10)
                .map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className={`text-sm font-bold w-6 text-center ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-orange-400' : 'text-[var(--text-3)]'}`}>{i + 1}</span>
                    <div className="flex-1 bg-[var(--surface-2)] rounded-full h-7 overflow-hidden relative">
                      <div
                        className="h-full bg-[var(--accent)] rounded-full transition-all"
                        style={{ width: `${Math.min(100, ((meetingCounts[p.id] ?? 0) / Math.max(...Object.values(meetingCounts))) * 100)}%` }}
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--text)] mix-blend-multiply">{p.full_name}</span>
                    </div>
                    <span className="text-sm font-black text-[var(--text)] w-8 text-right">{meetingCounts[p.id] ?? 0}</span>
                  </div>
                ))}
              {Object.keys(meetingCounts).length === 0 && (
                <p className="text-sm text-[var(--text-3)] text-center py-4">Встреч пока нет</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
