import { paintCanvas, sceneToSVG } from './render.js'
import { slugify, toNumber } from './format.js'
import { isHex } from './color.js'
import { encodeScenesToGIF } from './gif.js'

export const RASTER_FORMATS = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }
export const FORMATS = ['png', 'svg', 'gif', 'jpg', 'webp']
export const GIF_SCALES = [1, 2]

// Entrance animation timeline: ~20fps stepped frames, then hold the final chart.
export const GIF_FRAMES = 18
export const GIF_FRAME_MS = 50
export const GIF_HOLD_MS = 3000
export const SCALES = [1, 2, 4]

export function describe(scene, title) {
  return `${title || 'Chart'}: ` + scene.data.map(d => `${d.label} ${d.value}`).join(', ')
}

export function renderBlob(scene, { format = 'png', scale = 1, title = '' } = {}) {
  if (format === 'svg') {
    const svg = sceneToSVG(scene, { title, description: describe(scene, title), scale })
    return Promise.resolve(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  }
  const canvas = document.createElement('canvas')
  // JPEG has no alpha: fall back to the theme background.
  paintCanvas(canvas, scene, scale, { background: format === 'jpg' && !scene.bg ? scene.theme.bg : undefined })
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('encode-failed'))), RASTER_FORMATS[format] || 'image/png', 0.95)
  })
}

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function downloadChart(scene, { format, scale, title }) {
  const blob = await renderBlob(scene, { format, scale, title })
  const suffix = format === 'svg' || scale === 1 ? '' : `@${scale}x`
  saveBlob(blob, `${slugify(title)}${suffix}.${format}`)
  return blob
}

/** buildFrame(t) must return the scene at animation progress t ∈ [0, 1]. */
export async function downloadGIF(buildFrame, { scale = 1, loop = true, title = '', onProgress } = {}) {
  const frames = []
  for (let i = 0; i <= GIF_FRAMES; i++) {
    const t = i / GIF_FRAMES
    frames.push({ scene: buildFrame(t), delay: i === GIF_FRAMES ? GIF_HOLD_MS : GIF_FRAME_MS })
  }
  const bytes = await encodeScenesToGIF(frames, { scale, loop, onProgress })
  const blob = new Blob([bytes], { type: 'image/gif' })
  const filename = `${slugify(title)}${scale === 1 ? '' : `@${scale}x`}.gif`
  saveBlob(blob, filename)
  return { blob, filename }
}

export async function copyChart(scene, { scale = 2 } = {}) {
  if (!navigator.clipboard || typeof window.ClipboardItem === 'undefined') throw new Error('clipboard-unsupported')
  const blob = await renderBlob(scene, { format: 'png', scale })
  await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })])
}

// --- data files --------------------------------------------------------------
const csvCell = v => {
  const s = String(v ?? '')
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCSV(rows) {
  return ['label,value,color', ...rows.map(r => [csvCell(r.label), r.value, r.color || ''].join(','))].join('\n')
}

/** Parse CSV/TSV/semicolon text: "label,value[,color]" per line, optional header. */
export function parseCSV(text) {
  const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (!lines.length) return []
  const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ','
  const split = line => {
    const out = []
    let cur = '', q = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (q) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ } else if (ch === '"') q = false
        else cur += ch
      } else if (ch === '"') q = true
      else if (ch === sep) { out.push(cur); cur = '' }
      else cur += ch
    }
    out.push(cur)
    return out.map(s => s.trim())
  }
  const rows = lines.map(split)
  const header = rows[0]
  const hasHeader = header.length >= 2 && !/\d/.test(header[1])
  return rows.slice(hasHeader ? 1 : 0)
    .filter(r => r[0] !== undefined && r.length >= 2)
    .slice(0, 24)
    .map(r => ({ label: r[0].slice(0, 24), value: toNumber(r[1]), color: isHex(r[2]) ? r[2] : null }))
}

export function projectToJSON(project) {
  return JSON.stringify({ app: 'pixelgraphy', version: 2, ...project }, null, 2)
}

export function parseProject(text) {
  const obj = JSON.parse(text)
  if (!obj || !Array.isArray(obj.data)) throw new Error('invalid-project')
  return obj
}
