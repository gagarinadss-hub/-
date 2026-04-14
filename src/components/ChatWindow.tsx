'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Message } from '@/lib/types'
import { Avatar } from '@/components/ProfileCard'
import { Send, Zap } from 'lucide-react'
import { playMessageSound, unlockAudio } from '@/lib/sounds'
import { useNotifications } from '@/contexts/NotificationContext'

const QUICK_REPLIES = [
  'Привет! Давай познакомимся ☕',
  'Когда тебе удобно встретиться?',
  'Предлагаю Zoom на 30 минут',
  'Давай перенесём на другое время?',
  'Отлично пообщались! Спасибо 🙏',
]

type Props = {
  matchId: string
  myProfile: Profile
  partner: Profile
  initialMessages: Message[]
}

export default function ChatWindow({ matchId, myProfile, partner, initialMessages }: Props) {
  const supabase = createClient()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput]         = useState('')
  const [sending, setSending]     = useState(false)
  const [showQuick, setShowQuick] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  const { markMsgRead } = useNotifications()

  // Clear sidebar badge when chat is opened
  useEffect(() => {
    markMsgRead()
  }, []) // eslint-disable-line

  // Unlock Web Audio on first interaction
  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('click', unlock, { once: true })
    return () => window.removeEventListener('click', unlock)
  }, [])

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  // Mark unread messages as read on mount
  useEffect(() => {
    const unread = initialMessages
      .filter((m) => m.sender_id !== myProfile.id && !m.is_read)
      .map((m) => m.id)
    if (unread.length > 0) {
      supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', unread)
        .then(() => {})
    }
  }, [initialMessages]) // eslint-disable-line

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`match-chat-${matchId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
        (payload) => {
          const msg = payload.new as Message
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev
            return [...prev, msg]
          })
          // Mark read + play sound if from partner
          if (msg.sender_id !== myProfile.id) {
            playMessageSound()
            supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', msg.id)
              .then(() => {})
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [matchId, myProfile.id]) // eslint-disable-line

  async function sendMessage(body: string) {
    const text = body.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')
    setShowQuick(false)

    const { error } = await supabase.from('messages').insert({
      match_id:     matchId,
      sender_id:    myProfile.id,
      receiver_id:  partner.id,
      message_text: text,
    })

    if (error) {
      setInput(text) // restore on error
    }
    setSending(false)
    inputRef.current?.focus()
  }

  function formatTime(iso: string) {
    const d = new Date(iso)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    if (isToday) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  function groupMessages(msgs: Message[]) {
    const groups: { date: string; items: Message[] }[] = []
    let lastDate = ''
    msgs.forEach((m) => {
      const date = new Date(m.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
      if (date !== lastDate) {
        groups.push({ date, items: [] })
        lastDate = date
      }
      groups[groups.length - 1].items.push(m)
    })
    return groups
  }

  const groups = groupMessages(messages)

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] lg:h-[calc(100vh-80px)] bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-[var(--shadow)] overflow-hidden">

      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-3 bg-[var(--surface)] shrink-0">
        <Avatar name={partner.full_name} avatarUrl={partner.avatar_url} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="font-black text-[var(--text)] text-sm">{partner.full_name}</p>
          <p className="text-xs text-[var(--text-3)] truncate">
            {partner.profession ?? ''}
            {partner.city ? ` · ${partner.city}` : ''}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {groups.length === 0 && (
          <div className="text-center py-12">
            <div className="w-14 h-14 bg-[var(--accent)] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">☕</span>
            </div>
            <p className="font-bold text-[var(--text)] mb-1">Начни разговор!</p>
            <p className="text-sm text-[var(--text-3)]">Напиши первым — это легко 👇</p>
          </div>
        )}
        {groups.map(({ date, items }) => (
          <div key={date}>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-px bg-[var(--border)]" />
              <span className="text-[10px] font-semibold text-[var(--text-3)] px-2">{date}</span>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>
            <div className="space-y-2">
              {items.map((msg) => {
                const isMine = msg.sender_id === myProfile.id
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] ${isMine ? 'order-2' : ''}`}>
                      {!isMine && (
                        <div className="mb-1 ml-1">
                          <Avatar name={partner.full_name} avatarUrl={partner.avatar_url} size="sm" />
                        </div>
                      )}
                      <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                        isMine
                          ? 'bg-[var(--text)] text-white rounded-tr-sm'
                          : 'bg-[var(--surface-2)] text-[var(--text)] rounded-tl-sm'
                      }`}>
                        {msg.message_text}
                      </div>
                      <p className={`text-[10px] mt-0.5 text-[var(--text-3)] ${isMine ? 'text-right' : 'text-left ml-1'}`}>
                        {formatTime(msg.created_at)}
                        {isMine && msg.is_read && ' · ✓✓'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      {showQuick && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto shrink-0">
          {QUICK_REPLIES.map((reply) => (
            <button
              key={reply}
              onClick={() => sendMessage(reply)}
              className="shrink-0 text-xs px-3 py-1.5 bg-[var(--accent-light)] border border-[var(--accent)]/30 rounded-full font-medium text-[var(--text)] hover:bg-[var(--accent)] transition-colors whitespace-nowrap"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-[var(--border)] flex items-center gap-2 bg-[var(--surface)] shrink-0">
        <button
          onClick={() => setShowQuick((v) => !v)}
          aria-label={showQuick ? 'Скрыть быстрые ответы' : 'Быстрые ответы'}
          aria-pressed={showQuick}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
            showQuick ? 'bg-[var(--accent)]' : 'bg-[var(--surface-2)] hover:bg-[var(--accent-light)]'
          }`}
        >
          <Zap size={16} className="text-[var(--text)]" aria-hidden="true" />
        </button>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
          placeholder="Написать сообщение…"
          aria-label="Текст сообщения"
          disabled={sending}
          className="flex-1 px-3.5 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:ring-2 focus:ring-[var(--text)] focus:border-transparent bg-[var(--surface)] disabled:opacity-60"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || sending}
          aria-label="Отправить сообщение"
          className="w-9 h-9 rounded-xl bg-[var(--text)] flex items-center justify-center disabled:opacity-30 hover:opacity-80 transition-opacity shrink-0"
        >
          <Send size={15} className="text-white" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
