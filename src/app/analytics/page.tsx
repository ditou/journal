'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Trade } from '@/types'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, AreaChart, Area,
} from 'recharts'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6" style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</h2>
      {children}
    </div>
  )
}

function groupBy(trades: Trade[], key: keyof Trade) {
  const map: Record<string, { pnl: number; count: number; wins: number }> = {}
  trades.forEach(t => {
    const k = (t[key] as string) || 'Sin definir'
    if (!map[k]) map[k] = { pnl: 0, count: 0, wins: 0 }
    map[k].pnl += t.pnl
    map[k].count++
    if (t.status === 'WIN') map[k].wins++
  })
  return Object.entries(map)
    .map(([name, v]) => ({
      name,
      pnl: parseFloat(v.pnl.toFixed(2)),
      count: v.count,
      winRate: Math.round((v.wins / v.count) * 100),
      expectancy: parseFloat((v.pnl / v.count).toFixed(2)),
    }))
    .sort((a, b) => b.pnl - a.pnl)
}

const tooltipStyle = {
  contentStyle: { background: '#131B24', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: '#94A3B8' },
}

export default function AnalyticsPage() {
  const supabase = createClient()
  const [trades, setTrades] = useState<Trade[]>([])

  useEffect(() => {
    supabase.from('trades').select('*').then(({ data }) => setTrades(data || []))
  }, [])

  const summary = useMemo(() => {
    const wins = trades.filter(t => t.status === 'WIN')
    const losses = trades.filter(t => t.status === 'LOSS')
    const totalPnl = trades.reduce((s, t) => s + t.pnl, 0)
    const grossProfit = wins.reduce((s, t) => s + t.pnl, 0)
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0))
    const expectancy = trades.length ? totalPnl / trades.length : 0
    const winRate = trades.length ? (wins.length / trades.length) * 100 : 0
    const avgWin = wins.length ? grossProfit / wins.length : 0
    const avgLoss = losses.length ? grossLoss / losses.length : 0
    return {
      totalPnl,
      grossProfit,
      grossLoss,
      expectancy,
      winRate,
      avgWin,
      avgLoss,
      profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit > 0 ? grossProfit : 0,
    }
  }, [trades])

  const bySetup = groupBy(trades, 'setup')
  const byEmotion = groupBy(trades, 'emotion')
  const byMistake = groupBy(trades.filter(t => t.mistake && t.mistake !== 'Ninguno'), 'mistake')
  const bySymbol = groupBy(trades, 'symbol')
  const byDirection = [
    { name: 'LONG', value: trades.filter(t => t.direction === 'LONG').length },
    { name: 'SHORT', value: trades.filter(t => t.direction === 'SHORT').length },
  ]
  const bySource = [
    { name: 'Tradovate', value: trades.filter(t => t.broker_source === 'TRADOVATE').length },
    { name: 'MetaTrader', value: trades.filter(t => t.broker_source === 'METATRADER').length },
    { name: 'Manual', value: trades.filter(t => t.broker_source === 'MANUAL').length },
  ].filter(d => d.value > 0)

  const byDow = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'].map((name, i) => {
    const dayTrades = trades.filter(t => new Date(t.exit_time).getDay() === i + 1)
    return {
      name,
      pnl: parseFloat(dayTrades.reduce((s, t) => s + t.pnl, 0).toFixed(2)),
      count: dayTrades.length,
      expectancy: dayTrades.length ? parseFloat((dayTrades.reduce((s, t) => s + t.pnl, 0) / dayTrades.length).toFixed(2)) : 0,
    }
  })

  const byHour = Array.from({ length: 24 }, (_, h) => {
    const hourTrades = trades.filter(t => new Date(t.exit_time).getHours() === h)
    return {
      name: `${h}h`,
      pnl: parseFloat(hourTrades.reduce((s, t) => s + t.pnl, 0).toFixed(2)),
      count: hourTrades.length,
    }
  }).filter(h => h.count > 0)

  const equityCurve = useMemo(() => {
    const ordered = [...trades].sort((a, b) => +new Date(a.exit_time) - +new Date(b.exit_time))
    let running = 0
    return ordered.map(t => {
      running += t.pnl
      return {
        date: new Date(t.exit_time).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
        equity: parseFloat(running.toFixed(2)),
      }
    })
  }, [trades])

  if (trades.length === 0) {
    return (
      <div style={{ padding: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: '#E2E8F0', marginBottom: 32 }}>Analytics</h1>
        <div className="card" style={{ padding: 64, textAlign: 'center' }}>
          <p style={{ color: '#475569', fontSize: 14 }}>Cargá trades primero para ver los analytics.</p>
        </div>
      </div>
    )
  }

  const barProps = { radius: [4, 4, 0, 0] as [number, number, number, number], maxBarSize: 40 }

  return (
    <div style={{ padding: '32px', maxWidth: 1180 }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: '#E2E8F0', marginBottom: 8 }}>Analytics</h1>
      <p style={{ color: '#475569', fontSize: 13, marginBottom: 20 }}>Basado en {trades.length} trades registrados</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ padding: 16 }}><div style={{ fontSize: 11, color: '#475569', marginBottom: 6 }}>Net P&L</div><div className="stat-number" style={{ fontSize: 24, color: summary.totalPnl >= 0 ? '#00D68F' : '#FF4D6D' }}>{summary.totalPnl >= 0 ? '+' : ''}${summary.totalPnl.toFixed(2)}</div></div>
        <div className="card" style={{ padding: 16 }}><div style={{ fontSize: 11, color: '#475569', marginBottom: 6 }}>Expectancy</div><div className="stat-number" style={{ fontSize: 24 }}>{summary.expectancy >= 0 ? '+' : ''}${summary.expectancy.toFixed(2)}</div></div>
        <div className="card" style={{ padding: 16 }}><div style={{ fontSize: 11, color: '#475569', marginBottom: 6 }}>Profit Factor</div><div className="stat-number" style={{ fontSize: 24 }}>{summary.profitFactor.toFixed(2)}</div></div>
        <div className="card" style={{ padding: 16 }}><div style={{ fontSize: 11, color: '#475569', marginBottom: 6 }}>Avg Win</div><div className="stat-number" style={{ fontSize: 24, color: '#00D68F' }}>+${summary.avgWin.toFixed(2)}</div></div>
        <div className="card" style={{ padding: 16 }}><div style={{ fontSize: 11, color: '#475569', marginBottom: 6 }}>Avg Loss</div><div className="stat-number" style={{ fontSize: 24, color: '#FF4D6D' }}>-${summary.avgLoss.toFixed(2)}</div></div>
      </div>

      <Section title="Curva de equity">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={equityCurve}>
            <defs>
              <linearGradient id="eqAnalytics" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00D68F" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#00D68F" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
            <Tooltip {...tooltipStyle} formatter={(v: number) => [`$${v}`, 'Equity']} />
            <Area type="monotone" dataKey="equity" stroke="#00D68F" strokeWidth={2} fill="url(#eqAnalytics)" />
          </AreaChart>
        </ResponsiveContainer>
      </Section>

      {bySetup.length > 0 && (
        <Section title="P&L por setup">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={bySetup}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => [`$${v}`, 'P&L']} />
              <Bar dataKey="pnl" {...barProps}>{bySetup.map((entry, i) => <Cell key={i} fill={entry.pnl >= 0 ? '#00D68F' : '#FF4D6D'} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
            {bySetup.map(s => (
              <div key={s.name} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                <span style={{ color: '#94A3B8', fontWeight: 600 }}>{s.name}</span>
                <span style={{ color: '#475569', marginLeft: 8 }}>{s.count} trades</span>
                <span style={{ color: s.pnl >= 0 ? '#00D68F' : '#FF4D6D', marginLeft: 8, fontFamily: 'var(--font-geist-mono)' }}>{s.pnl >= 0 ? '+' : ''}${s.pnl}</span>
                <span style={{ color: '#475569', marginLeft: 8 }}>Exp {s.expectancy >= 0 ? '+' : ''}${s.expectancy}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {byEmotion.length > 0 && (
          <div className="card p-6">
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.06em' }}>P&L por emoción</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byEmotion} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [`$${v}`, 'P&L']} />
                <Bar dataKey="pnl" {...barProps}>{byEmotion.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#00D68F' : '#FF4D6D'} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="card p-6">
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Distribución</h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={byDirection} cx="32%" cy="50%" outerRadius={58} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={11}>
                <Cell fill="#00D68F" />
                <Cell fill="#FF4D6D" />
              </Pie>
              <Pie data={bySource} cx="75%" cy="50%" outerRadius={58} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={10}>
                {bySource.map((_, i) => <Cell key={i} fill={['#4FC3F7', '#A78BFA', '#FFB547'][i % 3]} />)}
              </Pie>
              <Tooltip {...tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {byMistake.length > 0 && (
        <Section title="Errores más costosos">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byMistake}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => [`$${v}`, 'P&L']} />
              <Bar dataKey="pnl" {...barProps} fill="#FF4D6D" />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card p-6">
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.06em' }}>P&L por día de la semana</h2>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={byDow}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => [`$${v}`, 'P&L']} />
              <Bar dataKey="pnl" {...barProps}>{byDow.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? '#00D68F' : '#FF4D6D'} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-6">
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.06em' }}>P&L por hora</h2>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={byHour}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => [`$${v}`, 'P&L']} />
              <Bar dataKey="pnl" {...barProps}>{byHour.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? '#00D68F' : '#FF4D6D'} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {bySymbol.length > 0 && (
        <Section title="Mejores y peores instrumentos">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {bySymbol.slice(0, 12).map(s => (
              <div key={s.name} className="card" style={{ padding: '10px 14px', minWidth: 120 }}>
                <div className="mono" style={{ fontWeight: 700, fontSize: 15, color: '#E2E8F0' }}>{s.name}</div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{s.count} trades</div>
                <div className="mono" style={{ fontSize: 13, color: s.pnl >= 0 ? '#00D68F' : '#FF4D6D', marginTop: 4, fontWeight: 600 }}>{s.pnl >= 0 ? '+' : ''}${s.pnl}</div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
