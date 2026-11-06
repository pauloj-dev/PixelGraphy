import { useEffect, useState } from 'react'
import { readStore, writeStore } from './store.js'

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = readStore('theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#101418' : '#f4f1e8')
    writeStore('theme', theme)
  }, [theme])
  return [theme, () => setTheme(v => (v === 'dark' ? 'light' : 'dark'))]
}

export function useReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)'
  const [reduced, setReduced] = useState(() => window.matchMedia?.(query).matches ?? false)
  useEffect(() => {
    const mq = window.matchMedia?.(query)
    if (!mq) return undefined
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

/** Runs a 0→1 progress animation each time `key` changes. */
export function useProgress(key, { duration = 700, disabled = false } = {}) {
  const [progress, setProgress] = useState(disabled ? 1 : 0)
  useEffect(() => {
    if (disabled) { setProgress(1); return undefined }
    let raf, start
    // ~20fps stepping gives a sprite-like cadence instead of buttery tweening.
    let last = -1
    const tick = now => {
      start ??= now
      const t = Math.min(1, (now - start) / duration)
      const frame = Math.floor(t * duration / 50)
      if (frame !== last || t === 1) { last = frame; setProgress(t) }
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    setProgress(0)
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [key, duration, disabled])
  return progress
}

export function useDebounced(value, delay = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return v
}
