import { useCallback, useMemo, useState } from 'react'
import { useI18n } from '../i18n/I18n.jsx'
import { useProgress, useReducedMotion } from '../hooks.js'
import { buildScene } from '../chart/scene.js'
import { makeFormatter } from '../chart/format.js'
import ChartCanvas from './ChartCanvas.jsx'
import DataPanel from './DataPanel.jsx'
import StylePanel from './StylePanel.jsx'
import ExportPanel from './ExportPanel.jsx'
import PixelIcon from './PixelIcon.jsx'

export default function Studio({ project, dispatch, siteTheme, onPreset, onLoadProject, notify }) {
  const { t, locale } = useI18n()
  const reduced = useReducedMotion()
  const [tab, setTab] = useState('data')
  const [replay, setReplay] = useState(0)
  const progress = useProgress(`${project.type}-${project.aspect}-${replay}`, { duration: 800, disabled: reduced })

  const config = useMemo(() => ({ ...project, locale, strings: { total: t('chart.total'), empty: t('chart.empty'), series: t('chart.series') } }), [project, locale, t])
  const scene = useMemo(() => buildScene(config, { progress, siteTheme }), [config, progress, siteTheme])
  const finalScene = useMemo(() => buildScene(config, { progress: 1, siteTheme }), [config, siteTheme])
  const getScene = useCallback(() => finalScene, [finalScene])
  const buildFrame = useCallback(t => buildScene(config, { progress: t, siteTheme }), [config, siteTheme])

  const fmt = useMemo(() => makeFormatter({ locale, prefix: project.prefix, suffix: project.suffix, decimals: project.decimals }), [locale, project.prefix, project.suffix, project.decimals])
  const total = finalScene.total
  const tip = d => `${fmt.value(d.value)} · ${fmt.percent(d.value, total)}`
  const summary = `${project.title || ''} — ${finalScene.data.map(d => `${d.label}: ${fmt.value(d.value)}`).join('; ')}`

  const tabs = [['data', t('studio.tabs.data'), 'table'], ['style', t('studio.tabs.style'), 'sparkle']]

  return (
    <section className="studio" id="studio" aria-labelledby="studio-title">
      <div className="section-head">
        <div>
          <p className="eyebrow">{t('studio.eyebrow')}</p>
          <h2 id="studio-title">{t('studio.title')}</h2>
        </div>
        <ol className="steps" aria-hidden="true">
          {t('studio.steps').map((s, i) => <li key={s} className={(i === 0 && tab === 'data') || (i === 1 && tab === 'style') ? 'is-on' : ''}><b>0{i + 1}</b>{s}</li>)}
        </ol>
      </div>

      <div className="studio-grid">
        <aside className="card controls">
          <div className="tabs" role="tablist" aria-label={t('studio.eyebrow')}>
            {tabs.map(([id, label, icon]) => (
              <button key={id} id={`tab-${id}`} role="tab" type="button" aria-selected={tab === id} aria-controls={`panel-${id}`} className={tab === id ? 'is-on' : ''} onClick={() => setTab(id)}
                onKeyDown={e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const next = tab === 'data' ? 'style' : 'data'; setTab(next); document.getElementById(`tab-${next}`)?.focus() } }}
                tabIndex={tab === id ? 0 : -1}>
                <PixelIcon name={icon} size={14} />{label}
              </button>
            ))}
          </div>
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === 'data'
              ? <DataPanel project={project} dispatch={dispatch} onPreset={onPreset} notify={notify} />
              : <StylePanel project={project} dispatch={dispatch} />}
          </div>
        </aside>

        <div className="preview-col">
          <section className="card preview" aria-label={t('preview.live')}>
            <div className="card-head">
              <span className="live"><i aria-hidden="true" />{t('preview.live')}</span>
              <div className="head-tools">
                <span className="tag">{t(`types.${project.type}`)} · {project.aspect} · {project.pixel}px</span>
                <button type="button" className="icon-btn" onClick={() => setReplay(r => r + 1)} aria-label={t('preview.replay')} title={t('preview.replay')}><PixelIcon name="replay" size={16} /></button>
              </div>
            </div>
            <div className={`stage ${project.transparent ? 'is-transparent' : ''}`}>
              <ChartCanvas scene={scene} label={summary} formatTip={tip} />
            </div>
            <table className="sr-only">
              <caption>{t('preview.summary')}</caption>
              <thead><tr><th scope="col">{t('data.category')}</th><th scope="col">{t('data.value')}</th><th scope="col">%</th></tr></thead>
              <tbody>{finalScene.data.map((d, i) => <tr key={i}><td>{d.label}</td><td>{fmt.value(d.value)}</td><td>{fmt.percent(d.value, total)}</td></tr>)}</tbody>
            </table>
          </section>
          <ExportPanel project={project} dispatch={dispatch} getScene={getScene} buildFrame={buildFrame} onLoadProject={onLoadProject} notify={notify} />
        </div>
      </div>
    </section>
  )
}
