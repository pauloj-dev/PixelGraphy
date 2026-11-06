import { useRef, useState } from 'react'
import { useI18n } from '../i18n/I18n.jsx'
import { FORMATS, SCALES, GIF_SCALES, downloadChart, downloadGIF, copyChart, toCSV, projectToJSON, parseProject, saveBlob } from '../chart/exporters.js'
import { colorFor } from '../chart/scene.js'
import { slugify } from '../chart/format.js'
import { serializable } from '../project.js'
import { Segmented, Toggle, Button } from './controls.jsx'
import PixelIcon from './PixelIcon.jsx'

export default function ExportPanel({ project, dispatch, getScene, buildFrame, onLoadProject, notify }) {
  const { t } = useI18n()
  const [format, setFormat] = useState('png')
  const [scale, setScale] = useState(2)
  const [busy, setBusy] = useState(false)
  const [loop, setLoop] = useState(true)
  const [progress, setProgress] = useState(null)
  const isGif = format === 'gif'
  const effScale = isGif ? Math.min(scale, 2) : scale
  const fileRef = useRef(null)
  const scene = getScene()
  const name = slugify(project.title)

  async function run(fn) {
    setBusy(true)
    try { await fn() } catch (err) {
      notify(err?.message === 'clipboard-unsupported' ? t('toast.copyFail') : t('toast.error'), 'error')
    } finally { setBusy(false); setProgress(null) }
  }

  const download = () => run(async () => {
    if (isGif) {
      setProgress(0)
      const { filename } = await downloadGIF(buildFrame, { scale: effScale, loop, title: project.title, onProgress: setProgress })
      notify(t('toast.downloaded', { file: filename }))
      return
    }
    await downloadChart(getScene(), { format, scale, title: project.title })
    notify(t('toast.downloaded', { file: `${name}${format === 'svg' || scale === 1 ? '' : `@${scale}x`}.${format}` }))
  })
  const copy = () => run(async () => { await copyChart(getScene(), { scale }); notify(t('toast.copied')) })
  const csv = () => {
    saveBlob(new Blob([toCSV(project.data.map((r, i) => ({ label: r.label, value: r.value, color: colorFor(project, i) })))], { type: 'text/csv;charset=utf-8' }), `${name}.csv`)
    notify(t('toast.downloaded', { file: `${name}.csv` }))
  }
  const json = () => {
    saveBlob(new Blob([projectToJSON(serializable(project))], { type: 'application/json' }), `${name}.pixelgraphy.json`)
    notify(t('toast.downloaded', { file: `${name}.pixelgraphy.json` }))
  }
  async function open(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try { onLoadProject(parseProject(await file.text())); notify(t('toast.projectLoaded')) } catch { notify(t('toast.importFail'), 'error') }
  }

  return (
    <section className="card export-card" aria-labelledby="export-title">
      <div className="card-head">
        <h3 id="export-title"><PixelIcon name="download" size={16} /> {t('export.title')}</h3>
        <span className="tag">{t('export.size', { w: scene.width * (format === 'svg' ? 1 : effScale), h: scene.height * (format === 'svg' ? 1 : effScale) })}</span>
      </div>
      <div className="export-grid">
        <Segmented label={t('export.format')} value={format} columns={5} onChange={setFormat} options={FORMATS.map(f => ({ value: f, label: f.toUpperCase() }))} />
        <Segmented label={t('export.scale')} value={effScale} columns={3} onChange={setScale} options={(isGif ? GIF_SCALES : SCALES).map(s => ({ value: s, label: `${s}×` }))} />
      </div>
      <p className="field-hint export-hint">{t(`export.hints.${format}`)}</p>
      <div className="export-main">
        <Toggle
          label={t('export.transparent')}
          checked={project.transparent && format !== 'jpg'}
          disabled={format === 'jpg'}
          title={format === 'jpg' ? t('export.transparentNo') : undefined}
          onChange={transparent => dispatch({ type: 'set', patch: { transparent } })}
        />
        {isGif && <Toggle label={t('export.loop')} checked={loop} onChange={setLoop} />}
        <Button variant="primary" className="btn-lg download-btn" disabled={busy} aria-busy={busy} icon={<PixelIcon name="download" size={16} />} onClick={download}>
          {progress != null ? t('export.encoding', { n: Math.round(progress * 100) }) : t('export.download', { f: format.toUpperCase() })}
        </Button>
      </div>
      <div className="export-more">
        <Button icon={<PixelIcon name="copy" size={14} />} disabled={busy} onClick={copy}>{t('export.copy')}</Button>
        <Button icon={<PixelIcon name="table" size={14} />} onClick={csv}>{t('export.csv')}</Button>
        <Button icon={<PixelIcon name="code" size={14} />} onClick={json}>{t('export.json')}</Button>
        <Button icon={<PixelIcon name="upload" size={14} />} onClick={() => fileRef.current?.click()}>{t('export.open')}</Button>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={open} />
      </div>
    </section>
  )
}
