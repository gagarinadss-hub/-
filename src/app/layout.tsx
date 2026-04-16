import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://random-coffee.app'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'Random Coffee — умные встречи из сообщества',
    template: '%s · Random Coffee',
  },
  description: 'Находи полезных собеседников из своего сообщества. 30 минут — новый человек в жизни. Нетворкинг, менторство, партнёрство.',
  keywords: ['нетворкинг', 'random coffee', 'мастермайнд', 'знакомства', 'сообщество'],
  authors: [{ name: 'Random Coffee' }],
  creator: 'Random Coffee',
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: APP_URL,
    siteName: 'Random Coffee',
    title: 'Random Coffee — умные встречи из сообщества',
    description: 'Находи полезных собеседников. 30 минут — новый человек в жизни.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Random Coffee' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Random Coffee',
    description: 'Умные случайные встречи из сообщества',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },
}

export const viewport: Viewport = {
  themeColor: '#fda085',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {/* Animated blur blobs — fixed background layer */}
        <div aria-hidden="true" className="pointer-events-none select-none">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
          <div className="blob blob-4" />
          <div className="blob blob-5" />
        </div>
        <div className="relative z-[1] flex flex-col min-h-full flex-1">
          {children}
        </div>
      </body>
    </html>
  )
}
