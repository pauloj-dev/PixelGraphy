import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../i18n/I18n.jsx'
import { useProgress, useReducedMotion } from '../hooks.js'
import { buildScene } from '../chart/scene.js'
import ChartCanvas from './ChartCanvas.jsx'
import PixelIcon from './PixelIcon.jsx'

const CYCLE = ['bar', 'area', 'donut', 'hbar']

export default function Hero({ siteTheme }) {
  const { t, lang, locale } = useI18n()
  const reduced = useReducedMotion()
  const [step, setStep] = useState(0)
  const type = CYCLE[step % CYCLE.length]
  const progress = useProgress(`${type}-${step}`, { duration: 900, disabled: reduced })

  useEffect(() => {
    if (reduced) return undefined
    const id = setInterval(() => setStep(s => s + 1), 3600)
    return () => clearInterval(id)
  }, [reduced])

  const scene = useMemo(() => {
    const p = t('presets.week')
    return buildScene({
      title: p.title, subtitle: p.subtitle, suffix: p.suffix, locale, type,
      data: p.rows.map(([label, value]) => ({ label, value })),
      palette: 'forest', pixel: 8, pattern: 'dither', aspect: '4:3', depth: true, outline: false,
      labels: type === 'donut' ? 'percent' : 'value',
      strings: { total: t('chart.total') },
    }, { progress, siteTheme })
  }, [t, locale, type, progress, siteTheme, lang])

  return (
    <section className="hero" id="top">
      <div className="hero-copy">
        <p className="eyebrow"><span className="blink" aria-hidden="true">▮</span>{t('hero.eyebrow')}</p>
        <h1>
          <span>{t('hero.title1')}</span>
          <span className="hl">{t('hero.title2')}</span>
        </h1>
        <p className="lead">{t('hero.lead')}</p>
        <div className="hero-actions">
          <a className="btn btn-primary btn-lg" href="#studio"><span>{t('hero.cta')}</span><PixelIcon name="down" size={16} /></a>
          <a className="btn btn-ghost btn-lg" href="#features"><span>{t('hero.secondary')}</span></a>
        </div>
        <ul className="chips">
          {t('hero.chips').map(c => <li key={c}><PixelIcon name="check" size={12} />{c}</li>)}
        </ul>
      </div>
      <figure className="hero-art">
        <div className="window">
          <div className="window-bar" aria-hidden="true">
            <span /><span /><span />
            <b>{t(`types.${type}`).toLowerCase()}_chart.svg</b>
          </div>
          <ChartCanvas scene={scene} label={t('hero.caption')} interactive={false} />
        </div>
        <div className="hero-badge" aria-hidden="true">
          <PixelIcon name="image" size={18} />
          <div><b>SVG · PNG · GIF</b><small>1× · 2× · 4×</small></div>
        </div>
        <figcaption className="sr-only">{t('hero.caption')}</figcaption>
      </figure>
    </section>
  )
}
