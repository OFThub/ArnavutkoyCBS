// Harita araması: mahalle ve adlandırılmış OSM yerleri. Seçim haritayı o noktaya uçurur.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Autocomplete, type ComboboxItem } from '@mantine/core'
import { loadSearchIndex, rank, type SearchHit } from '../data/search'
import { useMapContext } from '../map/mapContext'

export function SearchBox() {
  const { map, ready } = useMapContext()
  const [index, setIndex] = useState<SearchHit[]>([])
  const [value, setValue] = useState('')
  const yuklendi = useRef(false)

  // İndeks ilk odaklanmada kurulur; açılışta 6 MB'lık OSM dosyasını beklemeye gerek yok.
  const yukle = (): void => {
    if (yuklendi.current) return
    yuklendi.current = true
    void loadSearchIndex()
      .then(setIndex)
      .catch(() => {
        yuklendi.current = false
      })
  }

  useEffect(() => {
    if (value.length >= 2) yukle()
  }, [value])

  const sonuclar = useMemo(
    () => (value.length >= 2 ? rank(index, value) : []),
    [index, value],
  )

  const secenekler: ComboboxItem[] = sonuclar.map((hit) => ({
    value: `${hit.ad} · ${hit.tur}`,
    label: `${hit.ad} · ${hit.tur}`,
  }))

  const sec = (secilen: string): void => {
    const hit = sonuclar.find((item) => `${item.ad} · ${item.tur}` === secilen)
    if (!hit || !map || !ready) return
    map.flyTo({ center: hit.merkez, zoom: hit.tur === 'Mahalle' ? 14 : 17, duration: 900 })
  }

  return (
    <Autocomplete
      size="sm"
      style={{ flex: 1, maxWidth: 300, minWidth: 0 }}
      placeholder="Mahalle, okul, eczane ara"
      aria-label="Haritada ara"
      value={value}
      data={secenekler}
      limit={12}
      onFocus={yukle}
      onChange={setValue}
      onOptionSubmit={sec}
      comboboxProps={{ withinPortal: true }}
      styles={{
        input: {
          background: 'var(--pafta-yuzey)',
          backdropFilter: 'blur(12px)',
          borderColor: 'var(--pafta-cizgi-koyu)',
        },
      }}
    />
  )
}
