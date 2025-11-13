import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify"
import { MixStateMachine, DealContext } from "../core/mixStateMachine"
import { generateRoute, Route, closeBurners } from "../core/routePlannerX402"
import { generatePoRD, serializePoRD } from "../core/podGeneratorX402"
import { DealParams, Deal, DealMetadata, DealLogEntry } from "../types/dealTypesX402"
import crypto from "crypto"

interface DealStorage extends Deal {
  context?: DealContext
  route?: Route
  salt?: string
}

const deals: Record<string, DealStorage> = {}

interface CreateDealRequest {
  amount: string
  target: string
  window: "Instant" | "1h" | "6h"
  hops: number
  decoys?: number
}

function validateDealParams(params: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!params.amount) {
    errors.push("Amount is required")
  } else {
    const amount = parseFloat(params.amount)
    if (isNaN(amount) || amount <= 0) {
      errors.push("Amount must be a positive number")
    }
    if (amount < 0.001) {
      errors.push("Amount must be at least 0.001")
    }
  }

  if (!params.target) {
    errors.push("Target address is required")
  } else if (params.target.length < 8) {
    errors.push("Target address is too short")
  }

  if (!params.window || !["Instant", "1h", "6h"].includes(params.window)) {
    errors.push("Window must be one of: Instant, 1h, 6h")
  }

  if (!params.hops) {
    errors.push("Hops count is required")
  } else {
    const hops = parseInt(params.hops)
    if (isNaN(hops) || hops < 1 || hops > 10) {
      errors.push("Hops must be between 1 and 10")
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

function createDealId(): string {
  const timestamp = Date.now()
  const random = crypto.randomBytes(4).toString("hex")
  return `dl_${timestamp}_${random}`
}

export function registerDealRoutes(app: FastifyInstance) {
  // Create new deal
  app.post("/api/deals", async (req: FastifyRequest<{ Body: CreateDealRequest }>, res: FastifyReply) => {
    try {
      const validation = validateDealParams(req.body)
      if (!validation.valid) {
        return res.status(400).send({
          error: "Validation failed",
          errors: validation.errors
        })
      }

      const id = createDealId()
      const now = new Date().toISOString()

      const metadata: DealMetadata = {
        network: "solana-mainnet (demo)",
        tokenType: "SOL",
        createdAt: now
      }

      const deal: DealStorage = {
        id,
        createdAt: now,
        params: req.body as DealParams,
        metadata,
        state: "DEAL_CREATED",
        log: [{
          timestamp: now,
          state: "DEAL_CREATED",
          message: "Deal created",
          data: { dealId: id }
        }]
      }

      deals[id] = deal

      return res.status(201).send(deal)
    } catch (error: any) {
      return res.status(500).send({
        error: "Internal server error",
        message: error.message
      })
    }
  })

  // Start deal processing
  app.post("/api/deals/:id/start", async (req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) => {
    try {
      const { id } = req.params
      const deal = deals[id]

      if (!deal) {
        return res.status(404).send({
          error: "Deal not found",
          dealId: id
        })
      }

      if (deal.state !== "DEAL_CREATED") {
        return res.status(400).send({
          error: "Deal already started or completed",
          currentState: deal.state
        })
      }

      // Generate route
      const route = generateRoute(deal.params.hops, deal.metadata.network)
      const salt = crypto.randomBytes(16).toString("hex")
      const routeHash = route.hash

      // Create context for state machine
      const context: DealContext = {
        id: deal.id,
        amount: deal.params.amount,
        target: deal.params.target,
        hops: deal.params.hops,
        window: deal.params.window,
        state: "DEAL_CREATED",
        log: deal.log,
        commitHash: routeHash,
        salt,
        route
      }

      // Run state machine
      const machine = new MixStateMachine(context)
      await machine.runAll()

      // Close burners
      const closedRoute = closeBurners(route)

      // Generate PoRD
      const proof = generatePoRD(
        {
          id: deal.id,
          amount: deal.params.amount,
          target: deal.params.target,
          window: deal.params.window,
          delayActualMs: context.delayActualMs
        },
        closedRoute,
        salt
      )

      // Update deal
      deal.state = context.state
      deal.log = context.log
      deal.route = closedRoute
      deal.receipt = proof
      deal.metadata.startedAt = context.startedAt?.toISOString()
      deal.metadata.completedAt = new Date().toISOString()
      deal.context = context

      return res.send(deal)
    } catch (error: any) {
      return res.status(500).send({
        error: "Failed to start deal",
        message: error.message
      })
    }
  })

  // Get deal status
  app.get("/api/deals/:id", async (req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) => {
    try {
      const { id } = req.params
      const deal = deals[id]

      if (!deal) {
        return res.status(404).send({
          error: "Deal not found",
          dealId: id
        })
      }

      // Return deal without sensitive data
      const { context, salt, ...safeDeal } = deal
      return res.send(safeDeal)
    } catch (error: any) {
      return res.status(500).send({
        error: "Internal server error",
        message: error.message
      })
    }
  })

  // Get PoRD receipt
  app.get("/api/deals/:id/receipt", async (req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) => {
    try {
      const { id } = req.params
      const deal = deals[id]

      if (!deal) {
        return res.status(404).send({
          error: "Deal not found",
          dealId: id
        })
      }

      if (!deal.receipt) {
        return res.status(404).send({
          error: "Receipt not available",
          dealId: id,
          state: deal.state
        })
      }

      // Set content type for JSON download
      res.header("Content-Type", "application/json")
      res.header("Content-Disposition", `attachment; filename="PoRD_${id}.json"`)

      return res.send(deal.receipt)
    } catch (error: any) {
      return res.status(500).send({
        error: "Internal server error",
        message: error.message
      })
    }
  })

  // List all deals (for debugging)
  app.get("/api/deals", async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const dealList = Object.values(deals).map(deal => {
        const { context, salt, route, ...safeDeal } = deal
        return {
          id: safeDeal.id,
          state: safeDeal.state,
          amount: safeDeal.params.amount,
          target: safeDeal.params.target.substring(0, 8) + "...",
          createdAt: safeDeal.createdAt,
          hasReceipt: !!safeDeal.receipt
        }
      })

      return res.send({
        deals: dealList,
        total: dealList.length
      })
    } catch (error: any) {
      return res.status(500).send({
        error: "Internal server error",
        message: error.message
      })
    }
  })
}
