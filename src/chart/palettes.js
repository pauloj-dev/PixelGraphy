export const PALETTES = {
  forest: ['#316b4d', '#e7a95e', '#5d93a8', '#df7b73', '#8aa774', '#8b82b7', '#d08b5b', '#82b4b3'],
  arcade: ['#ff4d6d', '#ffb703', '#3a86ff', '#06d6a0', '#8338ec', '#fb5607', '#00b4d8', '#f15bb5'],
  ember: ['#a8322d', '#e0703a', '#f2b544', '#7a4b3a', '#d9905a', '#5c2a3d', '#c45a49', '#efd29c'],
  ocean: ['#0b3c7a', '#1d7fc4', '#38b6d8', '#8fdcef', '#2a5aa8', '#4fc3c0', '#0d6e8c', '#b8ecf5'],
  candy: ['#f28fad', '#78cfcb', '#9ad98f', '#f6c56c', '#b39ddb', '#ff9e7a', '#7fb3f0', '#e6a8e0'],
  mono: ['#22302a', '#40504a', '#5f6f68', '#7f8e87', '#9eaca5', '#bdc8c2', '#334039', '#6e7d76'],
  handheld: ['#0f380f', '#306230', '#5a8a1f', '#8bac0f', '#1f4d1f', '#46762a', '#739b19', '#a4c13a'],
}

export const PALETTE_IDS = Object.keys(PALETTES)

// Image themes (the exported picture), independent from the site theme.
export const CHART_THEMES = {
  paper: { bg: '#fbf8ef', ink: '#1f2a24', muted: '#66705f', grid: '#e4dfd0', axis: '#b6af9c', shadow: '#e2dccb', panel: '#f3efe2' },
  night: { bg: '#12181d', ink: '#eef2e6', muted: '#93a0a8', grid: '#222c34', axis: '#3c4954', shadow: '#070a0d', panel: '#1a2229' },
  handheld: { bg: '#9bbc0f', ink: '#0f380f', muted: '#306230', grid: '#8bac0f', axis: '#306230', shadow: '#7f9e0c', panel: '#8bac0f' },
  blueprint: { bg: '#173a6b', ink: '#eaf2ff', muted: '#a7bfe3', grid: '#22497f', axis: '#4f74aa', shadow: '#0e2648', panel: '#1d4377' },
}

export const CHART_THEME_IDS = ['auto', ...Object.keys(CHART_THEMES)]

export function resolveTheme(id, siteTheme = 'light') {
  if (id === 'auto' || !CHART_THEMES[id]) return CHART_THEMES[siteTheme === 'dark' ? 'night' : 'paper']
  return CHART_THEMES[id]
}
