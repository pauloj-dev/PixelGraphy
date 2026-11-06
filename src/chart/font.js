// 5×7 bitmap font. Every glyph is a list of rows; '#' is an "on" dot.
// Text is rendered as rectangles, so SVG exports stay self-contained and crisp.
const G = {
  A: '.###.|#...#|#...#|#####|#...#|#...#|#...#',
  B: '####.|#...#|#...#|####.|#...#|#...#|####.',
  C: '.###.|#...#|#....|#....|#....|#...#|.###.',
  D: '####.|#...#|#...#|#...#|#...#|#...#|####.',
  E: '#####|#....|#....|####.|#....|#....|#####',
  F: '#####|#....|#....|####.|#....|#....|#....',
  G: '.###.|#...#|#....|#.###|#...#|#...#|.####',
  H: '#...#|#...#|#...#|#####|#...#|#...#|#...#',
  I: '###|.#.|.#.|.#.|.#.|.#.|###',
  J: '..###|...#.|...#.|...#.|#..#.|#..#.|.##..',
  K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#',
  L: '#....|#....|#....|#....|#....|#....|#####',
  M: '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#',
  N: '#...#|#...#|##..#|#.#.#|#..##|#...#|#...#',
  O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.',
  P: '####.|#...#|#...#|####.|#....|#....|#....',
  Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#',
  R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
  S: '.####|#....|#....|.###.|....#|....#|####.',
  T: '#####|..#..|..#..|..#..|..#..|..#..|..#..',
  U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.',
  V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..',
  W: '#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.',
  X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
  Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..',
  Z: '#####|....#|...#.|..#..|.#...|#....|#####',
  0: '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.',
  1: '..#..|.##..|..#..|..#..|..#..|..#..|.###.',
  2: '.###.|#...#|....#|...#.|..#..|.#...|#####',
  3: '####.|....#|....#|.###.|....#|....#|####.',
  4: '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.',
  5: '#####|#....|####.|....#|....#|#...#|.###.',
  6: '.###.|#....|#....|####.|#...#|#...#|.###.',
  7: '#####|....#|...#.|..#..|.#...|.#...|.#...',
  8: '.###.|#...#|#...#|.###.|#...#|#...#|.###.',
  9: '.###.|#...#|#...#|.####|....#|....#|.###.',
  ' ': '...|...|...|...|...|...|...',
  '.': '.|.|.|.|.|.|#',
  ',': '..|..|..|..|..|.#|#.',
  ':': '.|.|#|.|.|#|.',
  ';': '..|..|.#|..|..|.#|#.',
  '-': '....|....|....|####|....|....|....',
  '+': '.....|..#..|..#..|#####|..#..|..#..|.....',
  '=': '.....|.....|#####|.....|#####|.....|.....',
  '%': '##..#|##..#|...#.|..#..|.#...|#..##|#..##',
  '/': '....#|...#.|...#.|..#..|.#...|.#...|#....',
  '(': '.#|#.|#.|#.|#.|#.|.#',
  ')': '#.|.#|.#|.#|.#|.#|#.',
  '[': '##|#.|#.|#.|#.|#.|##',
  ']': '##|.#|.#|.#|.#|.#|##',
  '!': '#|#|#|#|#|.|#',
  '?': '.###.|#...#|....#|...#.|..#..|.....|..#..',
  "'": '#|#|.|.|.|.|.',
  '"': '#.#|#.#|...|...|...|...|...',
  '$': '..#..|.####|#.#..|.###.|..#.#|####.|..#..',
  '€': '..###|.#...|####.|.#...|####.|.#...|..###',
  '£': '..##.|.#..#|.#...|###..|.#...|.#...|#####',
  '&': '.##..|#..#.|.##..|.#...|#.#.#|#..#.|.##.#',
  '#': '.#.#.|#####|.#.#.|.#.#.|#####|.#.#.|.....',
  '*': '.....|#.#.#|.###.|#####|.###.|#.#.#|.....',
  '_': '.....|.....|.....|.....|.....|.....|#####',
  '<': '...#|..#.|.#..|#...|.#..|..#.|...#',
  '>': '#...|.#..|..#.|...#|..#.|.#..|#...',
  '·': '.|.|.|#|.|.|.',
  '°': '.#.|#.#|.#.|...|...|...|...',
  '×': '.....|#...#|.#.#.|..#..|.#.#.|#...#|.....',
  '…': '.....|.....|.....|.....|.....|.....|#.#.#',
  '↑': '..#..|.###.|#.#.#|..#..|..#..|..#..|..#..',
  '↓': '..#..|..#..|..#..|..#..|#.#.#|.###.|..#..',
}

