// İmar plan verisinin saf alanı: sözlükler, koordinat ayrıştırma, geometri dönüşümü ve satır hazırlama.
// Haritadan ve Supabase'den bağımsız tutulur ki tamamı testten geçebilsin.

import { area, booleanIntersects, booleanWithin } from '@turf/turf'
import type { Feature, Geometry, MultiPolygon, Polygon, Position } from 'geojson'
import { parseCoordinate } from './coords'

export type LngLatPair = [number, number]

export interface Secenek {
  value: string
  label: string
}

/** İmar plan lejandı renk kodu (Mekânsal Planlar Yapım Yönetmeliği). */
export const IMAR_RENKLERI: Record<string, string> = {
  konut: '#e8c95a',
  ticaret: '#d9534f',
  'ticaret-konut': '#e07b5a',
  sanayi: '#9b6fb0',
  'resmi-kurum': '#8aa2c0',
  egitim: '#f0a94a',
  saglik: '#e86a6a',
  'dini-tesis': '#b08968',
  'sosyal-kulturel': '#c77dff',
  'yesil-alan': '#6E8B3D',
  park: '#4d9c52',
  rekreasyon: '#7fbf7f',
  spor: '#3fa7a0',
  mezarlik: '#7a8b7a',
  tarim: '#c8d68a',
  orman: '#3f7a3f',
  su: '#2E6E8E',
  yol: '#9ca3af',
  otopark: '#6b7280',
}

export const IMAR_FONKSIYONLARI: Secenek[] = [
  { value: 'konut', label: 'Konut' },
  { value: 'ticaret', label: 'Ticaret' },
  { value: 'ticaret-konut', label: 'Ticaret + konut (TİCK)' },
  { value: 'sanayi', label: 'Sanayi' },
  { value: 'resmi-kurum', label: 'Resmî kurum' },
  { value: 'egitim', label: 'Eğitim tesisi' },
  { value: 'saglik', label: 'Sağlık tesisi' },
  { value: 'dini-tesis', label: 'Dini tesis' },
  { value: 'sosyal-kulturel', label: 'Sosyal / kültürel tesis' },
  { value: 'yesil-alan', label: 'Yeşil alan' },
  { value: 'park', label: 'Park' },
  { value: 'rekreasyon', label: 'Rekreasyon' },
  { value: 'spor', label: 'Spor alanı' },
  { value: 'mezarlik', label: 'Mezarlık' },
  { value: 'tarim', label: 'Tarım alanı' },
  { value: 'orman', label: 'Orman' },
  { value: 'su', label: 'Su yüzeyi' },
  { value: 'yol', label: 'Yol / ulaşım' },
  { value: 'otopark', label: 'Otopark' },
]

export const YAPI_NIZAMLARI: Secenek[] = [
  { value: 'ayrik', label: 'Ayrık nizam' },
  { value: 'bitisik', label: 'Bitişik nizam' },
  { value: 'blok', label: 'Blok nizam' },
  { value: 'ikiz', label: 'İkiz nizam' },
]

export const PLAN_DURUMLARI: Secenek[] = [
  { value: 'taslak', label: 'Taslak' },
  { value: 'askida', label: 'Askıda' },
  { value: 'yururlukte', label: 'Yürürlükte' },
  { value: 'iptal', label: 'İptal' },
]

export const TESIS_TURLERI: Secenek[] = [
  { value: 'cami', label: 'Cami' },
  { value: 'okul', label: 'Okul' },
  { value: 'anaokulu', label: 'Anaokulu / kreş' },
  { value: 'saglik-ocagi', label: 'Sağlık ocağı / ASM' },
  { value: 'hastane', label: 'Hastane' },
  { value: 'park', label: 'Park' },
  { value: 'cocuk-bahcesi', label: 'Çocuk bahçesi' },
  { value: 'spor-tesisi', label: 'Spor tesisi' },
  { value: 'kultur-merkezi', label: 'Kültür merkezi' },
  { value: 'kutuphane', label: 'Kütüphane' },
  { value: 'pazar-yeri', label: 'Pazar yeri' },
  { value: 'otopark', label: 'Otopark' },
  { value: 'itfaiye', label: 'İtfaiye' },
  { value: 'muhtarlik', label: 'Muhtarlık' },
  { value: 'belediye-hizmet', label: 'Belediye hizmet binası' },
  { value: 'trafo', label: 'Trafo / teknik altyapı' },
  { value: 'diger', label: 'Diğer' },
]

