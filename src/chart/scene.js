import { textRects, measureText, fitText, FONT_HEIGHT } from './font.js'
import { PALETTES, resolveTheme } from './palettes.js'
import { shade, mix, readableOn, ensureContrast } from './color.js'
import { makeFormatter, niceScale, toNumber } from './format.js'

export const ASPECTS = { '16:9': [800, 450], '4:3': [800, 600], '1:1': [720, 720], '4:5': [720, 900] }
export const CHART_TYPES = ['bar', 'hbar', 'line', 'area', 'pie', 'donut']
export const PIXEL_SIZES = [4, 6, 8, 10, 12]
export const PATTERNS = ['solid', 'dither', 'stripes', 'checker']

const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
const TEXT = 2 // dot size for regular labels → 14px cap height

export const DEFAULT_STYLE = {
  type: 'bar',
  palette: 'forest',
  chartTheme: 'auto',
  aspect: '16:9',
  pixel: 8,
  pattern: 'dither',
  labels: 'value',
  axisMax: '',
  grid: true,
  shadow: true,
  outline: false,
  bevel: true,
  depth: true,
  legend: true,
  frame: false,
  watermark: true,
  transparent: false,
  seriesColor: null,
  prefix: '',
  suffix: '',
  decimals: 'auto',
}

export function colorFor(config, index) {
  const palette = PALETTES[config.palette] || PALETTES.forest
  return config.data[index]?.color || palette[index % palette.length]
}
export function seriesColor(config) {
  return config.seriesColor || (PALETTES[config.palette] || PALETTES.forest)[0]
}

/**
 * Builds a resolution-independent scene made only of axis-aligned rectangles.
 * Both the canvas and the SVG renderers consume the same scene, so previews
 * and exports are pixel-identical.
 */
