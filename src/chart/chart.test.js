import { describe, it, expect } from 'vitest'
import { measureText, textRects, fitText } from './font.js'
import { buildScene, hitTest, CHART_TYPES, PIXEL_SIZES } from './scene.js'
import { sceneToSVG } from './render.js'
import { parseCSV, toCSV, parseProject, projectToJSON } from './exporters.js'
import { niceScale, toNumber, slugify, makeFormatter } from './format.js'
import { contrast } from './color.js'

const data = [
  { label: 'Seg', value: 3 }, { label: 'Ter', value: 5 }, { label: 'Qua', value: 4 },
  { label: 'Qui', value: 7 }, { label: 'Sex', value: 6 }, { label: 'Sáb', value: 9 },
]

describe('bitmap font', () => {
  it('measures and renders glyphs including accents', () => {
    expect(measureText('A', 2)).toBe(10)
    expect(measureText('AB', 1)).toBe(11)
    const plain = textRects('A', 0, 0, 1, '#000').length
    const accented = textRects('Á', 0, 0, 1, '#000').length
    expect(accented).toBeGreaterThan(plain)
    expect(textRects('ç', 0, 0, 1, '#000').some(r => r.y >= 7)).toBe(true)
  })
  it('truncates with ellipsis', () => {
    const out = fitText('Uma categoria muito longa', 2, 80)
    expect(out.endsWith('…')).toBe(true)
    expect(measureText(out, 2)).toBeLessThanOrEqual(80)
  })
})

describe('scene', () => {
  for (const type of CHART_TYPES) {
    for (const pixel of PIXEL_SIZES) {
      it(`builds ${type} @ ${pixel}px with integer, in-bounds rects`, () => {
        const s = buildScene({ title: 'Horas de foco', data, type, pixel })
        expect(s.rects.length).toBeGreaterThan(50)
        for (const r of s.rects) {
          expect(Number.isInteger(r.x) && Number.isInteger(r.y) && Number.isInteger(r.w) && Number.isInteger(r.h)).toBe(true)
          expect(r.x).toBeGreaterThanOrEqual(-pixel)
          expect(r.x + r.w).toBeLessThanOrEqual(s.width + pixel * 2)
          expect(r.y + r.h).toBeLessThanOrEqual(s.height + pixel * 2)
        }
        expect(s.hits.length).toBe(data.length)
      })
    }
  }
  it('hit-tests bars and slices', () => {
    const bars = buildScene({ data, type: 'bar' })
    const h = bars.hits[3]
    expect(hitTest(bars, h.x + 2, h.y + h.h - 2)?.index).toBe(3)
    const pie = buildScene({ data, type: 'pie', depth: false })
    const a = pie.hits[0], mid = (a.a0 + a.a1) / 2
    expect(hitTest(pie, a.cx + Math.cos(mid) * a.r1 * 0.5, a.cy + Math.sin(mid) * a.r1 * 0.5)?.index).toBe(0)
  })
  it('shows an empty state without data', () => {
    const s = buildScene({ data: [{ label: 'a', value: 0 }], type: 'bar' })
    expect(s.hits.length).toBe(0)
    expect(s.rects.length).toBeGreaterThan(10)
  })
  it('respects transparent background and aspect ratios', () => {
    expect(buildScene({ data, transparent: true }).bg).toBeNull()
    const sq = buildScene({ data, aspect: '1:1' })
    expect([sq.width, sq.height]).toEqual([720, 720])
  })
  it('animation start draws fewer pixels than the final frame', () => {
    const a = buildScene({ data, type: 'bar', pattern: 'solid' }, { progress: 0.2 })
    const b = buildScene({ data, type: 'bar', pattern: 'solid' }, { progress: 1 })
    const area = s => s.rects.reduce((sum, r) => sum + r.w * r.h, 0)
    expect(area(a)).toBeLessThan(area(b))
  })
})

describe('svg export', () => {
  it('produces a standalone crisp SVG', () => {
    const svg = sceneToSVG(buildScene({ title: 'Teste <&>', data }), { title: 'Teste <&>' })
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true)
    expect(svg).toContain('shape-rendering="crispEdges"')
    expect(svg).toContain('&lt;&amp;&gt;')
    expect(svg).not.toContain('<text')
  })
})

describe('data io', () => {
  it('parses CSV with header, quotes, semicolons and colours', () => {
    expect(parseCSV('label,value,color\n"Olá, mundo",3,#ff0000\nB,4.5')).toEqual([
      { label: 'Olá, mundo', value: 3, color: '#ff0000' },
      { label: 'B', value: 4.5, color: null },
    ])
    expect(parseCSV('A;1,5\nB;2')).toEqual([{ label: 'A', value: 1.5, color: null }, { label: 'B', value: 2, color: null }])
  })
  it('round-trips CSV and project JSON', () => {
    const rows = [{ label: 'x, y', value: 2, color: '#123456' }]
    expect(parseCSV(toCSV(rows))).toEqual(rows)
    expect(parseProject(projectToJSON({ title: 'T', data: rows })).data).toEqual(rows)
    expect(() => parseProject('{"a":1}')).toThrow()
  })
})

describe('format', () => {
  it('nice scale, numbers, slug', () => {
    expect(niceScale(9)).toEqual({ max: 10, step: 2.5 })
    expect(niceScale(7.1)).toEqual({ max: 8, step: 2 })
    expect(toNumber('1.234,5')).toBe(1234.5)
    expect(toNumber('1,234.5')).toBe(1234.5)
    expect(slugify('Horas de foco — Sábado!')).toBe('horas-de-foco-sabado')
    expect(makeFormatter({ locale: 'en-US', prefix: '$' }).axis(25000)).toBe('$25K')
  })
  it('chart themes keep readable ink', async () => {
    const { CHART_THEMES } = await import('./palettes.js')
    for (const t of Object.values(CHART_THEMES)) expect(contrast(t.ink, t.bg)).toBeGreaterThan(4.5)
  })
})
