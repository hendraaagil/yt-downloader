import { useState } from 'react'
import type { Job } from './useEvents'

export default function LinkInput({ onAdded }: { onAdded: (j: Job[]) => void }) {
  const [text, setText] = useState('')
  const [format, setFormat] = useState<'mp3' | 'mp4'>('mp3')
  const [err, setErr] = useState('')

  const count = text.split('\n').map((s) => s.trim()).filter(Boolean).length

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
    <div className="rounded-xl border border-line bg-surface p-4 shadow-xl shadow-black/20 sm:p-5">
      <textarea
        className="h-32 w-full resize-none rounded-lg border border-line bg-paper p-3 font-mono text-sm text-ink placeholder:text-faint focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30"
        placeholder={'https://youtube.com/watch?v=…\nOne URL per line'}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="inline-flex overflow-hidden rounded-lg border border-line">
          {(['mp3', 'mp4'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              className={`px-3.5 py-1.5 font-mono text-xs uppercase tracking-wide transition motion-reduce:transition-none ${
                format === f ? 'bg-accent text-paper' : 'bg-surface text-muted hover:bg-raise'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <button
          onClick={submit}
          disabled={!count}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-paper transition hover:bg-accent-hi focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none"
        >
          Add to queue{count > 1 ? ` (${count})` : ''}
        </button>

        {err && (
          <span className="font-mono text-xs text-bad" role="alert">
            {err}
          </span>
        )}
      </div>
    </div>
  )
}
