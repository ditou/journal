'use client'
import Link from 'next/link'
import { TrendingUp, Zap, BarChart2, Shield, Upload, Globe } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen grid-bg" style={{ fontFamily: 'var(--font-geist-sans)' }}>

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b" style={{ borderColor: 'var(--border)', backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 50, background: 'rgba(8,11,15,0.85)' }}>
        <div className="flex items-center gap-2">
          <TrendingUp size={20} color="#00D68F" />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: '#E2E8F0', letterSpacing: '-0.02em' }}>
            Trade<span style={{ color: '#00D68F' }}>Log</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login"><button className="btn-ghost">Entrar</button></Link>
          <Link href="/auth/register"><button className="btn-primary">Empezar gratis</button></Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 pt-24 pb-20">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0,214,143,0.08)', border: '1px solid rgba(0,214,143,0.2)', borderRadius: 20, padding: '4px 14px', marginBottom: 32, fontSize: 12, color: '#00D68F', fontWeight: 600, letterSpacing: '0.06em' }}>
          ⚡ BETA GRATUITA — Acceso completo sin tarjeta
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(36px, 6vw, 72px)', lineHeight: 1.08, letterSpacing: '-0.03em', maxWidth: 820, color: '#F1F5F9' }}>
          Tu journal de trading.<br />
          <span style={{ color: '#00D68F' }}>Serio.</span>
        </h1>
        <p style={{ marginTop: 24, fontSize: 18, color: '#64748B', maxWidth: 540, lineHeight: 1.6 }}>
          Conectá Tradovate por API o importá tu historial de MetaTrader. Analizá cada trade, cada error, cada patrón.
        </p>
        <div className="flex gap-3 mt-10 flex-wrap justify-center">
          <Link href="/auth/register"><button className="btn-primary" style={{ fontSize: 16, padding: '13px 28px' }}>Crear cuenta gratis</button></Link>
          <Link href="/dashboard"><button className="btn-secondary" style={{ fontSize: 16, padding: '13px 28px' }}>Ver demo</button></Link>
        </div>

        {/* Stats row */}
        <div className="flex gap-8 mt-16 flex-wrap justify-center">
          {[
            { label: 'Trades analizados', value: '0' },
            { label: 'Traders activos', value: '0' },
            { label: 'Brokers soportados', value: '2' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div className="mono" style={{ fontSize: 32, fontWeight: 700, color: '#E2E8F0' }}>{s.value}</div>
              <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-24 max-w-6xl mx-auto">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {[
            { icon: <Zap size={20} color="#00D68F" />, title: 'Tradovate API', desc: 'Conectá tu cuenta con OAuth. Tus trades se sincronizan automáticamente sin tocar nada.', tag: 'LIVE' },
            { icon: <Upload size={20} color="#4FC3F7" />, title: 'MetaTrader Import', desc: 'Exportá tu historial como CSV o HTML desde MT4/MT5 y subilo en segundos.', tag: 'MANUAL' },
            { icon: <BarChart2 size={20} color="#FFB547" />, title: 'Analytics profundo', desc: 'Win rate, profit factor, drawdown, mejores setups, peores errores. Todo en un dashboard.', tag: 'ANALYTICS' },
            { icon: <TrendingUp size={20} color="#00D68F" />, title: 'Calendario P&L', desc: 'Heatmap mensual. Ve tus días verdes y rojos de un vistazo. Identificá patrones temporales.', tag: 'CALENDAR' },
            { icon: <Shield size={20} color="#FF4D6D" />, title: 'Risk guardrails', desc: 'Límites de pérdida diaria, máximo de trades, límites de racha. Protegé tu cuenta.', tag: 'RISK' },
            { icon: <Globe size={20} color="#A78BFA" />, title: 'Perfil público', desc: 'Compartí tu curva de equity, tus mejores trades. Construí tu reputación en la comunidad.', tag: 'SOCIAL' },
          ].map(f => (
            <div key={f.title} className="card card-hover p-6">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ width: 40, height: 40, background: 'var(--surface-2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{f.icon}</div>
                <span className="tag" style={{ background: 'var(--surface-2)', color: 'var(--muted)', fontSize: 10, letterSpacing: '0.08em' }}>{f.tag}</span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#E2E8F0', marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ borderTop: '1px solid var(--border)', padding: '60px 24px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: '#F1F5F9', marginBottom: 16 }}>Empezá hoy.</h2>
        <p style={{ color: '#64748B', marginBottom: 28, fontSize: 16 }}>Gratis. Sin tarjeta. Sin excusas.</p>
        <Link href="/auth/register"><button className="btn-primary" style={{ fontSize: 16, padding: '13px 32px' }}>Crear mi cuenta →</button></Link>
      </section>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px', textAlign: 'center', fontSize: 13, color: '#334155' }}>
        © {new Date().getFullYear()} TradeLog — Hecho para traders, por traders.
      </footer>
    </div>
  )
}
