import crypto from "crypto"

/**
 * Mix multiple hashes together using XOR
 */
export function mixHashes(hashes: string[]): string {
  if (hashes.length === 0) {
    throw new Error("Cannot mix empty hash array")
  }

  if (hashes.length === 1) {
    return hashes[0]
  }

  // Convert hex strings to buffers
  const buffers = hashes.map(h => Buffer.from(h, "hex"))
  
  // XOR all buffers together
  let result = buffers[0]
  for (let i = 1; i < buffers.length; i++) {
    result = Buffer.from(
      result.map((byte, idx) => byte ^ buffers[i][idx % buffers[i].length])
    )
  }

  return result.toString("hex")
}

/**
 * Create commitment hash from route and salt
 */
export function createCommitment(routeHash: string, salt: string): string {
  const combined = `${routeHash}:${salt}`
  return crypto.createHash("sha256").update(combined).digest("hex")
}

/**
 * Verify commitment matches route hash and salt
 */
export function verifyCommitment(
  commitment: string,
  routeHash: string,
  salt: string
): boolean {
  const computed = createCommitment(routeHash, salt)
  return computed === commitment
}

/**
 * Generate random salt
 */
export function generateSalt(length: number = 16): string {
  return crypto.randomBytes(length).toString("hex")
}

/**
 * Hash salt for storage (one-way)
 */
export function hashSalt(salt: string): string {
  return crypto.createHash("sha256").update(salt).digest("hex")
}

/**
 * Create merkle-like tree hash from multiple values
 */
export function merkleHash(values: string[]): string {
  if (values.length === 0) {
    throw new Error("Cannot create merkle hash from empty array")
  }

  if (values.length === 1) {
    return crypto.createHash("sha256").update(values[0]).digest("hex")
  }

  // Recursively hash pairs
  const pairs: string[] = []
  for (let i = 0; i < values.length; i += 2) {
    if (i + 1 < values.length) {
      const combined = values[i] + values[i + 1]
      pairs.push(crypto.createHash("sha256").update(combined).digest("hex"))
    } else {
      pairs.push(values[i])
    }
  }

  return merkleHash(pairs)
}
