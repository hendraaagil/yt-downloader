import type { Job } from './useEvents'

const badge: Record<Job['status'], string> = {
  queued: 'bg-slate-200 text-slate-700',
  downloading: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}

export default function JobList({ jobs, onDelete }: { jobs: Job[]; onDelete: (id: string) => void }) {
  const del = async (id: string) => {
    await fetch(`/api/jobs/${id}`, { method: 'DELETE' })
    onDelete(id)
  }
  if (!jobs.length) return <p className="text-center text-slate-500">No jobs yet.</p>
  return (
    <table className="w-full rounded bg-white text-left text-sm shadow">
      <thead className="border-b text-slate-500">
        <tr>
          <th className="p-2">Title / URL</th>
          <th className="p-2">Format</th>
          <th className="p-2">Status</th>
          <th className="w-40 p-2">Progress</th>
          <th className="p-2" />
        </tr>
      </thead>
      <tbody>
        {jobs.map((j) => (
          <tr key={j.id} className="border-b last:border-0">
            <td className="max-w-xs truncate p-2" title={j.error ?? j.url}>
              {j.status === 'done' && j.file ? (
                <a className="text-blue-600 underline" href={`/api/downloads/${encodeURIComponent(j.file)}`} download>
                  {j.title || j.file}
                </a>
              ) : (
                j.title || j.url
              )}
              {j.error && <div className="truncate text-xs text-red-600">{j.error}</div>}
            </td>
            <td className="p-2 uppercase">{j.format}</td>
            <td className="p-2">
              <span className={`rounded px-2 py-0.5 text-xs ${badge[j.status]}`}>{j.status}</span>
            </td>
            <td className="p-2">
              <div className="h-2 w-full rounded bg-slate-200">
                <div className="h-2 rounded bg-blue-600 transition-all" style={{ width: `${j.progress}%` }} />
              </div>
            </td>
            <td className="p-2 text-right">
              <button onClick={() => del(j.id)} className="text-red-600 hover:underline">
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
