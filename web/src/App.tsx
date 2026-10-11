import LinkInput from './LinkInput'
import JobList from './JobList'
import { useEvents } from './useEvents'

export default function App() {
  const { jobs, add, remove } = useEvents()
  const done = jobs.filter((j) => j.status === 'done' && j.file)

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
    <main className="mx-auto max-w-4xl space-y-4 p-4">
      <h1 className="text-2xl font-bold">YT Downloader</h1>
      <LinkInput onAdded={add} />
      {done.length > 0 && (
        <button
          onClick={downloadAll}
          className="rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
        >
          Download all ({done.length})
        </button>
      )}
      <JobList jobs={jobs} onDelete={remove} />
    </main>
  )
}
