import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt     = 'Random Coffee — умные встречи из сообщества'
export const size    = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #c7d2fe 0%, #ddd6fe 25%, #e0e7ff 50%, #bae6fd 80%, #a5f3fc 100%)',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Background orbs */}
        <div style={{
          position: 'absolute', width: 480, height: 480,
          top: -120, left: -100, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, rgba(196,181,253,0.75), rgba(129,140,248,0.60) 55%, rgba(67,56,202,0.45) 100%)',
          filter: 'blur(2px)',
        }} />
        <div style={{
          position: 'absolute', width: 340, height: 340,
          top: 40, right: -60, borderRadius: '50%',
          background: 'radial-gradient(circle at 36% 32%, rgba(165,180,252,0.70), rgba(99,102,241,0.55) 60%, rgba(55,48,163,0.40) 100%)',
          filter: 'blur(2px)',
        }} />
        <div style={{
          position: 'absolute', width: 260, height: 260,
          bottom: -50, left: '30%', borderRadius: '50%',
          background: 'radial-gradient(circle at 38% 34%, rgba(186,230,253,0.65), rgba(125,211,252,0.50) 55%, rgba(2,132,199,0.35) 100%)',
          filter: 'blur(2px)',
        }} />
        <div style={{
          position: 'absolute', width: 200, height: 200,
          bottom: 60, right: '12%', borderRadius: '50%',
          background: 'radial-gradient(circle at 36% 32%, rgba(221,214,254,0.70), rgba(167,139,250,0.55) 55%, rgba(109,40,217,0.40) 100%)',
          filter: 'blur(2px)',
        }} />

        {/* Glass card */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.55)',
          border: '1.5px solid rgba(255,255,255,0.50)',
          borderRadius: 40,
          padding: '60px 80px',
          boxShadow: '0 8px 60px rgba(139,92,246,0.15), inset 0 1px rgba(255,255,255,0.70)',
          maxWidth: 880,
          width: '100%',
          position: 'relative',
          zIndex: 1,
        }}>

          {/* Logo row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 32,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'rgba(255,255,255,0.65)',
              border: '1.5px solid rgba(255,255,255,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28,
            }}>
              ☕
            </div>
            <span style={{
              fontSize: 28, fontWeight: 700, color: '#1e1b4b', letterSpacing: '-0.5px',
            }}>
              Random Coffee
            </span>
          </div>

          {/* Headline */}
          <div style={{
            fontSize: 68, fontWeight: 900, color: '#1e1b4b',
            lineHeight: 1.05, letterSpacing: '-2px',
            textAlign: 'center', marginBottom: 24,
          }}>
            Знакомься. Общайся. Расти.
          </div>

          {/* Subtext */}
          <div style={{
            fontSize: 28, color: '#4c1d95', opacity: 0.72,
            textAlign: 'center', lineHeight: 1.5, marginBottom: 36,
          }}>
            Умные кофе-встречи с участниками Мастермайнда
          </div>

          {/* Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(167,139,250,0.20)',
            border: '1.5px solid rgba(167,139,250,0.35)',
            borderRadius: 999,
            padding: '10px 24px',
            fontSize: 20,
            fontWeight: 600,
            color: '#5b21b6',
          }}>
            ✦ 30 минут — новый человек в жизни
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
