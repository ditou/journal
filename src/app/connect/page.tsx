'use client'
import { useState, useRef } from 'react'
import { Zap, Upload, CheckCircle, AlertCircle, FileText, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Papa from 'papaparse'
import toast from 'react-hot-toast'

// ─── Tradovate OAuth Config ───────────────────────────────────────────────
const TRADOVATE_AUTH_URL = 'https://trader.tradovate.com/oauth'
const TRADOVATE_TOKEN_URL = 'https://live.tradovateapi.com/v1/auth/oauthtoken'
const CLIENT_ID = process.env.NEXT_PUBLIC_TRADOVATE_CLIENT_ID || ''
const REDIRECT_URI = typeof window !== 'undefined' ? `${window.location.origin}/connect/callback` : ''

function startTradovateOAuth() {
  const state = Math.random().toString(36).substring(2)
  sessionStorage.setItem('tradovate_state', state)
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'trading',
    state,
  })
  window.location.href = `${TRADOVATE_AUTH_URL}?${params}`
}

// ─── MetaTrader HTML/CSV parser ──────────────────────────────────────────
function parseMetaTraderCSV(text: string) {
  const isHTML = /<html|<table|<tr/i.test(text)
  if (isHTML) return parseMetaTraderHTML(text)

  const result = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: true })
  const rows = result.data as Record<string, unknown>[]
  return rows
    .filter(r => r['Type'] !== 'balance' && r['Profit'] !== undefined)
    .map(r => {
      const pnl = parseFloat(String(r['Profit'] || 0))
      const direction = String(r['Type'] || '').toLowerCase().includes('buy') ? 'LONG' : 'SHORT'
      return {
        broker_source: 'METATRADER',
        external_id: String(r['Ticket'] || r['#'] || ''),
        symbol: String(r['Symbol'] || r['Item'] || ''),
        direction,
        status: pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BREAKEVEN',
        entry_price: parseFloat(String(r['Price'] || 0)),
        exit_price: parseFloat(String(r['Price.1'] || 0)),
        quantity: parseFloat(String(r['Size'] || r['Volume'] || 0)),
        pnl,
        commission: parseFloat(String(r['Commission'] || 0)),
        entry_time: String(r['Open Time'] || r['Time'] || ''),
        exit_time: String(r['Close Time'] || r['Time.1'] || ''),
      }
    })
}

function parseMetaTraderHTML(html: string) {
  // Strip UTF-16 LE BOM and null bytes (MT4 exports in UTF-16)
  const clean = html.replace(/\x00/g, '').replace(/^\xff\xfe/, '')
  const parser = new DOMParser()
  const doc = parser.parseFromString(clean, 'text/html')

  // FundedNext MT4 row structure:
  // td[0]: OpenTime  td[1]: Position  td[2]: Symbol  td[3]: Type
  // td[hidden colspan=8]: (invisible, skipped)
  // td[4]: Volume  td[5]: OpenPrice  td[6]: SL  td[7]: TP
  // td[8]: CloseTime  td[9]: ClosePrice  td[10]: Commission  td[11]: Swap  td[12]: Profit

  const toISO = (dt: string) => dt.replace(/(\d{4})\.(\d{2})\.(\d{2})/, '$1-$2-$3')

  const trades: {
    broker_source: string; external_id: string; symbol: string; direction: string
    status: string; entry_price: number; exit_price: number; quantity: number
    pnl: number; commission: number; entry_time: string; exit_time: string
  }[] = []

  const rows = Array.from(doc.querySelectorAll('tr'))

  for (const row of rows) {
    const allTds = Array.from(row.querySelectorAll('td'))
    if (allTds.length < 8) continue

    // The hidden td (colspan=8) is present in trade rows — filter it out
    // to get only the visible cells
    const visibleTds = allTds.filter(td => !td.classList.contains('hidden'))
    const cells = visibleTds.map(td => td.textContent?.trim() || '')

    // After filtering hidden: 13 visible cells
    // [0]OpenTime [1]Position [2]Symbol [3]Type [4]Volume [5]OpenPrice
    // [6]SL [7]TP [8]CloseTime [9]ClosePrice [10]Commission [11]Swap [12]Profit
    if (cells.length < 13) continue

    const openTime  = cells[0]
    const position  = cells[1]
    const symbol    = cells[2]
    const type      = cells[3]?.toLowerCase()
    const volume    = parseFloat(cells[4]) || 0
    const openPrice = parseFloat(cells[5]) || 0
    const closeTime  = cells[8]
    const closePrice = parseFloat(cells[9]) || 0
    const commission = parseFloat(cells[10]) || 0
    const profit     = parseFloat(cells[12]) || 0

    if (!symbol || !type) continue
    if (!['buy', 'sell'].includes(type)) continue
    if (!openTime || !closeTime || openPrice === 0) continue

    const pnl = parseFloat(profit.toFixed(2))

    trades.push({
      broker_source: 'METATRADER',
      external_id: position || `${symbol}_${openTime}`,
      symbol: symbol.toUpperCase(),
      direction: type === 'buy' ? 'LONG' : 'SHORT',
      status: pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BREAKEVEN',
      entry_price: openPrice,
      exit_price: closePrice,
      quantity: volume,
      pnl,
      commission,
      entry_time: toISO(openTime),
      exit_time: toISO(closeTime),
    })
  }

  return trades
}

