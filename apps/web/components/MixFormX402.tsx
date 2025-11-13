import { useState } from "react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4020"

interface MixFormProps {
  onStart: (deal: any) => void
  onError?: (error: string) => void
}

export default function MixFormX402({ onStart, onError }: MixFormProps) {
  const [amount, setAmount] = useState("1.000")
  const [window, setWindow] = useState<"Instant" | "1h" | "6h">("Instant")
  const [hops, setHops] = useState(3)
  const [target, setTarget] = useState("")
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    const amountNum = parseFloat(amount)
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      newErrors.amount = "Amount must be a positive number"
    } else if (amountNum < 0.001) {
      newErrors.amount = "Amount must be at least 0.001"
    }

    if (!target || target.length < 8) {
      newErrors.target = "Target address must be at least 8 characters"
    }

    if (hops < 1 || hops > 10) {
      newErrors.hops = "Hops must be between 1 and 10"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleStart = async () => {
    if (!validate()) {
      return
    }

    setLoading(true)
    setErrors({})

    try {
      // Create deal via API
      const response = await fetch(`${API_URL}/api/deals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount,
          target,
          window,
          hops
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.errors?.join(", ") || errorData.message || "Failed to create deal")
      }

      const deal = await response.json()
      onStart(deal)
    } catch (error: any) {
      const errorMessage = error.message || "Failed to start mix"
      setErrors({ general: errorMessage })
      if (onError) {
        onError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-md bg-gray-900 border border-gray-700 rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-2">Create x420 Mix</h2>
      
      {errors.general && (
        <div className="bg-red-900 border border-red-700 text-red-200 p-3 rounded">
          {errors.general}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-400">Amount (SOL)</label>
        <input
          type="number"
          step="0.001"
          min="0.001"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value)
            if (errors.amount) setErrors({ ...errors, amount: "" })
          }}
          className="bg-gray-800 border border-gray-600 text-white p-3 rounded focus:border-green-500 focus:outline-none"
          placeholder="1.000"
          disabled={loading}
        />
        {errors.amount && <span className="text-red-400 text-sm">{errors.amount}</span>}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-400">Time Window</label>
        <select
          value={window}
          onChange={(e) => setWindow(e.target.value as "Instant" | "1h" | "6h")}
          className="bg-gray-800 border border-gray-600 text-white p-3 rounded focus:border-green-500 focus:outline-none"
          disabled={loading}
        >
          <option value="Instant">Instant (0 delay)</option>
          <option value="1h">1 Hour (with jitter)</option>
          <option value="6h">6 Hours (with jitter)</option>
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-400">Number of Hops (1-10)</label>
        <input
          type="number"
          min="1"
          max="10"
          value={hops}
          onChange={(e) => {
            setHops(Number(e.target.value))
            if (errors.hops) setErrors({ ...errors, hops: "" })
          }}
          className="bg-gray-800 border border-gray-600 text-white p-3 rounded focus:border-green-500 focus:outline-none"
          disabled={loading}
        />
        {errors.hops && <span className="text-red-400 text-sm">{errors.hops}</span>}
        <span className="text-xs text-gray-500">More hops = better anonymity, but slower</span>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-400">Target Address</label>
        <input
          value={target}
          onChange={(e) => {
            setTarget(e.target.value)
            if (errors.target) setErrors({ ...errors, target: "" })
          }}
          className="bg-gray-800 border border-gray-600 text-white p-3 rounded font-mono text-sm focus:border-green-500 focus:outline-none"
          placeholder="Enter recipient address..."
          disabled={loading}
        />
        {errors.target && <span className="text-red-400 text-sm">{errors.target}</span>}
      </div>

      <button
        onClick={handleStart}
        disabled={loading}
        className="bg-green-500 hover:bg-green-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-black font-bold py-3 px-6 rounded transition mt-2"
      >
        {loading ? "Creating..." : "Start x420 Mix"}
      </button>

      <div className="text-xs text-gray-500 mt-2">
        <p>⚠️ Demo mode: This is a simulation. No real transactions occur.</p>
      </div>
    </div>
  )
}
