// İBB Açık Veri (CKAN) üzerinde veri seti ve kaynak çözümlemesi; slug değişirse aramaya düşer.

import { fetchJson } from './http'
import { normalizeName } from './normalize'
import { info, warn } from './log'

const API = 'https://data.ibb.gov.tr/api/3/action'

export interface CkanResource {
  id: string
  name: string
  format: string
  url: string
}

export interface CkanPackage {
  id: string
  name: string
  title: string
  resources: CkanResource[]
}

interface CkanEnvelope<T> {
  success: boolean
  result: T
}

async function packageShow(slug: string): Promise<CkanPackage | null> {
  try {
    const body = await fetchJson<CkanEnvelope<CkanPackage>>(
      `${API}/package_show?id=${encodeURIComponent(slug)}`,
      { retries: 2 },
    )
    return body.success ? body.result : null
  } catch {
    return null
  }
}

async function packageSearch(query: string): Promise<CkanPackage[]> {
  const body = await fetchJson<CkanEnvelope<{ results: CkanPackage[] }>>(
    `${API}/package_search?rows=20&q=${encodeURIComponent(query)}`,
  )
  return body.success ? body.result.results : []
}

export async function resolvePackage(slugs: string[], query: string): Promise<CkanPackage> {
  for (const slug of slugs) {
    const found = await packageShow(slug)
    if (found) {
      info(`CKAN veri seti: ${found.title} (${found.name})`)
      return found
    }
  }

  warn(`Slug bulunamadı (${slugs.join(', ')}), aramaya düşülüyor: "${query}"`)
  const results = await packageSearch(query)
  const first = results[0]
  if (!first) {
    throw new Error(`CKAN veri seti bulunamadı: ${query}`)
  }
  info(`CKAN arama sonucu: ${first.title} (${first.name})`)
  return first
}

export function pickResource(
  pkg: CkanPackage,
  formats: string[],
  nameHint?: string,
): CkanResource {
  const wanted = formats.map((format) => format.toLowerCase())
  const candidates = pkg.resources.filter((resource) =>
    wanted.includes((resource.format ?? '').toLowerCase()),
  )

  if (candidates.length === 0) {
    throw new Error(
      `${pkg.name} içinde ${formats.join('/')} kaynağı yok (mevcut: ${pkg.resources
        .map((resource) => resource.format)
        .join(', ')})`,
    )
  }

  if (nameHint) {
    const hint = normalizeName(nameHint)
    const preferred = candidates.find((resource) => normalizeName(resource.name ?? '').includes(hint))
    if (preferred) return preferred
  }

  return candidates[0] as CkanResource
}
