// Arnavutköy ilçesinin sabit coğrafi kimliği: OSM relation, bbox, merkez ve doğrulama referansları.

export interface DistrictConfig {
  readonly name: string
  readonly province: string
  readonly osmRelationId: number
  readonly bbox: readonly [number, number, number, number]
  readonly center: readonly [number, number]
  readonly defaultZoom: number
  readonly referenceElevationM: number
  readonly elevationToleranceM: number
  readonly mahalleCount: number
}

export const DISTRICT: DistrictConfig = {
  name: 'Arnavutköy',
  province: 'İstanbul',
  osmRelationId: 1766093,
  bbox: [28.4893, 41.0886, 28.8214, 41.4081],
  center: [28.6554, 41.2484],
  defaultZoom: 11,
  referenceElevationM: 74,
  elevationToleranceM: 25,
  mahalleCount: 38,
}

export const DISTRICT_BOUNDS: [[number, number], [number, number]] = [
  [DISTRICT.bbox[0], DISTRICT.bbox[1]],
  [DISTRICT.bbox[2], DISTRICT.bbox[3]],
]
