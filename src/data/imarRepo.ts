// İmar planı / lekesi / tesisi için Supabase okuma-yazma katmanı.
// Geometri yazarken EWKT kullanılır (core/imar.toEwkt); okurken PostgREST GeoJSON döner.

import type { MultiPolygon, Polygon } from 'geojson'
import { supabase } from '../lib/supabase'
import type { Satir } from '../core/imar'

export interface PlanKaydi {
  id: number
  ad: string
  olcek: string
  durum: string
  onay_tarihi: string | null
  aski_baslangic: string | null
  aski_bitis: string | null
}

export interface LekeKaydi {
  id: number
  plan_id: number
  fonksiyon: string
  taks: number | null
  kaks: number | null
  hmax: number | null
  kat_adedi: number | null
  yapi_nizami: string | null
  ada: string | null
  parsel: string | null
  plan_notu: string | null
  geom: Polygon | MultiPolygon | null
}

export interface TesisKaydi {
  id: number
  leke_id: number
  tur: string
  ad: string | null
  alan_m2: number | null
  kapasite: number | null
  durum: string
  yil: number | null
  aciklama: string | null
  geom: Polygon | null
}

const PLAN_SELECT = 'id, ad, olcek, durum, onay_tarihi, aski_baslangic, aski_bitis'
const LEKE_SELECT =
  'id, plan_id, fonksiyon, taks, kaks, hmax, kat_adedi, yapi_nizami, ada, parsel, plan_notu, geom'
const TESIS_SELECT = 'id, leke_id, tur, ad, alan_m2, kapasite, durum, yil, aciklama, geom'

export class BackendYokHatasi extends Error {
  constructor() {
    super('Sunucu bağlantısı yapılandırılmadı. .env içindeki VITE_SUPABASE_* değerlerini doldurun.')
    this.name = 'BackendYokHatasi'
  }
}

function istemci() {
  if (!supabase) throw new BackendYokHatasi()
  return supabase
}

/** PostGIS sütunu GeoJSON olarak gelmezse (hex WKB) geometri yok sayılır; bozuk çizim yapmaktansa boş bırakılır. */
function alanGeometrisi(value: unknown): Polygon | MultiPolygon | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as { type?: unknown; coordinates?: unknown }
  if (candidate.type !== 'Polygon' && candidate.type !== 'MultiPolygon') return null
  if (!Array.isArray(candidate.coordinates)) return null
  return value as Polygon | MultiPolygon
}

function poligon(value: unknown): Polygon | null {
  const geometry = alanGeometrisi(value)
  return geometry?.type === 'Polygon' ? geometry : null
}

// ─────────────────────────── imar planı ───────────────────────────

export async function listPlanlar(): Promise<PlanKaydi[]> {
  const { data, error } = await istemci()
    .from('imar_plani')
    .select(PLAN_SELECT)
    .order('ad', { ascending: true })
  if (error) throw new Error(`İmar planları okunamadı: ${error.message}`)
  return (data ?? []) as unknown as PlanKaydi[]
}

export async function createPlan(row: Satir): Promise<PlanKaydi> {
  const { data, error } = await istemci()
    .from('imar_plani')
    .insert(row)
    .select(PLAN_SELECT)
    .single()
  if (error) throw new Error(`Plan kaydedilemedi: ${error.message}`)
  return data as unknown as PlanKaydi
}

export async function updatePlan(id: number, row: Satir): Promise<void> {
  const { error } = await istemci().from('imar_plani').update(row).eq('id', id)
  if (error) throw new Error(`Plan güncellenemedi: ${error.message}`)
}

export async function deletePlan(id: number): Promise<void> {
  const { error } = await istemci().from('imar_plani').delete().eq('id', id)
  if (error) throw new Error(`Plan silinemedi: ${error.message}`)
}

// ─────────────────────────── imar lekesi ───────────────────────────

export async function listLekeler(planId: number): Promise<LekeKaydi[]> {
  const { data, error } = await istemci()
    .from('imar_lekesi')
    .select(LEKE_SELECT)
    .eq('plan_id', planId)
    .order('id', { ascending: true })
  if (error) throw new Error(`İmar lekeleri okunamadı: ${error.message}`)

  return (data ?? []).map((row) => {
    const record = row as unknown as LekeKaydi
    return { ...record, geom: alanGeometrisi(record.geom) }
  })
}

export async function createLeke(row: Satir): Promise<number> {
  const { data, error } = await istemci().from('imar_lekesi').insert(row).select('id').single()
  if (error) throw new Error(`İmar lekesi kaydedilemedi: ${error.message}`)
  return (data as { id: number }).id
}

export async function updateLeke(id: number, row: Satir): Promise<void> {
  const { error } = await istemci().from('imar_lekesi').update(row).eq('id', id)
  if (error) throw new Error(`İmar lekesi güncellenemedi: ${error.message}`)
}

export async function deleteLeke(id: number): Promise<void> {
  const { error } = await istemci().from('imar_lekesi').delete().eq('id', id)
  if (error) throw new Error(`İmar lekesi silinemedi: ${error.message}`)
}

// ─────────────────────────── imar tesisi ───────────────────────────

export async function listTesisler(lekeIds: number[]): Promise<TesisKaydi[]> {
  if (lekeIds.length === 0) return []
  const { data, error } = await istemci()
    .from('imar_tesisi')
    .select(TESIS_SELECT)
    .in('leke_id', lekeIds)
    .order('id', { ascending: true })
  if (error) throw new Error(`İmar tesisleri okunamadı: ${error.message}`)

  return (data ?? []).map((row) => {
    const record = row as unknown as TesisKaydi
    return { ...record, geom: poligon(record.geom) }
  })
}

export async function createTesis(row: Satir): Promise<number> {
  const { data, error } = await istemci().from('imar_tesisi').insert(row).select('id').single()
  if (error) throw new Error(`Tesis kaydedilemedi: ${error.message}`)
  return (data as { id: number }).id
}

export async function updateTesis(id: number, row: Satir): Promise<void> {
  const { error } = await istemci().from('imar_tesisi').update(row).eq('id', id)
  if (error) throw new Error(`Tesis güncellenemedi: ${error.message}`)
}

export async function deleteTesis(id: number): Promise<void> {
  const { error } = await istemci().from('imar_tesisi').delete().eq('id', id)
  if (error) throw new Error(`Tesis silinemedi: ${error.message}`)
}
