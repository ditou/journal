import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TRADOVATE_TOKEN_URL = 'https://live.tradovateapi.com/v1/auth/oauthtoken'
const CLIENT_ID = process.env.NEXT_PUBLIC_TRADOVATE_CLIENT_ID!
const CLIENT_SECRET = process.env.TRADOVATE_CLIENT_SECRET!

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/connect?error=oauth_cancelled', req.url))
  }

  // Exchange code for tokens
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/connect/callback`
  const tokenRes = await fetch(TRADOVATE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  })

  if (!tokenRes.ok) {
    console.error('Tradovate token exchange failed:', await tokenRes.text())
    return NextResponse.redirect(new URL('/connect?error=token_exchange', req.url))
  }

  const tokens = await tokenRes.json()

  // Get account info
  const accountRes = await fetch('https://live.tradovateapi.com/v1/account/list', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  const accounts = await accountRes.json()
  const account = accounts?.[0]

  // Save to Supabase
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/auth/login', req.url))

  await supabase.from('tradovate_credentials').upsert({
    user_id: user.id,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    account_id: account?.id,
    account_name: account?.name,
    environment: 'live',
  }, { onConflict: 'user_id' })

  return NextResponse.redirect(new URL('/connect?success=tradovate', req.url))
}
