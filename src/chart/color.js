export function parseHex(hex) {
  let h = String(hex || '').trim().replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  if (!/^[0-9a-f]{6}$/i.test(h)) return [0, 0, 0]
  const n = Number.parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function toHex([r, g, b]) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
}

export function isHex(value) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value || '').trim())
}

export function mix(a, b, t) {
  const A = parseHex(a), B = parseHex(b)
  return toHex(A.map((v, i) => v + (B[i] - v) * t))
}

/** amount > 0 lightens towards white, < 0 darkens towards a cool near-black (pixel-art style hue shift). */
export function shade(hex, amount) {
  return amount >= 0 ? mix(hex, '#fffbe8', amount) : mix(hex, '#141022', -amount)
}

export function luminance(hex) {
  const [r, g, b] = parseHex(hex).map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a, b) {
  const la = luminance(a), lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** Pick whichever of the two candidates reads best on `bg`. */
export function readableOn(bg, dark = '#141a17', light = '#ffffff') {
  return contrast(bg, dark) >= contrast(bg, light) ? dark : light
}

/** Nudge a colour lighter/darker until it reaches `min` contrast against `bg`. */
export function ensureContrast(hex, bg, min = 3) {
  if (contrast(hex, bg) >= min) return hex
  const dir = luminance(bg) < 0.4 ? 1 : -1
  let out = hex
  for (let k = 1; k <= 8 && contrast(out, bg) < min; k++) out = shade(hex, dir * k * 0.1)
  return out
}
