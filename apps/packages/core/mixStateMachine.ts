import { DealLogEntry, WindowType } from "../types/dealTypesX402"

export type DealState =
  | "NEW"
  | "DEAL_CREATED"
  | "COMMIT_DONE"
  | "WAITING_WINDOW"
  | "REVEALING_HOPS"
  | "BURNERS_CLOSED"
  | "SETTLED"
  | "RECEIPT_ISSUED"
  | "ERROR"

export interface DealContext {
  id: string
  amount: string
  target: string
  hops: number
  window: WindowType
  state: DealState
  log: DealLogEntry[]
  route?: any
  commitHash?: string
  salt?: string
  startedAt?: Date
  windowStartTime?: Date
  windowEndTime?: Date
  delayActualMs?: number
  error?: string
}

export interface StateTransition {
  from: DealState
  to: DealState
  condition?: () => boolean
  action?: (ctx: DealContext) => void | Promise<void>
}

export class MixStateMachine {
  ctx: DealContext
  private transitions: Map<DealState, DealState[]> = new Map()

  constructor(ctx: DealContext) {
    this.ctx = ctx
    this.initializeTransitions()
  }

  private initializeTransitions() {
    this.transitions.set("NEW", ["DEAL_CREATED"])
    this.transitions.set("DEAL_CREATED", ["COMMIT_DONE"])
    this.transitions.set("COMMIT_DONE", ["WAITING_WINDOW"])
    this.transitions.set("WAITING_WINDOW", ["REVEALING_HOPS"])
    this.transitions.set("REVEALING_HOPS", ["BURNERS_CLOSED"])
    this.transitions.set("BURNERS_CLOSED", ["SETTLED"])
    this.transitions.set("SETTLED", ["RECEIPT_ISSUED"])
    this.transitions.set("RECEIPT_ISSUED", [])
    this.transitions.set("ERROR", [])
  }

  private addLog(message: string, data?: Record<string, any>) {
    this.ctx.log.push({
      timestamp: new Date().toISOString(),
      state: this.ctx.state,
      message,
      data
    })
  }

  private getWindowDelayMs(): number {
    const baseDelays: Record<WindowType, number> = {
      "Instant": 0,
      "1h": 60 * 60 * 1000,
      "6h": 6 * 60 * 60 * 1000
    }
    const base = baseDelays[this.ctx.window] || 0
    const jitterPct = this.ctx.window === "Instant" ? 0 : 10
    const jitter = base * (jitterPct / 100)
    const randomJitter = Math.random() * jitter * 2 - jitter
    return Math.max(0, base + randomJitter)
  }

  async next(): Promise<boolean> {
    const nextStates = this.transitions.get(this.ctx.state)
    if (!nextStates || nextStates.length === 0) {
      return false
    }

    const nextState = nextStates[0]

    try {
      switch (this.ctx.state) {
        case "NEW":
          this.ctx.state = "DEAL_CREATED"
          this.addLog("Deal created", { dealId: this.ctx.id })
          break

        case "DEAL_CREATED":
          this.ctx.state = "COMMIT_DONE"
          this.ctx.startedAt = new Date()
          this.addLog("Commit phase completed", { 
            routeHash: this.ctx.commitHash?.substring(0, 16) + "..." 
          })
          break

        case "COMMIT_DONE":
          this.ctx.state = "WAITING_WINDOW"
          const delayMs = this.getWindowDelayMs()
          this.ctx.windowStartTime = new Date()
          this.ctx.windowEndTime = new Date(Date.now() + delayMs)
          this.addLog(`Waiting window: ${this.ctx.window}`, { 
            delayMs,
            endTime: this.ctx.windowEndTime.toISOString()
          })
          break

        case "WAITING_WINDOW":
          this.ctx.state = "REVEALING_HOPS"
          if (this.ctx.windowEndTime) {
            this.ctx.delayActualMs = Date.now() - this.ctx.windowStartTime!.getTime()
          }
          this.addLog("Window elapsed, revealing hops", { 
            delayActualMs: this.ctx.delayActualMs 
          })
          break

        case "REVEALING_HOPS":
          this.ctx.state = "BURNERS_CLOSED"
          this.addLog("Hops revealed, closing burners", { 
            hopCount: this.ctx.hops 
          })
          break

        case "BURNERS_CLOSED":
          this.ctx.state = "SETTLED"
          this.addLog("Burners closed, settlement complete")
          break

        case "SETTLED":
          this.ctx.state = "RECEIPT_ISSUED"
          this.addLog("Receipt issued", { receiptGenerated: true })
          break

        default:
          return false
      }

      return true
    } catch (error: any) {
      this.ctx.state = "ERROR"
      this.ctx.error = error.message || "Unknown error"
      this.addLog("Error occurred", { error: this.ctx.error })
      return false
    }
  }

  async runAll(): Promise<DealContext> {
    while (this.ctx.state !== "RECEIPT_ISSUED" && this.ctx.state !== "ERROR") {
      const hasNext = await this.next()
      if (!hasNext) break

      // Simulate async delays for realistic flow
      if (this.ctx.state === "WAITING_WINDOW") {
        // In real implementation, this would wait for actual time
        // For demo, we simulate with a short delay
        await new Promise(resolve => setTimeout(resolve, 100))
      } else {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    }

    return this.ctx
  }

  canTransitionTo(state: DealState): boolean {
    const nextStates = this.transitions.get(this.ctx.state)
    return nextStates?.includes(state) || false
  }

  getCurrentState(): DealState {
    return this.ctx.state
  }

  getLog(): DealLogEntry[] {
    return this.ctx.log
  }
}
