'use client'
import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Link as LinkIcon, Image as ImageIcon, Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { JournalAttachment, JournalChecklistItem, JournalEntry, Trade } from '@/types'
import toast from 'react-hot-toast'

const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const MARKET_CONDITIONS = ['None', 'Trending', 'Range', 'High Volatility', 'Low Volatility', 'News Driven']
const MOODS = [
  { value: 1, emoji: '😵', label: 'Muy mal' },
  { value: 2, emoji: '😕', label: 'Mal' },
  { value: 3, emoji: '😐', label: 'Neutral' },
  { value: 4, emoji: '🙂', label: 'Bien' },
  { value: 5, emoji: '😄', label: 'Excelente' },
]

function monthMatrix(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: Array<{ date: string; day: number; currentMonth: boolean }> = []

  for (let i = 0; i < firstDay; i++) cells.push({ date: '', day: 0, currentMonth: false })
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      date: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      day,
      currentMonth: true,
    })
  }
  while (cells.length % 7 !== 0) cells.push({ date: '', day: 0, currentMonth: false })
  return cells
}

export default function JournalPage() {
  const supabase = createClient()
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  const [current, setCurrent] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [entry, setEntry] = useState<Partial<JournalEntry>>({ entry_date: todayStr, market_condition: 'None' })
  const [entryId, setEntryId] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<JournalAttachment[]>([])
  const [checklist, setChecklist] = useState<JournalChecklistItem[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [saving, setSaving] = useState(false)
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('')

  const calendarCells = useMemo(() => monthMatrix(current.year, current.month), [current])

  useEffect(() => {
    loadDay(selectedDate)
  }, [selectedDate])

  async function loadDay(date: string) {
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    if (!user) return

    const [{ data: entryData }, { data: tradesData }] = await Promise.all([
      supabase.from('journal_entries').select('*').eq('user_id', user.id).eq('entry_date', date).maybeSingle(),
      supabase.from('trades').select('*').gte('exit_time', `${date}T00:00:00`).lt('exit_time', `${date}T23:59:59.999`).order('exit_time', { ascending: false }),
    ])

    if (entryData) {
      setEntry(entryData)
      setEntryId(entryData.id)
      const [{ data: attachmentData }, { data: checklistData }] = await Promise.all([
        supabase.from('journal_attachments').select('*').eq('journal_entry_id', entryData.id).order('created_at', { ascending: true }),
        supabase.from('journal_checklist_items').select('*').eq('journal_entry_id', entryData.id).order('sort_order', { ascending: true }),
      ])
      setAttachments(attachmentData || [])
      setChecklist(checklistData || [])
    } else {
      setEntry({ entry_date: date, market_condition: 'None' })
      setEntryId(null)
      setAttachments([])
      setChecklist([])
    }

    setTrades(tradesData || [])
  }

  async function ensureEntry() {
    if (entryId) return entryId
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    if (!user) throw new Error('No autenticado')

    const payload = {
      user_id: user.id,
      entry_date: selectedDate,
      mood: entry.mood || null,
      sleep_hours: entry.sleep_hours || null,
      market_condition: entry.market_condition || 'None',
      reflection: entry.reflection || null,
      daily_goal: entry.daily_goal || null,
      discipline_score: entry.discipline_score || null,
      focus_score: entry.focus_score || null,
    }

    const { data, error } = await supabase.from('journal_entries').upsert(payload, { onConflict: 'user_id,entry_date' }).select().single()
    if (error) throw error
    setEntryId(data.id)
    setEntry(data)
    return data.id as string
  }

  async function saveEntry() {
    setSaving(true)
    try {
      const id = await ensureEntry()
      const { error } = await supabase.from('journal_entries').update({
        mood: entry.mood || null,
        sleep_hours: entry.sleep_hours || null,
        market_condition: entry.market_condition || 'None',
        reflection: entry.reflection || null,
        daily_goal: entry.daily_goal || null,
        discipline_score: entry.discipline_score || null,
        focus_score: entry.focus_score || null,
        updated_at: new Date().toISOString(),
      }).eq('id', id)
      if (error) throw error
      toast.success('Journal guardado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  async function addAttachment(type: 'url' | 'image') {
    if (!newAttachmentUrl.trim()) return
    try {
      const id = await ensureEntry()
      const { data, error } = await supabase.from('journal_attachments').insert({
        journal_entry_id: id,
        type,
        url: newAttachmentUrl.trim(),
      }).select().single()
      if (error) throw error
      setAttachments(prev => [...prev, data])
      setNewAttachmentUrl('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo agregar adjunto')
    }
  }

  async function removeAttachment(id: string) {
    await supabase.from('journal_attachments').delete().eq('id', id)
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  async function addChecklistItem() {
    if (!newChecklistItem.trim()) return
    try {
      const id = await ensureEntry()
      const sortOrder = checklist.length
      const { data, error } = await supabase.from('journal_checklist_items').insert({
        journal_entry_id: id,
        label: newChecklistItem.trim(),
        checked: false,
        sort_order: sortOrder,
      }).select().single()
      if (error) throw error
      setChecklist(prev => [...prev, data])
      setNewChecklistItem('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo agregar item')
    }
  }

  async function toggleChecklistItem(item: JournalChecklistItem) {
    const next = !item.checked
    await supabase.from('journal_checklist_items').update({ checked: next }).eq('id', item.id)
    setChecklist(prev => prev.map(i => i.id === item.id ? { ...i, checked: next } : i))
  }

  async function removeChecklistItem(id: string) {
    await supabase.from('journal_checklist_items').delete().eq('id', id)
    setChecklist(prev => prev.filter(i => i.id !== id))
  }

  function shiftMonth(dir: -1 | 1) {
    setCurrent(prev => {
      if (dir === -1) {
        if (prev.month === 0) return { year: prev.year - 1, month: 11 }
        return { ...prev, month: prev.month - 1 }
      }
      if (prev.month === 11) return { year: prev.year + 1, month: 0 }
      return { ...prev, month: prev.month + 1 }
    })
  }

  const dayPnl = trades.reduce((sum, t) => sum + t.pnl, 0)
  const checkedCount = checklist.filter(i => i.checked).length

  return (
    <div style={{ padding: '32px', maxWidth: 1280 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: '#E2E8F0' }}>Journal</h1>
        <button className="btn-primary" onClick={saveEntry} disabled={saving}>{saving ? 'Guardando...' : 'Guardar journal'}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <button className="btn-ghost" onClick={() => shiftMonth(-1)}><ChevronLeft size={16} /></button>
              <div style={{ fontWeight: 600, color: '#E2E8F0' }}>{MONTHS[current.month]} {current.year}</div>
              <button className="btn-ghost" onClick={() => shiftMonth(1)}><ChevronRight size={16} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 8 }}>
              {WEEKDAYS.map(day => <div key={day} style={{ textAlign: 'center', fontSize: 10, color: '#475569' }}>{day}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
              {calendarCells.map((cell, i) => {
                if (!cell.currentMonth) return <div key={i} style={{ height: 32 }} />
                const isSelected = cell.date === selectedDate
                const isToday = cell.date === todayStr
                return (
                  <button
                    key={cell.date}
                    onClick={() => setSelectedDate(cell.date)}
                    style={{
                      height: 32,
                      borderRadius: 8,
                      border: isSelected ? '1px solid #00D68F' : isToday ? '1px solid rgba(0,214,143,0.35)' : '1px solid transparent',
                      background: isSelected ? 'rgba(0,214,143,0.12)' : 'transparent',
                      color: isSelected || isToday ? '#E2E8F0' : '#64748B',
                      cursor: 'pointer',
                    }}
                  >
                    {cell.day}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: '#475569', marginBottom: 10, textTransform: 'uppercase' }}>Trades del día</div>
            {trades.length === 0 ? (
              <p style={{ color: '#64748B', fontSize: 13 }}>No trades this day.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {trades.map(t => (
                  <div key={t.id} style={{ padding: 10, background: 'var(--surface-2)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: '#E2E8F0', fontWeight: 600 }}>{t.symbol}</span>
                      <span className="mono" style={{ color: t.pnl >= 0 ? '#00D68F' : '#FF4D6D' }}>{t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>{t.direction} · {new Date(t.exit_time).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 600, color: '#E2E8F0', marginBottom: 18 }}>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div className="card" style={{ padding: 14, background: 'var(--surface-2)' }}>
                <div style={{ fontSize: 11, color: '#475569', marginBottom: 8, textTransform: 'uppercase' }}>Mood</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {MOODS.map(m => (
                    <button key={m.value} className="btn-ghost" onClick={() => setEntry(prev => ({ ...prev, mood: m.value }))} style={{ padding: 4, opacity: entry.mood === m.value ? 1 : 0.45 }} title={m.label}>{m.emoji}</button>
                  ))}
                </div>
              </div>

              <div className="card" style={{ padding: 14, background: 'var(--surface-2)' }}>
                <div style={{ fontSize: 11, color: '#475569', marginBottom: 8, textTransform: 'uppercase' }}>Sleep (hrs)</div>
                <input className="input-base" type="number" min="0" step="0.5" value={entry.sleep_hours ?? ''} onChange={e => setEntry(prev => ({ ...prev, sleep_hours: e.target.value ? parseFloat(e.target.value) : undefined }))} placeholder="--" />
              </div>

              <div className="card" style={{ padding: 14, background: 'var(--surface-2)' }}>
                <div style={{ fontSize: 11, color: '#475569', marginBottom: 8, textTransform: 'uppercase' }}>Market Conditions</div>
                <select className="input-base" value={entry.market_condition || 'None'} onChange={e => setEntry(prev => ({ ...prev, market_condition: e.target.value }))}>
                  {MARKET_CONDITIONS.map(opt => <option key={opt}>{opt}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 6 }}>Goal of the day</label>
                <input className="input-base" value={entry.daily_goal || ''} onChange={e => setEntry(prev => ({ ...prev, daily_goal: e.target.value }))} placeholder="Ej: respetar el plan y no overtrade" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 6 }}>Discipline</label>
                  <input className="input-base" type="number" min="1" max="10" value={entry.discipline_score ?? ''} onChange={e => setEntry(prev => ({ ...prev, discipline_score: e.target.value ? parseInt(e.target.value, 10) : undefined }))} placeholder="1-10" />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 6 }}>Focus</label>
                  <input className="input-base" type="number" min="1" max="10" value={entry.focus_score ?? ''} onChange={e => setEntry(prev => ({ ...prev, focus_score: e.target.value ? parseInt(e.target.value, 10) : undefined }))} placeholder="1-10" />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 6 }}>Notes / Reflection</label>
              <textarea className="input-base" rows={10} value={entry.reflection || ''} onChange={e => setEntry(prev => ({ ...prev, reflection: e.target.value }))} placeholder="What did you learn today? Any mistakes, wins, patterns to watch?" style={{ resize: 'vertical' }} />
            </div>

            <div>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8, textTransform: 'uppercase' }}>Attachments</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input className="input-base" value={newAttachmentUrl} onChange={e => setNewAttachmentUrl(e.target.value)} placeholder="Paste TradingView chart link or any URL..." />
                <button className="btn-secondary" onClick={() => addAttachment('url')}><LinkIcon size={14} /> Add link</button>
                <button className="btn-secondary" onClick={() => addAttachment('image')}><ImageIcon size={14} /> Add image</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {attachments.map(att => (
                  <div key={att.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      {att.type === 'image' ? <ImageIcon size={14} color="#94A3B8" /> : <LinkIcon size={14} color="#94A3B8" />}
                      <a href={att.url} target="_blank" rel="noreferrer" style={{ color: '#CBD5E1', textDecoration: 'none', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.url}</a>
                    </div>
                    <button className="btn-ghost" onClick={() => removeAttachment(att.id)}><X size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: '#64748B', textTransform: 'uppercase' }}>Rules Checklist ({checkedCount}/{checklist.length})</div>
              <div style={{ fontSize: 12, color: dayPnl >= 0 ? '#00D68F' : '#FF4D6D' }}>Day P&L {dayPnl >= 0 ? '+' : ''}${dayPnl.toFixed(2)}</div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input className="input-base" value={newChecklistItem} onChange={e => setNewChecklistItem(e.target.value)} placeholder="e.g. Waited for confirmation" />
              <button className="btn-primary" onClick={addChecklistItem}><Plus size={14} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {checklist.length === 0 ? (
                <div style={{ color: '#475569', fontSize: 13 }}>No rules yet. Add your trading checklist items above.</div>
              ) : checklist.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-2)', borderRadius: 8, padding: '10px 12px' }}>
                  <button className="btn-ghost" onClick={() => toggleChecklistItem(item)} style={{ color: item.checked ? '#00D68F' : '#CBD5E1', padding: 0 }}>
                    {item.checked ? <Check size={14} /> : <span style={{ width: 14, height: 14, display: 'inline-block', borderRadius: 999, border: '1px solid rgba(255,255,255,0.25)' }} />}
                    <span style={{ textDecoration: item.checked ? 'line-through' : 'none' }}>{item.label}</span>
                  </button>
                  <button className="btn-ghost" onClick={() => removeChecklistItem(item.id)}><X size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
