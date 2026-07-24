// Ingest hattının dosya yolları ve ham indirme önbelleği ile çıktı yazma yardımcıları.

import { mkdir, readFile, writeFile, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

export const ROOT = resolve(here, '../../..')
export const RAW_DIR = resolve(ROOT, 'data/raw')
export const OUT_DIR = resolve(ROOT, 'public/data')

export const FRESH = process.argv.includes('--fresh')

export function isMain(moduleUrl: string): boolean {
  const entry = process.argv[1]
  return entry ? moduleUrl === pathToFileURL(entry).href : false
}

export async function runAsScript(moduleUrl: string, run: () => Promise<void>): Promise<void> {
  if (!isMain(moduleUrl)) return
  try {
    await run()
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}

export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true })
}

export async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

export async function cacheRaw(name: string, produce: () => Promise<Buffer>): Promise<Buffer> {
  await ensureDir(RAW_DIR)
  const path = resolve(RAW_DIR, name)
  if (!FRESH && (await exists(path))) {
    return readFile(path)
  }
  const buffer = await produce()
  await writeFile(path, buffer)
  return buffer
}

export async function writeOutput(file: string, value: unknown): Promise<number> {
  await ensureDir(OUT_DIR)
  const path = resolve(OUT_DIR, file)
  const body = JSON.stringify(value)
  await writeFile(path, body, 'utf8')
  return Buffer.byteLength(body, 'utf8')
}

export async function readOutput<T>(file: string): Promise<T | null> {
  const path = resolve(OUT_DIR, file)
  if (!(await exists(path))) return null
  return JSON.parse(await readFile(path, 'utf8')) as T
}
