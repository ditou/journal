'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState({ email: '', password: '', username: '', displayName: '' })
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { username: form.username, display_name: form.displayName }
      }
    })
    if (error) {
      toast.error(error.message)
    } else if (data.user) {
      // Create profile row
      await supabase.from('profiles').insert({
        id: data.user.id,
        username: form.username,
        display_name: form.displayName || form.username,
        is_public: false,
      })
      toast.success('Cuenta creada! Revisá tu email para confirmar.')
      router.push('/dashboard')
    }
    setLoading(false)
  }

  const field = (key: keyof typeof form, label: string, type = 'text', placeholder = '') => (
    <div>
      <label style={{ fontSize: 13, color: '#94A3B8', display: 'block', marginBottom: 6 }}>{label}</label>
      <input
        className="input-base"
        type={type}
        placeholder={placeholder}
        value={form[key]}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        required
      />
    </div>
  )

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center p-6">
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <TrendingUp size={22} color="#00D68F" />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: '#E2E8F0' }}>
              Trade<span style={{ color: '#00D68F' }}>Log</span>
            </span>
          </div>
          <p style={{ color: '#475569', fontSize: 14, marginTop: 8 }}>Creá tu cuenta gratuita</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {field('displayName', 'Nombre', 'text', 'Tu nombre')}
            {field('username', 'Usuario', 'text', '@usuario')}
            {field('email', 'Email', 'email', 'trader@ejemplo.com')}
            {field('password', 'Contraseña', 'password', '••••••••')}

            <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
              {loading ? 'Creando cuenta...' : 'Crear cuenta →'}
            </button>

            <p style={{ fontSize: 12, color: '#334155', textAlign: 'center' }}>
              Al registrarte aceptás los términos de uso
            </p>
          </form>

          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: 14, color: '#475569' }}>
            ¿Ya tenés cuenta?{' '}
            <Link href="/auth/login" style={{ color: '#00D68F', textDecoration: 'none' }}>Entrar</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
