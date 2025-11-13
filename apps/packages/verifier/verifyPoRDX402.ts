import fs from "fs"
import crypto from "crypto"
import { verifyData, hashData } from "../crypto/ed25519Fuse"
import { hashRoute, validateRoute, Route } from "../core/routePlannerX402"
import { validatePoRDStructure, PoRD } from "../core/podGeneratorX402"

export interface VerificationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  details: {
    structureValid: boolean
    signatureValid: boolean
    routeValid: boolean
    hashValid: boolean
    timestampValid: boolean
  }
  digest: string
}

/**
 * Verify PoRD signature
 */
function verifySignature(pod: PoRD): { valid: boolean; error?: string } {
  if (!pod.signatures || pod.signatures.length === 0) {
    return { valid: false, error: "No signatures found" }
  }

  for (const sig of pod.signatures) {
    if (sig.alg !== "ed25519") {
      return { valid: false, error: `Unsupported algorithm: ${sig.alg}` }
    }

    if (!sig.public_key) {
      return { valid: false, error: "Missing public key in signature" }
    }

    try {
      // Reconstruct data that was signed
      const dataToVerify = {
        deal_id: pod.deal_id,
        amount: pod.amount,
        target: pod.target,
        commit: pod.commit,
        reveal: {
          hops: pod.reveal.hops,
          delay_actual_ms: pod.reveal.delay_actual_ms
        }
      }
      const dataString = JSON.stringify(dataToVerify, Object.keys(dataToVerify).sort())

      const publicKey = Buffer.from(sig.public_key, "base64")
      const isValid = verifyData(dataString, sig.sig, publicKey)

      if (!isValid) {
        return { valid: false, error: "Signature verification failed" }
      }
    } catch (error: any) {
      return { valid: false, error: `Signature verification error: ${error.message}` }
    }
  }

  return { valid: true }
}

/**
 * Verify route hash matches commit
 */
function verifyRouteHash(pod: PoRD): { valid: boolean; error?: string } {
  try {
    const route: Route = {
      hops: pod.reveal.hops,
      metadata: {
        totalHops: pod.reveal.hops.length,
        generatedAt: pod.reveal.revealed_at,
        network: pod.network,
        tokenType: pod.token_type
      },
      hash: pod.commit.route_hash
    }

    const validation = validateRoute(route)
    if (!validation.valid) {
      return { valid: false, error: validation.errors.join(", ") }
    }

    return { valid: true }
  } catch (error: any) {
    return { valid: false, error: `Route validation error: ${error.message}` }
  }
}

/**
 * Verify timestamp validity
 */
function verifyTimestamps(pod: PoRD): { valid: boolean; warnings: string[] } {
  const warnings: string[] = []
  const now = Date.now()

  try {
    const commitTime = new Date(pod.commit.timestamp).getTime()
    const revealTime = new Date(pod.reveal.revealed_at).getTime()
    const generatedTime = new Date(pod.generated_at).getTime()

    // Check if timestamps are in the future
    if (commitTime > now) {
      warnings.push("Commit timestamp is in the future")
    }
    if (revealTime > now) {
      warnings.push("Reveal timestamp is in the future")
    }
    if (generatedTime > now) {
      warnings.push("Generated timestamp is in the future")
    }

    // Check if reveal is after commit
    if (revealTime < commitTime) {
      return { valid: false, warnings: ["Reveal timestamp is before commit timestamp"] }
    }

    // Check if delay matches
    const expectedDelay = revealTime - commitTime
    const actualDelay = pod.reveal.delay_actual_ms
    const delayDiff = Math.abs(expectedDelay - actualDelay)

    if (delayDiff > 1000) {
      warnings.push(`Delay mismatch: expected ${expectedDelay}ms, got ${actualDelay}ms`)
    }

    return { valid: true, warnings }
  } catch (error: any) {
    return { valid: false, warnings: [`Timestamp parsing error: ${error.message}`] }
  }
}

/**
 * Main PoRD verification function
 */
