// Rota çözümlemesi iki sayfayı ayırır; yanlış eşleşme vatandaşı CBS tezgâhına düşürür.

import { describe, expect, it } from 'vitest'
import { routeOf } from './route'

describe('routeOf', () => {
  it('/rehber rehber sayfasını seçer', () => {
    expect(routeOf('/rehber')).toBe('rehber')
  })

  it('sondaki eğik çizgiyi yok sayar', () => {
    expect(routeOf('/rehber/')).toBe('rehber')
    expect(routeOf('/rehber///')).toBe('rehber')
  })

  it('alt yolda sunulduğunda da çalışır', () => {
    expect(routeOf('/cbs/rehber')).toBe('rehber')
  })

  it('kök ve diğer yollar tezgâhı açar', () => {
    expect(routeOf('/')).toBe('tezgah')
    expect(routeOf('')).toBe('tezgah')
    expect(routeOf('/harita')).toBe('tezgah')
  })

  it('benzer adlı yolu rehber sanmaz', () => {
    expect(routeOf('/rehberlik')).toBe('tezgah')
  })
})
