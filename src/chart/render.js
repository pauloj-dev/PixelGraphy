/** Paint a scene onto a canvas at an integer scale (1x, 2x, 4x…). */
export function paintCanvas(canvas, scene, scale = 1, { background } = {}) {
  canvas.width = scene.width * scale
  canvas.height = scene.height * scale
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  ctx.clearRect(0, 0, scene.width, scene.height)
  const bg = background ?? scene.bg
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, scene.width, scene.height) }
  let current = null
  for (const r of scene.rects) {
    if (r.c !== current) { ctx.fillStyle = r.c; current = r.c }
    ctx.fillRect(r.x, r.y, r.w, r.h)
  }
  return canvas
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * Serialise the scene to SVG. Consecutive rectangles sharing a colour are merged
 * into one <path> (draw order is preserved), with crispEdges for sharp pixels.
 */
export function sceneToSVG(scene, { title = '', description = '', scale = 1 } = {}) {
  const parts = []
  let color = null, d = ''
  const flush = () => { if (d) parts.push(`<path fill="${color}" d="${d}"/>`); d = '' }
  for (const r of scene.rects) {
    if (r.c !== color) { flush(); color = r.c }
    d += `M${r.x} ${r.y}h${r.w}v${r.h}h${-r.w}z`
  }
  flush()
  const w = scene.width, h = scene.height
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w * scale}" height="${h * scale}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" role="img">`,
    title ? `<title>${esc(title)}</title>` : '',
    description ? `<desc>${esc(description)}</desc>` : '',
    scene.bg ? `<rect width="${w}" height="${h}" fill="${scene.bg}"/>` : '',
    ...parts,
    '</svg>',
  ].join('')
}
