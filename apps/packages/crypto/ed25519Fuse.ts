import crypto from "crypto"

export interface KeyPair {
  publicKey: Buffer
  privateKey: Buffer
  publicKeyBase64: string
  privateKeyBase64: string
}

export interface SignatureResult {
  signature: string
  publicKey: string
  algorithm: string
  timestamp: string
}

/**
 * Sign data using ed25519 private key
 * @param data - Data to sign (string or Buffer)
 * @param privateKey - Private key buffer
 * @returns Base64 encoded signature
 */
export function signData(data: string | Buffer, privateKey: Buffer): string {
  if (!Buffer.isBuffer(data)) {
    data = Buffer.from(data, "utf-8")
  }

  // ed25519 signing
  const sign = crypto.createSign("SHA256")
  sign.update(data)
  sign.end()
  
  const signature = sign.sign({
    key: privateKey,
    dsaEncoding: "ieee-p1363"
  })
  
  return signature.toString("base64")
}

/**
 * Verify ed25519 signature
 * @param data - Original data (string or Buffer)
 * @param signature - Base64 encoded signature
 * @param publicKey - Public key buffer
 * @returns True if signature is valid
 */
export function verifyData(
  data: string | Buffer,
  signature: string,
  publicKey: Buffer
): boolean {
  try {
    if (!Buffer.isBuffer(data)) {
      data = Buffer.from(data, "utf-8")
    }

    const verify = crypto.createVerify("SHA256")
    verify.update(data)
    verify.end()
    
    return verify.verify(
      {
        key: publicKey,
        dsaEncoding: "ieee-p1363"
      },
      Buffer.from(signature, "base64")
    )
  } catch (error) {
    return false
  }
}

/**
 * Generate a new ed25519 key pair
 * @returns KeyPair with buffers and base64 strings
 */
export function generateKeyPair(): KeyPair {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519", {
    publicKeyEncoding: {
      type: "spki",
      format: "pem"
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem"
    }
  })

  // Convert PEM to raw buffers for ed25519
  const publicKeyRaw = crypto.createPublicKey(publicKey).export({
    type: "spki",
    format: "der"
  })
  
  const privateKeyRaw = crypto.createPrivateKey(privateKey).export({
    type: "pkcs8",
    format: "der"
  })

  return {
    publicKey: publicKeyRaw,
    privateKey: privateKeyRaw,
    publicKeyBase64: publicKeyRaw.toString("base64"),
    privateKeyBase64: privateKeyRaw.toString("base64")
  }
}

/**
 * Sign data and return full signature result
 */
export function signDataWithMetadata(
  data: string | Buffer,
  privateKey: Buffer,
  signerName: string = "VantaX402"
): SignatureResult {
  const signature = signData(data, privateKey)
  const publicKey = crypto.createPublicKey({
    key: privateKey,
    format: "der",
    type: "pkcs8"
  }).export({
    type: "spki",
    format: "der"
  })

  return {
    signature,
    publicKey: publicKey.toString("base64"),
    algorithm: "ed25519",
    timestamp: new Date().toISOString()
  }
}

/**
 * Load key pair from JSON file
 */
export function loadKeyPairFromJSON(jsonData: {
  publicKey: string
  privateKey: string
}): KeyPair {
  return {
    publicKey: Buffer.from(jsonData.publicKey, "base64"),
    privateKey: Buffer.from(jsonData.privateKey, "base64"),
    publicKeyBase64: jsonData.publicKey,
    privateKeyBase64: jsonData.privateKey
  }
}

/**
 * Export key pair to JSON-safe format
 */
export function exportKeyPairToJSON(keyPair: KeyPair): {
  publicKey: string
  privateKey: string
} {
  return {
    publicKey: keyPair.publicKeyBase64,
    privateKey: keyPair.privateKeyBase64
  }
}

/**
 * Hash data using SHA-256
 */
export function hashData(data: string | Buffer): string {
  if (!Buffer.isBuffer(data)) {
    data = Buffer.from(data, "utf-8")
  }
  return crypto.createHash("sha256").update(data).digest("hex")
}

/**
 * Create deterministic hash from object (sorted keys)
 */
export function hashObject(obj: Record<string, any>): string {
  const sorted = JSON.stringify(obj, Object.keys(obj).sort())
  return hashData(sorted)
}
