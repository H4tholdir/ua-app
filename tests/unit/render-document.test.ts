// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { Document, Page, Text } from '@react-pdf/renderer'
import { renderPdfDocument } from '@/lib/pdf/render-document'

describe('renderPdfDocument', () => {
  it('produce un buffer PDF valido da un ReactElement <Document>', async () => {
    const element = createElement(
      Document,
      {},
      createElement(Page, {}, createElement(Text, {}, 'test'))
    )
    const buffer = await renderPdfDocument(element)
    expect(buffer.length).toBeGreaterThan(0)
    expect(buffer.subarray(0, 4).toString('latin1')).toBe('%PDF')
  })
})
