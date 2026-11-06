import { parseHex } from './color.js'

/**
 * Minimal animated GIF89a encoder, tailored to pixel-art scenes:
 * - scenes are rasterised straight into palette indices (no canvas, no anti-aliasing);
 * - pixel art uses few colours, so a single global palette is exact in practice
 *   (if a scene ever exceeds 255 colours, the rarest ones map to their nearest neighbour);
 * - opaque animations only encode the rectangle that changed since the previous frame.
 */

class ByteWriter {
  constructor(size = 1 << 16) { this.buf = new Uint8Array(size); this.len = 0 }
  ensure(n) {
    if (this.len + n <= this.buf.length) return
    let size = this.buf.length * 2
    while (size < this.len + n) size *= 2
    const next = new Uint8Array(size); next.set(this.buf.subarray(0, this.len)); this.buf = next
  }
  byte(b) { this.ensure(1); this.buf[this.len++] = b & 255 }
  word(w) { this.byte(w); this.byte(w >> 8) }
  bytes(arr) { this.ensure(arr.length); this.buf.set(arr, this.len); this.len += arr.length }
  str(s) { for (let i = 0; i < s.length; i++) this.byte(s.charCodeAt(i)) }
  result() { return this.buf.slice(0, this.len) }
}

export function lzwEncode(indices, minCodeSize) {
  const out = new ByteWriter(Math.max(1024, indices.length >> 1))
  const clearCode = 1 << minCodeSize, eoi = clearCode + 1
  let codeSize = minCodeSize + 1, next = eoi + 1
  let dict = new Map()
  let bitBuf = 0, bitCount = 0
  // Sub-blocks of up to 255 bytes are produced on the fly.
  const block = new Uint8Array(255)
  let blockLen = 0
  const pushByte = b => { block[blockLen++] = b; if (blockLen === 255) { out.byte(255); out.bytes(block); blockLen = 0 } }
  const emit = code => {
    bitBuf |= code << bitCount
    bitCount += codeSize
    while (bitCount >= 8) { pushByte(bitBuf & 255); bitBuf >>>= 8; bitCount -= 8 }
  }
  out.byte(minCodeSize)
  emit(clearCode)
  let prefix = indices[0]
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i]
    const key = (prefix << 8) | k
    const code = dict.get(key)
    if (code !== undefined) { prefix = code; continue }
    emit(prefix)
    if (next === 4096) {
      emit(clearCode)
      dict = new Map(); next = eoi + 1; codeSize = minCodeSize + 1
    } else {
      if (next >= 1 << codeSize) codeSize++
      dict.set(key, next++)
    }
    prefix = k
  }
  emit(prefix)
  emit(eoi)
  if (bitCount > 0) pushByte(bitBuf & 255)
  if (blockLen) { out.byte(blockLen); out.bytes(block.subarray(0, blockLen)) }
  out.byte(0)
  return out.result()
}

/** Build a palette (≤ maxColors) and a hex → index lookup covering every colour used. */
export function buildPalette(colorCounts, maxColors) {
  const sorted = [...colorCounts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c)
  const keep = sorted.slice(0, maxColors)
  const rgb = keep.map(parseHex)
  const lookup = new Map(keep.map((c, i) => [c, i]))
  for (const c of sorted.slice(maxColors)) {
    const [r, g, b] = parseHex(c)
    let best = 0, bestD = Infinity
    rgb.forEach(([R, G, B], i) => { const d = (R - r) ** 2 + (G - g) ** 2 + (B - b) ** 2; if (d < bestD) { bestD = d; best = i } })
    lookup.set(c, best)
  }
  return { colors: keep, lookup }
}

export function rasterize(scene, scale, lookup, bgIndex) {
  const W = scene.width * scale, H = scene.height * scale
  const px = new Uint8Array(W * H).fill(bgIndex)
  for (const r of scene.rects) {
    const idx = lookup.get(r.c)
    const x0 = Math.max(0, r.x * scale), x1 = Math.min(W, (r.x + r.w) * scale)
    const y0 = Math.max(0, r.y * scale), y1 = Math.min(H, (r.y + r.h) * scale)
    if (x1 <= x0) continue
    for (let y = y0; y < y1; y++) px.fill(idx, y * W + x0, y * W + x1)
  }
  return px
}

