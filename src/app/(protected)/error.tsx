'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to error tracking (Sentry etc) in production
    console.error('[Page error]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-5">
        <AlertTriangle size={28} className="text-red-500" />
      </div>
      <h2 className="text-xl font-black text-[var(--text)] mb-2">Что-то пошло не так</h2>
      <p className="text-sm text-[var(--text-2)] mb-6 max-w-xs leading-relaxed">
        Страница не загрузилась. Попробуй обновить или вернись на главную.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--text)] text-white rounded-xl text-sm font-bold hover:opacity-80 transition-opacity"
        >
          <RefreshCw size={14} /> Попробовать снова
        </button>
        <Link href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-[var(--border)] text-[var(--text-2)] rounded-xl text-sm font-bold hover:bg-[var(--surface-2)] transition-colors">
          На главную
        </Link>
      </div>
    </div>
  )
}
