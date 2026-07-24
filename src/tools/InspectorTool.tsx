// Bilgi aracı: tıklanan objenin özniteliklerini, topografyasını, mahallesini ve envanter sayımlarını tek panelde toplar.

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  Badge,
  Divider,
  Group,
  ScrollArea,
  Stack,
  Switch,
  Table,
  Text,
} from '@mantine/core'
import type { MapGeoJSONFeature, MapMouseEvent } from 'maplibre-gl'
import { formatArea, formatCount } from '../core/format'
import { formatDecimal } from '../core/coords'
import { ASPECT_SECTORS, TERRAIN_CLASSES, aspectSector } from '../core/terrain'
import { findMahalle, type MahalleInfo } from '../data/mahalleIndex'
import { loadOsmSnapshot, osmKey, type SnapshotCounts } from '../data/osmSnapshot'
import {
  accessMessage,
  fetchAttachments,
  fetchAuditTrail,
  type Attachment,
  type AuditEntry,
  type RecordAccess,
} from '../data/records'
import { loadTerrainDerived, terrainSampleAt, type TerrainSample } from '../data/terrainDerived'
import { BUILDING_EXTRUDE_LAYER, BUILDING_FILL_LAYER } from '../layers/buildings'
import { poiCategoryOf } from '../layers/poi'
import { useMapContext } from '../map/mapContext'
import { useAppStore } from '../store/appStore'
import { ToolMetrics } from './ToolMetrics'
import type { ToolModule } from './types'

const QUERY_LAYERS = [
  BUILDING_EXTRUDE_LAYER,
  BUILDING_FILL_LAYER,
  'yol-cizgi',
  'poi-daire',
  'saglik-kurumu-daire',
  'su-alan',
  'su-akarsu',
]

const HIDDEN_KEYS = new Set(['tema', 'source', 'osm_type', 'osm_id'])

function dbEntityFor(layerId: string): string | null {
  return layerId.startsWith('bina') ? 'bina' : null
}

interface Picked {
  lng: number
  lat: number
  title: string
  kind: string
  attributes: [string, string][]
  enriched: boolean
  entity: string | null
  recordId: string | null
}

interface ServerRecord {
  history: { access: RecordAccess; entries: AuditEntry[] }
  attachments: { access: RecordAccess; items: Attachment[] }
}

function labelFor(feature: MapGeoJSONFeature): { title: string; kind: string } {
  const properties = feature.properties ?? {}
  const name =
    (properties['name:tr'] as string) ??
    (properties['name'] as string) ??
    (properties['ad'] as string) ??
    ''

  if (feature.layer.id.startsWith('bina')) {
    return { title: name || 'Bina', kind: 'Yapı' }
  }
  if (feature.layer.id === 'yol-cizgi') {
    return { title: name || 'Yol', kind: `Yol · ${String(properties['class'] ?? '')}` }
  }
  if (feature.layer.id === 'saglik-kurumu-daire') {
    return { title: name || 'Sağlık kurumu', kind: 'Sağlık kurumu (İBB)' }
  }
  if (feature.layer.id === 'poi-daire') {
    const category = poiCategoryOf(properties['class'] as string)
    return { title: name || 'Önemli nokta', kind: category?.label ?? 'Önemli nokta' }
  }
  return { title: name || 'Su yüzeyi', kind: 'Su' }
}

function toRows(properties: Record<string, unknown>): [string, string][] {
  return Object.entries(properties)
    .filter(([key, value]) => !HIDDEN_KEYS.has(key) && value !== null && value !== '')
    .map(([key, value]) => [key, String(value)] as [string, string])
    .sort((a, b) => a[0].localeCompare(b[0], 'tr'))
}

