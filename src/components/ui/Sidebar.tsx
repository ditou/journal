'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, BookOpen, BarChart2, Calendar,
  Link2, Trophy, Settings, TrendingUp, LogOut, Shield, CandlestickChart
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/trades', icon: CandlestickChart, label: 'Trades' },
  { href: '/calendar', icon: Calendar, label: 'Calendar' },
  { href: '/analytics', icon: BarChart2, label: 'Analytics' },
  { href: '/journal', icon: BookOpen, label: 'Journal' },
  { href: '/connect', icon: Link2, label: 'Conectar' },
  { href: '/risk', icon: Shield, label: 'Risk Rules' },
  { href: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 12px',
      position: 'fixed',
      left: 0, top: 0,
      zIndex: 40,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', marginBottom: 32 }}>
        <TrendingUp size={18} color="#00D68F" />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#E2E8F0' }}>
          Trade<span style={{ color: '#00D68F' }}>Log</span>
        </span>
      </div>

      {/* Nav items */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {NAV.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href} className={`nav-item ${pathname === href || pathname.startsWith(href + '/') ? 'active' : ''}`}>
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <Link href="/settings" className={`nav-item ${pathname === '/settings' ? 'active' : ''}`}>
          <Settings size={16} />
          Configuración
        </Link>
        <button onClick={handleLogout} className="nav-item" style={{ width: '100%', textAlign: 'left' }}>
          <LogOut size={16} />
          Salir
        </button>
      </div>
    </aside>
  )
}
