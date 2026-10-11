import type { Job } from './useEvents'

const badge: Record<Job['status'], string> = {
  queued: 'border-line text-faint',
  downloading: 'border-accent/50 bg-accent/15 text-accent-hi',
  done: 'border-ok/40 bg-ok/15 text-ok',
  failed: 'border-bad/40 bg-bad/15 text-bad',
}

export default function JobList({ jobs, onDelete }: { jobs: Job[]; onDelete: (id: string) => void }) {
  const del = async (id: string) => {
    await fetch(`/api/jobs/${id}`, { method: 'DELETE' })
    onDelete(id)
  }

  if (!jobs.length)
    return (
      <div className="rounded-xl border border-dashed border-line/70 py-14 text-center">
        <p className="font-mono text-sm text-faint">No jobs yet</p>
        <p className="mt-1 text-xs text-faint/70">Added links show up here with live progress.</p>
      </div>
    )

  return (
    <ul className="space-y-2.5">
      {jobs.map((j) => (
        <li
          key={j.id}
          className="group rounded-xl border border-line bg-surface p-4 transition hover:border-line/80 hover:bg-raise/60 motion-reduce:transition-none"
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-ink" title={j.error ?? j.url}>
                {j.status === 'done' && j.file ? (
                  <a
                    className="text-ink underline decoration-accent decoration-2 underline-offset-4 hover:text-accent-hi"
                    href={`/api/downloads/${encodeURIComponent(j.file)}`}
                    download
                  >
                    {j.title || j.file}
                  </a>
                ) : (
                  j.title || j.url
                )}
              </div>
              <div className="mt-1 truncate font-mono text-xs text-faint">{j.url}</div>
              {j.error && <div className="mt-1 truncate font-mono text-xs text-bad">{j.error}</div>}
            </div>

            <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-faint">{j.format}</span>
            <span
              className={`shrink-0 rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${badge[j.status]}`}
            >
              {j.status}
            </span>

            <button
              onClick={() => del(j.id)}
              aria-label="Delete job"
              className="shrink-0 rounded-md px-1.5 py-0.5 text-faint transition hover:bg-bad/15 hover:text-bad focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent motion-reduce:transition-none"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d="M6 2h4l.5 1H13v1.5H3V3h2.5L6 2zM4 6h8l-.6 8H4.6L4 6z" />
              </svg>
            </button>
          </div>

          {j.status !== 'done' && j.status !== 'failed' && (
            <div className="mt-3 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out motion-reduce:transition-none"
                  style={{ width: `${j.progress}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-muted">
                {Math.round(j.progress)}%
              </span>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
