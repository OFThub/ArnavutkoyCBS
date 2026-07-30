// DEV mode örnek verileri: kurumsal (Supabase) katmanların gerçek veri gelmediği durumlarda gösterilecek sahte kayıtlar.
// Anahtar, kurumsal.ts içindeki katman kimliğidir (spec.id); değer, supabaseLayer.ts'in beklediği ham satır dizisidir.

import type { Position } from 'geojson'
import { DISTRICT } from '../config/district'

type Row = Record<string, unknown>

const [CENTER_LNG, CENTER_LAT] = DISTRICT.center

function offset(dLng: number, dLat: number): [number, number] {
  return [CENTER_LNG + dLng, CENTER_LAT + dLat]
}

function square(dLng: number, dLat: number, half: number): Position[] {
  const [cx, cy] = offset(dLng, dLat)
  return [
    [cx - half, cy - half],
    [cx + half, cy - half],
    [cx + half, cy + half],
    [cx - half, cy + half],
    [cx - half, cy - half],
  ]
}

let seq = 0
function nextId(prefix: string): string {
  seq += 1
  return `${prefix}-demo-${seq}`
}

const IMAR_LEKESI: Row[] = [
  { fonksiyon: 'konut', taks: 0.35, kaks: 1.8, hmax: 21.5, geom: { type: 'Polygon', coordinates: [square(-0.02, 0.02, 0.004)] } },
  { fonksiyon: 'ticaret', taks: 0.4, kaks: 2.4, hmax: 27.5, geom: { type: 'Polygon', coordinates: [square(-0.008, 0.02, 0.004)] } },
  { fonksiyon: 'sanayi', taks: 0.5, kaks: 1.2, hmax: 12.5, geom: { type: 'Polygon', coordinates: [square(0.006, 0.02, 0.005)] } },
  { fonksiyon: 'egitim', taks: 0.3, kaks: 1.0, hmax: 15.5, geom: { type: 'Polygon', coordinates: [square(-0.02, 0.008, 0.0035)] } },
  { fonksiyon: 'saglik', taks: 0.3, kaks: 1.2, hmax: 18.5, geom: { type: 'Polygon', coordinates: [square(-0.008, 0.008, 0.0035)] } },
  { fonksiyon: 'yesil-alan', taks: 0.05, kaks: 0.1, hmax: 6.5, geom: { type: 'Polygon', coordinates: [square(0.006, 0.008, 0.0045)] } },
  { fonksiyon: 'tarim', taks: 0.02, kaks: 0.05, hmax: 6.5, geom: { type: 'Polygon', coordinates: [square(0.02, 0.008, 0.006)] } },
].map((row) => ({ id: nextId('imar-lekesi'), ...row }))

const IMAR_UYGULAMA_ALANI: Row[] = [
  {
    ad: 'Demo 18. Madde Uygulama Alanı 1',
    uygulama_turu: '18. madde',
    encumen_karar_no: '2026/DEMO-14',
    karar_tarihi: '2026-03-10',
    durum: 'devam',
    geom: { type: 'Polygon', coordinates: [square(-0.03, -0.01, 0.005)] },
  },
  {
    ad: 'Demo 18. Madde Uygulama Alanı 2',
    uygulama_turu: '18. madde',
    encumen_karar_no: '2026/DEMO-27',
    karar_tarihi: '2026-05-22',
    durum: 'tamamlandi',
    geom: { type: 'Polygon', coordinates: [square(-0.015, -0.01, 0.005)] },
  },
].map((row) => ({ id: nextId('imar-uygulama-alani'), ...row }))

const NUMARATAJ: Row[] = Array.from({ length: 10 }, (_, index) => ({
  id: nextId('numarataj'),
  csbm: 'Demo Caddesi',
  kapi_no: String(index * 2 + 1),
  bagimsiz_bolum: null,
  uavt_kod: `999${String(index).padStart(4, '0')}`,
  geom: { type: 'Point', coordinates: offset(0.001 * index - 0.01, -0.02) },
}))

const YOL_RAYIC: Row[] = [
  { cadde_sokak: 'Demo Caddesi', yil: 2026, rayic_tl_m2: 8500, geom: { type: 'LineString', coordinates: [offset(-0.012, -0.02), offset(0.006, -0.02)] } },
  { cadde_sokak: 'Örnek Sokak', yil: 2026, rayic_tl_m2: 12500, geom: { type: 'LineString', coordinates: [offset(-0.02, -0.015), offset(-0.02, -0.005)] } },
  { cadde_sokak: 'Numune Bulvarı', yil: 2026, rayic_tl_m2: 15800, geom: { type: 'LineString', coordinates: [offset(0.01, -0.025), offset(0.026, -0.012)] } },
  { cadde_sokak: 'Test Meydanı Yolu', yil: 2025, rayic_tl_m2: 6200, geom: { type: 'LineString', coordinates: [offset(-0.03, -0.028), offset(-0.018, -0.03)] } },
].map((row) => ({ id: nextId('yol-rayic'), ...row }))

