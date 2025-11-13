import crypto from "crypto"
import { Route, Hop } from "./routePlannerX402"
import { signData, generateKeyPair } from "../crypto/ed25519Fuse"
import fs from "fs"
import path from "path"

export interface PoRDCommit {
  route_hash: string
  salt_hash: string
  timestamp: string
}

export interface PoRDReveal {
  hops: Hop[]
  delay_actual: string
  delay_actual_ms: number
  revealed_at: string
}

export interface PoRDFlags {
  burners_closed: boolean
  route_destroyed: boolean
  settlement_complete: boolean
}

export interface PoRDSignature {
  by: string
  alg: string
  sig: string
  public_key?: string
  timestamp: string
}

export interface PoRD {
  version: string
  deal_id: string
  network: string
  amount: string
  target: string
  token_type: string
  commit: PoRDCommit
  reveal: PoRDReveal
  flags: PoRDFlags
  signatures: PoRDSignature[]
  generated_at: string
  disclaimer: string
}

function formatDelay(delayMs: number): string {
  if (delayMs < 1000) {
    return `${delayMs}ms`
  }
  if (delayMs < 60000) {
    return `${Math.floor(delayMs / 1000)}s`
  }
  if (delayMs < 3600000) {
    const minutes = Math.floor(delayMs / 60000)
    const seconds = Math.floor((delayMs % 60000) / 1000)
    return `${minutes}m${seconds.toString().padStart(2, "0")}s`
  }
  const hours = Math.floor(delayMs / 3600000)
  const minutes = Math.floor((delayMs % 3600000) / 60000)
  return `${hours}h${minutes}m`
}

function loadOrGenerateKeyPair(): { publicKey: Buffer; privateKey: Buffer } {
  const secretsPath = path.join(process.cwd(), "..", "..", "secrets", "demo_ed25519.json")
  
  try {
    if (fs.existsSync(secretsPath)) {
      const keyData = JSON.parse(fs.readFileSync(secretsPath, "utf-8"))
      return {
        publicKey: Buffer.from(keyData.publicKey, "base64"),
        privateKey: Buffer.from(keyData.privateKey, "base64")
      }
    }
  } catch (error) {
    // Fall through to generate new keys
  }

  // Generate new key pair if file doesn't exist
  const { publicKey, privateKey } = generateKeyPair()
  return { publicKey, privateKey }
}

export function generatePoRD(
  deal: {
    id: string
    amount: string
    target: string
    window: string
    delayActualMs?: number
  },
  route: Route,
  salt?: string
): PoRD {
  // Generate salt if not provided
  const actualSalt = salt || crypto.randomBytes(16).toString("hex")
  const saltHash = crypto.createHash("sha256").update(actualSalt).digest("hex")
  
  // Get route hash
  const routeHash = route.hash
  
  // Format delay
  const delayMs = deal.delayActualMs || 0
  const delayFormatted = formatDelay(delayMs)
  
  // Prepare PoRD data for signing
  const podData = {
    deal_id: deal.id,
    amount: deal.amount,
    target: deal.target,
    commit: {
      route_hash: routeHash,
      salt_hash: saltHash
    },
    reveal: {
      hops: route.hops,
      delay_actual_ms: delayMs
    }
  }
  
  // Sign the PoRD
  const { publicKey, privateKey } = loadOrGenerateKeyPair()
  const dataToSign = JSON.stringify(podData, Object.keys(podData).sort())
  const signature = signData(dataToSign, privateKey)
  
  const now = new Date().toISOString()
  
  const pod: PoRD = {
    version: "0.1.0",
    deal_id: deal.id,
    network: route.metadata.network,
    amount: deal.amount,
    target: deal.target,
    token_type: route.metadata.tokenType,
    commit: {
      route_hash: routeHash,
      salt_hash: saltHash,
      timestamp: now
    },
    reveal: {
      hops: route.hops,
      delay_actual: delayFormatted,
      delay_actual_ms: delayMs,
      revealed_at: now
    },
    flags: {
      burners_closed: true,
      route_destroyed: true,
      settlement_complete: true
    },
    signatures: [{
      by: "VantaX402-demo",
      alg: "ed25519",
      sig: signature,
      public_key: publicKey.toString("base64"),
      timestamp: now
    }],
    generated_at: now,
    disclaimer: "Demo-only proof. This is a simulated PoRD for demonstration purposes. Unlinkability is probabilistic and depends on proper implementation."
  }
  
  return pod
}

export function serializePoRD(pod: PoRD): string {
  return JSON.stringify(pod, null, 2)
}

export function deserializePoRD(json: string): PoRD {
  return JSON.parse(json) as PoRD
}

export function validatePoRDStructure(pod: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!pod.deal_id) errors.push("Missing deal_id")
  if (!pod.amount) errors.push("Missing amount")
  if (!pod.target) errors.push("Missing target")
  if (!pod.commit) errors.push("Missing commit")
  if (!pod.commit.route_hash) errors.push("Missing commit.route_hash")
  if (!pod.commit.salt_hash) errors.push("Missing commit.salt_hash")
  if (!pod.reveal) errors.push("Missing reveal")
  if (!pod.reveal.hops) errors.push("Missing reveal.hops")
  if (!Array.isArray(pod.reveal.hops)) errors.push("reveal.hops must be an array")
  if (!pod.flags) errors.push("Missing flags")
  if (!pod.signatures) errors.push("Missing signatures")
  if (!Array.isArray(pod.signatures) || pod.signatures.length === 0) {
    errors.push("signatures must be a non-empty array")
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}
