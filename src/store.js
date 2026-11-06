// localStorage can throw (private mode, blocked storage); never let that break the app.
const PREFIX = 'pixelgraphy:'

export function readStore(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw == null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function writeStore(key, value) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)) } catch { /* ignore */ }
}
