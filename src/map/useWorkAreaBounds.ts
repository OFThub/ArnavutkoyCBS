// Haritayı çalışma alanına hapseder: dışına kaydırmayı ve alanın tamamından fazla uzaklaşmayı engeller.

import { useEffect } from 'react'
import type { LngLatBoundsLike } from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'
import { loadDataset } from '../core/dataset'
import { useMapContext } from './mapContext'

const PADDING_DEGREES = 0.04

export function useWorkAreaBounds(): void {
  const { map, ready } = useMapContext()

  useEffect(() => {
    if (!map || !ready) return
    let alive = true

    void loadDataset<FeatureCollection>('calismaAlani').then((data) => {
      if (!alive) return
      const box = data.bbox
      const west = box?.[0]
      const south = box?.[1]
      const east = box?.[2]
      const north = box?.[3]
      if (
        typeof west !== 'number' ||
        typeof south !== 'number' ||
        typeof east !== 'number' ||
        typeof north !== 'number'
      ) {
        return
      }

      const bounds: LngLatBoundsLike = [
        [west - PADDING_DEGREES, south - PADDING_DEGREES],
        [east + PADDING_DEGREES, north + PADDING_DEGREES],
      ]
      map.setMaxBounds(bounds)

      const camera = map.cameraForBounds(bounds)
      if (typeof camera?.zoom === 'number') map.setMinZoom(Math.max(0, camera.zoom - 0.3))
    })

    return () => {
      alive = false
    }
  }, [map, ready])
}
