// Çizim oturumunun dışarıdan köşe yazma sözleşmesi: koordinat tablosu ve kayıtlı geometriyi
// düzenlemeye alma bu API üzerinden çalışır, bozulursa imar aracı sessizce boş geometri kaydeder.

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { OverlayManager } from './overlays'
import { startDrawSession, type DrawFeature, type LngLatPair } from './draw'

// Oturum klavye kısayolları için window'a bağlanır; test ortamı node olduğundan asgari bir kabuk yeter.
const gercekWindow = globalThis.window
beforeAll(() => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { addEventListener: () => {}, removeEventListener: () => {} },
  })
})
afterAll(() => {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: gercekWindow })
})

const KARE: LngLatPair[] = [
  [28.74, 41.18],
  [28.75, 41.18],
  [28.75, 41.19],
]

function ortam() {
  const canvas = { style: { cursor: '' } }
  const map = {
    getSource: () => undefined,
    getLayer: () => undefined,
    addSource: () => {},
    addLayer: () => {},
    removeLayer: () => {},
    removeSource: () => {},
    getStyle: () => ({ layers: [] }),
    project: ([lng, lat]: LngLatPair) => ({ x: lng * 1000, y: lat * 1000 }),
    getCanvas: () => canvas,
    on: () => {},
    off: () => {},
    doubleClickZoom: { enable: () => {}, disable: () => {} },
    dragPan: { enable: () => {}, disable: () => {} },
  } as unknown as MapLibreMap

  const overlays = { register: vi.fn(), unregister: vi.fn() } as unknown as OverlayManager
  return { map, overlays, canvas }
}

describe('startDrawSession.setVertices', () => {
  it('dışarıdan yazılan köşeleri geri okur ve poligon üretir', () => {
    const { map, overlays } = ortam()
    const gelen: (DrawFeature | null)[] = []
    const session = startDrawSession(map, overlays, {
      mode: 'polygon',
      onChange: (feature) => gelen.push(feature),
    })

    session.setVertices(KARE, true)

    expect(session.getVertices()).toEqual(KARE)
    const sonuncu = gelen[gelen.length - 1]
    expect(sonuncu?.geometry.type).toBe('Polygon')
    // Halka ilk noktayla kapatılır: 3 köşe → 4 pozisyon.
    expect((sonuncu?.geometry as { coordinates: unknown[][] }).coordinates[0]).toHaveLength(4)

    session.destroy()
  })

  it('onChange ikinci parametresi köşe dizisidir ve kopyadır', () => {
    const { map, overlays } = ortam()
    let sonKoseler: LngLatPair[] = []
    const session = startDrawSession(map, overlays, {
      mode: 'polygon',
      onChange: (_feature, vertices) => {
        sonKoseler = vertices
      },
    })

    session.setVertices(KARE, true)
    expect(sonKoseler).toEqual(KARE)

    sonKoseler.push([0, 0])
    expect(session.getVertices()).toHaveLength(3)

    session.destroy()
  })

  it('nokta kipinde yalnızca ilk köşe tutulur', () => {
    const { map, overlays } = ortam()
    const session = startDrawSession(map, overlays, { mode: 'point' })

    session.setVertices(KARE, true)
    expect(session.getVertices()).toEqual([KARE[0]])

    session.destroy()
  })

  it('reset köşeleri temizler', () => {
    const { map, overlays } = ortam()
    const session = startDrawSession(map, overlays, { mode: 'polygon' })

    session.setVertices(KARE, true)
    session.reset()
    expect(session.getVertices()).toEqual([])

    session.destroy()
  })
})
