import { useState } from "react"
import MixFormX402 from "../components/MixFormX402"
import MixConsoleX402 from "../components/MixConsoleX402"
import PoRDViewerX402 from "../components/PoRDViewerX402"

export default function MixPage() {
  const [view, setView] = useState<"form" | "console" | "proof">("form")
  const [deal, setDeal] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleStart = (newDeal: any) => {
    setDeal(newDeal)
    setError(null)
    setView("console")
  }

  const handleDone = (completedDeal: any) => {
    setDeal(completedDeal)
    setView("proof")
  }

  const handleRestart = () => {
    setDeal(null)
    setError(null)
    setView("form")
  }

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 flex flex-col items-center gap-6">
      <header className="text-center mb-4">
        <h1 className="text-4xl font-bold mb-2">⚡ VantaX402</h1>
        <p className="text-gray-400">x420 Fair-Exchange Mixer (Demo)</p>
      </header>

      {error && (
        <div className="w-full max-w-2xl bg-red-900 border border-red-700 text-red-200 p-4 rounded">
          <strong>Error:</strong> {error}
          <button
            onClick={() => setError(null)}
            className="ml-4 text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {view === "form" && (
        <MixFormX402
          onStart={handleStart}
          onError={handleError}
        />
      )}

      {view === "console" && deal && (
        <MixConsoleX402
          deal={deal}
          onDone={handleDone}
          onError={handleError}
        />
      )}

      {view === "proof" && deal && (
        <PoRDViewerX402
          deal={deal}
          onRestart={handleRestart}
        />
      )}
    </main>
  )
}