export const TESIS_RENKLERI: Record<string, string> = {
  cami: '#b08968',
  okul: '#f0a94a',
  anaokulu: '#f4c07a',
  'saglik-ocagi': '#e86a6a',
  hastane: '#C8402F',
  park: '#4d9c52',
  'cocuk-bahcesi': '#7fbf7f',
  'spor-tesisi': '#3fa7a0',
  'kultur-merkezi': '#c77dff',
  kutuphane: '#9b6fb0',
  'pazar-yeri': '#D9A02B',
  otopark: '#6b7280',
  itfaiye: '#d9534f',
  muhtarlik: '#8aa2c0',
  'belediye-hizmet': '#2E6E8E',
  trafo: '#7a5c3a',
  diger: '#a8a29e',
}

// Etiketler kısa tutulur: haritada çizimin üstünde de, formda da aynısı kullanılıyor.
// "Yapıldı mı yapılacak mı" ayrımını yıl kutusunun başlığı taşıyor (bkz. yilEtiketi).
export const TESIS_DURUMLARI: Secenek[] = [
  { value: 'mevcut', label: 'Mevcut' },
  { value: 'yapim_asamasinda', label: 'Yapım aşamasında' },
  { value: 'planlanan', label: 'Planlanan' },
  { value: 'iptal', label: 'İptal' },
]

export const TESIS_DURUM_RENKLERI: Record<string, string> = {
  mevcut: '#6E8B3D',
  yapim_asamasinda: '#D9A02B',
  planlanan: '#8aa2c0',
  iptal: '#a8a29e',
}

/** `yil` alanının etiketi duruma göre değişir: geçmiş yapım yılı mı, hedef yıl mı. */
export function yilEtiketi(durum: string): string {
  return durum === 'planlanan' ? 'Hedef yıl' : 'Yapım yılı'
}

// ─────────────────────────── harita etiketi ifadeleri ───────────────────────────
// Etiketler haritada çizimin üstünde okunur; `null` gelen alanlar satırdan tamamen düşmeli,
// aksi halde " · m²" gibi yarım parçalar görünürdü.

/** Slug alanını insan okunur etikete çeviren MapLibre `match` ifadesi. */
export function etiketIfadesi(field: string, secenekler: Secenek[]): unknown {
  const expr: unknown[] = ['match', ['get', field]]
  for (const item of secenekler) expr.push(item.value, item.label)
  expr.push(['to-string', ['coalesce', ['get', field], '']])
  return expr
}

/** `to-number(..., 0)` sayı olmayan/boş değeri 0'a düşürür; 0 ise ek hiç yazılmaz. */
function sayisal(field: string): unknown {
  return ['to-number', ['get', field], 0]
}

/** Ondalık sayı eki: `· E:1.8`. Değer yoksa boş metin. */
export function sayiEki(field: string, onek: string, sonek = ''): unknown {
  const deger = sayisal(field)
  return ['case', ['>', deger, 0], ['concat', onek, ['to-string', deger], sonek], '']
}

/** Tam sayı eki: `· 1200 m²`, `· 2027`. Değer yoksa boş metin. */
export function tamSayiEki(field: string, onek: string, sonek = ''): unknown {
  const deger = sayisal(field)
  return ['case', ['>', deger, 0], ['concat', onek, ['to-string', ['round', deger]], sonek], '']
}

/** Metin eki; alan boş ya da null ise hiç yazılmaz. */
export function metinEki(field: string, onek: string): unknown {
  const deger: unknown = ['to-string', ['coalesce', ['get', field], '']]
  return ['case', ['!=', deger, ''], ['concat', onek, deger], '']
}

export function etiketBul(secenekler: Secenek[], value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value)
  return secenekler.find((item) => item.value === text)?.label ?? text
}

// ─────────────────────────── sayı ve koordinat ayrıştırma ───────────────────────────

/** Boş metin `null` döner; Türkçe klavyeden gelen ondalık virgül kabul edilir. */
export function sayi(text: string): number | null {
  const trimmed = text.trim().replace(',', '.')
  if (trimmed === '') return null
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}

