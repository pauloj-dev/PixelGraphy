import { useI18n } from '../i18n/I18n.jsx'
import { CHART_TYPES, PIXEL_SIZES, PATTERNS, ASPECTS, seriesColor } from '../chart/scene.js'
import { PALETTES, PALETTE_IDS, CHART_THEME_IDS, CHART_THEMES } from '../chart/palettes.js'
import { Field, Segmented, Toggle } from './controls.jsx'
import PixelIcon from './PixelIcon.jsx'

export default function StylePanel({ project, dispatch }) {
  const { t } = useI18n()
  const set = patch => dispatch({ type: 'set', patch })
  const cartesian = !['pie', 'donut'].includes(project.type)
  const series = ['line', 'area'].includes(project.type)
  const palette = PALETTES[project.palette] || PALETTES.forest

  return (
    <div className="panel-body">
      <Segmented
        className="type-grid"
        label={t('style.type')}
        value={project.type}
        columns={3}
        onChange={type => set({ type })}
        options={CHART_TYPES.map(type => ({ value: type, label: t(`types.${type}`), icon: <PixelIcon name={type} size={22} /> }))}
      />

      <fieldset className="palette-list">
        <legend className="field-label">{t('style.palette')}</legend>
        {PALETTE_IDS.map(id => (
          <label key={id} className={`palette-option ${project.palette === id ? 'is-on' : ''}`}>
            <input type="radio" name="palette" checked={project.palette === id} onChange={() => dispatch({ type: 'set', patch: { palette: id, seriesColor: null } })} />
            <span className="palette-strip" aria-hidden="true">{PALETTES[id].slice(0, 6).map(c => <i key={c} style={{ background: c }} />)}</span>
            <span>{t(`palettes.${id}`)}</span>
          </label>
        ))}
      </fieldset>

      {series && (
        <Field label={t('style.series')}>
          <div className="swatches" role="group" aria-label={t('style.series')}>
            {palette.map(c => (
              <button key={c} type="button" className={`swatch ${seriesColor(project) === c ? 'is-on' : ''}`} style={{ '--c': c }} aria-label={c} aria-pressed={seriesColor(project) === c} onClick={() => set({ seriesColor: c })} />
            ))}
            <label className="swatch swatch-custom" title={t('style.custom')}>
              <input type="color" aria-label={t('style.custom')} value={seriesColor(project)} onChange={e => set({ seriesColor: e.target.value })} />
              <PixelIcon name="plus" size={12} />
            </label>
          </div>
        </Field>
      )}

      <Segmented
        className="theme-seg"
        label={t('style.theme')}
        value={project.chartTheme}
        columns={5}
        onChange={chartTheme => set({ chartTheme })}
        options={CHART_THEME_IDS.map(id => ({
          value: id,
          label: t(`chartThemes.${id}`),
          icon: <span className={`theme-dot ${id === 'auto' ? 'auto' : ''}`} style={id === 'auto' ? undefined : { '--bg': CHART_THEMES[id].bg, '--fg': CHART_THEMES[id].ink }} aria-hidden="true" />,
        }))}
      />

      <div className="grid-2">
        <Segmented label={t('style.aspect')} value={project.aspect} columns={4} onChange={aspect => set({ aspect })} options={Object.keys(ASPECTS).map(a => ({ value: a, label: a }))} />
        <Segmented label={t('style.pixel')} value={Number(project.pixel)} columns={5} onChange={pixel => set({ pixel })} options={PIXEL_SIZES.map(s => ({ value: s, label: String(s) }))} />
      </div>

      <Segmented label={t('style.pattern')} value={project.pattern} columns={4} onChange={pattern => set({ pattern })} options={PATTERNS.map(id => ({ value: id, label: t(`patterns.${id}`), icon: <span className={`pattern-swatch pattern-${id}`} aria-hidden="true" /> }))} />

      <Segmented label={t('style.labels')} value={project.labels} columns={3} onChange={labels => set({ labels })} options={['value', 'percent', 'none'].map(id => ({ value: id, label: t(`labelModes.${id}`) }))} />

      {cartesian && (
        <Field label={t('style.axis')} htmlFor="axisMax" hint={t('style.axisHint')}>
          <input id="axisMax" className="input input-sm num" type="number" min="0" step="any" inputMode="decimal" placeholder={t('data.auto')} value={project.axisMax} onChange={e => set({ axisMax: e.target.value })} />
        </Field>
      )}

      <fieldset className="toggles">
        <legend className="field-label">{t('style.details')}</legend>
        {cartesian && <Toggle label={t('style.options.grid')} checked={project.grid} onChange={grid => set({ grid })} />}
        <Toggle label={t('style.options.shadow')} checked={project.shadow} onChange={shadow => set({ shadow })} />
        <Toggle label={t('style.options.outline')} checked={project.outline} onChange={outline => set({ outline })} />
        <Toggle label={t('style.options.bevel')} checked={project.bevel} onChange={bevel => set({ bevel })} />
        {!cartesian && <Toggle label={t('style.options.depth')} checked={project.depth} onChange={depth => set({ depth })} />}
        {!cartesian && <Toggle label={t('style.options.legend')} checked={project.legend} onChange={legend => set({ legend })} />}
        <Toggle label={t('style.options.frame')} checked={project.frame} onChange={frame => set({ frame })} />
        <Toggle label={t('style.options.watermark')} checked={project.watermark} onChange={watermark => set({ watermark })} />
      </fieldset>
    </div>
  )
}
