import { DEFAULT_STYLE } from './chart/scene.js'
import { STRINGS, PRESET_TYPES } from './i18n/strings.js'
import { isHex } from './chart/color.js'
import { toNumber } from './chart/format.js'

export const MAX_ROWS = 16
let seq = 0
export const uid = () => `r${Date.now().toString(36)}${(seq++).toString(36)}`

export function presetProject(key, lang, base = {}) {
  const p = STRINGS[lang].presets[key]
  return {
    ...DEFAULT_STYLE,
    ...base,
    type: base.type ?? PRESET_TYPES[key] ?? 'bar',
    title: p.title,
    subtitle: p.subtitle,
    prefix: p.prefix || '',
    suffix: p.suffix || '',
    labels: key === 'share' ? 'percent' : base.labels ?? 'value',
    data: p.rows.map(([label, value]) => ({ id: uid(), label, value, color: null })),
    preset: key,
    pristine: true,
  }
}

/** Sanitise anything coming from storage or an imported file. */
export function normalizeProject(raw, lang) {
  if (!raw || !Array.isArray(raw.data)) return presetProject('week', lang)
  const out = { ...DEFAULT_STYLE }
  for (const key of Object.keys(DEFAULT_STYLE)) if (raw[key] !== undefined) out[key] = raw[key]
  out.title = String(raw.title ?? '').slice(0, 64)
  out.subtitle = String(raw.subtitle ?? '').slice(0, 90)
  out.data = raw.data.slice(0, MAX_ROWS).map(d => ({
    id: uid(),
    label: String(d.label ?? '').slice(0, 24),
    value: toNumber(d.value),
    color: isHex(d.color) ? d.color : null,
  }))
  out.preset = raw.preset ?? null
  out.pristine = !!raw.pristine
  return out
}

export function serializable(project) {
  const { pristine, preset, ...rest } = project
  return { ...rest, data: project.data.map(({ id, ...d }) => d) }
}

export function reducer(state, action) {
  const touched = { pristine: false }
  switch (action.type) {
    case 'set':
      return { ...state, ...action.patch, ...(action.keepPristine ? null : touched) }
    case 'row':
      return { ...state, ...touched, data: state.data.map(r => (r.id === action.id ? { ...r, ...action.patch } : r)) }
    case 'add': {
      if (state.data.length >= MAX_ROWS) return state
      return { ...state, ...touched, data: [...state.data, { id: uid(), label: action.label, value: 1, color: null }] }
    }
    case 'remove':
      return state.data.length <= 1 ? state : { ...state, ...touched, data: state.data.filter(r => r.id !== action.id) }
    case 'move': {
      const i = state.data.findIndex(r => r.id === action.id), j = i + action.dir
      if (i < 0 || j < 0 || j >= state.data.length) return state
      const data = [...state.data];
      [data[i], data[j]] = [data[j], data[i]]
      return { ...state, ...touched, data }
    }
    case 'sort': {
      const data = [...state.data]
      if (action.by === 'asc') data.sort((a, b) => toNumber(a.value) - toNumber(b.value))
      if (action.by === 'desc') data.sort((a, b) => toNumber(b.value) - toNumber(a.value))
      if (action.by === 'az') data.sort((a, b) => a.label.localeCompare(b.label))
      return { ...state, ...touched, data }
    }
    case 'data':
      return { ...state, ...touched, data: action.rows.slice(0, MAX_ROWS).map(r => ({ id: uid(), ...r })) }
    case 'resetColors':
      return { ...state, ...touched, data: state.data.map(r => ({ ...r, color: null })) }
    case 'load':
      return action.project
    default:
      return state
  }
}