// Combining marks, drawn above (negative rows) or below the base glyph.
const MARKS = {
  '́': { rows: ['...#.', '..#..'], y: -3 },
  '̀': { rows: ['.#...', '..#..'], y: -3 },
  '̂': { rows: ['..#..', '.#.#.'], y: -3 },
  '̃': { rows: ['.##.#', '#..#.'], y: -3 },
  '̈': { rows: ['.#.#.'], y: -2 },
  '̧': { rows: ['..#..', '.#...'], y: 7 },
}

const cache = new Map()
function parse(def) {
  const rows = def.split('|')
  return { rows, w: rows[0].length }
}
function glyph(ch) {
  if (cache.has(ch)) return cache.get(ch)
  const def = G[ch]
  const g = def ? parse(def) : null
  cache.set(ch, g)
  return g
}

/** Split text into drawable units: base glyph + optional marks. */
function units(text) {
  const out = []
  const src = String(text ?? '')
    .replace(/[   ]/g, ' ')
    .toUpperCase()
    .normalize('NFD')
  for (const ch of src) {
    if (MARKS[ch]) {
      if (out.length) out[out.length - 1].marks.push(MARKS[ch])
      continue
    }
    const g = glyph(ch) || glyph('?')
    out.push({ g, marks: [] })
  }
  return out
}

export const FONT_HEIGHT = 7

export function measureText(text, scale = 1) {
  const u = units(text)
  if (!u.length) return 0
  const dots = u.reduce((sum, { g }) => sum + g.w + 1, -1)
  return dots * scale
}

/** Truncate with an ellipsis so the text fits maxWidth. */
export function fitText(text, scale, maxWidth) {
  const str = String(text ?? '')
  if (measureText(str, scale) <= maxWidth) return str
  let out = str
  while (out.length > 1 && measureText(out + '…', scale) > maxWidth) out = out.slice(0, -1)
  return out.length <= 1 ? out : out.trimEnd() + '…'
}

/**
 * Emit rectangles for text. Horizontal runs inside each glyph row are merged
 * to keep the scene (and SVG) small.
 * align: 'left' | 'center' | 'right'; y is the top of the cap height.
 */
export function textRects(text, x, y, scale, color, align = 'left') {
  const u = units(text)
  const width = measureText(text, scale)
  let cx = align === 'center' ? x - width / 2 : align === 'right' ? x - width : x
  cx = Math.round(cx / scale) * scale
  const top = Math.round(y)
  const rects = []
  const paint = (rows, ox, oy, gw) => {
    rows.forEach((row, ry) => {
      let start = -1
      for (let i = 0; i <= row.length; i++) {
        const on = row[i] === '#'
        if (on && start < 0) start = i
        if (!on && start >= 0) {
          rects.push({ x: ox + start * scale, y: oy + ry * scale, w: (i - start) * scale, h: scale, c: color })
          start = -1
        }
      }
    })
    return gw
  }
  for (const { g, marks } of u) {
    paint(g.rows, cx, top, g.w)
    for (const m of marks) {
      const offset = Math.floor((g.w - m.rows[0].length) / 2)
      paint(m.rows, cx + offset * scale, top + m.y * scale, g.w)
    }
    cx += (g.w + 1) * scale
  }
  return rects
}
