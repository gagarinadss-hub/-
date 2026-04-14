/**
 * Moscow time utilities (Europe/Moscow = UTC+3, no DST since 2014)
 */

const TZ = 'Europe/Moscow'

/** Format UTC ISO string for display in Moscow time */
export function toMoscowDisplay(
  utcString: string | null | undefined,
  opts?: Intl.DateTimeFormatOptions
): string {
  if (!utcString) return ''
  const d = new Date(utcString)
  return d.toLocaleString('ru-RU', {
    timeZone: TZ,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...opts,
  })
}

/** Format UTC ISO string to short date in Moscow time */
export function toMoscowDate(utcString: string | null | undefined): string {
  if (!utcString) return ''
  return new Date(utcString).toLocaleDateString('ru-RU', {
    timeZone: TZ,
    day: 'numeric',
    month: 'long',
  })
}

/** Format UTC ISO string to time string in Moscow time */
export function toMoscowTime(utcString: string | null | undefined): string {
  if (!utcString) return ''
  return new Date(utcString).toLocaleTimeString('ru-RU', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Get day number in Moscow time */
export function moscowDay(utcString: string | null | undefined): number {
  if (!utcString) return 0
  return parseInt(
    new Date(utcString).toLocaleString('ru-RU', { timeZone: TZ, day: 'numeric' }),
    10
  )
}

/** Get short month name in Moscow time */
export function moscowMonth(utcString: string | null | undefined): string {
  if (!utcString) return ''
  return new Date(utcString).toLocaleString('ru-RU', {
    timeZone: TZ,
    month: 'short',
  })
}

/**
 * Convert UTC ISO string → value for <input type="datetime-local">
 * Shows Moscow time in the input regardless of user's local timezone
 */
export function utcToMoscowInput(utcString: string | null | undefined): string {
  if (!utcString) return ''
  const d = new Date(utcString)
  // 'sv' locale gives ISO-like format: "YYYY-MM-DD HH:MM:SS"
  return d
    .toLocaleString('sv', { timeZone: TZ })
    .replace(' ', 'T')
    .slice(0, 16)
}

/**
 * Convert datetime-local value (Moscow time) → UTC ISO string
 * Input value is treated as Moscow time (UTC+3)
 */
export function moscowInputToUtc(localValue: string): string {
  if (!localValue) return ''
  // Append Moscow offset so Date parses correctly
  return new Date(`${localValue}:00+03:00`).toISOString()
}
