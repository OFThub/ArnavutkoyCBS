// public/data/manifest.json kaydını okuyup tek tek ingest adımlarının çıktısıyla günceller.

import { readOutput, writeOutput } from './paths'

export interface DatasetEntry {
  file: string
  count: number
  source: string
  bytes: number
  generatedAt: string
}

export interface DataManifest {
  version: string
  generatedAt: string
  district: string
  datasets: Record<string, DatasetEntry>
}

function stamp(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
}

export async function recordDataset(
  key: string,
  entry: Omit<DatasetEntry, 'generatedAt'>,
): Promise<void> {
  const now = stamp()
  const existing = await readOutput<DataManifest>('manifest.json')

  const manifest: DataManifest = {
    version: now,
    generatedAt: now,
    district: 'Arnavutköy',
    datasets: { ...(existing?.datasets ?? {}) },
  }

  manifest.datasets[key] = { ...entry, generatedAt: now }
  await writeOutput('manifest.json', manifest)
}

export async function readManifest(): Promise<DataManifest | null> {
  return readOutput<DataManifest>('manifest.json')
}