export function verifyPoRD(filePath: string): VerificationResult {
  const errors: string[] = []
  const warnings: string[] = []

  try {
    // Read and parse file
    const raw = fs.readFileSync(filePath, "utf-8")
    const data: any = JSON.parse(raw)

    // Validate structure
    const structureCheck = validatePoRDStructure(data)
    if (!structureCheck.valid) {
      errors.push(...structureCheck.errors)
      return {
        valid: false,
        errors,
        warnings,
        details: {
          structureValid: false,
          signatureValid: false,
          routeValid: false,
          hashValid: false,
          timestampValid: false
        },
        digest: hashData(raw)
      }
    }

    const pod = data as PoRD

    // Verify signature
    const sigCheck = verifySignature(pod)
    if (!sigCheck.valid) {
      errors.push(sigCheck.error || "Signature verification failed")
    }

    // Verify route hash
    const routeCheck = verifyRouteHash(pod)
    if (!routeCheck.valid) {
      errors.push(routeCheck.error || "Route hash verification failed")
    }

    // Verify timestamps
    const timeCheck = verifyTimestamps(pod)
    if (!timeCheck.valid) {
      errors.push(...timeCheck.warnings)
    } else {
      warnings.push(...timeCheck.warnings)
    }

    // Create digest
    const digest = hashData(raw)

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      details: {
        structureValid: true,
        signatureValid: sigCheck.valid,
        routeValid: routeCheck.valid,
        hashValid: routeCheck.valid,
        timestampValid: timeCheck.valid
      },
      digest
    }
  } catch (error: any) {
    errors.push(`Verification error: ${error.message}`)
    return {
      valid: false,
      errors,
      warnings,
      details: {
        structureValid: false,
        signatureValid: false,
        routeValid: false,
        hashValid: false,
        timestampValid: false
      },
      digest: ""
    }
  }
}

/**
 * Verify PoRD from JSON object (for API use)
 */
export function verifyPoRDFromObject(pod: any): VerificationResult {
  const errors: string[] = []
  const warnings: string[] = []

  try {
    // Validate structure
    const structureCheck = validatePoRDStructure(pod)
    if (!structureCheck.valid) {
      errors.push(...structureCheck.errors)
      return {
        valid: false,
        errors,
        warnings,
        details: {
          structureValid: false,
          signatureValid: false,
          routeValid: false,
          hashValid: false,
          timestampValid: false
        },
        digest: hashData(JSON.stringify(pod))
      }
    }

    const podTyped = pod as PoRD

    // Verify signature
    const sigCheck = verifySignature(podTyped)
    if (!sigCheck.valid) {
      errors.push(sigCheck.error || "Signature verification failed")
    }

    // Verify route hash
    const routeCheck = verifyRouteHash(podTyped)
    if (!routeCheck.valid) {
      errors.push(routeCheck.error || "Route hash verification failed")
    }

    // Verify timestamps
    const timeCheck = verifyTimestamps(podTyped)
    if (!timeCheck.valid) {
      errors.push(...timeCheck.warnings)
    } else {
      warnings.push(...timeCheck.warnings)
    }

    const digest = hashData(JSON.stringify(pod))

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      details: {
        structureValid: true,
        signatureValid: sigCheck.valid,
        routeValid: routeCheck.valid,
        hashValid: routeCheck.valid,
        timestampValid: timeCheck.valid
      },
      digest
    }
  } catch (error: any) {
    errors.push(`Verification error: ${error.message}`)
    return {
      valid: false,
      errors,
      warnings,
      details: {
        structureValid: false,
        signatureValid: false,
        routeValid: false,
        hashValid: false,
        timestampValid: false
      },
      digest: ""
    }
  }
}

// CLI entry point
if (require.main === module) {
  const file = process.argv[2]
  if (!file) {
    console.error("usage: node verifyPoRDX402.js <PoRD.json>")
    process.exit(1)
  }
  const result = verifyPoRD(file)
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.valid ? 0 : 1)
}
