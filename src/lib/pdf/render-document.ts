import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import type { ReactElement } from 'react'

// react-pdf tipizza renderToBuffer su ReactElement<DocumentProps>, ma i
// nostri template accettano props applicative (lavoro/lab/...) e rendono
// un <Document> internamente — il cast è inevitabile al confine, isolato
// qui in un solo punto invece che ripetuto in ogni generatore.
export function renderPdfDocument(element: ReactElement<unknown>): Promise<Buffer> {
  return renderToBuffer(element as unknown as ReactElement<DocumentProps>)
}
