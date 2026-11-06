import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { I18nProvider, useI18n } from './i18n/I18n.jsx'
import { useTheme, useDebounced } from './hooks.js'
import { readStore, writeStore } from './store.js'
import { reducer, presetProject, normalizeProject, serializable } from './project.js'
import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import Studio from './components/Studio.jsx'
import { Features, Footer, Toasts } from './components/Sections.jsx'

function Shell() {
  const { lang } = useI18n()
  const [theme, toggleTheme] = useTheme()
  const [project, dispatch] = useReducer(reducer, null, () => {
    const saved = readStore('project')
    return saved ? normalizeProject(saved, lang) : presetProject('week', lang)
  })
  const [toasts, setToasts] = useState([])
  const toastId = useRef(0)

  const notify = useCallback((text, kind = 'ok') => {
    const id = ++toastId.current
    setToasts(list => [...list.slice(-2), { id, text, kind }])
    setTimeout(() => setToasts(list => list.filter(x => x.id !== id)), 3600)
  }, [])

  // Untouched example data follows the interface language.
  useEffect(() => {
    if (project.pristine && project.preset) dispatch({ type: 'load', project: presetProject(project.preset, lang, { ...project, labels: project.labels }) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  const persisted = useDebounced(project, 400)
  useEffect(() => { writeStore('project', { ...serializable(persisted), pristine: persisted.pristine, preset: persisted.preset }) }, [persisted])

  const onPreset = key => dispatch({ type: 'load', project: presetProject(key, lang, { ...project, type: undefined, labels: undefined, seriesColor: null }) })
  const onLoadProject = raw => dispatch({ type: 'load', project: normalizeProject(raw, lang) })

  return (
    <>
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <main>
        <Hero siteTheme={theme} />
        <Studio project={project} dispatch={dispatch} siteTheme={theme} onPreset={onPreset} onLoadProject={onLoadProject} notify={notify} />
        <Features />
      </main>
      <Footer />
      <Toasts items={toasts} />
    </>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <Shell />
    </I18nProvider>
  )
}
