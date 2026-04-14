'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import { playMessageSound, playNotificationSound, unlockAudio } from '@/lib/sounds'

// ── Types ──────────────────────────────────────────────────────────────────────

type NotificationState = {
  msgCount:           number
  notifCount:         number
  markMsgRead:        () => void
  markAllNotifsRead:  () => void
}

// ── Context ────────────────────────────────────────────────────────────────────

const NotificationContext = createContext<NotificationState>({
  msgCount:          0,
  notifCount:        0,
  markMsgRead:       () => {},
  markAllNotifsRead: () => {},
})

export function useNotifications() {
  return useContext(NotificationContext)
}

// ── Provider ───────────────────────────────────────────────────────────────────

type Props = {
  children:      ReactNode
  initialMsg?:   number
  initialNotif?: number
  profileId?:    string | null
  userId?:       string | null
}

export function NotificationProvider({
  children,
  initialMsg   = 0,
  initialNotif = 0,
  profileId    = null,
  userId       = null,
}: Props) {
  const [msgCount,   setMsgCount]   = useState(initialMsg)
  const [notifCount, setNotifCount] = useState(initialNotif)

  // Sync when server-side initial values change (e.g. hard navigation)
  useEffect(() => { setMsgCount(initialMsg)   }, [initialMsg])
  useEffect(() => { setNotifCount(initialNotif) }, [initialNotif])

  // Unlock Web Audio on first user gesture
  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('click',   unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('click',   unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  // ── Supabase Realtime subscriptions ─────────────────────────────────────────
  const setupRealtime = useCallback(async () => {
    if (!userId || !profileId) return
    const supabase = createClient()
    const channels: ReturnType<typeof supabase.channel>[] = []

    // 1. New notification rows for this auth user
    const notifCh = supabase
      .channel(`ctx-notifs-${userId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          if (!window.location.pathname.startsWith('/notifications')) {
            setNotifCount((n) => n + 1)
            playNotificationSound()
          }
        }
      )
      .subscribe()
    channels.push(notifCh)

    // 2. New messages where this profile is the RECEIVER — single channel, no loop
    // The filter uses receiver_id so we need just one subscription for the whole profile
    const msgCh = supabase
      .channel(`ctx-msg-${profileId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'messages',
          filter: `receiver_id=eq.${profileId}`,
        },
        (payload) => {
          const msg = payload.new as { match_id: string; sender_id: string }
          // Don't badge while user is actively in this chat
          if (!window.location.pathname.includes(`/chat/${msg.match_id}`)) {
            setMsgCount((n) => n + 1)
            playMessageSound()
          }
        }
      )
      .subscribe()
    channels.push(msgCh)

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch))
    }
  }, [userId, profileId]) // eslint-disable-line

  useEffect(() => {
    let cleanup: (() => void) | undefined
    setupRealtime().then((fn) => { cleanup = fn })
    return () => { cleanup?.() }
  }, [setupRealtime])

  // ── Public API ───────────────────────────────────────────────────────────────

  /** Call when user opens a chat — clears the unread message badge */
  function markMsgRead() {
    setMsgCount(0)
  }

  /** Call when user opens the notifications page — clears the notif badge */
  function markAllNotifsRead() {
    setNotifCount(0)
  }

  return (
    <NotificationContext.Provider value={{ msgCount, notifCount, markMsgRead, markAllNotifsRead }}>
      {children}
    </NotificationContext.Provider>
  )
}