export function tamSayi(text: string): number | null {
  const value = sayi(text)
  return value === null ? null : Math.round(value)
}

export function gecerliEnlem(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90
}

export function gecerliBoylam(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180
}

/** Köşe tablosundaki tek satır: ayrı enlem/boylam kutuları. Geçersizse `null`. */
export function parseVertex(lat: string, lng: string): LngLatPair | null {
  const enlem = sayi(lat)
  const boylam = sayi(lng)
  if (enlem === null || boylam === null) return null
  if (!gecerliEnlem(enlem) || !gecerliBoylam(boylam)) return null
  return [boylam, enlem]
}

export interface VertexListSonuc {
  vertices: LngLatPair[]
  hataliSatirlar: number[]
}

/**
 * Toplu yapıştırma: her satır bir koordinat. Ondalık derece ve DMS kabul edilir
 * (coords.parseCoordinate), böylece pafta çıktısı doğrudan yapıştırılabilir.
 */
export function parseVertexList(text: string): VertexListSonuc {
  const vertices: LngLatPair[] = []
  const hataliSatirlar: number[] = []

  text.split(/\r?\n/).forEach((line, index) => {
    const satir = line.trim()
    if (satir === '') return
    const parsed = parseCoordinate(satir.replace(/;/g, ','))
    if (!parsed) {
      hataliSatirlar.push(index + 1)
      return
    }
    vertices.push([parsed.lng, parsed.lat])
  })

  return { vertices, hataliSatirlar }
}

// ─────────────────────────── geometri dönüşümü ───────────────────────────

/** Poligon dış halkasından köşe listesi; kapanış noktası tekrar olduğu için atılır. */
export function polygonToVertices(geometry: Polygon | MultiPolygon): LngLatPair[] {
  const ring = geometry.type === 'Polygon' ? geometry.coordinates[0] : geometry.coordinates[0]?.[0]
  if (!ring || ring.length === 0) return []

  const pairs: LngLatPair[] = []
  for (const position of ring) {
    const [lng, lat] = position
    if (typeof lng !== 'number' || typeof lat !== 'number') continue
    pairs.push([lng, lat])
  }

  const first = pairs[0]
  const last = pairs[pairs.length - 1]
  if (pairs.length > 1 && first && last && first[0] === last[0] && first[1] === last[1]) {
    pairs.pop()
  }
  return pairs
}

/** En az üç köşe yoksa poligon kurulmaz; halka ilk noktayla kapatılır. */
export function verticesToPolygon(vertices: LngLatPair[]): Polygon | null {
  if (vertices.length < 3) return null
  const first = vertices[0]
  if (!first) return null
  return { type: 'Polygon', coordinates: [[...vertices, first]] }
}

export function toMultiPolygon(geometry: Polygon | MultiPolygon): MultiPolygon {
  if (geometry.type === 'MultiPolygon') return geometry
  return { type: 'MultiPolygon', coordinates: [geometry.coordinates] }
}

export function polygonFeature(geometry: Polygon): Feature<Polygon> {
  return { type: 'Feature', geometry, properties: {} }
}

/** m² cinsinden alan; geometri yoksa 0. */
export function polygonArea(geometry: Polygon | MultiPolygon | null): number {
  if (!geometry) return 0
  return area({ type: 'Feature', geometry, properties: {} } as Feature)
}

// ─────────────────────────── EWKT ───────────────────────────
// PostgREST gövdesindeki JSON, geometry sütununa PostGIS `geometry_in` ile yazılır;
// bu fonksiyon GeoJSON nesnesi kabul etmez ama EWKT'yi her sürümde kabul eder.
// Bu yüzden yazma yolunda geometri daima EWKT metnine çevrilir.

function coordText(position: Position): string | null {
  const [lng, lat] = position
  if (typeof lng !== 'number' || typeof lat !== 'number') return null
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null
  return `${lng} ${lat}`
}

function ringText(ring: Position[]): string | null {
  const parts: string[] = []
  for (const position of ring) {
    const text = coordText(position)
    if (text === null) return null
    parts.push(text)
  }
  return parts.length === 0 ? null : `(${parts.join(',')})`
}

function polygonText(rings: Position[][]): string | null {
  const parts: string[] = []
  for (const ring of rings) {
    const text = ringText(ring)
    if (text === null) return null
    parts.push(text)
  }
  return parts.length === 0 ? null : `(${parts.join(',')})`
}

