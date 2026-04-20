'use client'
import Link from 'next/link'
import { notFound, useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CalendarDays, Brain, TriangleAlert, Tags, NotebookPen, CheckSquare, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { JournalChecklistItem, JournalEntry, Trade, TradeReview } from '@/types'
import toast from 'react-hot-toast'

export default function TradeDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const supabase = createClient()
  const [trade, setTrade] = useState<Trade | null>(null)
  const [journalEntry, setJournalEntry] = useState<JournalEntry | null>(null)
  const [journalChecklist, setJournalChecklist] = useState<JournalChecklistItem[]>([])
  const [review, setReview] = useState<Partial<TradeReview>>({})
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [savingReview, setSavingReview] = useState(false)
  const checkedItems = useMemo(() => journalChecklist.filter(item => item.checked), [journalChecklist])

  useEffect(() => {
    async function load() {
      if (!id) {
        setMissing(true)
        setLoading(false)
        return
      }
      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user
      if (!user) {
        setMissing(true)
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('trades')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (!data) {
        setMissing(true)
        setLoading(false)
        return
      }

      setTrade(data)

      const tradeDate = data.exit_time?.slice(0, 10)
      const promises: Promise<unknown>[] = [
        supabase.from('trade_reviews').select('*').eq('trade_id', data.id).eq('user_id', user.id).maybeSingle(),
      ]

      if (tradeDate) {
        promises.push(
          supabase.from('journal_entries').select('*').eq('user_id', user.id).eq('entry_date', tradeDate).maybeSingle()
        )
      }

      const [reviewRes, journalRes] = await Promise.all(promises as [Promise<{ data: TradeReview | null }>, Promise<{ data: JournalEntry | null }>?])

      if (reviewRes?.data) setReview(reviewRes.data)

      const journal = journalRes?.data
      if (journal) {
        setJournalEntry(journal)
        const { data: checklist } = await supabase
          .from('journal_checklist_items')
          .select('*')
          .eq('journal_entry_id', journal.id)
          .order('sort_order', { ascending: true })
        setJournalChecklist(checklist || [])
      }

      setLoading(false)
    }
    load()
  }, [id])

  async function saveReview() {
    if (!trade) return
    setSavingReview(true)
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    if (!user) {
      setSavingReview(false)
      return
    }

    const payload = {
      trade_id: trade.id,
      user_id: user.id,
      pre_trade_thesis: review.pre_trade_thesis || null,
      execution_rating: review.execution_rating || null,
      discipline_rating: review.discipline_rating || null,
      followed_plan: typeof review.followed_plan === 'boolean' ? review.followed_plan : null,
      exit_reason: review.exit_reason || null,
      lesson_learned: review.lesson_learned || null,
      improvement_note: review.improvement_note || null,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase.from('trade_reviews').upsert(payload, { onConflict: 'trade_id' }).select().single()
    if (error) toast.error(error.message)
    else {
      setReview(data)
      toast.success('Review guardada')
    }
    setSavingReview(false)
  }

  if (loading) return <div style={{ padding: '32px', color: '#64748B' }}>Cargando trade...</div>
  if (missing || !trade) notFound()

  const tradeDate = trade.exit_time?.slice(0, 10)

  return (
    <div style={{ padding: '32px', maxWidth: 1120 }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/trades" className="btn-ghost" style={{ textDecoration: 'none', marginBottom: 12 }}>
          <ArrowLeft size={14} /> Volver a Trades
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: '#E2E8F0', marginBottom: 8 }}>{trade.symbol}</h1>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="tag" style={{ background: trade.direction === 'LONG' ? 'rgba(0,214,143,0.1)' : 'rgba(255,77,109,0.1)', color: trade.direction === 'LONG' ? '#00D68F' : '#FF4D6D' }}>{trade.direction}</span>
              <span className="tag" style={{ background: trade.status === 'WIN' ? 'rgba(0,214,143,0.1)' : trade.status === 'LOSS' ? 'rgba(255,77,109,0.1)' : 'rgba(255,181,71,0.1)', color: trade.status === 'WIN' ? '#00D68F' : trade.status === 'LOSS' ? '#FF4D6D' : '#FFB547' }}>{trade.status}</span>
              <span className="tag" style={{ background: 'var(--surface-2)', color: '#94A3B8' }}>{trade.broker_source}</span>
            </div>
          </div>
          <div className="mono" style={{ fontSize: 32, fontWeight: 700, color: trade.pnl >= 0 ? '#00D68F' : '#FF4D6D' }}>
            {trade.pnl >= 0 ? '+' : ''}${Number(trade.pnl).toFixed(2)}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ padding: 16 }}><div style={{ fontSize: 11, color: '#475569', marginBottom: 6 }}>Entry</div><div className="mono" style={{ fontSize: 22 }}>${Number(trade.entry_price).toFixed(2)}</div></div>
        <div className="card" style={{ padding: 16 }}><div style={{ fontSize: 11, color: '#475569', marginBottom: 6 }}>Exit</div><div className="mono" style={{ fontSize: 22 }}>${Number(trade.exit_price).toFixed(2)}</div></div>
        <div className="card" style={{ padding: 16 }}><div style={{ fontSize: 11, color: '#475569', marginBottom: 6 }}>Quantity</div><div className="mono" style={{ fontSize: 22 }}>{Number(trade.quantity).toFixed(2)}</div></div>
        <div className="card" style={{ padding: 16 }}><div style={{ fontSize: 11, color: '#475569', marginBottom: 6 }}>Commission</div><div className="mono" style={{ fontSize: 22 }}>${Number(trade.commission || 0).toFixed(2)}</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}><NotebookPen size={16} color="#94A3B8" /><span style={{ fontSize: 14, fontWeight: 600, color: '#CBD5E1' }}>Trade notes</span></div>
            <p style={{ color: trade.notes ? '#CBD5E1' : '#64748B', lineHeight: 1.7, fontSize: 14, whiteSpace: 'pre-wrap' }}>{trade.notes || 'Todavía no hay notas para este trade.'}</p>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}><Tags size={16} color="#94A3B8" /><span style={{ fontSize: 14, fontWeight: 600, color: '#CBD5E1' }}>Tags</span></div>
            {trade.tags && trade.tags.length > 0 ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {trade.tags.map((tag: string) => <span key={tag} className="tag" style={{ background: 'var(--surface-2)', color: '#CBD5E1' }}>{tag}</span>)}
              </div>
            ) : <p style={{ color: '#64748B', fontSize: 14 }}>Sin tags todavía.</p>}
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Brain size={16} color="#94A3B8" /><span style={{ fontSize: 14, fontWeight: 600, color: '#CBD5E1' }}>Trade review</span></div>
              <button className="btn-primary" onClick={saveReview} disabled={savingReview}><Save size={14} />{savingReview ? 'Guardando...' : 'Guardar review'}</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 6 }}>Pre-trade thesis</label>
                <textarea className="input-base" rows={3} value={review.pre_trade_thesis || ''} onChange={e => setReview(prev => ({ ...prev, pre_trade_thesis: e.target.value }))} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 6 }}>Execution rating</label>
                  <input className="input-base" type="number" min="1" max="10" value={review.execution_rating ?? ''} onChange={e => setReview(prev => ({ ...prev, execution_rating: e.target.value ? parseInt(e.target.value, 10) : undefined }))} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 6 }}>Discipline rating</label>
                  <input className="input-base" type="number" min="1" max="10" value={review.discipline_rating ?? ''} onChange={e => setReview(prev => ({ ...prev, discipline_rating: e.target.value ? parseInt(e.target.value, 10) : undefined }))} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 6 }}>Followed plan</label>
                  <select className="input-base" value={typeof review.followed_plan === 'boolean' ? String(review.followed_plan) : ''} onChange={e => setReview(prev => ({ ...prev, followed_plan: e.target.value === '' ? undefined : e.target.value === 'true' }))}>
                    <option value="">—</option>
                    <option value="true">Sí</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 6 }}>Exit reason</label>
                <input className="input-base" value={review.exit_reason || ''} onChange={e => setReview(prev => ({ ...prev, exit_reason: e.target.value }))} placeholder="Target hit, invalidation, manual close..." />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 6 }}>Lesson learned</label>
                <textarea className="input-base" rows={3} value={review.lesson_learned || ''} onChange={e => setReview(prev => ({ ...prev, lesson_learned: e.target.value }))} style={{ resize: 'vertical' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 6 }}>Improvement note</label>
                <textarea className="input-base" rows={3} value={review.improvement_note || ''} onChange={e => setReview(prev => ({ ...prev, improvement_note: e.target.value }))} style={{ resize: 'vertical' }} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}><CalendarDays size={16} color="#94A3B8" /><span style={{ fontSize: 14, fontWeight: 600, color: '#CBD5E1' }}>Timing</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div><span style={{ color: '#475569' }}>Entry time</span><div style={{ color: '#CBD5E1', marginTop: 4 }}>{new Date(trade.entry_time).toLocaleString('es-AR')}</div></div>
              <div><span style={{ color: '#475569' }}>Exit time</span><div style={{ color: '#CBD5E1', marginTop: 4 }}>{new Date(trade.exit_time).toLocaleString('es-AR')}</div></div>
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}><Brain size={16} color="#94A3B8" /><span style={{ fontSize: 14, fontWeight: 600, color: '#CBD5E1' }}>Execution context</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div><span style={{ color: '#475569' }}>Setup</span><div style={{ color: '#CBD5E1', marginTop: 4 }}>{trade.setup || '—'}</div></div>
              <div><span style={{ color: '#475569' }}>Emotion</span><div style={{ color: '#CBD5E1', marginTop: 4 }}>{trade.emotion || '—'}</div></div>
              <div><span style={{ color: '#475569' }}>Mistake</span><div style={{ color: '#CBD5E1', marginTop: 4 }}>{trade.mistake || '—'}</div></div>
            </div>
          </div>

          <div className="card" style={{ padding: 20, borderColor: trade.status === 'LOSS' ? 'rgba(255,77,109,0.2)' : 'var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}><TriangleAlert size={16} color={trade.status === 'LOSS' ? '#FF4D6D' : '#94A3B8'} /><span style={{ fontSize: 14, fontWeight: 600, color: '#CBD5E1' }}>Quick review</span></div>
            {journalEntry ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 12, color: '#475569' }}>Journal vinculado: {tradeDate}</div>
                <div style={{ fontSize: 13, color: '#CBD5E1', lineHeight: 1.7 }}>{journalEntry.reflection || 'Ese día tiene journal pero sin reflexión escrita todavía.'}</div>
                <Link href="/journal" className="btn-secondary" style={{ width: 'fit-content', textDecoration: 'none' }}>Abrir Journal</Link>
              </div>
            ) : (
              <p style={{ color: '#64748B', fontSize: 13, lineHeight: 1.7 }}>
                Este trade todavía no tiene un journal diario vinculado. Después te lo conecto mejor para abrir directo al día exacto.
              </p>
            )}
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}><CheckSquare size={16} color="#94A3B8" /><span style={{ fontSize: 14, fontWeight: 600, color: '#CBD5E1' }}>Checklist del día</span></div>
            {journalChecklist.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 12, color: '#475569' }}>{checkedItems.length}/{journalChecklist.length} reglas cumplidas</div>
                {journalChecklist.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, color: item.checked ? '#CBD5E1' : '#64748B', fontSize: 13 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.checked ? '#00D68F' : '#475569', display: 'inline-block' }} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#64748B', fontSize: 13 }}>No hay checklist cargado para ese día.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
