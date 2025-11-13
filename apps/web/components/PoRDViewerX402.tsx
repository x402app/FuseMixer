import { useState, useEffect } from "react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4020"

interface PoRDViewerProps {
  deal: any
  onRestart: () => void
  onVerify?: (result: any) => void
}

export default function PoRDViewerX402({ deal, onRestart, onVerify }: PoRDViewerProps) {
  const [proof, setProof] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (deal?.receipt) {
      setProof(deal.receipt)
      setLoading(false)
    } else if (deal?.id) {
      fetchReceipt()
    }
  }, [deal])

  const fetchReceipt = async () => {
    try {
      const response = await fetch(`${API_URL}/api/deals/${deal.id}/receipt`)
      if (!response.ok) {
        throw new Error("Failed to fetch receipt")
      }
      const receipt = await response.json()
      setProof(receipt)
    } catch (error: any) {
      console.error("Error fetching receipt:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (!proof) return

    setVerifying(true)
    try {
      const response = await fetch(`${API_URL}/api/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ pod: proof })
      })

      const result = await response.json()
      setVerifyResult(result)
      if (onVerify) {
        onVerify(result)
      }
    } catch (error: any) {
      setVerifyResult({
        valid: false,
        errors: [error.message || "Verification failed"]
      })
    } finally {
      setVerifying(false)
    }
  }

  const handleDownload = () => {
    if (!proof) return

    const blob = new Blob([JSON.stringify(proof, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `PoRD_${deal?.id || "proof"}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleCopy = () => {
    if (!proof) return
    navigator.clipboard.writeText(JSON.stringify(proof, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-lg p-6">
        <div className="text-center text-gray-400">Loading PoRD...</div>
      </div>
    )
  }

  if (!proof) {
    return (
      <div className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-lg p-6">
        <div className="text-center text-red-400">No proof available</div>
        <button onClick={onRestart} className="mt-4 bg-blue-500 hover:bg-blue-600 text-black p-2 rounded">
          New Mix
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl bg-gray-900 border border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Proof of Route Destruction (PoRD)</h2>
        <div className="flex gap-2">
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-700 text-black px-4 py-2 rounded text-sm font-bold"
          >
            {verifying ? "Verifying..." : "Verify"}
          </button>
          <button
            onClick={handleCopy}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={handleDownload}
            className="bg-blue-500 hover:bg-blue-600 text-black px-4 py-2 rounded text-sm"
          >
            Download
          </button>
        </div>
      </div>

      {verifyResult && (
        <div className={`mb-4 p-4 rounded border ${
          verifyResult.valid
            ? "bg-green-900 border-green-700 text-green-200"
            : "bg-red-900 border-red-700 text-red-200"
        }`}>
          <div className="font-bold mb-2">
            Verification: {verifyResult.valid ? "✓ Valid" : "✗ Invalid"}
          </div>
          {verifyResult.errors && verifyResult.errors.length > 0 && (
            <div className="text-sm mt-2">
              <div className="font-bold">Errors:</div>
              <ul className="list-disc list-inside">
                {verifyResult.errors.map((err: string, i: number) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
          {verifyResult.warnings && verifyResult.warnings.length > 0 && (
            <div className="text-sm mt-2 text-yellow-300">
              <div className="font-bold">Warnings:</div>
              <ul className="list-disc list-inside">
                {verifyResult.warnings.map((warn: string, i: number) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="bg-gray-950 border border-gray-800 rounded p-4 overflow-x-auto">
        <pre className="text-xs text-gray-300 whitespace-pre-wrap">
          {JSON.stringify(proof, null, 2)}
        </pre>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={onRestart}
          className="bg-blue-500 hover:bg-blue-600 text-black px-6 py-2 rounded font-bold"
        >
          New Mix
        </button>
        <div className="text-xs text-gray-500 self-center ml-4">
          Deal ID: <span className="font-mono">{deal?.id}</span>
        </div>
      </div>
    </div>
  )
}