export default function ConnectPage() {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ count: number; errors: number } | null>(null)
  const [tradovateStatus, setTradovateStatus] = useState<'disconnected' | 'connected'>('disconnected')

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)

    const text = await file.text()
    let trades: ReturnType<typeof parseMetaTraderCSV> = []

    try {
      trades = parseMetaTraderCSV(text)
    } catch {
      toast.error('Error al parsear el archivo. Verificá el formato.')
      setImporting(false)
      return
    }

    if (!trades.length) {
      toast.error('No se encontraron trades en el archivo.')
      setImporting(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('No estás autenticado'); setImporting(false); return }

    let inserted = 0, errors = 0
    for (const trade of trades) {
      const { error } = await supabase.from('trades').upsert({
        ...trade,
        user_id: user.id,
      }, { onConflict: 'user_id,external_id,broker_source' })
      if (error) errors++
      else inserted++
    }

    setImportResult({ count: inserted, errors })
    if (inserted > 0) toast.success(`${inserted} trades importados de MetaTrader`)
    if (errors > 0) toast.error(`${errors} trades con error`)
    setImporting(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div style={{ padding: '32px', maxWidth: 800 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: '#E2E8F0', marginBottom: 8 }}>Conectar brokers</h1>
        <p style={{ color: '#475569', fontSize: 14 }}>Importá tus trades automáticamente o subí tu historial.</p>
      </div>

      {/* Tradovate */}
      <div className="card p-6" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ width: 44, height: 44, background: 'rgba(0,214,143,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Zap size={20} color="#00D68F" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#E2E8F0' }}>Tradovate</h2>
              <span className="tag" style={{ background: 'rgba(0,214,143,0.1)', color: '#00D68F', fontSize: 10 }}>API OFICIAL</span>
            </div>
            <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6, marginBottom: 16 }}>
              Conectá tu cuenta Tradovate con OAuth. Tus trades se sincronizan automáticamente.
              Necesitás habilitar el acceso API en tu cuenta de Tradovate desde{' '}
              <a href="https://trader.tradovate.com" target="_blank" rel="noopener" style={{ color: '#4FC3F7' }}>trader.tradovate.com</a> → Settings → API Access.
            </p>
            <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#64748B', borderLeft: '3px solid rgba(0,214,143,0.3)' }}>
              <strong style={{ color: '#94A3B8' }}>Necesitás:</strong>
              <ul style={{ marginTop: 6, paddingLeft: 16, lineHeight: 2 }}>
                <li>Cuenta Tradovate activa (live o demo)</li>
                <li>API habilitada en tu perfil</li>
                <li>Configurar <code style={{ background: 'var(--surface-3)', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>NEXT_PUBLIC_TRADOVATE_CLIENT_ID</code> en tu .env</li>
              </ul>
            </div>
            {tradovateStatus === 'connected' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#00D68F', fontSize: 14 }}>
                <CheckCircle size={16} /> Conectado
                <button className="btn-ghost" style={{ marginLeft: 8, color: '#FF4D6D' }}>Desconectar</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={startTradovateOAuth} style={{ gap: 8 }}>
                  <Zap size={14} /> Conectar con Tradovate
                </button>
                <button className="btn-secondary" onClick={() => toast('Sincronizando...')}>
                  <RefreshCw size={14} /> Sincronizar manualmente
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MetaTrader */}
      <div className="card p-6">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ width: 44, height: 44, background: 'rgba(79,195,247,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Upload size={20} color="#4FC3F7" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#E2E8F0' }}>MetaTrader 4 / 5</h2>
              <span className="tag" style={{ background: 'rgba(79,195,247,0.1)', color: '#4FC3F7', fontSize: 10 }}>CSV IMPORT</span>
            </div>
            <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6, marginBottom: 16 }}>
              Exportá tu historial de trades desde MetaTrader y subilo acá. Soporta el formato CSV/HTML estándar de MT4 y MT5.
            </p>

            {/* Instructions */}
            <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '14px 16px', marginBottom: 16, fontSize: 13 }}>
              <p style={{ color: '#94A3B8', fontWeight: 600, marginBottom: 10 }}>Cómo exportar desde MT4/MT5:</p>
              <ol style={{ paddingLeft: 18, lineHeight: 2.2, color: '#64748B' }}>
                <li>Abrí MetaTrader → tab <strong style={{ color: '#94A3B8' }}>Account History</strong></li>
                <li>Click derecho en el historial → <strong style={{ color: '#94A3B8' }}>Save as Report</strong></li>
                <li>Elegí formato <strong style={{ color: '#94A3B8' }}>CSV</strong> o <strong style={{ color: '#94A3B8' }}>Detailed Report</strong></li>
                <li>Subí el archivo acá abajo</li>
              </ol>
            </div>

            {/* Upload area */}
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: '2px dashed rgba(79,195,247,0.2)',
                borderRadius: 10,
                padding: '28px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'border-color 0.2s, background 0.2s',
                marginBottom: 12,
              }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                const file = e.dataTransfer.files[0]
                if (file && fileRef.current) {
                  const dt = new DataTransfer()
                  dt.items.add(file)
                  fileRef.current.files = dt.files
                  fileRef.current.dispatchEvent(new Event('change', { bubbles: true }))
                }
              }}
            >
              <FileText size={28} color="#4FC3F7" style={{ marginBottom: 10 }} />
              <p style={{ fontSize: 14, color: '#94A3B8', marginBottom: 4 }}>
                {importing ? 'Importando...' : 'Arrastrá tu archivo o hacé click para seleccionar'}
              </p>
              <p style={{ fontSize: 12, color: '#475569' }}>CSV · HTM · HTML — MT4 y MT5</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.htm,.html,.txt"
                style={{ display: 'none' }}
                onChange={handleFileImport}
              />
            </div>

            {/* Result */}
            {importResult && (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {importResult.count > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#00D68F' }}>
                    <CheckCircle size={14} /> {importResult.count} trades importados
                  </div>
                )}
                {importResult.errors > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#FF4D6D' }}>
                    <AlertCircle size={14} /> {importResult.errors} con errores (posibles duplicados)
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
