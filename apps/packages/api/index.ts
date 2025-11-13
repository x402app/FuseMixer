import Fastify from "fastify"
import { registerDealRoutes } from "./dealRoutesX402"
import { registerVerifyRoutes } from "./verifyPoRDRoute"

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
    transport: process.env.NODE_ENV === "development" ? {
      target: "pino-pretty",
      options: {
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname"
      }
    } : undefined
  }
})

// CORS
app.addHook("onRequest", async (request, reply) => {
  reply.header("Access-Control-Allow-Origin", "*")
  reply.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  reply.header("Access-Control-Allow-Headers", "Content-Type")
})

// Handle preflight
app.addHook("onRequest", async (request, reply) => {
  if (request.method === "OPTIONS") {
    reply.code(204).send()
  }
})

// Register routes
registerDealRoutes(app)
registerVerifyRoutes(app)

// Error handler
app.setErrorHandler((error, request, reply) => {
  app.log.error(error)
  reply.status(500).send({
    error: "Internal server error",
    message: error.message
  })
})

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || "4020")
    const host = process.env.HOST || "0.0.0.0"

    await app.listen({ port, host })
    app.log.info(`VantaX402 API server listening on ${host}:${port}`)
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  app.log.info("Shutting down gracefully...")
  await app.close()
  process.exit(0)
})

process.on("SIGTERM", async () => {
  app.log.info("Shutting down gracefully...")
  await app.close()
  process.exit(0)
})

if (require.main === module) {
  start()
}

export default app
