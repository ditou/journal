'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, TrendingDown, Activity, Target, AlertTriangle, ArrowUpRight, Flame, BadgeAlert } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { DashboardStats, Trade } from '@/types'
import Link from 'next/link'

function StatCard({ label, value, sub, color, icon }: { label: string; value: string; sub?: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: '#475569', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
        <div style={{ color }}>{icon}</div>
      </div>
      <div className="stat-number" style={{ color }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#475569', marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

function getCurrentStreak(trades: Trade[]) {
  if (!trades.length) return 0
  let streak = 0
  const ordered = [...trades].sort((a, b) => +new Date(b.exit_time) - +new Date(a.exit_time))
  const firstStatus = ordered[0].status
  if (firstStatus === 'BREAKEVEN') return 0
  for (const trade of ordered) {
    if (trade.status !== firstStatus) break
    streak += trade.status === 'WIN' ? 1 : -1
  }
  return streak
}

function getMaxDrawdownAndEquity(trades: Trade[]) {
  const ordered = [...trades].sort((a, b) => +new Date(a.exit_time) - +new Date(b.exit_time))
  let running = 0
  let peak = 0
  let maxDrawdown = 0
  const points = ordered.map((trade) => {
    running += trade.pnl
    peak = Math.max(peak, running)
    maxDrawdown = Math.max(maxDrawdown, peak - running)
    return {
      date: new Date(trade.exit_time).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
      equity: parseFloat(running.toFixed(2)),
      pnl: trade.pnl,
    }
  })
  return { maxDrawdown, equityPoints: points }
}

export default function DashboardPage() {
  const [user, setUser] = useState<{ email?: string; user_metadata?: { display_name?: string } } | null>(null)
  const [allTrades, setAllTrades] = useState<Trade[]>([])
  const [recentTrades, setRecentTrades] = useState<Trade[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    total_pnl: 0, total_trades: 0, win_rate: 0, profit_factor: 0,
    avg_win: 0, avg_loss: 0, best_trade: 0, worst_trade: 0,
    current_streak: 0, max_drawdown: 0,
  })
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    loadTrades()
  }, [])

  async function loadTrades() {
    const { data } = await supabase
      .from('trades')
      .select('*')
      .order('exit_time', { ascending: false })
      .limit(5000)

    const trades = data || []
    setAllTrades(trades)
    setRecentTrades(trades.slice(0, 10))
    computeStats(trades)
  }

  function computeStats(data: Trade[]) {
    if (!data.length) {
      setStats({
        total_pnl: 0, total_trades: 0, win_rate: 0, profit_factor: 0,
        avg_win: 0, avg_loss: 0, best_trade: 0, worst_trade: 0,
        current_streak: 0, max_drawdown: 0,
      })
      return
    }

    const wins = data.filter(t => t.status === 'WIN')
    const losses = data.filter(t => t.status === 'LOSS')
    const totalPnl = data.reduce((s, t) => s + t.pnl, 0)
    const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0
    const avgLossAbs = losses.length ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0
    const grossProfit = wins.reduce((s, t) => s + t.pnl, 0)
    const grossLossAbs = Math.abs(losses.reduce((s, t) => s + t.pnl, 0))
    const { maxDrawdown } = getMaxDrawdownAndEquity(data)

    setStats({
      total_pnl: totalPnl,
      total_trades: data.length,
      win_rate: data.length ? (wins.length / data.length) * 100 : 0,
      profit_factor: grossLossAbs ? grossProfit / grossLossAbs : grossProfit > 0 ? grossProfit : 0,
      avg_win: avgWin,
      avg_loss: -avgLossAbs,
      best_trade: Math.max(...data.map(t => t.pnl)),
      worst_trade: Math.min(...data.map(t => t.pnl)),
      current_streak: getCurrentStreak(data),
      max_drawdown: maxDrawdown,
    })
  }

  const name = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Trader'
  const pnlColor = stats.total_pnl >= 0 ? '#00D68F' : '#FF4D6D'
  const { equityPoints } = useMemo(() => getMaxDrawdownAndEquity(allTrades), [allTrades])
  const streakLabel = stats.current_streak > 0 ? `${stats.current_streak} wins` : stats.current_streak < 0 ? `${Math.abs(stats.current_streak)} losses` : 'Sin racha activa'

  return (
    <div style={{ padding: '32px 32px', maxWidth: 1200 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}>Bienvenido de vuelta,</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: '#E2E8F0', letterSpacing: '-0.02em' }}>{name}</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard
          label="P&L Total"
          value={`${stats.total_pnl >= 0 ? '+' : ''}$${stats.total_pnl.toFixed(2)}`}
          color={pnlColor}
          icon={stats.total_pnl >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          sub={`${stats.total_trades} trades totales`}
        />
        <StatCard label="Win Rate" value={`${stats.win_rate.toFixed(1)}%`} color="#4FC3F7" icon={<Target size={16} />} sub={`${allTrades.filter(t => t.status === 'WIN').length} ganadores`} />
        <StatCard label="Profit Factor" value={stats.profit_factor.toFixed(2)} color="#FFB547" icon={<Activity size={16} />} sub="Ganancia bruta / pérdida bruta" />
        <StatCard label="Mejor trade" value={`${stats.best_trade >= 0 ? '+' : ''}$${stats.best_trade.toFixed(2)}`} color="#00D68F" icon={<ArrowUpRight size={16} />} />
        <StatCard label="Peor trade" value={`${stats.worst_trade >= 0 ? '+' : ''}$${stats.worst_trade.toFixed(2)}`} color="#FF4D6D" icon={<AlertTriangle size={16} />} />
        <StatCard label="Racha actual" value={streakLabel} color={stats.current_streak >= 0 ? '#00D68F' : '#FF4D6D'} icon={<Flame size={16} />} sub="Basada en trades cerrados consecutivos" />
        <StatCard label="Max drawdown" value={`-$${stats.max_drawdown.toFixed(2)}`} color="#FF8A65" icon={<BadgeAlert size={16} />} sub="Caída máxima desde peak" />
      </div>

      <div className="card p-6" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#CBD5E1' }}>Curva de equity real</h2>
          <span style={{ fontSize: 12, color: '#475569' }}>{equityPoints.length} trades acumulados</span>
        </div>
        {equityPoints.length === 0 ? (
          <div style={{ padding: 32, color: '#475569', textAlign: 'center' }}>Todavía no hay trades suficientes para construir la curva.</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={equityPoints}>
              <defs>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00D68F" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#00D68F" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} minTickGap={24} />
              <YAxis tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} width={80} tickFormatter={v => `$${v.toLocaleString()}`} />
              <Tooltip
                contentStyle={{ background: '#131B24', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, fontSize: 13 }}
                labelStyle={{ color: '#94A3B8' }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Equity']}
              />
              <Area type="monotone" dataKey="equity" stroke="#00D68F" strokeWidth={2} fill="url(#equityGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#CBD5E1' }}>Últimos trades</h2>
          <Link href="/journal" style={{ fontSize: 13, color: '#00D68F', textDecoration: 'none' }}>Ver todos →</Link>
        </div>
        {recentTrades.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <p style={{ color: '#475569', fontSize: 14, marginBottom: 16 }}>No hay trades todavía.</p>
            <Link href="/connect"><button className="btn-primary">Conectar broker →</button></Link>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Símbolo</th>
                <th>Dirección</th>
                <th>Entrada</th>
                <th>Salida</th>
                <th>P&L</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {recentTrades.map(t => (
                <tr key={t.id}>
                  <td className="mono" style={{ color: '#CBD5E1', fontWeight: 600 }}>{t.symbol}</td>
                  <td>
                    <span className="tag" style={{ background: t.direction === 'LONG' ? 'rgba(0,214,143,0.1)' : 'rgba(255,77,109,0.1)', color: t.direction === 'LONG' ? '#00D68F' : '#FF4D6D' }}>
                      {t.direction}
                    </span>
                  </td>
                  <td className="mono" style={{ color: '#94A3B8' }}>${t.entry_price.toFixed(2)}</td>
                  <td className="mono" style={{ color: '#94A3B8' }}>${t.exit_price.toFixed(2)}</td>
                  <td className="mono" style={{ color: t.pnl >= 0 ? '#00D68F' : '#FF4D6D', fontWeight: 600 }}>
                    {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                  </td>
                  <td style={{ color: '#475569', fontSize: 12 }}>{new Date(t.exit_time).toLocaleDateString('es-AR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
