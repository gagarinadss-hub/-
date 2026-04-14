import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Public ICS feed — Google Calendar subscribes to this URL and auto-syncs
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: true })

  const now = formatDate(new Date())
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://random-coffee-lyart.vercel.app'

  const vevents = (events ?? []).map((e) => {
    const start = new Date(e.event_date)
    const end   = new Date(start.getTime() + 60 * 60 * 1000) // +1 час по умолчанию

    const lines = [
      'BEGIN:VEVENT',
      `UID:${e.id}@random-coffee`,
      `DTSTAMP:${now}`,
      `DTSTART:${formatDate(start)}`,
      `DTEND:${formatDate(end)}`,
      `SUMMARY:${icsEscape(e.title)}`,
    ]

    if (e.description) {
      lines.push(`DESCRIPTION:${icsEscape(e.description)}`)
    }
    if (e.location_or_link) {
      lines.push(`LOCATION:${icsEscape(e.location_or_link)}`)
      if (e.location_or_link.startsWith('http')) {
        lines.push(`URL:${e.location_or_link}`)
      }
    }

    lines.push(`URL:${appUrl}/dashboard`)
    lines.push('END:VEVENT')
    return lines.join('\r\n')
  }).join('\r\n')

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Random Coffee//Events//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Random Coffee — События',
    'X-WR-CALDESC:События сообщества Random Coffee',
    'X-WR-TIMEZONE:Europe/Moscow',
    'X-PUBLISHED-TTL:PT1H',
    vevents,
    'END:VCALENDAR',
  ].join('\r\n')

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="random-coffee.ics"',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}

function formatDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function icsEscape(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
}