/**
 * Encode a list of scenes (same size) as an animated GIF.
 * frames: [{ scene, delay }] with delay in milliseconds.
 */
export async function encodeScenesToGIF(frames, { scale = 1, loop = true, onProgress } = {}) {
  const first = frames[0].scene
  const transparent = !first.bg
  const counts = new Map()
  for (const { scene } of frames) for (const r of scene.rects) counts.set(r.c, (counts.get(r.c) || 0) + r.w * r.h)
  if (!transparent) counts.set(first.bg, (counts.get(first.bg) || 0) + 1e12)
  const { colors, lookup } = buildPalette(counts, transparent ? 255 : 256)
  const tIndex = transparent ? colors.length : -1
  const bgIndex = transparent ? tIndex : lookup.get(first.bg)
  const total = colors.length + (transparent ? 1 : 0)
  const bits = Math.max(1, Math.ceil(Math.log2(Math.max(2, total))))
  const minCode = Math.max(2, bits)

  const W = first.width * scale, H = first.height * scale
  const out = new ByteWriter(1 << 20)
  out.str('GIF89a')
  out.word(W); out.word(H)
  out.byte(0x80 | ((bits - 1) << 4) | (bits - 1))
  out.byte(transparent ? tIndex : bgIndex); out.byte(0)
  const table = new Uint8Array(3 * (1 << bits))
  colors.forEach((c, i) => table.set(parseHex(c), i * 3))
  out.bytes(table)
  if (loop) { out.byte(0x21); out.byte(0xff); out.byte(11); out.str('NETSCAPE2.0'); out.byte(3); out.byte(1); out.word(0); out.byte(0) }

  // Rasterise and merge identical consecutive frames.
  const rasters = []
  for (const f of frames) {
    const px = rasterize(f.scene, scale, lookup, bgIndex)
    const prev = rasters[rasters.length - 1]
    if (prev && sameBuffer(prev.px, px)) prev.delay += f.delay
    else rasters.push({ px, delay: f.delay })
  }

  for (let n = 0; n < rasters.length; n++) {
    const { px, delay } = rasters[n]
    let x = 0, y = 0, w = W, h = H
    if (!transparent && n > 0) ({ x, y, w, h } = diffBox(rasters[n - 1].px, px, W, H))
    const region = w === W && h === H ? px : crop(px, W, x, y, w, h)
    // GCE: disposal 1 (keep) for opaque deltas, 2 (restore bg) for transparent full frames.
    out.byte(0x21); out.byte(0xf9); out.byte(4)
    out.byte(((transparent ? 2 : 1) << 2) | (transparent ? 1 : 0))
    out.word(Math.max(2, Math.round(delay / 10)))
    out.byte(transparent ? tIndex : 0); out.byte(0)
    out.byte(0x2c); out.word(x); out.word(y); out.word(w); out.word(h); out.byte(0)
    out.bytes(lzwEncode(region, minCode))
    onProgress?.((n + 1) / rasters.length)
    await new Promise(r => setTimeout(r, 0)) // keep the UI responsive
  }
  out.byte(0x3b)
  return out.result()
}

function sameBuffer(a, b) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

function diffBox(a, b, W, H) {
  let minX = W, minY = H, maxX = -1, maxY = -1
  for (let y = 0; y < H; y++) {
    const row = y * W
    for (let x = 0; x < W; x++) {
      if (a[row + x] !== b[row + x]) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        maxY = y
      }
    }
  }
  if (maxX < 0) return { x: 0, y: 0, w: 1, h: 1 }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
}

function crop(px, W, x, y, w, h) {
  const out = new Uint8Array(w * h)
  for (let j = 0; j < h; j++) out.set(px.subarray((y + j) * W + x, (y + j) * W + x + w), j * w)
  return out
}

