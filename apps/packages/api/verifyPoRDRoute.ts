import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify"
import { verifyPoRDFromObject } from "../verifier/verifyPoRDX402"
import { PoRD } from "../core/podGeneratorX402"

interface VerifyRequest {
  pod?: PoRD
  podJson?: string
}

export function registerVerifyRoutes(app: FastifyInstance) {
  // Verify PoRD
  app.post("/api/verify", async (req: FastifyRequest<{ Body: VerifyRequest }>, res: FastifyReply) => {
    try {
      let pod: PoRD | null = null

      // Accept either JSON string or object
      if (req.body.podJson) {
        try {
          pod = JSON.parse(req.body.podJson) as PoRD
        } catch (error: any) {
          return res.status(400).send({
            error: "Invalid JSON",
            message: error.message
          })
        }
      } else if (req.body.pod) {
        pod = req.body.pod as PoRD
      } else {
        return res.status(400).send({
          error: "Missing PoRD data",
          message: "Provide either 'pod' object or 'podJson' string"
        })
      }

      if (!pod) {
        return res.status(400).send({
          error: "Invalid PoRD data"
        })
      }

      // Verify PoRD
      const result = verifyPoRDFromObject(pod)

      return res.send({
        valid: result.valid,
        errors: result.errors,
        warnings: result.warnings,
        details: result.details,
        digest: result.digest,
        dealId: pod.deal_id
      })
    } catch (error: any) {
      return res.status(500).send({
        error: "Verification failed",
        message: error.message
      })
    }
  })

  // Health check
  app.get("/api/health", async (req: FastifyRequest, res: FastifyReply) => {
    return res.send({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "VantaX402 API"
    })
  })
}
