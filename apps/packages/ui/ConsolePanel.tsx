export default function ConsolePanel({ lines }: { lines: string[] }) {
  return (
    <div className="bg-gray-950 text-gray-200 p-3 font-mono text-xs rounded-md w-full max-w-lg overflow-y-auto h-64">
      {lines.map((line, i) => (
        <div key={i}>{"> " + line}</div>
      ))}
    </div>
  )
}
