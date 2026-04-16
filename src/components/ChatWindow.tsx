'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Message } from '@/lib/types'
import { Avatar } from '@/components/ProfileCard'
import { Send, Zap } from 'lucide-react'
import { playMessageSound, unlockAudio } from '@/lib/sounds'
import { useNotifications } from '@/contexts/NotificationContext'

const QUICK_REPLIES = [
  { label: '👋 Познакомиться',   text: 'Привет! Нам предложили познакомиться 👋 Рад(а) встретиться!' },
  { label: '⏰ Удобное время',   text: 'Когда тебе удобно? Я обычно свободен(а) в будние дни' },
  { label: '📞 Созвон',          text: 'Давай созвонимся? 30 минут в zoom — этого обычно хватает' },
  { label: '☕ Кофе',            text: 'Предлагаю кофе ☕ — оффлайн или онлайн, как удобнее' },
  { label: '🔗 Zoom',            text: 'Предлагаю Zoom 30 минут — пришли удобное время' },
  { label: '🙏 Спасибо',         text: 'Отлично пообщались! Спасибо, было очень полезно 🙏' },
]

const REACTION_EMOJIS = ['👍', '❤️', '😂', '🔥', '🙏']

type Props = {
  matchId:         string
  myProfile:       Profile
  partner:         Profile
  initialMessages: Message[]
}

type Reactions   = Record<string, Record<string, number>>  // msgId → emoji → count
type MyReactions = Record<string, string | null>           // msgId → my emoji

