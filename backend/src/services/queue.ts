import { Queue, Worker } from 'bullmq'
import IORedis from 'ioredis'
import { sendAccessKeyEmail, sendResultEmail } from './email'

let emailQueue: Queue | null = null

export function getEmailQueue(): Queue | null {
  return emailQueue
}

export function initQueue(): void {
  if (!process.env.REDIS_URL) {
    console.warn('REDIS_URL not set — email queue disabled')
    return
  }

  const connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })

  emailQueue = new Queue('emails', { connection })

  const worker = new Worker(
    'emails',
    async (job) => {
      if (job.name === 'access_key') {
        await sendAccessKeyEmail(job.data.to, job.data.name, job.data.accessKey)
      } else if (job.name === 'result') {
        await sendResultEmail(job.data.to, job.data.name, job.data.testTitle, job.data.score, job.data.passFail)
      }
    },
    { connection }
  )

  worker.on('failed', (job, err) => {
    console.error(`Email job ${job?.id} failed:`, err.message)
  })

  console.log('Email queue initialized')
}

export async function enqueueEmail(name: string, data: Record<string, unknown>): Promise<void> {
  if (emailQueue) {
    await emailQueue.add(name, data, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } })
  }
}
