export function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const s = String(value ?? '').trim().replace(/\s/g, '')
  if (!s) return 0
  // Accept both 1.234,5 (pt-BR) and 1,234.5 (en-US).
  let normalized = s
  if (/,\d{1,}$/.test(s) && s.includes('.')) normalized = s.replace(/\./g, '').replace(',', '.')
  else if (/^-?\d+,\d+$/.test(s)) normalized = s.replace(',', '.')
  else normalized = s.replace(/,/g, '')
  const n = Number.parseFloat(normalized)
  return Number.isFinite(n) ? n : 0
}

export function makeFormatter({ locale = 'pt-BR', prefix = '', suffix = '', decimals = 'auto' } = {}) {
  const fixed = decimals === 'auto' ? null : Number(decimals)
  const plain = new Intl.NumberFormat(locale, fixed == null ? { maximumFractionDigits: 2 } : { minimumFractionDigits: fixed, maximumFractionDigits: fixed })
  const compact = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 })
  const wrap = s => `${prefix}${s}${suffix}`
  return {
    value: v => wrap(plain.format(v)),
    axis: v => wrap(Math.abs(v) >= 10000 ? compact.format(v) : plain.format(v)),
    percent: (v, ref) => `${ref ? Math.round((v / ref) * 100) : 0}%`,
  }
}

/** "Nice" axis maximum with a fixed number of ticks. */
export function niceScale(maxValue, ticks = 4) {
  if (!(maxValue > 0)) return { max: ticks, step: 1 }
  const raw = maxValue / ticks
  const mag = 10 ** Math.floor(Math.log10(raw))
  const norm = raw / mag
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag
  return { max: step * ticks, step }
}

export function slugify(text, fallback = 'grafico-pixel') {
  const slug = String(text || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return slug || fallback
}