export default function ChatWindow({ matchId, myProfile, partner, initialMessages }: Props) {
  const supabase = createClient()

  const [messages, setMessages]           = useState<Message[]>(initialMessages)
  const [input, setInput]                 = useState('')
  const [sending, setSending]             = useState(false)
  const [showQuick, setShowQuick]         = useState(false)
  const [partnerTyping, setPartnerTyping] = useState(false)
  const [reactions, setReactions]         = useState<Reactions>({})
  const [myReactions, setMyReactions]     = useState<MyReactions>({})
  const [reactionPicker, setReactionPicker] = useState<string | null>(null)

  const bottomRef                = useRef<HTMLDivElement>(null)
  const inputRef                 = useRef<HTMLInputElement>(null)
  const channelRef               = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const typingTimeoutRef         = useRef<ReturnType<typeof setTimeout> | null>(null)
  const partnerTypingTimeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { markMsgRead } = useNotifications()

  useEffect(() => { markMsgRead() }, []) // eslint-disable-line

  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('click', unlock, { once: true })
    return () => window.removeEventListener('click', unlock)
  }, [])

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  // Mark unread on mount
  useEffect(() => {
    const unread = initialMessages
      .filter((m) => m.sender_id !== myProfile.id && !m.is_read)
      .map((m) => m.id)
    if (unread.length > 0) {
      supabase.from('messages').update({ is_read: true }).in('id', unread).then(() => {})
    }
  }, [initialMessages]) // eslint-disable-line

  // Realtime: messages + typing + reactions
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
          if (msg.sender_id !== myProfile.id) {
            playMessageSound()
            setPartnerTyping(false)
            supabase.from('messages').update({ is_read: true }).eq('id', msg.id).then(() => {})
          }
        }
      )
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId !== myProfile.id) {
          setPartnerTyping(true)
          if (partnerTypingTimeoutRef.current) clearTimeout(partnerTypingTimeoutRef.current)
          partnerTypingTimeoutRef.current = setTimeout(() => setPartnerTyping(false), 3000)
        }
      })
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        const { messageId, emoji, removed } = payload as { messageId: string; emoji: string; removed: boolean }
        setReactions((prev) => {
          const msgR = { ...(prev[messageId] ?? {}) }
          msgR[emoji] = removed
            ? Math.max(0, (msgR[emoji] ?? 1) - 1)
            : (msgR[emoji] ?? 0) + 1
          return { ...prev, [messageId]: msgR }
        })
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      if (typingTimeoutRef.current)        clearTimeout(typingTimeoutRef.current)
      if (partnerTypingTimeoutRef.current) clearTimeout(partnerTypingTimeoutRef.current)
    }
  }, [matchId, myProfile.id]) // eslint-disable-line

  // Input handler — broadcasts typing event
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value)
    channelRef.current?.send({
      type: 'broadcast', event: 'typing',
      payload: { userId: myProfile.id },
    })
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {/* partner auto-hides after 3s */}, 2500)
  }

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

    if (error) setInput(text)
    setSending(false)
    inputRef.current?.focus()
  }

  function toggleReaction(messageId: string, emoji: string) {
    const prevEmoji  = myReactions[messageId]
    const isRemoving = prevEmoji === emoji

    setMyReactions((prev) => ({ ...prev, [messageId]: isRemoving ? null : emoji }))
    setReactions((prev) => {
      const msgR = { ...(prev[messageId] ?? {}) }
      if (prevEmoji) msgR[prevEmoji] = Math.max(0, (msgR[prevEmoji] ?? 1) - 1)
      if (!isRemoving) msgR[emoji]   = (msgR[emoji] ?? 0) + 1
      return { ...prev, [messageId]: msgR }
    })
    channelRef.current?.send({
      type: 'broadcast', event: 'reaction',
      payload: { messageId, emoji, removed: isRemoving },
    })
    setReactionPicker(null)
  }

  function formatTime(iso: string) {
    const d   = new Date(iso)
    const now = new Date()
    if (d.toDateString() === now.toDateString())
      return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  function groupMessages(msgs: Message[]) {
    const groups: { date: string; items: Message[] }[] = []
    let lastDate = ''
    msgs.forEach((m) => {
      const date = new Date(m.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
      if (date !== lastDate) { groups.push({ date, items: [] }); lastDate = date }
      groups[groups.length - 1].items.push(m)
    })
    return groups
  }

  const groups = groupMessages(messages)

  return (
    <div
      className="flex flex-col h-[calc(100vh-140px)] lg:h-[calc(100vh-80px)] rounded-2xl border border-[var(--border)] shadow-[var(--shadow)] overflow-hidden"
      onClick={() => reactionPicker && setReactionPicker(null)}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-white/35 flex items-center gap-3 bg-white/55 backdrop-blur-xl shrink-0">
        <Avatar name={partner.full_name} avatarUrl={partner.avatar_url} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="font-black text-[var(--text)] text-sm">{partner.full_name}</p>
          {partnerTyping ? (
            <span className="flex items-center gap-1.5 text-xs text-[var(--accent-dark)] font-medium">
              <span className="flex gap-[3px] items-end">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="w-1 h-1 bg-[var(--accent-dark)] rounded-full animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </span>
              печатает…
            </span>
          ) : (
            <p className="text-xs text-[var(--text-3)] truncate">
              {partner.profession ?? ''}
              {partner.city ? ` · ${partner.city}` : ''}
            </p>
          )}
        </div>
        {partner.username && (
          <a
            href={`https://t.me/${partner.username.replace(/^@/, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-[#229ED9]/12 text-[#229ED9] hover:bg-[#229ED9]/20 border border-[#229ED9]/25 transition-all"
            aria-label="Написать в Telegram"
          >
            <Send size={12} />
            Telegram
          </a>
        )}
      </div>

      {/* ── Messages ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 rk-chat-bg">
        {groups.length === 0 && (
          <div className="text-center py-12">
            <div className="w-14 h-14 bg-white/30 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">☕</span>
            </div>
            <p className="font-bold text-white mb-1">Начни разговор!</p>
            <p className="text-sm text-white/70">Напиши первым — это легко 👇</p>
          </div>
        )}

        {groups.map(({ date, items }) => (
          <div key={date}>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-px bg-white/35" />
              <span className="text-[10px] font-semibold text-white/80 px-2.5 py-0.5 bg-black/15 rounded-full backdrop-blur-sm">
                {date}
              </span>
              <div className="flex-1 h-px bg-white/35" />
            </div>

            <div className="space-y-2">
              {items.map((msg) => {
                const isMine         = msg.sender_id === myProfile.id
                const msgReactions   = reactions[msg.id] ?? {}
                const activeReacts   = Object.entries(msgReactions).filter(([, c]) => c > 0)
                const pickerOpen     = reactionPicker === msg.id

                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] ${isMine ? 'order-2' : ''}`}>
                      {!isMine && (
                        <div className="mb-1 ml-1">
                          <Avatar name={partner.full_name} avatarUrl={partner.avatar_url} size="sm" />
                        </div>
                      )}

                      {/* Bubble row */}
                      <div className={`flex items-center gap-1.5 ${isMine ? 'flex-row-reverse' : ''}`}>
                        {/* Emoji trigger */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setReactionPicker((prev) => prev === msg.id ? null : msg.id)
                          }}
                          className="w-5 h-5 rounded-full bg-white/60 backdrop-blur-sm flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100 transition-opacity shadow-sm shrink-0 self-center"
                          aria-label="Реакция"
                        >
                          +
                        </button>

                        {/* Bubble + picker */}
                        <div className="relative group">
                          <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                            isMine
                              ? 'rk-bubble-mine'
                              : 'rk-bubble-them'
                          }`}>
                            {msg.message_text}
                          </div>

                          {/* Reaction picker popup */}
                          {pickerOpen && (
                            <div
                              className={`absolute ${isMine ? 'right-0' : 'left-0'} bottom-full mb-1.5 flex gap-1 p-1.5 bg-white/92 backdrop-blur-md rounded-2xl shadow-xl border border-white/60 z-20`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {REACTION_EMOJIS.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => toggleReaction(msg.id, emoji)}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center text-lg hover:scale-125 active:scale-110 transition-transform ${
                                    myReactions[msg.id] === emoji ? 'bg-[var(--accent-light)] scale-110' : 'hover:bg-black/5'
                                  }`}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Reaction pills */}
                      {activeReacts.length > 0 && (
                        <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start ml-1'}`}>
                          {activeReacts.map(([emoji, count]) => (
                            <button
                              key={emoji}
                              onClick={() => toggleReaction(msg.id, emoji)}
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border font-medium transition-all ${
                                myReactions[msg.id] === emoji
                                  ? 'bg-[var(--accent)] border-[var(--accent-dark)] text-white'
                                  : 'bg-white/70 border-white/50 text-[var(--text)] hover:bg-white/90'
                              }`}
                            >
                              {emoji}{count > 1 && <span>{count}</span>}
                            </button>
                          ))}
                        </div>
                      )}

                      <p className={`text-[10px] mt-0.5 text-white/70 ${isMine ? 'text-right' : 'text-left ml-1'}`}>
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

      {/* ── Quick panel ────────────────────────────────────────────────────── */}
      {showQuick && (
        <div className="px-4 py-3 border-t border-white/35 bg-white/45 backdrop-blur-xl shrink-0 space-y-2.5">
          {/* Quick replies scroll */}
          <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-1 px-1">
            {QUICK_REPLIES.map((reply) => (
              <button
                key={reply.label}
                onClick={() => sendMessage(reply.text)}
                className="shrink-0 text-xs px-3 py-1.5 rk-qa-pill"
              >
                {reply.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input ──────────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-white/35 flex items-center gap-2 bg-white/45 backdrop-blur-xl shrink-0">
        <button
          onClick={() => setShowQuick((v) => !v)}
          aria-label={showQuick ? 'Скрыть быстрые ответы' : 'Быстрые ответы'}
          aria-pressed={showQuick}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
            showQuick
              ? 'bg-[rgba(196,181,253,0.55)] border border-[rgba(196,181,253,0.5)]'
              : 'bg-white/40 border border-white/40 hover:bg-[rgba(196,181,253,0.30)]'
          }`}
        >
          <Zap size={16} className="text-[var(--text)]" aria-hidden="true" />
        </button>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
          placeholder="Написать сообщение…"
          aria-label="Текст сообщения"
          disabled={sending}
          className="flex-1 px-4 py-2.5 text-sm rk-chat-input disabled:opacity-60"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || sending}
          aria-label="Отправить сообщение"
          className="w-10 h-10 flex items-center justify-center shrink-0 rk-send-btn"
        >
          <Send size={15} className="text-white" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
