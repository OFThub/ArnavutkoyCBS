// Antet: teknik çizimin köşe başlık bloğu. Tezgâhta durum okuması, rehberde karne damgası olarak kullanılır.

import type { ReactNode } from 'react'

export interface AntetSatiri {
  etiket: string
  deger: ReactNode
}

export function Antet({
  baslik,
  satirlar,
  className,
  style,
}: {
  baslik: string
  satirlar: AntetSatiri[]
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div className={`pafta-antet ${className ?? ''}`} style={style}>
      <div className="pafta-antet__baslik">{baslik}</div>
      {satirlar.map((satir) => (
        <div key={satir.etiket} className="pafta-antet__satir">
          <span className="pafta-antet__etiket">{satir.etiket}</span>
          <span className="pafta-veri">{satir.deger}</span>
        </div>
      ))}
    </div>
  )
}
