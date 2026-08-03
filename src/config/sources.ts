// Tüm dış servis uç noktaları ve build-time üretilmiş yerel veri dosyalarının tek kayıt yeri.

export const BASEMAPS = {
  liberty: {
    id: 'liberty',
    title: 'Vektör (Liberty)',
    kind: 'style',
    url: 'https://tiles.openfreemap.org/styles/liberty',
    attribution: '© OpenMapTiles © OpenStreetMap katkıcıları',
  },
  esriImagery: {
    id: 'esriImagery',
    title: 'Uydu (Esri)',
    kind: 'raster',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
    // Uzaklaşınca sokak haritasına çapraz geçiş; uydu görüntüsü düşük zoom'da okunmaz.
    fadeTo: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      attribution: '© Esri, HERE, Garmin, OpenStreetMap katkıcıları',
      maxZoom: 19,
    },
    fadeZoom: [11, 13],
  },
  // Karanlık kip için altlık zorla değiştirilmez — kullanıcının seçimi kalır, koyu altlık seçenek olarak durur.
  cartoDark: {
    id: 'cartoDark',
    title: 'Koyu',
    kind: 'raster',
    url: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
    attribution: '© OpenStreetMap katkıcıları © CARTO',
    maxZoom: 20,
  },
  openTopoMap: {
    id: 'openTopoMap',
    title: 'Topografik',
    kind: 'raster',
    url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenTopoMap (CC-BY-SA)',
    maxZoom: 17,
  },
} as const

export type BasemapId = keyof typeof BASEMAPS

export const SOURCES = {
  demTerrarium: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
  demTerrariumTile: (z: number, x: number, y: number) =>
    `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`,
  elevationOpenMeteo: 'https://api.open-meteo.com/v1/elevation',
  elevationOpenTopoData: 'https://api.opentopodata.org/v1/srtm30m',
  quakeAfad: '/proxy/afad/event/filter',
  quakeUsgs: 'https://earthquake.usgs.gov/fdsnws/event/1/query',
  overpass: '/proxy/overpass',
  nominatim: 'https://nominatim.openstreetmap.org',
  ibbCkan: 'https://data.ibb.gov.tr/api/3/action',
} as const

export const DATASETS = {
  manifest: '/data/manifest.json',
  district: '/data/district.geojson',
  mahalle: '/data/mahalle.geojson',
  mahalleNufus: '/data/mahalle-nufus.json',
  depremSenaryo: '/data/deprem-senaryo.json',
  acilUlasimYolu: '/data/acil-ulasim-yolu.geojson',
  saglikKurumu: '/data/saglik-kurumu.geojson',
  osmSnapshot: '/data/osm-snapshot.geojson',
  ilceler: '/data/ilceler.geojson',
  calismaAlani: '/data/calisma-alani.geojson',
  toplanmaAlani: '/data/toplanma-alani.geojson',
  otobusDuragi: '/data/otobus-duragi.geojson',
} as const

export type DatasetKey = keyof typeof DATASETS
