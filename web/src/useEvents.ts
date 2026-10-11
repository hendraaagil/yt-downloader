import { useEffect, useState } from 'react'

export type Job = {
  id: string
  url: string
  format: 'mp3' | 'mp4'
  status: 'queued' | 'downloading' | 'done' | 'failed'
  progress: number
  title?: string
  file?: string
  error?: string
  createdAt: number | string
}

export function useEvents() {
  const [jobs, setJobs] = useState<Job[]>([])

  useEffect(() => {
    // ponytail: assumes each SSE message is a Job (or Job[]) as JSON; adjust if server differs
    const merge = (u: Job | Job[]) =>
      setJobs((prev) => {
        const map = new Map(prev.map((j) => [j.id, j]))
        for (const j of Array.isArray(u) ? u : [u]) map.set(j.id, { ...map.get(j.id), ...j })
        return [...map.values()]
      })
    const load = () =>
      fetch('/api/jobs').then((r) => r.json()).then(setJobs).catch(() => {})
    load()
    const es = new EventSource('/api/events')
    es.onopen = load // resync after reconnect
    es.onmessage = (e) => {
      try { merge(JSON.parse(e.data)) } catch { /* ignore non-JSON keepalives */ }
    }
    return () => es.close()
  }, [])

  const add = (j: Job[]) => setJobs((p) => [...p, ...j.filter((n) => !p.some((o) => o.id === n.id))])
  const remove = (id: string) => setJobs((p) => p.filter((j) => j.id !== id))
  return { jobs, add, remove }
}
