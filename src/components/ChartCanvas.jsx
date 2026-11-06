import { useEffect, useRef, useState } from 'react'
import { paintCanvas } from '../chart/render.js'
import { hitTest } from '../chart/scene.js'

/**
 * Paints a prepared scene. Tooltips use the scene's hit regions, and the
 * canvas is drawn at an integer device scale so every pixel stays sharp.
 */
export default function ChartCanvas({ scene, label, formatTip, interactive = true, className = '' }) {
  const ref = useRef(null)
  const [tip, setTip] = useState(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || !scene) return
    const scale = Math.min(3, Math.max(1, Math.ceil(window.devicePixelRatio || 1)))
    paintCanvas(canvas, scene, scale)
  }, [scene])

  function locate(clientX, clientY) {
    const canvas = ref.current
    const box = canvas.getBoundingClientRect()
    const x = ((clientX - box.left) / box.width) * scene.width
    const y = ((clientY - box.top) / box.height) * scene.height
    const hit = hitTest(scene, x, y)
    if (!hit) return setTip(null)
    setTip({ left: ((clientX - box.left) / box.width) * 100, top: ((clientY - box.top) / box.height) * 100, index: hit.index })
  }

  const datum = tip && scene?.data[tip.index]

  return (
    <div className={`chart-canvas ${className}`} style={scene ? { '--ar': scene.width / scene.height } : undefined}>
      <canvas
        ref={ref}
        role="img"
        aria-label={label}
        onPointerMove={interactive ? e => locate(e.clientX, e.clientY) : undefined}
        onPointerDown={interactive ? e => locate(e.clientX, e.clientY) : undefined}
        onPointerLeave={interactive ? () => setTip(null) : undefined}
      />
      {datum && (
        <div className="chart-tip" style={{ left: `${tip.left}%`, top: `${tip.top}%` }} role="status">
          <i style={{ background: datum.color }} />
          <span>{datum.label || `#${tip.index + 1}`}</span>
          <b>{formatTip ? formatTip(datum) : datum.value}</b>
        </div>
      )}
    </div>
  )
}
