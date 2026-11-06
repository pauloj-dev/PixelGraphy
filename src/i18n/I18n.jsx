import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { STRINGS, LANGS, LOCALES } from './strings.js'
import { readStore, writeStore } from '../store.js'

const I18nContext = createContext(null)

function detect() {
  const saved = readStore('lang')
  if (LANGS.includes(saved)) return saved
  return (navigator.language || '').toLowerCase().startsWith('pt') ? 'pt' : 'en'
}

function lookup(dict, key) {
  return key.split('.').reduce((node, part) => (node == null ? node : node[part]), dict)
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(detect)

  useEffect(() => {
    writeStore('lang', lang)
    document.documentElement.lang = LOCALES[lang]
    document.title = STRINGS[lang].meta.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', STRINGS[lang].meta.description)
  }, [lang])

  const t = useCallback((key, vars) => {
    let value = lookup(STRINGS[lang], key) ?? lookup(STRINGS.pt, key) ?? key
    if (typeof value === 'string' && vars) value = value.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
    return value
  }, [lang])

  const value = useMemo(() => ({ lang, setLang, t, locale: LOCALES[lang] }), [lang, t])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}
