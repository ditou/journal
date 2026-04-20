'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, ChevronRight, NotebookPen } from 'lucide-react'
import type { JournalEntry, Trade } from '@/types'

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function pnlColor(pnl: number, max: number): string {
  if (pnl === 0) return 'var(--surface-2)'
  const intensity = Math.min(Math.abs(pnl) / max, 1)
  if (pnl > 0) {
    const alpha = 0.15 + intensity * 0.65
    return `rgba(0, 214, 143, ${alpha})`
  } else {
    const alpha = 0.15 + intensity * 0.65
    return `rgba(255, 77, 109, ${alpha})`
  }
}

const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function CalendarPage() {
  const supabase = createClient()
  const [trades, setTrades] = useState<Trade[]>([])
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([])
  const [today] = useState(new Date())
  const [current, setCurrent] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      supabase.from('trades').select('*'),
      supabase.from('journal_entries').select('*'),
    ]).then(([tradesRes, journalRes]) => {
      setTrades(tradesRes.data || [])
      setJournalEntries(journalRes.data || [])
    })
  }, [])

  // Group trades by day
  const byDay: Record<string, { pnl: number; trades: Trade[]; journal?: JournalEntry }> = {}
  trades.forEach(t => {
    const d = t.exit_time?.slice(0, 10)
    if (!d) return
    if (!byDay[d]) byDay[d] = { pnl: 0, trades: [] }
    byDay[d].pnl += t.pnl
    byDay[d].trades.push(t)
  })

  journalEntries.forEach(entry => {
    const d = entry.entry_date
    if (!byDay[d]) byDay[d] = { pnl: 0, trades: [], journal: entry }
    else byDay[d].journal = entry
  })

  const maxAbsPnl = Math.max(...Object.values(byDay).map(d => Math.abs(d.pnl)), 1)
  const daysInMonth = getDaysInMonth(current.year, current.month)
  const firstDay = getFirstDayOfMonth(current.year, current.month)

  // Month summary
  const monthKey = `${current.year}-${String(current.month + 1).padStart(2, '0')}`
  const monthDays = Object.entries(byDay).filter(([d]) => d.startsWith(monthKey))
  const monthPnl = monthDays.reduce((s, [, v]) => s + v.pnl, 0)
  const monthTrades = monthDays.reduce((s, [, v]) => s + v.trades.length, 0)
  const greenDays = monthDays.filter(([, v]) => v.pnl > 0).length
  const redDays = monthDays.filter(([, v]) => v.pnl < 0).length

  const selectedDay = selected ? byDay[selected] : null

  function prev() {
    setCurrent(c => {
      if (c.month === 0) return { year: c.year - 1, month: 11 }
      return { ...c, month: c.month - 1 }
    })
    setSelected(null)
  }
  function next() {
    setCurrent(c => {
      if (c.month === 11) return { year: c.year + 1, month: 0 }
      return { ...c, month: c.month + 1 }
    })
    setSelected(null)
  }

  return (
    <div style={{ padding: '32px', maxWidth: 1000 }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: '#E2E8F0', marginBottom: 28 }}>Calendario P&L</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>
        {/* Calendar */}
        <div className="card p-6">
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <button className="btn-ghost" onClick={prev}><ChevronLeft size={18} /></button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: '#E2E8F0' }}>{MONTHS_ES[current.month]} {current.year}</div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                <span style={{ color: monthPnl >= 0 ? '#00D68F' : '#FF4D6D', fontFamily: 'var(--font-geist-mono)' }}>
                  {monthPnl >= 0 ? '+' : ''}${monthPnl.toFixed(2)}
                </span>
                {' · '}{monthTrades} trades · <span style={{ color: '#00D68F' }}>{greenDays}V</span> <span style={{ color: '#FF4D6D' }}>{redDays}R</span>
              </div>
            </div>
            <button className="btn-ghost" onClick={next}><ChevronRight size={18} /></button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
            {DAYS_ES.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, color: '#334155', padding: '4px 0', fontWeight: 600 }}>{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {/* Empty cells for first day */}
            {Array.from({ length: firstDay }, (_, i) => <div key={`empty-${i}`} />)}

            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1
              const dateStr = `${current.year}-${String(current.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const data = byDay[dateStr]
              const isToday = dateStr === today.toISOString().slice(0, 10)
              const isSelected = selected === dateStr

              return (
                <div
                  key={day}
                  className="heatmap-cell"
                  onClick={() => data ? setSelected(isSelected ? null : dateStr) : null}
                  style={{
                    background: data ? pnlColor(data.pnl, maxAbsPnl) : 'var(--surface-1)',
                    border: isSelected ? '1px solid rgba(255,255,255,0.3)' : isToday ? '1px solid rgba(0,214,143,0.4)' : '1px solid transparent',
                    padding: '6px 4px',
                    minHeight: 56,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: data ? 'pointer' : 'default',
                  }}
                >
                  <span style={{ fontSize: 11, color: isToday ? '#00D68F' : '#475569', fontWeight: isToday ? 700 : 400 }}>{day}</span>
                  {data && (
                    <>
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-geist-mono)', color: data.pnl >= 0 ? '#00D68F' : '#FF4D6D', fontWeight: 700, lineHeight: 1 }}>
                        {data.pnl >= 0 ? '+' : ''}{Math.abs(data.pnl) >= 1000 ? `${(data.pnl / 1000).toFixed(1)}k` : data.pnl.toFixed(0)}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {data.journal && <span title="Tiene journal" style={{ width: 6, height: 6, borderRadius: '50%', background: '#4FC3F7', display: 'inline-block' }} />}
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{data.trades.length}t</span>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 20, justifyContent: 'center' }}>
            {[-1, -0.5, 0, 0.5, 1].map(v => (
              <div key={v} style={{ width: 20, height: 20, borderRadius: 4, background: v === 0 ? 'var(--surface-2)' : v > 0 ? `rgba(0,214,143,${0.15 + v * 0.65})` : `rgba(255,77,109,${0.15 + Math.abs(v) * 0.65})` }} />
            ))}
            <span style={{ fontSize: 11, color: '#334155', marginLeft: 4 }}>Intensidad = magnitud P&L</span>
          </div>
        </div>

        {/* Side panel */}
        <div>
          {selected && selectedDay ? (
            <div className="card p-5">
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>{selected}</div>
                <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: selectedDay.pnl >= 0 ? '#00D68F' : '#FF4D6D' }}>
                  {selectedDay.pnl >= 0 ? '+' : ''}${selectedDay.pnl.toFixed(2)}
                </div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{selectedDay.trades.length} trades</div>
              </div>
              {selectedDay.journal && (
                <Link href="/journal" className="btn-secondary" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none', marginBottom: 12 }}>
                  <NotebookPen size={14} /> Ver journal de este día
                </Link>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selectedDay.trades.map(t => (
                  <Link key={t.id} href={`/trades/${t.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)', borderRadius: 6, padding: '7px 10px', textDecoration: 'none' }}>
                    <div>
                      <span className="mono" style={{ fontSize: 12, color: '#E2E8F0', fontWeight: 600 }}>{t.symbol}</span>
                      <span style={{ fontSize: 10, color: '#475569', marginLeft: 6 }}>{t.direction}</span>
                    </div>
                    <span className="mono" style={{ fontSize: 12, color: t.pnl >= 0 ? '#00D68F' : '#FF4D6D', fontWeight: 700 }}>
                      {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="card p-5" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#334155' }}>Hacé click en un día para ver el detalle de trades.</p>
            </div>
          )}

          {/* Monthly stats */}
          <div className="card p-5" style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: '#475569', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Resumen del mes</div>
            {[
              { label: 'Total P&L', val: `${monthPnl >= 0 ? '+' : ''}$${monthPnl.toFixed(2)}`, color: monthPnl >= 0 ? '#00D68F' : '#FF4D6D' },
              { label: 'Días operados', val: `${monthDays.length}`, color: '#94A3B8' },
              { label: 'Días verdes', val: `${greenDays}`, color: '#00D68F' },
              { label: 'Días rojos', val: `${redDays}`, color: '#FF4D6D' },
              { label: 'Total trades', val: `${monthTrades}`, color: '#94A3B8' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#475569' }}>{label}</span>
                <span className="mono" style={{ fontSize: 12, fontWeight: 700, color }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
