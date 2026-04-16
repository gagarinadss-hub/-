import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
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
        {/* Orb top-left */}
        <div style={{
          position: 'absolute', width: '420px', height: '420px',
          top: '-100px', left: '-80px', borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, rgba(196,181,253,0.80), rgba(129,140,248,0.65) 55%, rgba(67,56,202,0.50) 100%)',
          display: 'flex',
        }} />
        {/* Orb top-right */}
        <div style={{
          position: 'absolute', width: '300px', height: '300px',
          top: '-20px', right: '-60px', borderRadius: '50%',
          background: 'radial-gradient(circle at 36% 32%, rgba(165,180,252,0.75), rgba(99,102,241,0.60) 60%, rgba(55,48,163,0.45) 100%)',
          display: 'flex',
        }} />
        {/* Orb bottom-right */}
        <div style={{
          position: 'absolute', width: '220px', height: '220px',
          bottom: '-40px', right: '10%', borderRadius: '50%',
          background: 'radial-gradient(circle at 36% 32%, rgba(221,214,254,0.75), rgba(167,139,250,0.60) 55%, rgba(109,40,217,0.45) 100%)',
          display: 'flex',
        }} />
        {/* Orb bottom-left */}
        <div style={{
          position: 'absolute', width: '180px', height: '180px',
          bottom: '30px', left: '8%', borderRadius: '50%',
          background: 'radial-gradient(circle at 38% 34%, rgba(186,230,253,0.70), rgba(125,211,252,0.55) 55%, rgba(2,132,199,0.40) 100%)',
          display: 'flex',
        }} />

        {/* Glass card */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.58)',
          border: '1.5px solid rgba(255,255,255,0.52)',
          borderRadius: '40px',
          padding: '56px 80px',
          boxShadow: '0 8px 60px rgba(139,92,246,0.16), inset 0 1px rgba(255,255,255,0.72)',
          maxWidth: '900px',
          width: '900px',
          position: 'relative',
          zIndex: 1,
        }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px',
              background: 'rgba(255,255,255,0.70)',
              border: '1.5px solid rgba(255,255,255,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '26px',
            }}>
              ☕
            </div>
            <span style={{ fontSize: '28px', fontWeight: 700, color: '#1e1b4b', letterSpacing: '-0.5px' }}>
              Random Coffee
            </span>
          </div>

          {/* Headline */}
          <div style={{
            fontSize: '64px', fontWeight: 900, color: '#1e1b4b',
            lineHeight: 1.06, letterSpacing: '-2px',
            textAlign: 'center', marginBottom: '20px',
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
          }}>
            Знакомься. Общайся. Расти.
          </div>

          {/* Subtext */}
          <div style={{
            fontSize: '26px', color: '#4c1d95', opacity: 0.72,
            textAlign: 'center', lineHeight: 1.5, marginBottom: '32px',
          }}>
            Умные кофе-встречи с участниками Мастермайнда
          </div>

          {/* Badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'rgba(167,139,250,0.20)',
            border: '1.5px solid rgba(167,139,250,0.38)',
            borderRadius: '999px',
            padding: '10px 28px',
            fontSize: '20px', fontWeight: 600, color: '#5b21b6',
          }}>
            ✦ 30 минут — новый человек в жизни
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
