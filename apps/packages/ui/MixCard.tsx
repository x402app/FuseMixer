import { ReactNode } from "react"

export default function MixCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 w-full max-w-md">
      <h2 className="text-lg font-bold mb-3">{title}</h2>
      <div>{children}</div>
    </div>
  )
}