/**
 * GeoJSON geometriyi `SRID=4326;…` EWKT metnine çevirir.
 * Desteklenmeyen tip veya bozuk koordinat için `null` döner — sessizce yarım veri yazılmaz.
 */
export function toEwkt(geometry: Geometry | null | undefined): string | null {
  if (!geometry) return null

  const body = ((): string | null => {
    switch (geometry.type) {
      case 'Point': {
        const text = coordText(geometry.coordinates)
        return text === null ? null : `POINT(${text})`
      }
      case 'MultiPoint': {
        const text = ringText(geometry.coordinates)
        return text === null ? null : `MULTIPOINT${text}`
      }
      case 'LineString': {
        const text = ringText(geometry.coordinates)
        return text === null ? null : `LINESTRING${text}`
      }
      case 'MultiLineString': {
        const text = polygonText(geometry.coordinates)
        return text === null ? null : `MULTILINESTRING${text}`
      }
      case 'Polygon': {
        const text = polygonText(geometry.coordinates)
        return text === null ? null : `POLYGON${text}`
      }
      case 'MultiPolygon': {
        const parts: string[] = []
        for (const rings of geometry.coordinates) {
          const text = polygonText(rings)
          if (text === null) return null
          parts.push(text)
        }
        return parts.length === 0 ? null : `MULTIPOLYGON(${parts.join(',')})`
      }
      default:
        return null
    }
  })()

  return body === null ? null : `SRID=4326;${body}`
}

// ─────────────────────────── kapsama doğrulaması ───────────────────────────

export type KapsamaSonucu = 'icinde' | 'kismen' | 'disarida'

function parcalar(geometry: Polygon | MultiPolygon): Feature<Polygon>[] {
  if (geometry.type === 'Polygon') return [polygonFeature(geometry)]
  return geometry.coordinates.map((coordinates) =>
    polygonFeature({ type: 'Polygon', coordinates }),
  )
}

/**
 * Tesis geometrisinin üst lekeye göre konumu.
 * MultiPolygon leke, parçalarına ayrılıp tek tek denenir — turf'ün booleanWithin'i
 * kapsayıcı olarak MultiPolygon'u güvenilir biçimde ele almıyor.
 */
export function kapsamaDurumu(
  tesis: Polygon,
  leke: Polygon | MultiPolygon | null | undefined,
): KapsamaSonucu {
  if (!leke) return 'disarida'
  const hedef = polygonFeature(tesis)
  const bolumler = parcalar(leke)
  if (bolumler.some((bolum) => booleanWithin(hedef, bolum))) return 'icinde'
  if (bolumler.some((bolum) => booleanIntersects(hedef, bolum))) return 'kismen'
  return 'disarida'
}

export const KAPSAMA_MESAJI: Record<KapsamaSonucu, string | null> = {
  icinde: null,
  kismen: 'Tesis üst imar lekesinin dışına taşıyor. Kaydedilir ama plan bütünlüğünü kontrol edin.',
  disarida: 'Tesis tamamen üst imar lekesinin dışında. Doğru lekeyi seçin ya da geometriyi düzeltin.',
}

// ─────────────────────────── satır hazırlama ───────────────────────────

export interface PlanGirdi {
  ad: string
  olcek: string
  onay_tarihi: string
  aski_baslangic: string
  aski_bitis: string
  durum: string
}

export interface LekeGirdi {
  fonksiyon: string
  taks: string
  kaks: string
  hmax: string
  kat_adedi: string
  yapi_nizami: string
  ada: string
  parsel: string
  plan_notu: string
}

export interface TesisGirdi {
  tur: string
  ad: string
  alan_m2: string
  kapasite: string
  durum: string
  yil: string
  aciklama: string
}

export type Satir = Record<string, unknown>

/** Boş metin sütunu satırdan tamamen düşer; `null` yazıp mevcut değeri silmek istemiyoruz. */
function metin(row: Satir, key: string, value: string): void {
  const trimmed = value.trim()
  if (trimmed !== '') row[key] = trimmed
}

function ondalik(row: Satir, key: string, value: string): void {
  const parsed = sayi(value)
  if (parsed !== null) row[key] = parsed
}

function tam(row: Satir, key: string, value: string): void {
  const parsed = tamSayi(value)
  if (parsed !== null) row[key] = parsed
}

