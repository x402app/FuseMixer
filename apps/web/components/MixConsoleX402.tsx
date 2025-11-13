import { useEffect, useState } from "react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4020"

interface MixConsoleProps {
  deal: any
  onDone: (deal: any) => void
  onError?: (error: string) => void
}

export default function MixConsoleX402({ deal, onDone, onError }: MixConsoleProps) {
  const [logs, setLogs] = useState<Array<{ timestamp: string; state: string; message: string; data?: any }>>([])
  const [currentState, setCurrentState] = useState("DEAL_CREATED")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!deal?.id) return

    const startProcessing = async () => {
      setLoading(true)
      
      try {
        // Start the deal processing
        const response = await fetch(`${API_URL}/api/deals/${deal.id}/start`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          }
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || "Failed to start processing")
        }

        const updatedDeal = await response.json()
        
        // Update logs from deal log entries
        if (updatedDeal.log && Array.isArray(updatedDeal.log)) {
          setLogs(updatedDeal.log)
          setCurrentState(updatedDeal.state)
        }

        // Poll for updates if not complete
        if (updatedDeal.state !== "RECEIPT_ISSUED" && updatedDeal.state !== "ERROR") {
          pollDealStatus(deal.id)
        } else {
          setLoading(false)
          onDone(updatedDeal)
        }
      } catch (error: any) {
        setLoading(false)
        const errorMessage = error.message || "Failed to process deal"
        setLogs(prev => [...prev, {
          timestamp: new Date().toISOString(),
          state: "ERROR",
          message: `Error: ${errorMessage}`
        }])
        if (onError) {
          onError(errorMessage)
        }
      }
    }

    const pollDealStatus = async (dealId: string) => {
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`${API_URL}/api/deals/${dealId}`)
          if (!response.ok) {
            clearInterval(pollInterval)
            return
          }

          const dealData = await response.json()
          
          if (dealData.log && Array.isArray(dealData.log)) {
            setLogs(dealData.log)
            setCurrentState(dealData.state)
          }

          if (dealData.state === "RECEIPT_ISSUED" || dealData.state === "ERROR") {
            clearInterval(pollInterval)
            setLoading(false)
            onDone(dealData)
          }
        } catch (error) {
          clearInterval(pollInterval)
          setLoading(false)
        }
      }, 500)

      // Cleanup after 30 seconds
      setTimeout(() => {
        clearInterval(pollInterval)
        setLoading(false)
      }, 30000)
    }

    startProcessing()
  }, [deal?.id])

  const getStateColor = (state: string): string => {
    if (state === "ERROR") return "text-red-400"
    if (state === "RECEIPT_ISSUED") return "text-green-400"
    if (state.includes("WAITING")) return "text-yellow-400"
    return "text-gray-300"
  }

  return (
    <div className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Processing Mix</h2>
        <div className={`text-sm font-mono ${getStateColor(currentState)}`}>
          {currentState}
        </div>
      </div>

      <div className="bg-gray-950 border border-gray-800 rounded p-4 font-mono text-sm h-96 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="text-gray-500">Initializing...</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="mb-1">
              <span className="text-gray-500 text-xs">
                [{new Date(log.timestamp).toLocaleTimeString()}]
              </span>
              <span className={`ml-2 ${getStateColor(log.state)}`}>
                &gt; {log.message}
              </span>
              {log.data && (
                <div className="ml-6 text-xs text-gray-400 mt-1">
                  {JSON.stringify(log.data, null, 2)}
                </div>
              )}
            </div>
          ))
        )}
        {loading && (
          <div className="text-gray-500 mt-2">
            &gt; Processing...
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500">
        Deal ID: <span className="font-mono">{deal?.id}</span>
      </div>
    </div>
  )
}
