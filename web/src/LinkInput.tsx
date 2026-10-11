import { useState } from 'react'
import type { Job } from './useEvents'

export default function LinkInput({ onAdded }: { onAdded: (j: Job[]) => void }) {
  const [text, setText] = useState('')
  const [format, setFormat] = useState<'mp3' | 'mp4'>('mp3')
  const [err, setErr] = useState('')

  const submit = async () => {
    const urls = text.split('\n').map((s) => s.trim()).filter(Boolean)
    if (!urls.length) return
    setErr('')
    try {
      const r = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls, format }),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const created = await r.json()
      onAdded(Array.isArray(created) ? created : created.jobs ?? [])
      setText('')
    } catch (e) {
      setErr(String(e))
    }
  }

  return (
    <div className="rounded bg-white p-4 shadow">
      <textarea
        className="h-32 w-full rounded border border-slate-300 p-2 font-mono text-sm"
        placeholder="One YouTube URL per line"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="mt-2 flex items-center gap-3">
        <div className="flex overflow-hidden rounded border border-slate-300">
          {(['mp3', 'mp4'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              className={`px-3 py-1 text-sm uppercase ${format === f ? 'bg-blue-600 text-white' : 'bg-white'}`}
            >
              {f}
            </button>
          ))}
        </div>
        <button onClick={submit} className="rounded bg-blue-600 px-4 py-1 text-white hover:bg-blue-700">
          Add to queue
        </button>
        {err && <span className="text-sm text-red-600">{err}</span>}
      </div>
    </div>
  )
}