function InspectorPanel() {
  const { map, ready } = useMapContext()
  const [picked, setPicked] = useState<Picked | null>(null)
  const [terrain, setTerrain] = useState<TerrainSample | null>(null)
  const [mahalle, setMahalle] = useState<MahalleInfo | null>(null)
  const [counts, setCounts] = useState<SnapshotCounts | null>(null)
  const [server, setServer] = useState<ServerRecord | null>(null)
  const role = useAppStore((state) => state.role)
  const [error, setError] = useState<string | null>(null)
  const building3d = useAppStore((state) => state.building3d)
  const setBuilding3d = useAppStore((state) => state.setBuilding3d)
  const busy = useRef(false)

  useEffect(() => {
    loadOsmSnapshot()
      .then((index) => setCounts(index.counts))
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : 'Envanter yüklenemedi'),
      )
  }, [])

  const onClick = useCallback(
    (event: MapMouseEvent) => {
      const target = event.target
      if (busy.current) return
      busy.current = true

      const available = QUERY_LAYERS.filter((id) => target.getLayer(id))
      const hit = target.queryRenderedFeatures(event.point, { layers: available })[0]
      const { lng, lat } = event.lngLat

      void (async () => {
        try {
          if (hit) {
            const { title, kind } = labelFor(hit)
            const properties = { ...(hit.properties ?? {}) }
            let enriched = false

            const key = osmKey(properties['osm_type'], properties['osm_id'])
            if (properties['osm_id']) {
              const snapshot = await loadOsmSnapshot()
              const match = snapshot.byOsmId.get(key)
              if (match?.properties) {
                Object.assign(properties, match.properties)
                enriched = true
              }
            }

            const entity = dbEntityFor(hit.layer.id)
            const recordId = properties['osm_id'] ? String(properties['osm_id']) : null
            setPicked({
              lng,
              lat,
              title,
              kind,
              attributes: toRows(properties),
              enriched,
              entity,
              recordId,
            })

            if (entity && recordId) {
              const [history, attachments] = await Promise.all([
                fetchAuditTrail(entity, recordId, role),
                fetchAttachments(entity, recordId, role),
              ])
              setServer({ history, attachments })
            } else {
              setServer(null)
            }
          } else {
            setServer(null)
            setPicked({
              lng,
              lat,
              title: 'Seçili nesne yok',
              kind: 'Zemin',
              attributes: [],
              enriched: false,
              entity: null,
              recordId: null,
            })
          }

          const derived = await loadTerrainDerived()
          setTerrain(terrainSampleAt(derived, lng, lat))
          setMahalle(await findMahalle(lng, lat))
        } catch (cause: unknown) {
          setError(cause instanceof Error ? cause.message : 'Sorgu tamamlanamadı')
        } finally {
          busy.current = false
        }
      })()
    },
    [role],
  )

  useEffect(() => {
    if (!map || !ready) return
    map.on('click', onClick)
    map.getCanvas().style.cursor = 'help'
    return () => {
      map.off('click', onClick)
      map.getCanvas().style.cursor = ''
    }
  }, [map, ready, onClick])

  return (
    <Stack gap="sm">
      <Switch
        size="xs"
        label="Binaları 3B kütle olarak göster"
        checked={building3d}
        onChange={(event) => setBuilding3d(event.currentTarget.checked)}
      />

      <Text size="xs" c="dimmed">
        Haritada bir bina, yol, önemli nokta veya su yüzeyine tıklayın.
      </Text>

      {error ? (
        <Alert color="red" p="xs">
          <Text size="xs">{error}</Text>
        </Alert>
      ) : null}

      {picked ? (
        <Stack gap={6}>
          <Group gap="xs" wrap="nowrap">
            <Text size="sm" fw={700} style={{ flex: 1 }}>
              {picked.title}
            </Text>
            {picked.enriched ? (
              <Badge size="xs" variant="light" color="teal">
                OSM zenginleştirildi
              </Badge>
            ) : null}
          </Group>
          <Text fz={10} c="dimmed">
            {picked.kind} · {formatDecimal(picked.lng, picked.lat, 5)}
          </Text>
        </Stack>
      ) : null}

      {terrain ? (
        <ToolMetrics
          items={[
            { label: 'Yükselti', value: `${terrain.elevation.toFixed(1)} m` },
            { label: 'Eğim', value: `%${terrain.slopePercent.toFixed(1)}` },
            {
              label: 'Bakı',
              value:
                terrain.aspectDegrees < 0
                  ? 'Düz'
                  : (ASPECT_SECTORS[aspectSector(terrain.aspectDegrees)]?.label ?? '—'),
            },
            { label: 'Topografik konum', value: TERRAIN_CLASSES[terrain.terrainClass].label },
          ]}
        />
      ) : null}

      {mahalle ? (
        <ToolMetrics
          items={[
            { label: 'Mahalle', value: mahalle.ad },
            { label: 'UAVT kodu', value: mahalle.uavtKod },
            {
              label: 'Mahalle alanı',
              value: mahalle.alanKm2 === null ? '—' : formatArea(mahalle.alanKm2 * 1_000_000),
            },
            { label: 'Sınır', value: mahalle.yaklasik ? 'YAKLAŞIK SINIR' : 'Resmî' },
          ]}
        />
      ) : null}

      {picked && picked.attributes.length > 0 ? (
        <>
          <Divider label="Öznitelikler" labelPosition="left" />
          <ScrollArea.Autosize mah={260}>
            <Table striped withRowBorders={false} fz={10} verticalSpacing={2}>
              <Table.Tbody>
                {picked.attributes.map(([key, value]) => (
                  <Table.Tr key={key}>
                    <Table.Td c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                      {key}
                    </Table.Td>
                    <Table.Td>{value}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea.Autosize>
        </>
      ) : null}

      {picked?.entity ? (
        <>
          <Divider label="Değişiklik geçmişi" labelPosition="left" />
          {server && server.history.entries.length > 0 ? (
            <Stack gap={4}>
              {server.history.entries.map((entry) => (
                <Group key={entry.id} justify="space-between" gap="xs" wrap="nowrap">
                  <Text fz={10}>{entry.islem}</Text>
                  <Text fz={10} c="dimmed">
                    {new Date(entry.zaman).toLocaleString('tr-TR')}
                  </Text>
                </Group>
              ))}
            </Stack>
          ) : (
            <Text fz={10} c="dimmed">
              {accessMessage(server?.history.access ?? 'ok', 'yönetici')}
            </Text>
          )}

          <Divider label="Medya ekleri" labelPosition="left" />
          {server && server.attachments.items.length > 0 ? (
            <Stack gap={4}>
              {server.attachments.items.map((item) => (
                <Group key={item.id} justify="space-between" gap="xs" wrap="nowrap">
                  <Text fz={10} truncate>
                    {item.dosyaAdi}
                  </Text>
                  <Text fz={10} c="dimmed">
                    {item.boyutBayt === null ? '—' : `${Math.round(item.boyutBayt / 1024)} KB`}
                  </Text>
                </Group>
              ))}
            </Stack>
          ) : (
            <Text fz={10} c="dimmed">
              {accessMessage(server?.attachments.access ?? 'ok', 'personel')}
            </Text>
          )}
        </>
      ) : null}

      {counts ? (
        <>
          <Divider label="İlçe envanteri" labelPosition="left" />
          <ToolMetrics
            items={[
              { label: 'Bina', value: formatCount(counts.bina) },
              { label: 'Yol', value: formatCount(counts.yol) },
              { label: 'Hastane + okul', value: formatCount(counts.hastane + counts.okul) },
              { label: 'Eczane', value: formatCount(counts.eczane) },
              { label: 'İbadet yeri', value: formatCount(counts.ibadet) },
              { label: 'İtfaiye + emniyet', value: formatCount(counts.itfaiye + counts.emniyet) },
            ]}
          />
          <Text fz={10} c="dimmed">
            Bina ve sayımlar build-time OSM anlık görüntüsünden; yol, önemli nokta ve su canlı
            vektör döşemelerinden gelir.
          </Text>
        </>
      ) : null}
    </Stack>
  )
}

export const inspectorTool: ToolModule = {
  id: 'bilgi',
  title: 'Bilgi',
  description: 'Tıklanan objenin künyesi',
  access: 'public',
  Panel: InspectorPanel,
}
