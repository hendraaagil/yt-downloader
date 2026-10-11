import LinkInput from './LinkInput'
import JobList from './JobList'
import { useEvents } from './useEvents'

export default function App() {
  const { jobs, add, remove } = useEvents()
  const done = jobs.filter((j) => j.status === 'done' && j.file)
  const active = jobs.filter((j) => j.status === 'queued' || j.status === 'downloading').length

  // trigger each file's browser download, staggered so the browser doesn't drop them
  const downloadAll = () => {
    done.forEach((j, i) => {
      setTimeout(() => {
        const a = document.createElement('a')
        a.href = `/api/downloads/${encodeURIComponent(j.file!)}`
        a.download = ''
        a.click()
      }, i * 300)
    })
  }

  return (
    <div className="min-h-dvh">
      {/* ambient wash — pure CSS, no asset */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-80 bg-gradient-to-b from-accent/10 to-transparent" />

      <main className="relative mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-10">
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-accent text-paper">
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                <path d="M6 4.5v7l6-3.5-6-3.5z" />
              </svg>
            </span>
            <span className="text-sm font-semibold tracking-tight text-ink">YT Downloader</span>
            <span className="ml-auto font-mono text-xs text-faint">
              {active > 0 ? `${active} active` : 'idle'}
            </span>
          </div>
          <h1 className="mt-6 max-w-xl text-3xl font-bold leading-[1.05] tracking-tight text-ink [overflow-wrap:anywhere] sm:text-4xl">
            Paste links.<br />
            <span className="text-muted">Get files.</span>
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
            Self-hosted on your LAN. Drop YouTube URLs below, pick a format, and pull the results straight from the queue.
          </p>
        </header>

        <LinkInput onAdded={add} />

        {done.length > 0 && (
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={downloadAll}
              className="rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-raise focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none"
            >
              Download all ({done.length})
            </button>
            <span className="font-mono text-xs text-faint">ready to pull</span>
          </div>
        )}

        <div className="mt-10">
          <JobList jobs={jobs} onDelete={remove} />
        </div>

        <footer className="mt-16 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line/60 pt-5 font-mono text-xs text-faint">
          <span>Self-hosted · yt-dlp + ffmpeg</span>
          <span className="ml-auto flex items-center gap-3">
            <a
              href="https://github.com/hendraaagil/yt-downloader"
              target="_blank"
              rel="noreferrer"
              className="text-muted transition hover:text-accent-hi"
            >
              Source
            </a>
            <span className="text-line">·</span>
            <a
              href="https://hendraaagil.dev"
              target="_blank"
              rel="noreferrer"
              className="text-muted transition hover:text-accent-hi"
            >
              @hendraaagil
            </a>
          </span>
        </footer>
      </main>
    </div>
  )
}
