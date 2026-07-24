// Ingest adımları için tek biçimli, adım numaralı konsol günlüğü.

const started = Date.now()

function stamp(): string {
  const seconds = ((Date.now() - started) / 1000).toFixed(1)
  return `[${seconds.padStart(6)}s]`
}

export function step(title: string): void {
  console.log(`\n${stamp()} ▸ ${title}`)
}

export function info(message: string): void {
  console.log(`${stamp()}   ${message}`)
}

export function ok(message: string): void {
  console.log(`${stamp()}   ✓ ${message}`)
}

export function warn(message: string): void {
  console.warn(`${stamp()}   ! ${message}`)
}

export function fail(message: string): void {
  console.error(`${stamp()}   ✗ ${message}`)
}
