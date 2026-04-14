'use client'

import { useEffect } from 'react'
import { useNotifications } from '@/contexts/NotificationContext'

/**
 * Invisible client component mounted on the notifications page.
 * On mount it clears the notification badge in the sidebar via context.
 */
export default function MarkNotifsRead() {
  const { markAllNotifsRead } = useNotifications()
  useEffect(() => {
    markAllNotifsRead()
  }, []) // eslint-disable-line
  return null
}