const FEN_ISLERI: Row[] = [
  { kurum: 'İSKİ', baslangic: '2026-06-01', bitis: '2026-08-15', durum: 'devam', aciklama: 'Demo içmesuyu hattı yenileme çalışması', geom: { type: 'LineString', coordinates: [offset(0.012, 0.03), offset(0.024, 0.026)] } },
  { kurum: 'İGDAŞ', baslangic: '2026-07-10', bitis: '2026-07-25', durum: 'planlandi', aciklama: 'Demo doğalgaz bakım çalışması', geom: { type: 'LineString', coordinates: [offset(-0.024, 0.03), offset(-0.012, 0.032)] } },
].map((row) => ({ id: nextId('fen-isleri'), ...row }))

const PROJELER: Row[] = [
  { ad: 'Demo Kültür Merkezi', tur: 'Sosyal tesis', durum: 'planlandi', baslangic: '2026-09-01', bitis: '2027-06-30', yuklenici: 'Örnek İnşaat A.Ş.', geom: { type: 'Polygon', coordinates: [square(0.03, 0.03, 0.004)] } },
  { ad: 'Demo Yol Genişletme', tur: 'Altyapı', durum: 'devam', baslangic: '2026-02-01', bitis: '2026-12-31', yuklenici: 'Numune Yapı Ltd.', geom: { type: 'Polygon', coordinates: [square(0.042, 0.02, 0.004)] } },
  { ad: 'Demo Park Yenileme', tur: 'Yeşil alan', durum: 'tamamlandi', baslangic: '2025-04-01', bitis: '2025-10-01', yuklenici: 'Deneme Peyzaj', geom: { type: 'Polygon', coordinates: [square(0.03, 0.01, 0.004)] } },
].map((row) => ({ id: nextId('proje'), ...row }))

const ZEMIN_ETUT: Row[] = [
  { rapor_no: 'ZE-DEMO-01', etut_tarihi: '2026-01-15', zemin_sinifi: 'ZC', tasima_gucu_kpa: 180, sivilasma_riski: 'yok', geom: { type: 'Point', coordinates: offset(-0.035, 0.01) } },
  { rapor_no: 'ZE-DEMO-02', etut_tarihi: '2026-02-10', zemin_sinifi: 'ZD', tasima_gucu_kpa: 120, sivilasma_riski: 'dusuk', geom: { type: 'Point', coordinates: offset(-0.03, 0.014) } },
  { rapor_no: 'ZE-DEMO-03', etut_tarihi: '2026-03-05', zemin_sinifi: 'ZD', tasima_gucu_kpa: 95, sivilasma_riski: 'orta', geom: { type: 'Point', coordinates: offset(-0.025, 0.01) } },
  { rapor_no: 'ZE-DEMO-04', etut_tarihi: '2026-04-20', zemin_sinifi: 'ZE', tasima_gucu_kpa: 60, sivilasma_riski: 'yuksek', geom: { type: 'Point', coordinates: offset(-0.02, 0.014) } },
].map((row) => ({ id: nextId('zemin-etut'), ...row }))

const TOPLANMA_ALANI: Row[] = [
  { ad: 'Demo Toplanma Alanı 1', kapasite_kisi: 1200, alan_m2: 4500, geom: { type: 'Polygon', coordinates: [square(0.015, -0.005, 0.005)] } },
  { ad: 'Demo Toplanma Alanı 2', kapasite_kisi: 800, alan_m2: 3000, geom: { type: 'Polygon', coordinates: [square(0.03, -0.005, 0.0045)] } },
].map((row) => ({ id: nextId('toplanma-alani'), ...row }))

const ASKIDAKI_IMAR_PLANI: Row[] = [
  {
    fonksiyon: 'ticaret-konut',
    taks: 0.4,
    kaks: 2.0,
    hmax: 24.5,
    imar_plani: { ad: 'Demo Nazım İmar Planı Revizyonu', durum: 'askida', aski_bitis: '2026-08-30' },
    geom: { type: 'Polygon', coordinates: [square(-0.045, 0.0, 0.004)] },
  },
  {
    fonksiyon: 'resmi-kurum',
    taks: 0.35,
    kaks: 1.4,
    hmax: 15.5,
    imar_plani: { ad: 'Demo Uygulama İmar Planı Değişikliği', durum: 'askida', aski_bitis: '2026-09-15' },
    geom: { type: 'Polygon', coordinates: [square(-0.045, -0.012, 0.004)] },
  },
].map((row) => ({ id: nextId('askidaki-imar-plani'), ...row }))

export const DEV_DEMO_DATA: Record<string, Row[]> = {
  'imar-lekesi': IMAR_LEKESI,
  'imar-uygulama-alani': IMAR_UYGULAMA_ALANI,
  numarataj: NUMARATAJ,
  'yol-rayic': YOL_RAYIC,
  'fen-isleri': FEN_ISLERI,
  projeler: PROJELER,
  'zemin-etut': ZEMIN_ETUT,
  'toplanma-alani': TOPLANMA_ALANI,
  'askidaki-imar-plani': ASKIDAKI_IMAR_PLANI,
}
