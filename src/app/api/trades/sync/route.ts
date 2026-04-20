import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TRADOVATE_API = 'https://live.tradovateapi.com/v1'

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const res = await fetch(`${TRADOVATE_API}/auth/oauthtoken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.NEXT_PUBLIC_TRADOVATE_CLIENT_ID!,
      client_secret: process.env.TRADOVATE_CLIENT_SECRET!,
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.access_token
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get stored credentials
  const { data: creds } = await supabase
    .from('tradovate_credentials')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!creds) return NextResponse.json({ error: 'Tradovate not connected' }, { status: 400 })

  // Refresh token if expired
  let token = creds.access_token
  if (new Date(creds.token_expires_at) <= new Date()) {
    token = await refreshAccessToken(creds.refresh_token) || token
    await supabase.from('tradovate_credentials').update({ access_token: token }).eq('user_id', user.id)
  }

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  // Fetch fills (executed trades) from Tradovate
  const fillsRes = await fetch(`${TRADOVATE_API}/fill/list`, { headers })
  if (!fillsRes.ok) {
    return NextResponse.json({ error: 'Failed to fetch fills from Tradovate' }, { status: 500 })
  }
  const fills = await fillsRes.json()

  // Fetch orders to match fills
  const ordersRes = await fetch(`${TRADOVATE_API}/order/list`, { headers })
  const orders: Record<number, { action: string }> = {}
  if (ordersRes.ok) {
    const orderList = await ordersRes.json()
    orderList.forEach((o: { id: number; action: string }) => { orders[o.id] = o })
  }

  // Group fills into completed trades (pair buy + sell fills)
  // Tradovate fills: id, orderId, contractId, timestamp, price, qty, side
  const grouped: Record<string, { fills: typeof fills; symbol: string }> = {}

  for (const fill of fills) {
    const key = `${fill.contractId}`
    if (!grouped[key]) grouped[key] = { fills: [], symbol: fill.contractId?.name || `CONTRACT_${fill.contractId}` }
    grouped[key].fills.push(fill)
  }

  let inserted = 0, skipped = 0

  for (const [, group] of Object.entries(grouped)) {
    const { fills: groupFills, symbol } = group
    // Simple pairing: first fill = entry, last fill = exit (simplified)
    if (groupFills.length < 2) continue

    const first = groupFills[0]
    const last = groupFills[groupFills.length - 1]
    const direction = first.side === 'Buy' ? 'LONG' : 'SHORT'
    const entryPrice = first.price
    const exitPrice = last.price
    const qty = first.qty
    const pnl = direction === 'LONG'
      ? (exitPrice - entryPrice) * qty
      : (entryPrice - exitPrice) * qty

    const externalId = `tv_${first.id}_${last.id}`

    const { error } = await supabase.from('trades').upsert({
      user_id: user.id,
      broker_source: 'TRADOVATE',
      external_id: externalId,
      symbol,
      direction,
      status: pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BREAKEVEN',
      entry_price: entryPrice,
      exit_price: exitPrice,
      quantity: qty,
      pnl: parseFloat(pnl.toFixed(2)),
      commission: (first.commission || 0) + (last.commission || 0),
      entry_time: first.timestamp,
      exit_time: last.timestamp,
    }, { onConflict: 'user_id,external_id,broker_source' })

    if (error) skipped++
    else inserted++
  }

  return NextResponse.json({ inserted, skipped, total: fills.length })
}
