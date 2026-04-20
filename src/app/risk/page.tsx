'use client'
import { useEffect, useState } from 'react'
import { Shield, AlertTriangle, CheckCircle, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { RiskSettings, Trade } from '@/types'

function RuleCard({ icon, title, desc, children }: { icon: React.ReactNode; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, background: 'var(--surface-2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#E2E8F0', marginBottom: 3 }}>{title}</div>
          <div style={{ fontSize: 12, color: '#475569' }}>{desc}</div>
        </div>
      </div>
      {children}
    </div>
  )
}

export default function RiskPage() {
  const supabase = createClient()
  const [settings, setSettings] = useState<RiskSettings>({})
  const [saving, setSaving] = useState(false)
  const [todayTrades, setTodayTrades] = useState<Trade[]>([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from('profiles').select('risk_settings').eq('id', user.id).single()
      if (profile?.risk_settings) setSettings(profile.risk_settings)

      const today = new Date().toISOString().slice(0, 10)
      const { data: trades } = await supabase.from('trades').select('*').gte('exit_time', today)
      setTodayTrades(trades || [])
    }
    load()
  }, [])

  async function save() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { error } = await supabase.from('profiles').update({ risk_settings: settings }).eq('id', user.id)
    if (error) toast.error(error.message)
    else toast.success('Reglas guardadas')
    setSaving(false)
  }

  const todayPnl = todayTrades.reduce((s, t) => s + t.pnl, 0)
  const todayCount = todayTrades.length

  // Check violations
  const dailyLossViolated = settings.daily_loss_limit && todayPnl < -settings.daily_loss_limit
  const maxTradesViolated = settings.max_trades_per_day && todayCount >= settings.max_trades_per_day

  const num = (k: keyof RiskSettings) => (
    <input
      className="input-base"
      type="number"
      min="0"
      step="any"
      value={settings[k] ?? ''}
      onChange={e => setSettings(p => ({ ...p, [k]: e.target.value ? parseFloat(e.target.value) : undefined }))}
      style={{ maxWidth: 160 }}
      placeholder="Sin límite"
    />
  )

  return (
    <div style={{ padding: '32px', maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: '#E2E8F0', marginBottom: 6 }}>Risk Rules</h1>
          <p style={{ fontSize: 13, color: '#475569' }}>Establecé límites para proteger tu cuenta. Usá esto como guardarrails mentales.</p>
        </div>
        <button className="btn-primary" onClick={save} disabled={saving}>
          <Save size={14} />{saving ? 'Guardando...' : 'Guardar reglas'}
        </button>
      </div>

      {/* Today's status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <div className="card p-5" style={{ borderColor: dailyLossViolated ? 'rgba(255,77,109,0.3)' : undefined }}>
          <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>P&L hoy</div>
          <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: todayPnl >= 0 ? '#00D68F' : '#FF4D6D' }}>
            {todayPnl >= 0 ? '+' : ''}${todayPnl.toFixed(2)}
          </div>
          {dailyLossViolated && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#FF4D6D', fontSize: 12, marginTop: 8 }}>
              <AlertTriangle size={13} /> Límite diario superado
            </div>
          )}
          {settings.daily_loss_limit && !dailyLossViolated && (
            <div style={{ fontSize: 12, color: '#475569', marginTop: 6 }}>
              Límite: -${settings.daily_loss_limit} · Restante: ${(settings.daily_loss_limit + todayPnl).toFixed(2)}
            </div>
          )}
        </div>
        <div className="card p-5" style={{ borderColor: maxTradesViolated ? 'rgba(255,77,109,0.3)' : undefined }}>
          <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Trades hoy</div>
          <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: maxTradesViolated ? '#FF4D6D' : '#E2E8F0' }}>
            {todayCount}
          </div>
          {maxTradesViolated && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#FF4D6D', fontSize: 12, marginTop: 8 }}>
              <AlertTriangle size={13} /> Máximo de trades alcanzado
            </div>
          )}
          {settings.max_trades_per_day && !maxTradesViolated && (
            <div style={{ fontSize: 12, color: '#475569', marginTop: 6 }}>Máximo: {settings.max_trades_per_day} · Restante: {settings.max_trades_per_day - todayCount}</div>
          )}
        </div>
      </div>

      {/* Rules */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <RuleCard icon={<AlertTriangle size={17} color="#FF4D6D" />} title="Límite de pérdida diaria" desc="Si tu P&L del día cae por debajo de este valor, el sistema te avisa que pares.">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#64748B' }}>-$</span>
            {num('daily_loss_limit')}
            {settings.daily_loss_limit && <span style={{ fontSize: 12, color: '#475569' }}>por día</span>}
          </div>
        </RuleCard>

        <RuleCard icon={<Shield size={17} color="#FFB547" />} title="Máximo de trades por día" desc="Evitá el overtrading. Cuando llegás al límite, el sistema te avisa.">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {num('max_trades_per_day')}
            {settings.max_trades_per_day && <span style={{ fontSize: 12, color: '#475569' }}>trades/día</span>}
          </div>
        </RuleCard>

        <RuleCard icon={<AlertTriangle size={17} color="#F472B6" />} title="Límite de racha perdedora" desc="Si perdés X trades seguidos, el sistema te sugiere hacer una pausa.">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {num('max_loss_streak')}
            {settings.max_loss_streak && <span style={{ fontSize: 12, color: '#475569' }}>pérdidas seguidas</span>}
          </div>
        </RuleCard>

        <RuleCard icon={<CheckCircle size={17} color="#4FC3F7" />} title="Tamaño máximo de posición ($)" desc="Recibirás una advertencia si registrás un trade con más de este valor en riesgo.">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#64748B' }}>$</span>
            {num('max_position_size')}
            {settings.max_position_size && <span style={{ fontSize: 12, color: '#475569' }}>por trade</span>}
          </div>
        </RuleCard>
      </div>

      <div style={{ marginTop: 20, padding: 16, background: 'var(--surface-1)', borderRadius: 10, borderLeft: '3px solid rgba(255,181,71,0.3)' }}>
        <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.7 }}>
          <strong style={{ color: '#FFB547' }}>Nota:</strong> Estas reglas son de referencia. El sistema registra los trades pero no bloquea la operativa — el control final lo tenés vos.
        </p>
      </div>
    </div>
  )
}
