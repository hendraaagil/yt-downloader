import LinkInput from './LinkInput'
import JobList from './JobList'
import { useEvents } from './useEvents'

export default function App() {
  const { jobs, add, remove } = useEvents()
  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4">
      <h1 className="text-2xl font-bold">YT Downloader</h1>
      <LinkInput onAdded={add} />
      <JobList jobs={jobs} onDelete={remove} />
    </main>
  )
}
