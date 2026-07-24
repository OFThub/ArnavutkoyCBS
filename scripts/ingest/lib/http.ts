// Üstel geri çekilmeli, yönlendirme izleyen ve kullanım politikalarına saygılı build-time HTTP istemcisi.

import { warn } from './log'

export const USER_AGENT =
  'ArnavutkoyCBS/0.1 (Arnavutkoy Belediyesi CBS veri hatti; iletisim: cbs@arnavutkoy.bel.tr)'

export interface RequestOptions {
  retries?: number
  timeoutMs?: number
  headers?: Record<string, string>
}

const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504])

export class KaliciHataError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'KaliciHataError'
    this.status = status
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function retryDelay(attempt: number, response: Response | null): number {
  const header = response?.headers.get('retry-after')
  if (header) {
    const seconds = Number(header)
    if (Number.isFinite(seconds)) return Math.min(seconds * 1000, 60_000)
  }
  return Math.min(1000 * 2 ** attempt, 30_000)
}

export async function request(url: string, options: RequestOptions = {}): Promise<Response> {
  const retries = options.retries ?? 4
  const timeoutMs = options.timeoutMs ?? 60_000

  let lastError: unknown = null

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'user-agent': USER_AGENT, ...options.headers },
      })
      if (response.ok) return response
      if (!RETRYABLE.has(response.status)) {
        throw new KaliciHataError(
          `HTTP ${response.status} ${response.statusText} — ${url}`,
          response.status,
        )
      }
      if (attempt === retries) {
        throw new Error(`HTTP ${response.status} ${response.statusText} — ${url}`)
      }
      const delay = retryDelay(attempt, response)
      warn(`HTTP ${response.status}, ${delay} ms sonra yeniden denenecek — ${url}`)
      await sleep(delay)
    } catch (error) {
      if (error instanceof KaliciHataError) throw error
      lastError = error
      if (attempt === retries) break
      const delay = retryDelay(attempt, null)
      warn(`İstek başarısız (${String(error)}), ${delay} ms sonra yeniden denenecek`)
      await sleep(delay)
    } finally {
      clearTimeout(timer)
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`İstek başarısız — ${url}`)
}

export async function fetchBuffer(url: string, options?: RequestOptions): Promise<Buffer> {
  const response = await request(url, options)
  return Buffer.from(await response.arrayBuffer())
}

export async function fetchText(url: string, options?: RequestOptions): Promise<string> {
  const response = await request(url, options)
  return response.text()
}

export async function fetchJson<T>(url: string, options?: RequestOptions): Promise<T> {
  const response = await request(url, { ...options, headers: { accept: 'application/json', ...options?.headers } })
  const text = await response.text()
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`JSON beklenirken farklı içerik geldi (${text.slice(0, 120)}…) — ${url}`)
  }
}

export function politeDelay(ms: number): Promise<void> {
  return sleep(ms)
}
