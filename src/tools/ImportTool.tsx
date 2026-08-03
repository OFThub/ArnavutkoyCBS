// Veri içe aktarma: personelin GeoJSON dosyasını kurumsal bir tabloya toplu yazması.

import { useState } from 'react'
import { Alert, Button, Divider, FileInput, Select, Stack, Switch, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import type { Feature, FeatureCollection } from 'geojson'
import { toEwkt, toMultiPolygon } from '../core/imar'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/appStore'
import type { ToolModule } from './types'

interface Hedef {
  table: string
  label: string
  /** GeoJSON özelliğinden tabloya taşınacak sütunlar; gerisi yok sayılır. */
  columns: string[]
  zorunlu: string[]
  /** Sütun `geometry(MultiPolygon,…)` ise Polygon geometriler sarmalanmadan yazılamaz. */
  multiPolygon?: boolean
  /** Kayıt zaten varsa güncellenir; bu sütun çakışma anahtarıdır (ör. mahalle.uavt_kod). */
  upsertKey?: string
  /** Öznitelik güncellemesi geometri gerektirmez; geometrisiz kayıtlar atlanmaz. */
  geometrisizKabul?: boolean
}

const HEDEFLER: Hedef[] = [
  {
    table: 'mahalle',
    label: 'Mahalle nüfus / hane',
    columns: ['uavt_kod', 'ad', 'nufus', 'hane', 'veri_yili', 'nufus_kaynak'],
    zorunlu: ['uavt_kod'],
    upsertKey: 'uavt_kod',
    // Nüfus tablosu genelde geometrisiz gelir; mevcut mahalle geometrisi korunur.
    geometrisizKabul: true,
  },
  {
    table: 'imar_lekesi',
    label: 'İmar lekesi',
    columns: [
      'plan_id',
      'fonksiyon',
      'taks',
      'kaks',
      'hmax',
      'kat_adedi',
      'yapi_nizami',
      'ada',
      'parsel',
      'plan_notu',
    ],
    zorunlu: ['plan_id', 'fonksiyon'],
    multiPolygon: true,
  },
  {
    table: 'imar_tesisi',
    label: 'İmar tesisi (leke içi)',
    columns: ['leke_id', 'tur', 'ad', 'alan_m2', 'kapasite', 'durum', 'yil', 'aciklama'],
    zorunlu: ['leke_id', 'tur'],
  },
  {
    table: 'imar_uygulama_alani',
    label: 'İmar uygulama alanı',
    columns: ['ad', 'uygulama_turu', 'encumen_karar_no', 'karar_tarihi', 'durum', 'plan_id'],
    zorunlu: ['ad'],
    multiPolygon: true,
  },
  {
    table: 'proje',
    label: 'Proje',
    columns: ['ad', 'tur', 'durum', 'baslangic', 'bitis', 'yuklenici', 'butce_tl', 'aciklama'],
    zorunlu: ['ad'],
  },
  {
    table: 'zemin_etut',
    label: 'Zemin etüdü',
    columns: [
      'mahalle_uavt',
      'rapor_no',
      'etut_tarihi',
      'zemin_sinifi',
      'tasima_gucu_kpa',
      'yeralti_suyu_m',
      'sivilasma_riski',
    ],
    zorunlu: [],
  },
  {
    table: 'yol_rayic',
    label: 'Yol rayiç',
    columns: ['mahalle_uavt', 'cadde_sokak', 'yil', 'rayic_tl_m2'],
    zorunlu: ['cadde_sokak', 'yil', 'rayic_tl_m2'],
  },
  {
    table: 'toplanma_alani',
    label: 'Toplanma alanı',
    columns: ['mahalle_uavt', 'ad', 'kapasite_kisi', 'alan_m2'],
    zorunlu: ['ad'],
  },
  {
    table: 'kazi_ruhsat',
    label: 'Kazı ruhsatı (fen işleri)',
    columns: ['kurum', 'baslangic', 'bitis', 'durum', 'aciklama'],
    zorunlu: ['kurum', 'baslangic', 'bitis'],
  },
]

const BATCH = 500

interface Hazirlik {
  rows: Record<string, unknown>[]
  eksikZorunlu: number
  geometrisiz: number
}

export function prepareRows(features: Feature[], hedef: Hedef): Hazirlik {
  const rows: Record<string, unknown>[] = []
  let eksikZorunlu = 0
  let geometrisiz = 0

  for (const feature of features) {
    const geometry =
      hedef.multiPolygon && feature.geometry?.type === 'Polygon'
        ? toMultiPolygon(feature.geometry)
        : feature.geometry

    // PostGIS `geometry_in` GeoJSON kabul etmez; yazma yolunda daima EWKT gönderilir.
    const geom = toEwkt(geometry)
    if (!geom && !hedef.geometrisizKabul) {
      geometrisiz += 1
      continue
    }

    const props = feature.properties ?? {}
    // Geometrisiz güncellemede `geom` hiç yazılmaz; mevcut geometri silinmemeli.
    const row: Record<string, unknown> = geom ? { geom } : {}
    for (const column of hedef.columns) {
      if (props[column] !== undefined && props[column] !== '') row[column] = props[column]
    }

    if (hedef.zorunlu.some((column) => row[column] === undefined)) {
      eksikZorunlu += 1
      continue
    }

    rows.push(row)
  }

  return { rows, eksikZorunlu, geometrisiz }
}

function DevModeControl() {
  const devMode = useAppStore((state) => state.devMode)
  const setDevMode = useAppStore((state) => state.setDevMode)

  return (
    <>
      <Divider />
      <Switch
        size="xs"
        label="DEV mode"
        description="Açıkken kurumsal katmanlar (imar planı, rayiç, numarataj vb.) örnek demo verileriyle gösterilir. Kapalıyken gerçek içe aktarılan veriler gösterilir."
        checked={devMode}
        onChange={(event) => setDevMode(event.currentTarget.checked)}
      />
    </>
  )
}

function ImportPanel() {
  const role = useAppStore((state) => state.role)
  const [file, setFile] = useState<File | null>(null)
  const [table, setTable] = useState<string>(HEDEFLER[0]!.table)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hedef = HEDEFLER.find((item) => item.table === table)!

  if (!supabase) {
    return (
      <Stack gap="xs">
        <Text size="xs" c="dimmed">
          Sunucu bağlantısı yapılandırılmadı. `.env` içindeki VITE_SUPABASE_URL ve
          VITE_SUPABASE_ANON_KEY doldurulduğunda içe aktarma açılır.
        </Text>
        <DevModeControl />
      </Stack>
    )
  }

  if (role === 'public') {
    return (
      <Stack gap="xs">
        <Text size="xs" c="dimmed">
          Veri içe aktarmak için personel hesabıyla giriş yapın.
        </Text>
        <DevModeControl />
      </Stack>
    )
  }

  const submit = async (): Promise<void> => {
    if (!file || !supabase) return
    setBusy(true)
    setError(null)

    try {
      const parsed = JSON.parse(await file.text()) as FeatureCollection
      if (parsed.type !== 'FeatureCollection' || !Array.isArray(parsed.features)) {
        throw new Error('Dosya bir GeoJSON FeatureCollection değil.')
      }

      const { rows, eksikZorunlu, geometrisiz } = prepareRows(parsed.features, hedef)
      if (rows.length === 0) {
        throw new Error(
          `Yazılabilir kayıt yok. ${hedef.zorunlu.length > 0 ? `Zorunlu alanlar: ${hedef.zorunlu.join(', ')}.` : ''}`,
        )
      }

      for (let index = 0; index < rows.length; index += BATCH) {
        const dilim = rows.slice(index, index + BATCH)
        const { error: yazmaHatasi } = hedef.upsertKey
          ? await supabase.from(hedef.table).upsert(dilim, { onConflict: hedef.upsertKey })
          : await supabase.from(hedef.table).insert(dilim)
        if (yazmaHatasi) throw new Error(yazmaHatasi.message)
      }

      const atlanan = eksikZorunlu + geometrisiz
      notifications.show({
        color: 'teal',
        title: hedef.label,
        message:
          `${rows.length} kayıt yazıldı` +
          (atlanan > 0
            ? ` · ${geometrisiz} geometrisi okunamayan, ${eksikZorunlu} zorunlu alanı eksik kayıt atlandı`
            : ''),
      })
      setFile(null)
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'İçe aktarma başarısız')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack gap="xs">
      <Select
        size="xs"
        label="Hedef tablo"
        allowDeselect={false}
        value={table}
        onChange={(value) => value && setTable(value)}
        data={HEDEFLER.map((item) => ({ value: item.table, label: item.label }))}
      />

      <Text fz={10} c="dimmed">
        Taşınan alanlar: {hedef.columns.join(', ')}
        {hedef.zorunlu.length > 0 ? ` · zorunlu: ${hedef.zorunlu.join(', ')}` : ''}
      </Text>

      <FileInput
        size="xs"
        label="GeoJSON dosyası"
        placeholder="Dosya seçin"
        accept=".geojson,.json,application/geo+json"
        value={file}
        onChange={setFile}
        clearable
      />

      <Button size="xs" loading={busy} disabled={!file} onClick={() => void submit()}>
        İçe aktar
      </Button>

      {error ? (
        <Alert color="red" p="xs">
          <Text size="xs">{error}</Text>
        </Alert>
      ) : null}

      <DevModeControl />
    </Stack>
  )
}

export const importTool: ToolModule = {
  id: 'veri-ice-aktar',
  title: 'Veri içe aktar',
  description: 'GeoJSON dosyasını kurumsal bir katmana yazar',
  access: 'personel',
  Panel: ImportPanel,
}