export function buildScene(config, { progress = 1, siteTheme = 'light' } = {}) {
  const cfg = { ...DEFAULT_STYLE, ...config }
  const [W, H] = ASPECTS[cfg.aspect] || ASPECTS['16:9']
  const p = PIXEL_SIZES.includes(Number(cfg.pixel)) ? Number(cfg.pixel) : 8
  const theme = resolveTheme(cfg.chartTheme, siteTheme)
  const strings = { total: 'TOTAL', empty: 'Sem dados', ...cfg.strings }
  const fmt = makeFormatter({ locale: cfg.locale, prefix: cfg.prefix, suffix: cfg.suffix, decimals: cfg.decimals })
  const t = Math.max(0, Math.min(1, progress))
  const done = t >= 1

  const rects = []
  const hits = []
  const rect = (x, y, w, h, c) => { if (w > 0 && h > 0) rects.push({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), c }) }
  const label = (text, x, y, scale, color, align) => { for (const r of textRects(text, x, y, scale, color, align)) rects.push(r) }
  const snap = v => Math.round(v / p) * p
  const snapDown = v => Math.floor(v / p) * p

  const data = (cfg.data || []).map((d, i) => ({ label: String(d.label ?? ''), value: Math.max(0, toNumber(d.value)), color: colorFor(cfg, i) }))
  const values = data.map(d => d.value)
  const total = values.reduce((a, b) => a + b, 0)
  const isCircular = cfg.type === 'pie' || cfg.type === 'donut'
  const lineColor = ensureContrast(seriesColor(cfg), theme.bg, 4)

  const pad = Math.max(28, Math.round(W * 0.04 / 4) * 4)

  // Image frame
  if (cfg.frame) {
    const f = Math.max(4, p / 2)
    rect(f, 0, W - 2 * f, f, theme.axis); rect(f, H - f, W - 2 * f, f, theme.axis)
    rect(0, f, f, H - 2 * f, theme.axis); rect(W - f, f, f, H - 2 * f, theme.axis)
  }

  // Header
  let y = pad
  const title = String(cfg.title || '').trim()
  if (title) {
    let ts = W >= 700 ? 4 : 3
    while (ts > 2 && measureText(title, ts) > W - pad * 2) ts--
    label(fitText(title, ts, W - pad * 2), pad, y, ts, theme.ink, 'left')
    y += FONT_HEIGHT * ts + ts * 3
  }
  const subtitle = String(cfg.subtitle || '').trim()
  if (subtitle) {
    label(fitText(subtitle, TEXT, W - pad * 2), pad, y, TEXT, theme.muted, 'left')
    y += FONT_HEIGHT * TEXT + 8
  }
  if (title || subtitle) {
    // pixel underline accent
    rect(pad, y + 2, 24, 4, lineColor); rect(pad + 28, y + 2, 8, 4, theme.axis)
    y += 22
  }

  // Legend only for pie/donut: cartesian charts already label categories on the axis.
  const showLegend = cfg.legend && data.length && isCircular
  const legendEntries = showLegend
    ? (cfg.type === 'line' || cfg.type === 'area'
      ? [{ label: subtitle || title || strings.series || 'Série', color: lineColor }]
      : data.map((d, i) => ({
        label: (d.label || `Item ${i + 1}`) + (isCircular && cfg.labels !== 'none' ? ` · ${cfg.labels === 'percent' ? fmt.percent(d.value, total) : fmt.value(d.value)}` : ''),
        color: d.color,
      })))
    : []
  const lineH = 26
  const watermarkH = cfg.watermark ? 18 : 0
  const drawItem = (it, x, ly) => {
    rect(x + 2, ly + 2, 12, 12, theme.shadow)
    rect(x, ly, 12, 12, it.color)
    rect(x, ly, 12, 3, shade(it.color, 0.3))
    label(it.text, x + 20, ly - 1, TEXT, theme.muted, 'left')
  }
  // Landscape pie/donut: a vertical legend on the right leaves room for a bigger circle.
  const bottomArea = H - pad - watermarkH - y
  const side = isCircular && legendEntries.length && W / H >= 1.2 && legendEntries.length * lineH <= bottomArea
  let plot
  if (side) {
    const items = legendEntries.map(e => { const text = fitText(e.label, TEXT, W * 0.34); return { ...e, text, w: 20 + measureText(text, TEXT) } })
    const colW = Math.max(...items.map(i => i.w))
    const lx = W - pad - colW
    const ly0 = Math.round(y + (bottomArea - items.length * lineH) / 2) + 6
    items.forEach((it, i) => drawItem(it, lx, ly0 + i * lineH))
    plot = { x: pad, y, w: lx - 32 - pad, h: bottomArea }
  } else {
    const legendLines = []
    if (legendEntries.length) {
      const gap = 24, maxW = W - pad * 2
      let line = [], lw = 0
      for (const e of legendEntries) {
        const text = fitText(e.label, TEXT, maxW * 0.6)
        const w = 20 + measureText(text, TEXT)
        if (line.length && lw + gap + w > maxW) { legendLines.push({ items: line, w: lw }); line = []; lw = 0 }
        line.push({ ...e, text, w }); lw += (line.length > 1 ? gap : 0) + w
      }
      if (line.length) legendLines.push({ items: line, w: lw })
    }
    const legendH = legendLines.length * lineH
    const legendTop = H - pad - legendH - watermarkH + (legendLines.length ? 6 : 0)
    legendLines.forEach((ln, row) => {
      let x = Math.round((W - ln.w) / 2)
      for (const it of ln.items) { drawItem(it, x, legendTop + row * lineH); x += it.w + 24 }
    })
    plot = { x: pad, y, w: W - pad * 2, h: (legendLines.length ? legendTop - 14 : H - pad - watermarkH) - y }
  }
  if (cfg.watermark) {
    label('PIXELGRAPHY', W - pad, H - pad + 4, 1, theme.axis, 'right')
    rect(W - pad - measureText('PIXELGRAPHY', 1) - 10, H - pad + 4, 6, 6, lineColor)
  }

  if (!data.length || total <= 0) {
    const cx = W / 2, cy = plot.y + plot.h / 2
    for (let i = -2; i <= 2; i++) rect(snap(cx + i * p * 2), snap(cy - p * 3), p, p, theme.axis)
    label(strings.empty, cx, cy, 3, theme.muted, 'center')
    return finish()
  }

  // --- pixel helpers -------------------------------------------------------
  function patternDark(cx, cy, f) {
    switch (cfg.pattern) {
      case 'dither': return BAYER[cy & 3][cx & 3] / 16 < f * 0.85 - 0.15
      case 'stripes': return (cx + cy) % 4 === 0
      case 'checker': return (cx + cy) % 2 === 0
      default: return false
    }
  }

  /** A bar made of p-sized cells with bevel, pattern, outline and drop shadow. dir: 'v' grows up, 'h' grows right. */
  function block(x, y, w, h, color, dir = 'v') {
    const cols = Math.round(w / p), rows = Math.round(h / p)
    if (cols <= 0 || rows <= 0) return
    const dark = shade(color, -0.42)
    const off = cfg.outline ? 2 * p : p
    if (cfg.shadow) {
      if (dir === 'v') rect(x + off, y + off, w, h - off, theme.shadow)
      else rect(x + off, y + off, w - off, h, theme.shadow)
    }
    if (cfg.outline) {
      rect(x, y - p, w, p, dark)
      rect(x - p, y, p, h, dark)
      if (dir === 'v') rect(x + w, y, p, h, dark)
      else { rect(x + w, y, p, h, dark); rect(x, y + h, w, p, dark) }
      if (dir === 'v') rect(x - p, y + h - p, p, p, dark)
    }
    rect(x, y, w, h, color)
    if (cfg.pattern !== 'solid') {
      const pc = shade(color, cfg.pattern === 'checker' ? -0.08 : -0.18)
      for (let cy = 0; cy < rows; cy++) {
        let run = -1
        for (let cx = 0; cx <= cols; cx++) {
          const f = dir === 'v' ? cy / Math.max(1, rows - 1) : 1 - cx / Math.max(1, cols - 1)
          const on = cx < cols && patternDark(cx, cy + (dir === 'v' ? rows : 0), f)
          if (on && run < 0) run = cx
          if (!on && run >= 0) { rect(x + run * p, y + cy * p, (cx - run) * p, p, pc); run = -1 }
        }
      }
    }
    if (cfg.bevel && cols >= 2 && rows >= 2) {
      const light = shade(color, 0.32), low = shade(color, -0.2)
      rect(x, y, w, p, light)
      rect(x, y + p, p, h - p, shade(color, 0.16))
      rect(x + w - p, y + p, p, h - p, low)
      if (dir === 'h') rect(x + p, y + h - p, w - 2 * p, p, low)
      if (cols >= 4 && rows >= 4) rect(x + p, y + p, p, p, shade(color, 0.6))
    }
  }

  function axisScale() {
    const max = Math.max(0, ...values)
    const custom = toNumber(cfg.axisMax)
    if (cfg.axisMax !== '' && custom > 0) return { max: custom, step: custom / 4, custom: true }
    return { ...niceScale(max, 4), custom: false }
  }
  // Percent for cartesian charts: share of a custom axis max (goal) or of the total.
  const pct = (v, scale) => fmt.percent(v, scale.custom ? scale.max : total)
  const valueText = (v, scale) => (cfg.labels === 'percent' ? pct(v, scale) : fmt.value(v))

  function dashedH(x0, x1, yy, color) { for (let x = x0; x < x1; x += 8) rect(x, yy, Math.min(4, x1 - x), 2, color) }
  function dashedV(xx, y0, y1, color) { for (let yy = y0; yy < y1; yy += 8) rect(xx, yy, 2, Math.min(4, y1 - yy), color) }

  // --- charts ---------------------------------------------------------------
  if (cfg.type === 'bar') drawBars()
  else if (cfg.type === 'hbar') drawHBars()
  else if (cfg.type === 'line' || cfg.type === 'area') drawLine(cfg.type === 'area')
  else drawPie(cfg.type === 'donut')

  return finish()

  function drawBars() {
    const scale = axisScale()
    const ticks = [0, 1, 2, 3, 4].map(i => scale.step * i)
    const axisW = Math.max(...ticks.map(v => measureText(fmt.axis(v), TEXT))) + 14
    const left = snap(plot.x + axisW), right = snapDown(plot.x + plot.w)
    const top = plot.y + (cfg.labels !== 'none' ? 26 : 8)
    const bottom = snapDown(plot.y + plot.h - 26)
    const plotH = bottom - top
    ticks.forEach((v, i) => {
      const gy = Math.round(bottom - (plotH * i) / 4)
      if (cfg.grid && i > 0) dashedH(left, right, gy, theme.grid)
      label(fmt.axis(v), left - 12, gy - 7, TEXT, theme.muted, 'right')
    })
    const n = data.length, step = (right - left) / n
    const barW = Math.max(p, Math.min(p * 14, snapDown(step * 0.58)))
    data.forEach((d, i) => {
      const bx = snap(left + step * i + (step - barW) / 2)
      let h = snap((plotH * Math.min(d.value, scale.max)) / scale.max * easeSteps(t, i, n))
      if (d.value > 0 && h < p && t > 0) h = p
      block(bx, bottom - h, barW, h, d.color, 'v')
      if (done && cfg.labels !== 'none') label(valueText(d.value, scale), bx + barW / 2, bottom - h - (cfg.outline ? p : 0) - 22, TEXT, theme.ink, 'center')
      label(fitText(d.label, TEXT, step - 8), bx + barW / 2, bottom + 12, TEXT, theme.muted, 'center')
      hits.push({ kind: 'rect', x: bx, y: Math.min(bottom - h, bottom - 16), w: barW, h: Math.max(h, 16), index: i })
    })
    rect(left - p, bottom, right - left + p, Math.max(2, p / 2), theme.axis)
  }

  function drawHBars() {
    const scale = axisScale()
    const catW = Math.min(Math.max(...data.map(d => measureText(d.label, TEXT))) + 16, plot.w * 0.32)
    const valueW = cfg.labels !== 'none' ? Math.max(...data.map(d => measureText(valueText(d.value, scale), TEXT))) + 18 : 8
    const left = snap(plot.x + catW), right = snapDown(plot.x + plot.w - valueW)
    const top = snap(plot.y + 4), bottom = plot.y + plot.h - 24
    const n = data.length, step = (bottom - top) / n
    const gapNeeded = cfg.outline ? 3 * p : 2 * p
    const barH = Math.max(p, Math.min(p * 8, snapDown(step * 0.62), snapDown(step) - gapNeeded))
    const plotW = right - left
    for (let i = 0; i <= 4; i++) {
      const gx = Math.round(left + (plotW * i) / 4)
      if (cfg.grid && i > 0) dashedV(gx, top, bottom, theme.grid)
      label(fmt.axis(scale.step * i), gx, bottom + 10, TEXT, theme.muted, i === 0 ? 'left' : 'center')
    }
    data.forEach((d, i) => {
      const by = top + snap(step * i + (step - barH) / 2)
      let w = snap((plotW * Math.min(d.value, scale.max)) / scale.max * easeSteps(t, i, n))
      if (d.value > 0 && w < p && t > 0) w = p
      block(left, by, w, barH, d.color, 'h')
      label(fitText(d.label, TEXT, catW - 16), left - 12, by + barH / 2 - 7, TEXT, theme.muted, 'right')
      if (done && cfg.labels !== 'none') label(valueText(d.value, scale), left + w + (cfg.outline ? p : 0) + 10, by + barH / 2 - 7, TEXT, theme.ink, 'left')
      hits.push({ kind: 'rect', x: left, y: by, w: Math.max(w, 16), h: barH, index: i })
    })
    rect(left - Math.max(2, p / 2), top, Math.max(2, p / 2), bottom - top, theme.axis)
  }

  function drawLine(area) {
    const scale = axisScale()
    const ticks = [0, 1, 2, 3, 4].map(i => scale.step * i)
    const axisW = Math.max(...ticks.map(v => measureText(fmt.axis(v), TEXT))) + 14
    const left = snap(plot.x + axisW), right = snapDown(plot.x + plot.w)
    const top = snap(plot.y + (cfg.labels !== 'none' ? 30 : 10))
    const bottom = snapDown(plot.y + plot.h - 26)
    const plotH = bottom - top
    ticks.forEach((v, i) => {
      const gy = Math.round(bottom - (plotH * i) / 4)
      if (cfg.grid && i > 0) dashedH(left, right, gy, theme.grid)
      label(fmt.axis(v), left - 12, gy - 7, TEXT, theme.muted, 'right')
    })
    const color = lineColor
    const n = data.length
    const inset = n === 1 ? (right - left) / 2 : Math.min(48, (right - left) / (n * 2))
    const cols = Math.round((right - left) / p), baseRow = Math.round(plotH / p)
    const pts = data.map((d, i) => {
      const x = n === 1 ? left + (right - left) / 2 : left + inset + ((right - left - inset * 2) * i) / (n - 1)
      const cy = Math.round(((1 - Math.min(d.value, scale.max) / scale.max)) * baseRow)
      return { cx: Math.round((x - left) / p), cy: Math.min(baseRow - 1, cy) }
    })
    // Bresenham over the cell lattice, revealed progressively.
    const cells = new Map()
    const put = (cx, cy) => { if (cx >= 0 && cx < cols) cells.set(cx + ',' + cy, [cx, cy]) }
    const reveal = t * Math.max(1, n - 1)
    for (let i = 0; i < n - 1; i++) {
      if (i >= reveal) break
      const a = pts[i], b = pts[i + 1]
      const frac = Math.min(1, reveal - i)
      const bx = Math.round(a.cx + (b.cx - a.cx) * frac), by = Math.round(a.cy + (b.cy - a.cy) * frac)
      let x0 = a.cx, y0 = a.cy
      const dx = Math.abs(bx - x0), dy = -Math.abs(by - y0), sx = x0 < bx ? 1 : -1, sy = y0 < by ? 1 : -1
      let err = dx + dy
      for (;;) {
        put(x0, y0)
        if (x0 === bx && y0 === by) break
        const e2 = 2 * err
        if (e2 >= dy) { err += dy; x0 += sx }
        if (e2 <= dx) { err += dx; y0 += sy }
      }
    }
    if (n === 1 || t >= 1) pts.forEach(pt => put(pt.cx, pt.cy))
    const thick = p <= 4 ? 2 : 1
    const cellRect = (cx, cy, c, size = 1, ox = 0) => rect(left + (cx + ox) * p, top + (cy + ox) * p, p * size, p * size, c)

    if (area && cells.size) {
      const topOf = new Map()
      for (const [cx, cy] of cells.values()) topOf.set(cx, Math.min(topOf.get(cx) ?? Infinity, cy))
      const soft = mix(color, theme.bg, 0.82), mid = mix(color, theme.bg, 0.5)
      for (const [cx, cy0] of topOf) {
        const startRow = cy0 + thick
        rect(left + cx * p, top + startRow * p, p, (baseRow - startRow) * p, soft)
        for (let cy = startRow; cy < baseRow; cy++) {
          const f = (cy - startRow) / Math.max(1, baseRow - startRow)
          if (BAYER[cy & 3][cx & 3] / 16 < (1 - f) * 0.95 - 0.05) cellRect(cx, cy, mid)
        }
      }
    }
    const list = [...cells.values()]
    if (cfg.shadow) list.forEach(([cx, cy]) => cellRect(cx + 1, cy + 1, theme.shadow, thick))
    if (cfg.outline) list.forEach(([cx, cy]) => rect(left + (cx - 1) * p, top + (cy - 1) * p, p * (thick + 2), p * (thick + 2), shade(color, -0.45)))
    list.forEach(([cx, cy]) => cellRect(cx, cy, color, thick))
    if (cfg.bevel) list.forEach(([cx, cy]) => rect(left + cx * p, top + cy * p, p * thick, Math.max(2, p / 4), shade(color, 0.3)))

    const visible = t >= 1 ? n : Math.floor(reveal) + 1
    pts.slice(0, visible).forEach((pt, i) => {
      const mx = left + pt.cx * p, my = top + pt.cy * p, m = p * (p <= 6 ? 2 : 1)
      const x0 = mx - m + (thick - 1) * p / 2, y0 = my - m + (thick - 1) * p / 2
      const size = m * 2 + p
      if (cfg.shadow) rect(x0 + p, y0 + p, size, size, theme.shadow)
      rect(x0 - p, y0, size + 2 * p, size, shade(color, -0.45)); rect(x0, y0 - p, size, size + 2 * p, shade(color, -0.45))
      rect(x0, y0, size, size, theme.bg)
      rect(x0 + m / 2, y0 + m / 2, size - m, size - m, color)
      if (done && cfg.labels !== 'none') label(valueText(data[i].value, scale), mx + p / 2, y0 - p - 22, TEXT, theme.ink, 'center')
      hits.push({ kind: 'rect', x: x0 - p, y: y0 - p, w: size + 2 * p, h: size + 2 * p, index: i })
    })
    const step = (right - left - inset * 2) / Math.max(1, n - 1)
    pts.forEach((pt, i) => label(fitText(data[i].label, TEXT, n === 1 ? plot.w : Math.max(24, step - 8)), left + pt.cx * p + p / 2, bottom + 12, TEXT, theme.muted, 'center'))
    rect(left - p, bottom, right - left + p, Math.max(2, p / 2), theme.axis)
  }

  function drawPie(donut) {
    const depthCells = cfg.depth ? Math.max(2, Math.round(16 / p)) : 0
    const avail = Math.min(plot.w * 0.86, plot.h - depthCells * p - 8)
    const R = Math.max(4, Math.floor(avail / 2 / p))
    const cx0 = snap(plot.x + plot.w / 2), cy0 = snap(plot.y + (plot.h - depthCells * p) / 2)
    const inner = donut ? R * 0.56 : 0

    // Visual portions: keep tiny non-zero slices visible (labels stay exact).
    const active = values.map((v, i) => (v > 0 ? i : -1)).filter(i => i >= 0)
    const portions = Array(values.length).fill(0)
    const minSlice = active.length ? Math.min(0.04, 0.48 / active.length) : 0
    let remaining = [...active], remainingValue = total, remainingPortion = 1
    while (remaining.length) {
      const tiny = remaining.filter(i => (values[i] / remainingValue) * remainingPortion < minSlice)
      if (!tiny.length) { remaining.forEach(i => { portions[i] = (values[i] / remainingValue) * remainingPortion }); break }
      tiny.forEach(i => { portions[i] = minSlice; remainingPortion -= minSlice; remainingValue -= values[i] })
      remaining = remaining.filter(i => !tiny.includes(i))
    }
    const sweep = Math.PI * 2 * easeOut(t)
    const cuts = []
    let a = -Math.PI / 2
    portions.forEach((portion, i) => { const b = a + Math.PI * 2 * portion; cuts.push({ start: a, end: b, i }); a = b })

    const size = R * 2
    const grid = new Int16Array(size * size).fill(-1)
    const dist = new Float32Array(size * size)
    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        const dx = i - R + 0.5, dy = j - R + 0.5, d = Math.hypot(dx, dy)
        if (d > R || d < inner) continue
        let ang = Math.atan2(dy, dx)
        if (ang < -Math.PI / 2) ang += Math.PI * 2
        if (ang - -Math.PI / 2 > sweep) continue
        const slice = cuts.find(c => ang >= c.start && ang < c.end && c.end > c.start)
        if (slice) { grid[j * size + i] = slice.i; dist[j * size + i] = d }
      }
    }
    const at = (i, j) => (i < 0 || j < 0 || i >= size || j >= size ? -1 : grid[j * size + i])
    const ox = cx0 - R * p, oy = cy0 - R * p

    // Drop shadow / 3D wall
    if (cfg.shadow && !depthCells) {
      for (let j = 0; j < size; j++) runs(j, i => (at(i, j) >= 0 ? theme.shadow : null), p, p)
    }
    if (depthCells) {
      if (cfg.shadow) for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
        if (at(i, j) >= 0 && at(i, j + 1) < 0) rect(ox + (i + 1) * p, oy + (j + 1) * p, p, depthCells * p, theme.shadow)
      }
      for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
        const s = at(i, j)
        if (s >= 0 && at(i, j + 1) < 0) {
          const c = data[s].color
          rect(ox + i * p, oy + (j + 1) * p, p, depthCells * p, shade(c, -0.3))
          rect(ox + i * p, oy + (j + depthCells) * p, p, p, shade(c, -0.5))
        }
      }
    }
    // Top face, emitted as horizontal runs of identical colour.
    for (let j = 0; j < size; j++) {
      runs(j, i => {
        const s = at(i, j)
        if (s < 0) return null
        const c = data[s].color, d = dist[j * size + i]
        const edge = at(i - 1, j) !== s || at(i + 1, j) !== s || at(i, j - 1) !== s || at(i, j + 1) !== s
        if (edge && cfg.outline) return shade(c, -0.42)
        if (cfg.bevel && d > R - 1.6 && i < R && j < R) return shade(c, 0.28)
        if (cfg.bevel && d > R - 1.6 && i >= R && j >= R) return shade(c, -0.16)
        if (cfg.bevel && donut && d < inner + 1.2 && i >= R && j >= R) return shade(c, 0.2)
        if (cfg.pattern !== 'solid') {
          const f = (d - inner) / Math.max(1, R - inner)
          if (patternDark(i, j, cfg.pattern === 'dither' ? f : 0)) return shade(c, cfg.pattern === 'checker' ? -0.08 : -0.16)
        }
        return c
      })
    }
    function runs(j, colorAt, dx = 0, dy = 0) {
      let start = 0, cur = colorAt(0, j)
      for (let i = 1; i <= size; i++) {
        const c = i < size ? colorAt(i, j) : null
        if (c !== cur) { if (cur) rect(ox + start * p + dx, oy + j * p + dy, (i - start) * p, p, cur); start = i; cur = c }
      }
    }

    cuts.forEach(c => { if (c.end > c.start) hits.push({ kind: 'arc', cx: cx0, cy: cy0, r0: inner * p, r1: R * p, a0: c.start, a1: c.end, index: c.i }) })

    const ls = R * p > 220 ? 3 : TEXT
    if (done && cfg.labels !== 'none') {
      cuts.forEach(c => {
        if (values[c.i] / total < 0.05) return
        const mid = (c.start + c.end) / 2
        const lr = donut ? ((R + inner) / 2) * p : R * p * 0.6
        const txt = cfg.labels === 'percent' ? fmt.percent(values[c.i], total) : fmt.value(values[c.i])
        const lx = cx0 + Math.cos(mid) * lr, ly = cy0 + Math.sin(mid) * lr - (FONT_HEIGHT * ls) / 2
        const bg = data[c.i].color, fg = readableOn(bg)
        label(txt, lx + ls, ly + ls, ls, fg === '#ffffff' ? shade(bg, -0.5) : shade(bg, 0.45), 'center')
        label(txt, lx, ly, ls, fg, 'center')
      })
    }
    if (donut && done) {
      const txt = cfg.labels === 'percent' ? '100%' : fmt.axis(total)
      let s = Math.max(4, Math.min(7, Math.floor(inner * p / 30)))
      while (s > 2 && measureText(txt, s) > inner * p * 1.6) s--
      label(txt, cx0, cy0 - FONT_HEIGHT * s / 2 - 6, s, theme.ink, 'center')
      label(strings.total, cx0, cy0 + FONT_HEIGHT * s / 2, ls, theme.muted, 'center')
    }
  }

  function finish() {
    return { width: W, height: H, bg: cfg.transparent ? null : theme.bg, theme, rects, hits, data, total }
  }
}

// Stepped, staggered easing: bars rise in discrete frames like a sprite animation.
function easeSteps(t, i, n) {
  if (t >= 1) return 1
  const delay = (i / Math.max(1, n)) * 0.35
  const local = Math.max(0, Math.min(1, (t - delay) / 0.65))
  return Math.round(easeOut(local) * 12) / 12
}
function easeOut(t) { return 1 - (1 - t) ** 3 }

export function hitTest(scene, x, y) {
  for (let k = scene.hits.length - 1; k >= 0; k--) {
    const h = scene.hits[k]
    if (h.kind === 'rect') {
      if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h
    } else {
      const dx = x - h.cx, dy = y - h.cy, d = Math.hypot(dx, dy)
      if (d < h.r0 || d > h.r1) continue
      let a = Math.atan2(dy, dx)
      if (a < -Math.PI / 2) a += Math.PI * 2
      if (a >= h.a0 && a < h.a1) return h
    }
  }
  return null
}
