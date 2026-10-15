export type Format = "mp3" | "mp4";
export type JobStatus = "queued" | "downloading" | "done" | "failed";

export interface Job {
  id: string;
  url: string;
  format: Format;
  status: JobStatus;
  progress: number; // 0-100
  title?: string;
  file?: string;
  error?: string;
  createdAt: number;
}
