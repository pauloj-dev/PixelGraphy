import { useRef, useState } from 'react'
import { useI18n } from '../i18n/I18n.jsx'
import { colorFor } from '../chart/scene.js'
import { parseCSV } from '../chart/exporters.js'
import { MAX_ROWS } from '../project.js'
import { Field, Button } from './controls.jsx'
import PixelIcon from './PixelIcon.jsx'

const PRESETS = ['week', 'sales', 'share', 'growth']

export default function DataPanel({ project, dispatch, onPreset, notify }) {
  const { t } = useI18n()
  const [csv, setCsv] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const fileRef = useRef(null)
  const circularOrBar = !['line', 'area'].includes(project.type)
  const set = patch => dispatch({ type: 'set', patch })

  function applyCsv(text) {
    const rows = parseCSV(text)
    if (!rows.length) return notify(t('toast.importFail'), 'error')
    dispatch({ type: 'data', rows })
    notify(t('toast.imported', { n: rows.length }))
    setCsv('')
    setImportOpen(false)
  }

  async function onFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    applyCsv(await file.text())
  }

  return (
    <div className="panel-body">
      <Field label={t('data.presets')} htmlFor="preset">
        <div className="select-wrap">
          <select id="preset" className="input" value="" onChange={e => e.target.value && onPreset(e.target.value)}>
            <option value="">—</option>
            {PRESETS.map(k => <option key={k} value={k}>{t(`presets.${k}.name`)}</option>)}
          </select>
          <PixelIcon name="down" size={14} />
        </div>
      </Field>

      <Field label={t('data.title')} htmlFor="title">
        <input id="title" className="input" maxLength={64} value={project.title} onChange={e => set({ title: e.target.value })} />
      </Field>
      <Field label={t('data.subtitle')} htmlFor="subtitle">
        <input id="subtitle" className="input" maxLength={90} placeholder={t('data.subtitlePh')} value={project.subtitle} onChange={e => set({ subtitle: e.target.value })} />
      </Field>

      <div className="rows-head" aria-hidden="true">
        <span>{t('data.category')}</span><span>{t('data.value')}</span><span>{t('data.color')}</span><span />
      </div>
      <ol className="rows">
        {project.data.map((row, i) => {
          const name = row.label || `#${i + 1}`
          return (
            <li className="row" key={row.id}>
              <input className="input input-sm" aria-label={`${t('data.category')} ${i + 1}`} maxLength={24} value={row.label} onChange={e => dispatch({ type: 'row', id: row.id, patch: { label: e.target.value } })} />
              <input className="input input-sm num" aria-label={`${t('data.value')} ${i + 1}`} type="number" inputMode="decimal" step="any" min="0" value={row.value} onChange={e => dispatch({ type: 'row', id: row.id, patch: { value: e.target.value } })} />
              <label className="color-chip" title={circularOrBar ? t('data.colorOf', { name }) : t('data.seriesHint')}>
                <input type="color" disabled={!circularOrBar} aria-label={t('data.colorOf', { name })} value={colorFor(project, i)} onChange={e => dispatch({ type: 'row', id: row.id, patch: { color: e.target.value } })} />
                <i style={{ background: colorFor(project, i) }} />
              </label>
              <div className="row-tools">
                <button type="button" className="icon-btn icon-btn-sm" aria-label={`${t('data.moveUp')}: ${name}`} disabled={i === 0} onClick={() => dispatch({ type: 'move', id: row.id, dir: -1 })}><PixelIcon name="up" size={12} /></button>
                <button type="button" className="icon-btn icon-btn-sm" aria-label={`${t('data.moveDown')}: ${name}`} disabled={i === project.data.length - 1} onClick={() => dispatch({ type: 'move', id: row.id, dir: 1 })}><PixelIcon name="down" size={12} /></button>
                <button type="button" className="icon-btn icon-btn-sm danger" aria-label={`${t('data.remove')}: ${name}`} disabled={project.data.length <= 1} onClick={() => dispatch({ type: 'remove', id: row.id })}><PixelIcon name="close" size={12} /></button>
              </div>
            </li>
          )
        })}
      </ol>
      <div className="rows-actions">
        <Button icon={<PixelIcon name="plus" size={14} />} disabled={project.data.length >= MAX_ROWS} title={project.data.length >= MAX_ROWS ? t('data.limit', { n: MAX_ROWS }) : undefined} onClick={() => dispatch({ type: 'add', label: `Item ${project.data.length + 1}` })}>
          {t('data.add')}
        </Button>
        <span className="counter">{project.data.length}/{MAX_ROWS}</span>
      </div>

      <div className="inline-group" role="group" aria-label={t('data.sort')}>
        <span className="field-label"><PixelIcon name="sort" size={12} /> {t('data.sort')}</span>
        <div className="mini-actions">
          <Button onClick={() => dispatch({ type: 'sort', by: 'desc' })}>{t('data.sortDesc')}</Button>
          <Button onClick={() => dispatch({ type: 'sort', by: 'asc' })}>{t('data.sortAsc')}</Button>
          <Button onClick={() => dispatch({ type: 'sort', by: 'az' })}>{t('data.sortAz')}</Button>
        </div>
      </div>

      <div className="grid-3">
        <Field label={t('data.prefix')} htmlFor="prefix"><input id="prefix" className="input input-sm" maxLength={6} placeholder="R$" value={project.prefix} onChange={e => set({ prefix: e.target.value })} /></Field>
        <Field label={t('data.suffix')} htmlFor="suffix"><input id="suffix" className="input input-sm" maxLength={6} placeholder="%" value={project.suffix} onChange={e => set({ suffix: e.target.value })} /></Field>
        <Field label={t('data.decimals')} htmlFor="decimals">
          <div className="select-wrap">
            <select id="decimals" className="input input-sm" value={project.decimals} onChange={e => set({ decimals: e.target.value })}>
              <option value="auto">{t('data.auto')}</option>
              {[0, 1, 2].map(n => <option key={n} value={String(n)}>{n}</option>)}
            </select>
            <PixelIcon name="down" size={12} />
          </div>
        </Field>
      </div>

      <div className="import-box">
        <div className="mini-actions">
          <Button icon={<PixelIcon name="table" size={14} />} aria-expanded={importOpen} onClick={() => setImportOpen(o => !o)}>{t('data.import')}</Button>
          <Button icon={<PixelIcon name="sparkle" size={14} />} onClick={() => dispatch({ type: 'resetColors' })}>{t('data.resetColors')}</Button>
        </div>
        {importOpen && (
          <div className="import-panel">
            <label className="field-hint" htmlFor="csv">{t('data.importHint')}</label>
            <textarea id="csv" className="input textarea" rows={5} value={csv} placeholder={'Jan,120\nFev,180\nMar,150,#e7a95e'} onChange={e => setCsv(e.target.value)} />
            <div className="mini-actions">
              <Button variant="primary" disabled={!csv.trim()} onClick={() => applyCsv(csv)}>{t('data.apply')}</Button>
              <Button icon={<PixelIcon name="folder" size={14} />} onClick={() => fileRef.current?.click()}>{t('data.file')}</Button>
              <Button onClick={() => setImportOpen(false)}>{t('data.cancel')}</Button>
              <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,text/csv" hidden onChange={onFile} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
