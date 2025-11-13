export type WindowType = "Instant" | "1h" | "6h"

export interface DealParams {
  amount: string
  target: string
  window: WindowType
  hops: number
  decoys?: number
}

export interface DealMetadata {
  network: string
  tokenType: string
  createdAt: string
  startedAt?: string
  completedAt?: string
}

export interface DealLogEntry {
  timestamp: string
  state: string
  message: string
  data?: Record<string, any>
}

export interface Deal {
  id: string
  createdAt: string
  params: DealParams
  metadata: DealMetadata
  state: string
  log: DealLogEntry[]
  route?: any
  receipt?: any
  error?: string
}

export interface WindowConfig {
  id: WindowType
  baseDelayMs: number
  jitterPct: number
  description: string
}

export interface RouteConfig {
  minHops: number
  maxHops: number
  recommendedHops: number
}

export interface MixConfig {
  windows: WindowConfig[]
  route: RouteConfig
  minAmount: number
  maxAmount: number
  tokenType: string
}
