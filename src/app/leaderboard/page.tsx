'use client'
import { useEffect, useState } from 'react'
import { Trophy, TrendingUp, TrendingDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface LeaderEntry {
  id: string
  username: string
  display_name: string
  total_pnl: number
  win_rate: number
  total_trades: number
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const supabase = createClient()
  const [leaders, setLeaders] = useState<LeaderEntry[]>([])
  const [tab, setTab] = useState<'pnl' | 'winrate'>('pnl')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null))
    supabase
      .from('profiles')
      .select('id, username, display_name, total_pnl, win_rate, total_trades')
      .eq('is_public', true)
      .order('total_pnl', { ascending: false })
      .limit(50)
      .then(({ data }) => setLeaders(data || []))
  }, [])

  const sorted = [...leaders].sort((a, b) =>
    tab === 'pnl' ? b.total_pnl - a.total_pnl : b.win_rate - a.win_rate
  )

  return (
    <div style={{ padding: '32px', maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <Trophy size={22} color="#FFB547" />
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: '#E2E8F0' }}>Leaderboard</h1>
      </div>
      <p style={{ color: '#475569', fontSize: 13, marginBottom: 28 }}>Solo traders con perfil público. Activá el tuyo en Configuración.</p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--surface-1)', padding: 4, borderRadius: 10, width: 'fit-content', border: '1px solid var(--border)' }}>
        {(['pnl', 'winrate'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '7px 18px',
              borderRadius: 7,
              border: 'none',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              background: tab === t ? 'var(--surface-3)' : 'transparent',
              color: tab === t ? '#E2E8F0' : '#475569',
              transition: 'all 0.15s',
            }}
          >
            {t === 'pnl' ? 'Por P&L' : 'Por Win Rate'}
          </button>
        ))}
      </div>

      {leaders.length === 0 ? (
        <div className="card" style={{ padding: 64, textAlign: 'center' }}>
          <Trophy size={32} color="#334155" style={{ marginBottom: 16 }} />
          <p style={{ color: '#475569', fontSize: 14, marginBottom: 8 }}>Todavía no hay traders públicos.</p>
          <p style={{ color: '#334155', fontSize: 13 }}>Activá tu perfil público en Configuración para aparecer acá.</p>
        </div>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 50 }}>#</th>
                <th>Trader</th>
                <th>Trades</th>
                <th>Win Rate</th>
                <th>P&L Total</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((u, i) => {
                const isMe = u.id === currentUserId
                return (
                  <tr key={u.id} style={{ background: isMe ? 'rgba(0,214,143,0.04)' : undefined }}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 14, color: i < 3 ? '#FFB547' : '#334155', fontWeight: i < 3 ? 700 : 400 }}>
                        {i < 3 ? MEDALS[i] : `${i + 1}`}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#94A3B8', flexShrink: 0 }}>
                          {(u.display_name || u.username)?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: isMe ? '#00D68F' : '#CBD5E1' }}>
                            {u.display_name || u.username}
                            {isMe && <span style={{ fontSize: 10, color: '#00D68F', marginLeft: 6, fontWeight: 400 }}>tú</span>}
                          </div>
                          <div style={{ fontSize: 11, color: '#334155' }}>@{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="mono" style={{ color: '#64748B', fontSize: 13 }}>{u.total_trades}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 60, height: 4, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${u.win_rate}%`, height: '100%', background: '#00D68F', borderRadius: 2 }} />
                        </div>
                        <span className="mono" style={{ fontSize: 12, color: '#94A3B8' }}>{u.win_rate.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        {u.total_pnl >= 0 ? <TrendingUp size={13} color="#00D68F" /> : <TrendingDown size={13} color="#FF4D6D" />}
                        <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: u.total_pnl >= 0 ? '#00D68F' : '#FF4D6D' }}>
                          {u.total_pnl >= 0 ? '+' : ''}${u.total_pnl.toFixed(2)}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
