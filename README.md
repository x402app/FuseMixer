<img src="logo_site.png" width="120" align="center" />


# ⚡ FuseMixer — x402 Fair-Exchange Mixer

> “Obfuscation is not chaos — it’s *order* you can’t predict.”

---

## 🧬 What is VantaX402?

VantaX402 is a **simulated fair-exchange fuse mixer**, built on the conceptual framework of  
the **x402 protocol** — a payment-required system where commitments and settlements form a  
trust-minimized flow: **Commit → Delay → Reveal → Settle**.

This project showcases how anonymity, fairness, and cryptographic accountability can coexist  
inside a **deterministic simulation** — without relying on blockchain execution. It’s a  
*visual, interactive demo* that brings abstract cryptographic rituals to life.

**Key idea:**  
> You can destroy a route — but still prove it existed.

---

## 🧠 Concept Summary

| Term | Meaning |
|------|----------|
| **Deal** | A single simulated mixing session |
| **Hop** | A burner address in the route chain |
| **Window** | Time window for delay + random jitter |
| **PoRD** | Proof of Route Destruction — signed JSON artifact |
| **x420** | Fair-exchange principle: payment and proof are linked |
| **Fuse Mode** | Burners drain & close after reveal, ensuring unlinkability |

The demo implements an *off-chain simulation* of these flows for visualization and UX  
testing. All data is ephemeral and stored only in memory.

---

## 💡 Features

✨ Simulated commit/delay/reveal chain  
🔐 ed25519 PoRD signing and verification  
🌀 Jitter-based time windows (Instant / 1h / 6h)  
🧾 Local proof validation (CLI / browser)  
🖥️ Real-time state console  
🧩 Configurable hop routes, denominations & decoys  
🚫 No persistent logs or storage — pure in-memory demo  

---

## 🏗️ Architecture

```
/apps
  /web        → Next.js interface (mix form, console, PoRD viewer)
/packages
  /core       → state machine, PoRD generator, route simulator
  /api        → REST/WebSocket backend
  /verifier   → CLI for PoRD verification
  /crypto     → ed25519 signing + SHA-256 hashing
  /ui         → design system (cards, console, dark/light theme)
  /types      → shared Zod schemas & TS types
  /adapters
     /adapter-sim           → off-chain simulator
     /adapter-solana-devnet → future devnet stub
/spec
  SPEC.md     → detailed protocol spec
/secrets
  demo_ed25519.json (ignored by git)
```

---

## 🚀 Quick Start

```bash
git clone https://github.com/yourname/vantax402.git
cd vantax402
pnpm install
pnpm dev
```

Then open 👉 **http://localhost:3000**

---

## ⚙️ Example Config (`config.demo.yaml`)

```yaml
tokenType: "SOL:demo"
minAmount: 1.0
windows:
  - id: "Instant"
    jitterPct: 0
  - id: "1h"
    jitterPct: 10
  - id: "6h"
    jitterPct: 12
hops:
  recommended: 3
  max: 7
fees:
  mode: "demo"
receipt:
  signer: "VantaX402-demo"
  alg: "ed25519"
logging:
  persist: false
```

---

## 🧩 REST API

| Method | Endpoint | Description |
|:-------|:----------|:-------------|
| POST | `/api/deals` | Create new deal |
| POST | `/api/deals/{id}/start` | Run Commit→Reveal simulation |
| GET | `/api/deals/{id}` | Get deal state |
| GET | `/api/deals/{id}/receipt` | Download PoRD.json |
| POST | `/api/verify` | Verify PoRD validity |

---

## 🧠 State Machine Flow

```
NEW → DEAL_CREATED → COMMIT_DONE
→ WAITING_WINDOW → REVEALING_HOPS
→ BURNERS_CLOSED → SETTLED → RECEIPT_ISSUED
```

Each transition logs to a live in-browser console.  
Final step generates the PoRD — signed with ed25519.

---

## 🔏 Example PoRD v0

```json
{
  "deal_id": "dl_402xv",
  "network": "solana-mainnet (demo)",
  "amount": "1.000",
  "target": "9cVx…Hf",
  "commit": { "route_hash": "hex", "salt_hash": "hex" },
  "reveal": { "hops": ["..."], "delay_actual": "59m02s" },
  "flags": { "burners_closed": true },
  "signatures": [
    { "by": "VantaX402-demo", "alg": "ed25519", "sig": "base64" }
  ],
  "disclaimer": "Demo-only proof. Unlinkability is probabilistic."
}
```

---

## 🧮 Verify Locally

```bash
pnpm verifier ./PoRD.json
```

The verifier checks:
- route/salt hash integrity  
- signature validity  
- hop & window policy compliance  

---

## 🧰 Tech Stack

| Layer | Stack |
|:------|:------|
| **Frontend** | Next.js, React, Tailwind, TypeScript |
| **Backend** | Node.js, Fastify (REST + WS) |
| **Core** | TypeScript, Zod, State Machine |
| **Crypto** | TweetNaCl.js (ed25519), SHA-256 |
| **Build** | Turborepo + pnpm workspaces |

---

## 🎯 Demo Goals

✅ Visualize the x402 fair-exchange flow  
✅ Generate & sign PoRD proofs  
✅ Verify proofs locally  
✅ Provide a frictionless UX with no on-chain dependencies  

---

## 🧩 Roadmap

- **M1 (Demo α)** — Simulation, PoRD, local verification  
- **M2 (Devnet PoC)** — PDA-based deal anchor, slot deadlines  
- **M3 (MVP)** — Fee calculator, public verifier CLI, audit prep  

---

## ⚖️ License

MIT © 2025 [x402 Fuse Mimer](https://fusemixer.dev)
Built with ☕, entropy, and degen engineering spirit.

---

> “History can’t be erased — but routes can be destroyed.”
