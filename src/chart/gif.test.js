import { describe, it, expect } from 'vitest'
import { lzwEncode, encodeScenesToGIF, buildPalette } from './gif.js'
import { buildScene } from './scene.js'
import { parseHex } from './color.js'

// Small reference decoder used only to verify the encoder round-trips.
function lzwDecode(bytes, pos) {
  const minCode = bytes[pos++]
  const data = []
  for (let n = bytes[pos++]; n; n = bytes[pos++]) { for (let i = 0; i < n; i++) data.push(bytes[pos++]) }
  const clear = 1 << minCode, eoi = clear + 1
  let size = minCode + 1, dict = [], prev = null, bit = 0
  const out = []
  const reset = () => { dict = []; for (let i = 0; i < clear; i++) dict[i] = [i]; dict[clear] = []; dict[eoi] = null; size = minCode + 1; prev = null }
  reset()
  for (;;) {
    let code = 0
    for (let i = 0; i < size; i++, bit++) code |= ((data[bit >> 3] >> (bit & 7)) & 1) << i
    if (code === clear) { reset(); continue }
    if (code === eoi) break
    let entry
    if (code < dict.length) entry = dict[code]
    else entry = [...dict[prev], dict[prev][0]]
    out.push(...entry)
    if (prev !== null && dict.length < 4096) dict.push([...dict[prev], entry[0]])
    prev = code
    if (dict.length === 1 << size && size < 12) size++
  }
  return { indices: out, pos }
}

function decodeGIF(bytes) {
  const dv = i => bytes[i] | (bytes[i + 1] << 8)
  expect(String.fromCharCode(...bytes.slice(0, 6))).toBe('GIF89a')
  const W = dv(6), H = dv(8), packed = bytes[10]
  const tableSize = 1 << ((packed & 7) + 1)
  const palette = []
  let pos = 13
  for (let i = 0; i < tableSize; i++, pos += 3) palette.push([bytes[pos], bytes[pos + 1], bytes[pos + 2]])
  const canvas = new Int16Array(W * H).fill(-1)
  const frames = []
  let gce = {}, loop = false
  while (bytes[pos] !== 0x3b) {
    if (bytes[pos] === 0x21) {
      const label = bytes[pos + 1]; pos += 2
      if (label === 0xf9) { const p = bytes[pos + 1]; gce = { disposal: (p >> 2) & 7, transparent: p & 1 ? bytes[pos + 4] : -1, delay: dv(pos + 2) } }
      if (label === 0xff) loop = true
      for (let n = bytes[pos++]; n; n = bytes[pos++]) pos += n
    } else if (bytes[pos] === 0x2c) {
      const x = dv(pos + 1), y = dv(pos + 3), w = dv(pos + 5), h = dv(pos + 7)
      pos += 10
      const r = lzwDecode(bytes, pos); pos = r.pos
      expect(r.indices.length).toBe(w * h)
      if (gce.disposal === 2) canvas.fill(-1)
      r.indices.forEach((v, i) => { if (v !== gce.transparent) canvas[(y + Math.floor(i / w)) * W + x + (i % w)] = v })
      frames.push({ ...gce, snapshot: Int16Array.from(canvas) })
    } else throw new Error('bad block ' + bytes[pos])
  }
  return { W, H, palette, frames, loop }
}

const data = [{ label: 'Seg', value: 3 }, { label: 'Ter', value: 5 }, { label: 'Qua', value: 9 }]

function expectFrameMatches(gif, scene, scale) {
  const last = gif.frames[gif.frames.length - 1].snapshot
  // spot-check every rect's top-left pixel colour
  for (const r of scene.rects.slice(-400)) {
    const x = r.x * scale, y = r.y * scale
    if (x < 0 || y < 0 || x >= gif.W || y >= gif.H) continue
    // later rects may overlap earlier ones; only check the topmost (last drawn) at that pixel
    const top = [...scene.rects].reverse().find(q => r.x >= q.x && r.x < q.x + q.w && r.y >= q.y && r.y < q.y + q.h)
    expect(gif.palette[last[y * gif.W + x]]).toEqual(parseHex(top.c))
  }
}

describe('gif encoder', () => {
  it('lzw round-trips long, repetitive and code-table-overflowing input', () => {
    const input = Uint8Array.from({ length: 60000 }, (_, i) => (i * 7 + (i >> 5)) % 13)
    const bytes = lzwEncode(input, 4)
    expect(lzwDecode(bytes, 0).indices).toEqual([...input])
  })
  it('maps excess colours to the nearest kept colour', () => {
    const counts = new Map([['#000000', 10], ['#ffffff', 9], ['#010101', 1]])
    const { colors, lookup } = buildPalette(counts, 2)
    expect(colors).toEqual(['#000000', '#ffffff'])
    expect(lookup.get('#010101')).toBe(0)
  })
  for (const type of ['bar', 'donut', 'area']) {
    it(`encodes an opaque animated ${type} chart whose last frame equals the final scene`, async () => {
      const frames = [0, 0.25, 0.5, 0.75, 1].map(t => ({ scene: buildScene({ title: 'GIF', data, type }, { progress: t }), delay: t === 1 ? 2000 : 50 }))
      const gif = decodeGIF(await encodeScenesToGIF(frames, { scale: 1 }))
      expect(gif.loop).toBe(true)
      expect(gif.frames.length).toBeGreaterThan(2)
      expect(gif.frames.at(-1).delay).toBe(200)
      expect(gif.frames.at(-1).snapshot.includes(-1)).toBe(false)
      expectFrameMatches(gif, frames.at(-1).scene, 1)
    })
  }
  it('supports transparency, scale 2 and no-loop', async () => {
    const frames = [0.3, 1].map(t => ({ scene: buildScene({ data, type: 'bar', transparent: true }, { progress: t }), delay: 100 }))
    const gif = decodeGIF(await encodeScenesToGIF(frames, { scale: 2, loop: false }))
    expect(gif.W).toBe(frames[0].scene.width * 2)
    expect(gif.loop).toBe(false)
    expect(gif.frames.every(f => f.disposal === 2 && f.transparent >= 0)).toBe(true)
    expect(gif.frames.at(-1).snapshot[0]).toBe(-1) // corner stays transparent
    expectFrameMatches(gif, frames.at(-1).scene, 2)
  })
})
