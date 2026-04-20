'use client'
import { useEffect, useState } from 'react'
import { Save, User, Globe, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const supabase = createClient()
  const [form, setForm] = useState({ display_name: '', username: '', bio: '', is_public: false })
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) setForm({ display_name: data.display_name || '', username: data.username || '', bio: data.bio || '', is_public: data.is_public || false })
    }
    load()
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setLoading(true)
    const { error } = await supabase.from('profiles').update(form).eq('id', userId)
    if (error) toast.error(error.message)
    else toast.success('Perfil actualizado')
    setLoading(false)
  }

  const set = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }))
  const label = (txt: string) => <label style={{ fontSize: 12, color: '#64748B', fontWeight: 500, display: 'block', marginBottom: 6 }}>{txt}</label>

  return (
    <div style={{ padding: '32px', maxWidth: 600 }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: '#E2E8F0', marginBottom: 28 }}>Configuración</h1>

      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Profile */}
        <div className="card p-6">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <User size={16} color="#94A3B8" />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#CBD5E1' }}>Perfil</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              {label('Nombre público')}
              <input className="input-base" value={form.display_name} onChange={e => set('display_name', e.target.value)} placeholder="Tu nombre" />
            </div>
            <div>
              {label('Usuario (@)')}
              <input className="input-base" value={form.username} onChange={e => set('username', e.target.value)} placeholder="usuario" />
            </div>
            <div>
              {label('Bio')}
              <textarea className="input-base" rows={3} value={form.bio} onChange={e => set('bio', e.target.value)} placeholder="Trader de futuros. Especialista en ES y NQ..." style={{ resize: 'vertical' }} />
            </div>
          </div>
        </div>

        {/* Visibility */}
        <div className="card p-6">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            {form.is_public ? <Globe size={16} color="#00D68F" /> : <Lock size={16} color="#64748B" />}
            <span style={{ fontSize: 14, fontWeight: 600, color: '#CBD5E1' }}>Visibilidad del perfil</span>
          </div>
          <div
            onClick={() => set('is_public', !form.is_public)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--surface-2)',
              padding: '14px 16px',
              borderRadius: 10,
              cursor: 'pointer',
              border: `1px solid ${form.is_public ? 'rgba(0,214,143,0.25)' : 'var(--border)'}`,
              transition: 'border-color 0.2s',
            }}
          >
            <div>
              <div style={{ fontSize: 14, color: form.is_public ? '#00D68F' : '#94A3B8', fontWeight: 500 }}>
                {form.is_public ? 'Perfil público' : 'Perfil privado'}
              </div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>
                {form.is_public ? 'Aparecés en el leaderboard. Tu P&L y win rate son visibles.' : 'Solo vos podés ver tus datos.'}
              </div>
            </div>
            {/* Toggle */}
            <div style={{
              width: 44, height: 24,
              background: form.is_public ? '#00D68F' : 'var(--surface-3)',
              borderRadius: 12,
              position: 'relative',
              transition: 'background 0.2s',
              flexShrink: 0,
            }}>
              <div style={{
                position: 'absolute',
                top: 3, left: form.is_public ? 23 : 3,
                width: 18, height: 18,
                background: 'white',
                borderRadius: '50%',
                transition: 'left 0.2s',
              }} />
            </div>
          </div>
          {form.is_public && (
            <p style={{ fontSize: 12, color: '#334155', marginTop: 10 }}>
              Solo se comparte: nombre, usuario, P&L total, win rate y cantidad de trades. Tus notas y estrategias son siempre privadas.
            </p>
          )}
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ alignSelf: 'flex-start', gap: 8 }}>
          <Save size={14} /> {loading ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  )
}
