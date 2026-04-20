import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'TradeLog — Journal de Trading',
  description: 'Registrá, analizá y mejorá tu trading. Conectá Tradovate o importá desde MetaTrader.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#131B24',
              color: '#E2E8F0',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '10px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#00D68F', secondary: '#080B0F' } },
            error: { iconTheme: { primary: '#FF4D6D', secondary: '#080B0F' } },
          }}
        />
      </body>
    </html>
  )
}
