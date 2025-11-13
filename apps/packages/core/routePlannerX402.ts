import crypto from "crypto"

export interface Hop {
  address: string
  index: number
  balance?: string
  createdAt?: string
  closedAt?: string
  isClosed?: boolean
}

export interface RouteMetadata {
  totalHops: number
  generatedAt: string
  network: string
  tokenType: string
}

export interface Route {
  hops: Hop[]
  metadata: RouteMetadata
  hash: string
}

const SOLANA_ADDRESS_LENGTH = 44
const SOLANA_ADDRESS_CHARS = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

function generateSolanaLikeAddress(): string {
  // Generate a Solana-like base58 address (simplified)
  let address = ""
  for (let i = 0; i < SOLANA_ADDRESS_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * SOLANA_ADDRESS_CHARS.length)
    address += SOLANA_ADDRESS_CHARS[randomIndex]
  }
  return address
}

function generateShortAddress(): string {
  // Generate shorter hex address for demo
  return "0x" + crypto.randomBytes(20).toString("hex")
}

export function generateRoute(
  hopCount: number,
  network: string = "solana-mainnet",
  useSolanaFormat: boolean = true
): Route {
  if (hopCount < 1 || hopCount > 10) {
    throw new Error("Hop count must be between 1 and 10")
  }

  const hops: Hop[] = []
  const now = new Date().toISOString()

  for (let i = 0; i < hopCount; i++) {
    const address = useSolanaFormat 
      ? generateSolanaLikeAddress() 
      : generateShortAddress()
    
    hops.push({
      address,
      index: i,
      balance: "0",
      createdAt: now,
      isClosed: false
    })
  }

  const routeHash = hashRoute(hops)

  return {
    hops,
    metadata: {
      totalHops: hopCount,
      generatedAt: now,
      network,
      tokenType: "SOL"
    },
    hash: routeHash
  }
}

export function hashRoute(hops: Hop[]): string {
  if (hops.length === 0) {
    throw new Error("Cannot hash empty route")
  }

  // Create deterministic hash from hop addresses
  const addresses = hops
    .sort((a, b) => a.index - b.index)
    .map(h => h.address)
    .join("|")
  
  return crypto.createHash("sha256").update(addresses).digest("hex")
}

export function validateRoute(route: Route): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (route.hops.length === 0) {
    errors.push("Route must contain at least one hop")
  }

  if (route.hops.length > 10) {
    errors.push("Route cannot contain more than 10 hops")
  }

  // Check for duplicate addresses
  const addresses = new Set<string>()
  for (const hop of route.hops) {
    if (addresses.has(hop.address)) {
      errors.push(`Duplicate address found at index ${hop.index}`)
    }
    addresses.add(hop.address)
  }

  // Validate indices
  for (let i = 0; i < route.hops.length; i++) {
    if (route.hops[i].index !== i) {
      errors.push(`Invalid hop index at position ${i}`)
    }
  }

  // Verify hash
  const computedHash = hashRoute(route.hops)
  if (computedHash !== route.hash) {
    errors.push("Route hash mismatch")
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

export function formatRouteForDisplay(route: Route): string {
  return route.hops
    .map(h => `${h.index}: ${h.address.substring(0, 8)}...${h.address.substring(h.address.length - 4)}`)
    .join(" → ")
}

export function closeBurners(route: Route): Route {
  const closedAt = new Date().toISOString()
  return {
    ...route,
    hops: route.hops.map(hop => ({
      ...hop,
      isClosed: true,
      closedAt,
      balance: "0"
    }))
  }
}