export interface PlanHazirlik {
  row: Satir | null
  hata: string | null
}

export function planRow(girdi: PlanGirdi): PlanHazirlik {
  if (girdi.ad.trim() === '') return { row: null, hata: 'Plan adı zorunlu.' }
  if (girdi.olcek.trim() === '') return { row: null, hata: 'Plan ölçeği zorunlu.' }
  if (!PLAN_DURUMLARI.some((item) => item.value === girdi.durum)) {
    return { row: null, hata: 'Plan durumu geçersiz.' }
  }

  const row: Satir = { ad: girdi.ad.trim(), olcek: girdi.olcek.trim(), durum: girdi.durum }
  metin(row, 'onay_tarihi', girdi.onay_tarihi)
  metin(row, 'aski_baslangic', girdi.aski_baslangic)
  metin(row, 'aski_bitis', girdi.aski_bitis)
  return { row, hata: null }
}

export interface LekeHazirlik {
  row: Satir | null
  hata: string | null
}

export function lekeRow(
  girdi: LekeGirdi,
  planId: number | null,
  geometry: Polygon | null,
): LekeHazirlik {
  if (planId === null) return { row: null, hata: 'Önce bir imar planı seçin.' }
  if (girdi.fonksiyon.trim() === '') return { row: null, hata: 'Fonksiyon zorunlu.' }
  if (!geometry) return { row: null, hata: 'En az üç köşeli bir alan çizin.' }

  const ewkt = toEwkt(toMultiPolygon(geometry))
  if (ewkt === null) return { row: null, hata: 'Geometri okunamadı; köşe koordinatlarını kontrol edin.' }

  const row: Satir = { plan_id: planId, fonksiyon: girdi.fonksiyon.trim(), geom: ewkt }
  ondalik(row, 'taks', girdi.taks)
  ondalik(row, 'kaks', girdi.kaks)
  ondalik(row, 'hmax', girdi.hmax)
  tam(row, 'kat_adedi', girdi.kat_adedi)
  metin(row, 'yapi_nizami', girdi.yapi_nizami)
  metin(row, 'ada', girdi.ada)
  metin(row, 'parsel', girdi.parsel)
  metin(row, 'plan_notu', girdi.plan_notu)
  return { row, hata: null }
}

export interface TesisHazirlik {
  row: Satir | null
  hata: string | null
  uyari: string | null
}

export function tesisRow(
  girdi: TesisGirdi,
  lekeId: number | null,
  geometry: Polygon | null,
  lekeGeometry: Polygon | MultiPolygon | null,
): TesisHazirlik {
  if (lekeId === null) return { row: null, hata: 'Önce üst imar lekesini seçin.', uyari: null }
  if (girdi.tur.trim() === '') return { row: null, hata: 'Tesis türü zorunlu.', uyari: null }
  if (!TESIS_DURUMLARI.some((item) => item.value === girdi.durum)) {
    return { row: null, hata: 'Tesis durumu geçersiz.', uyari: null }
  }
  if (!geometry) return { row: null, hata: 'En az üç köşeli bir alan çizin.', uyari: null }

  const kapsama = kapsamaDurumu(geometry, lekeGeometry)
  if (kapsama === 'disarida') {
    return { row: null, hata: KAPSAMA_MESAJI.disarida, uyari: null }
  }

  const ewkt = toEwkt(geometry)
  if (ewkt === null) {
    return { row: null, hata: 'Geometri okunamadı; köşe koordinatlarını kontrol edin.', uyari: null }
  }

  const row: Satir = {
    leke_id: lekeId,
    tur: girdi.tur.trim(),
    durum: girdi.durum,
    geom: ewkt,
  }
  metin(row, 'ad', girdi.ad)
  tam(row, 'kapasite', girdi.kapasite)
  tam(row, 'yil', girdi.yil)
  metin(row, 'aciklama', girdi.aciklama)

  // Alan elle girilmediyse geometriden hesaplanır; personel her seferinde ölçmek zorunda kalmasın.
  const elle = sayi(girdi.alan_m2)
  row['alan_m2'] = elle !== null && elle > 0 ? elle : Number(polygonArea(geometry).toFixed(2))

  return { row, hata: null, uyari: KAPSAMA_MESAJI[kapsama] }
}
