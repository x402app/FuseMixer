import { ReactNode } from "react"

export default function FuseButton({ onClick, children }: { onClick: ()=>void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="bg-green-500 text-black font-bold py-2 px-4 rounded hover:bg-green-400 transition"
    >
      {children}
    </button>
  )
}
