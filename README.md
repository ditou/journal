# TradeLog — Tu journal de trading

Journal de trading completo con soporte para **Tradovate (API OAuth)** y **MetaTrader (CSV import)**.

## Stack

- **Next.js 14** (App Router) — Frontend + API Routes
- **Supabase** — Base de datos Postgres + Autenticación + RLS
- **Recharts** — Gráficos y analytics
- **Vercel** — Deploy (recomendado)

---

## Setup paso a paso

### 1. Clonar y instalar

```bash
git clone <tu-repo>
cd trading-journal
npm install
```

### 2. Crear proyecto en Supabase

1. Entrá a [supabase.com](https://supabase.com) y creá un proyecto gratis
2. Andá a **SQL Editor** y ejecutá todo el contenido de `supabase/migrations/001_initial.sql`
3. Copiá tu **Project URL** y **anon key** desde Settings → API

### 3. Configurar variables de entorno

```bash
cp .env.local.example .env.local
```

Editá `.env.local` y completá:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_KEY
```

### 4. Configurar Tradovate (opcional por ahora)

1. Logueate en [trader.tradovate.com](https://trader.tradovate.com)
2. Andá a **Settings → API Access → Create OAuth App**
3. Redirect URI: `http://localhost:3000/connect/callback`
4. Completá en `.env.local`:

```env
NEXT_PUBLIC_TRADOVATE_CLIENT_ID=TU_CLIENT_ID
TRADOVATE_CLIENT_SECRET=TU_CLIENT_SECRET
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Correr en desarrollo

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000)

---

## Deploy en Vercel

```bash
npm install -g vercel
vercel
```

En Vercel → Settings → Environment Variables, agregá todas las variables de `.env.local`.

Actualizá el Redirect URI en Tradovate a `https://tudominio.com/connect/callback`.

---

## Importar desde MetaTrader

1. Abrí MetaTrader 4 o 5
2. Tab **Account History** → Click derecho → **Save as Report**
3. Formato: **CSV** o **Detailed Report**
4. En la app: andá a **Conectar** → subí el archivo

### Columnas que parsea el importador

| Campo MT4/MT5 | Campo en TradeLog |
|---|---|
| Ticket / # | external_id |
| Symbol / Item | symbol |
| Type (buy/sell) | direction |
| Open Price | entry_price |
| Close Price | exit_price |
| Size / Volume | quantity |
| Profit | pnl |
| Commission | commission |
| Open Time | entry_time |
| Close Time | exit_time |

---

## Estructura del proyecto

```
src/
├── app/
│   ├── page.tsx              # Landing
│   ├── auth/
│   │   ├── login/            # Login
│   │   └── register/         # Registro
│   ├── dashboard/            # Dashboard principal
│   ├── journal/              # Log de trades
│   ├── analytics/            # Gráficos y análisis
│   ├── calendar/             # Heatmap P&L
│   ├── connect/              # Conectar brokers
│   ├── risk/                 # Reglas de riesgo
│   ├── leaderboard/          # Rankings
│   ├── settings/             # Configuración
│   └── api/
│       └── trades/sync/      # Sincronización Tradovate
├── components/ui/
│   └── Sidebar.tsx
├── lib/supabase/
│   ├── client.ts
│   └── server.ts
└── types/index.ts
```

---

## Próximos pasos sugeridos

- [ ] Webhook de MetaTrader con EA (MQL5) para sync automático
- [ ] Notificaciones cuando se violan risk rules
- [ ] Share cards de trades individuales
- [ ] Export de datos a CSV
- [ ] Comparativa entre brokers
