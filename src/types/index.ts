export type TradeDirection = 'LONG' | 'SHORT'
export type TradeStatus = 'WIN' | 'LOSS' | 'BREAKEVEN'
export type BrokerSource = 'TRADOVATE' | 'METATRADER' | 'MANUAL'

export interface Trade {
  id: string
  user_id: string
  broker_source: BrokerSource
  external_id?: string
  symbol: string
  direction: TradeDirection
  status: TradeStatus
  entry_price: number
  exit_price: number
  quantity: number
  pnl: number
  pnl_percent?: number
  commission?: number
  entry_time: string
  exit_time: string
  duration_minutes?: number
  setup?: string
  emotion?: string
  mistake?: string
  notes?: string
  tags?: string[]
  created_at: string
}

export interface UserProfile {
  id: string
  username: string
  display_name?: string
  avatar_url?: string
  bio?: string
  is_public: boolean
  tradovate_connected: boolean
  total_trades: number
  win_rate: number
  total_pnl: number
  created_at: string
}

export interface TradovateCredentials {
  id: string
  user_id: string
  access_token: string
  refresh_token: string
  token_expires_at: string
  account_id: number
  account_name: string
  environment: 'live' | 'demo'
}

export interface DashboardStats {
  total_pnl: number
  total_trades: number
  win_rate: number
  profit_factor: number
  avg_win: number
  avg_loss: number
  best_trade: number
  worst_trade: number
  current_streak: number
  max_drawdown: number
}

export interface CalendarDay {
  date: string
  pnl: number
  trades: number
}

export interface RiskSettings {
  daily_loss_limit?: number
  max_trades_per_day?: number
  max_loss_streak?: number
  max_position_size?: number
}

export interface JournalEntry {
  id: string
  user_id: string
  entry_date: string
  mood?: number
  sleep_hours?: number
  market_condition?: string
  reflection?: string
  daily_goal?: string
  discipline_score?: number
  focus_score?: number
  created_at: string
  updated_at: string
}

export interface JournalAttachment {
  id: string
  journal_entry_id: string
  type: 'url' | 'image'
  url: string
  caption?: string
  created_at: string
}

export interface JournalChecklistItem {
  id: string
  journal_entry_id: string
  label: string
  checked: boolean
  sort_order: number
  created_at: string
}

export interface TradeReview {
  id: string
  trade_id: string
  user_id: string
  pre_trade_thesis?: string
  execution_rating?: number
  discipline_rating?: number
  followed_plan?: boolean
  exit_reason?: string
  lesson_learned?: string
  improvement_note?: string
  created_at: string
  updated_at: string
}
