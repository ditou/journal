'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, ChevronDown, Edit2, Trash2, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Trade, TradeDirection, TradeStatus, BrokerSource } from '@/types'
import toast from 'react-hot-toast'

const SETUPS = ['Breakout', 'Pullback', 'Reversal', 'Trend Follow', 'Scalp', 'News', 'Support/Resistance', 'Otro']
const EMOTIONS = ['Tranquilo', 'Ansioso', 'Confiado', 'Miedoso', 'Eufórico', 'Frustrado', 'Neutral']
const MISTAKES = ['FOMO', 'Revenge trade', 'Sin stop loss', 'Sobredimensionado', 'Entrada temprana', 'Salida temprana', 'Sin plan', 'Ninguno']

const EMPTY_FORM = {
  symbol: '', direction: 'LONG' as TradeDirection,
  entry_price: '', exit_price: '', quantity: '', pnl: '',
  entry_time: '', exit_time: '', setup: '', emotion: '', mistake: '', notes: '', tags: '',
}

function TradeModal({ onClose, onSave, initial }: { onClose: () => void; onSave: () => void; initial?: Trade }) {
  const supabase = createClient()
  const [form, setForm] = useState(initial ? {
    symbol: initial.symbol, direction: initial.direction,
    entry_price: String(initial.entry_price), exit_price: String(initial.exit_price),
    quantity: String(initial.quantity), pnl: String(initial.pnl),
    entry_time: initial.entry_time.slice(0, 16), exit_time: initial.exit_time.slice(0, 16),
    setup: initial.setup || '', emotion: initial.emotion || '',
    mistake: initial.mistake || '', notes: initial.notes || '',
    tags: (initial.tags || []).join(', '),
  } : { ...EMPTY_FORM })
  const [loading, setLoading] = useState(false)

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('No autenticado'); setLoading(false); return }

    const pnl = parseFloat(form.pnl)
    const payload = {
      user_id: user.id,
      broker_source: 'MANUAL' as BrokerSource,
      symbol: form.symbol.toUpperCase(),
      direction: form.direction,
      status: (pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BREAKEVEN') as TradeStatus,
      entry_price: parseFloat(form.entry_price),
      exit_price: parseFloat(form.exit_price),
      quantity: parseFloat(form.quantity),
      pnl,
      entry_time: form.entry_time,
      exit_time: form.exit_time,
      setup: form.setup || null,
      emotion: form.emotion || null,
      mistake: form.mistake || null,
      notes: form.notes || null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    }

    const { error } = initial
      ? await supabase.from('trades').update(payload).eq('id', initial.id)
      : await supabase.from('trades').insert(payload)

    if (error) toast.error(error.message)
    else { toast.success(initial ? 'Trade actualizado' : 'Trade guardado'); onSave() }
    setLoading(false)
  }

  const inputStyle = { display: 'flex', flexDirection: 'column' as const, gap: 5 }
  const label = (txt: string) => <label style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>{txt}</label>

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#E2E8F0' }}>{initial ? 'Editar trade' : 'Nuevo trade'}</h2>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 6 }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div style={inputStyle}>{label('Símbolo *')}<input className="input-base" value={form.symbol} onChange={e => set('symbol', e.target.value)} required /></div>
            <div style={inputStyle}>{label('Dirección *')}<select className="input-base" value={form.direction} onChange={e => set('direction', e.target.value)}><option value="LONG">LONG</option><option value="SHORT">SHORT</option></select></div>
            <div style={inputStyle}>{label('Cantidad *')}<input className="input-base" type="number" step="any" value={form.quantity} onChange={e => set('quantity', e.target.value)} required /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div style={inputStyle}>{label('Precio entrada *')}<input className="input-base" type="number" step="any" value={form.entry_price} onChange={e => set('entry_price', e.target.value)} required /></div>
            <div style={inputStyle}>{label('Precio salida *')}<input className="input-base" type="number" step="any" value={form.exit_price} onChange={e => set('exit_price', e.target.value)} required /></div>
            <div style={inputStyle}>{label('P&L ($) *')}<input className="input-base" type="number" step="any" value={form.pnl} onChange={e => set('pnl', e.target.value)} required /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={inputStyle}>{label('Fecha/hora entrada *')}<input className="input-base" type="datetime-local" value={form.entry_time} onChange={e => set('entry_time', e.target.value)} required /></div>
            <div style={inputStyle}>{label('Fecha/hora salida *')}<input className="input-base" type="datetime-local" value={form.exit_time} onChange={e => set('exit_time', e.target.value)} required /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div style={inputStyle}>{label('Setup')}<select className="input-base" value={form.setup} onChange={e => set('setup', e.target.value)}><option value="">— Ninguno —</option>{SETUPS.map(s => <option key={s}>{s}</option>)}</select></div>
            <div style={inputStyle}>{label('Emoción')}<select className="input-base" value={form.emotion} onChange={e => set('emotion', e.target.value)}><option value="">— Ninguna —</option>{EMOTIONS.map(s => <option key={s}>{s}</option>)}</select></div>
            <div style={inputStyle}>{label('Error cometido')}<select className="input-base" value={form.mistake} onChange={e => set('mistake', e.target.value)}><option value="">— Ninguno —</option>{MISTAKES.map(s => <option key={s}>{s}</option>)}</select></div>
          </div>
          <div style={inputStyle}>{label('Tags')}<input className="input-base" value={form.tags} onChange={e => set('tags', e.target.value)} /></div>
          <div style={inputStyle}>{label('Notas')}<textarea className="input-base" rows={4} value={form.notes} onChange={e => set('notes', e.target.value)} style={{ resize: 'vertical' }} /></div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Guardando...' : initial ? 'Actualizar' : 'Guardar trade'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TradesPage() {
  const supabase = createClient()
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTrade, setEditTrade] = useState<Trade | undefined>()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [filterDir, setFilterDir] = useState<string>('ALL')

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('trades').select('*').order('exit_time', { ascending: false })
    if (filterStatus !== 'ALL') q = q.eq('status', filterStatus)
    if (filterDir !== 'ALL') q = q.eq('direction', filterDir)
    if (search) q = q.ilike('symbol', `%${search}%`)
    const { data } = await q.limit(200)
    setTrades(data || [])
    setLoading(false)
  }, [filterStatus, filterDir, search])

  useEffect(() => { load() }, [load])

  async function deleteTrade(id: string) {
    if (!confirm('¿Eliminar este trade?')) return
    await supabase.from('trades').delete().eq('id', id)
    toast.success('Trade eliminado')
    load()
  }

  const summary = useMemo(() => {
    const totalPnl = trades.reduce((s, t) => s + t.pnl, 0)
    const wins = trades.filter(t => t.status === 'WIN').length
    const losses = trades.filter(t => t.status === 'LOSS').length
    return {
      totalPnl,
      wins,
      losses,
      winRate: trades.length ? (wins / trades.length) * 100 : 0,
    }
  }, [trades])

  return (
    <div style={{ padding: '32px', maxWidth: 1280 }}>
      {showModal && (
        <TradeModal
          initial={editTrade}
          onClose={() => { setShowModal(false); setEditTrade(undefined) }}
          onSave={() => { setShowModal(false); setEditTrade(undefined); load() }}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: '#E2E8F0', marginBottom: 6 }}>Trades</h1>
          <p style={{ fontSize: 13, color: '#475569' }}>Vista operativa de todos tus trades. Después conectamos esto con review detallado.</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditTrade(undefined); setShowModal(true) }}>
          <Plus size={15} /> Nuevo trade
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ padding: 16 }}><div style={{ fontSize: 11, color: '#475569', marginBottom: 6 }}>Trades visibles</div><div className="stat-number" style={{ fontSize: 24 }}>{trades.length}</div></div>
        <div className="card" style={{ padding: 16 }}><div style={{ fontSize: 11, color: '#475569', marginBottom: 6 }}>P&L visible</div><div className="stat-number" style={{ fontSize: 24, color: summary.totalPnl >= 0 ? '#00D68F' : '#FF4D6D' }}>{summary.totalPnl >= 0 ? '+' : ''}${summary.totalPnl.toFixed(2)}</div></div>
        <div className="card" style={{ padding: 16 }}><div style={{ fontSize: 11, color: '#475569', marginBottom: 6 }}>Win rate</div><div className="stat-number" style={{ fontSize: 24 }}>{summary.winRate.toFixed(1)}%</div></div>
        <div className="card" style={{ padding: 16 }}><div style={{ fontSize: 11, color: '#475569', marginBottom: 6 }}>Wins / Losses</div><div className="stat-number" style={{ fontSize: 24 }}>{summary.wins}/{summary.losses}</div></div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
          <input className="input-base" placeholder="Buscar símbolo..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
        </div>
        <div style={{ position: 'relative' }}>
          <select className="input-base" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ paddingRight: 32, appearance: 'none', minWidth: 150 }}>
            <option value="ALL">Todos los resultados</option>
            <option value="WIN">Solo ganancias</option>
            <option value="LOSS">Solo pérdidas</option>
            <option value="BREAKEVEN">Breakeven</option>
          </select>
          <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
        </div>
        <div style={{ position: 'relative' }}>
          <select className="input-base" value={filterDir} onChange={e => setFilterDir(e.target.value)} style={{ paddingRight: 32, appearance: 'none', minWidth: 130 }}>
            <option value="ALL">Long y Short</option>
            <option value="LONG">Solo Long</option>
            <option value="SHORT">Solo Short</option>
          </select>
          <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#475569' }}>Cargando trades...</div>
        ) : trades.length === 0 ? (
          <div style={{ padding: 64, textAlign: 'center' }}>
            <p style={{ color: '#475569', marginBottom: 20, fontSize: 14 }}>No hay trades. Importá desde un broker o cargá manualmente.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={() => window.location.href = '/connect'}>Conectar broker</button>
              <button className="btn-primary" onClick={() => setShowModal(true)}><Plus size={14} /> Cargar manualmente</button>
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Símbolo</th>
                  <th>Dir</th>
                  <th>Entrada</th>
                  <th>Salida</th>
                  <th>P&L</th>
                  <th>Setup</th>
                  <th>Emoción</th>
                  <th>Error</th>
                  <th>Fuente</th>
                  <th>Fecha</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {trades.map(t => (
                  <tr key={t.id}>
                    <td>
                      <Link href={`/trades/${t.id}`} className="mono" style={{ color: '#E2E8F0', fontWeight: 600, textDecoration: 'none' }}>{t.symbol}</Link>
                    </td>
                    <td><span className="tag" style={{ background: t.direction === 'LONG' ? 'rgba(0,214,143,0.1)' : 'rgba(255,77,109,0.1)', color: t.direction === 'LONG' ? '#00D68F' : '#FF4D6D', fontSize: 10 }}>{t.direction}</span></td>
                    <td className="mono" style={{ color: '#94A3B8', fontSize: 12 }}>${t.entry_price.toFixed(2)}</td>
                    <td className="mono" style={{ color: '#94A3B8', fontSize: 12 }}>${t.exit_price.toFixed(2)}</td>
                    <td className="mono" style={{ color: t.pnl >= 0 ? '#00D68F' : '#FF4D6D', fontWeight: 700 }}>{t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}</td>
                    <td style={{ fontSize: 12 }}>{t.setup ? <span className="tag" style={{ background: 'var(--surface-2)', color: '#94A3B8' }}>{t.setup}</span> : <span style={{ color: '#334155' }}>—</span>}</td>
                    <td style={{ fontSize: 12, color: '#64748B' }}>{t.emotion || '—'}</td>
                    <td style={{ fontSize: 12 }}>{t.mistake && t.mistake !== 'Ninguno' ? <span className="tag" style={{ background: 'rgba(255,77,109,0.08)', color: '#FF4D6D', fontSize: 10 }}>{t.mistake}</span> : <span style={{ color: '#334155' }}>—</span>}</td>
                    <td><span className="tag" style={{ background: 'var(--surface-2)', color: '#475569', fontSize: 10 }}>{t.broker_source}</span></td>
                    <td style={{ color: '#334155', fontSize: 12 }}>{new Date(t.exit_time).toLocaleDateString('es-AR')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Link href={`/trades/${t.id}`} className="btn-ghost" style={{ padding: 6 }}><ExternalLink size={13} /></Link>
                        <button className="btn-ghost" style={{ padding: 6 }} onClick={() => { setEditTrade(t); setShowModal(true) }}><Edit2 size={13} /></button>
                        <button className="btn-ghost" style={{ padding: 6, color: '#FF4D6D' }} onClick={() => deleteTrade(t.id)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
