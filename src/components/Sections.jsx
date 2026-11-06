import { useI18n } from '../i18n/I18n.jsx'
import { Logo } from './Header.jsx'
import PixelIcon from './PixelIcon.jsx'

const FEATURE_ICONS = ['bar', 'code', 'image', 'globe']

export function Features() {
  const { t } = useI18n()
  return (
    <section className="features" id="features" aria-labelledby="features-title">
      <div className="section-head">
        <div>
          <p className="eyebrow">{t('features.eyebrow')}</p>
          <h2 id="features-title">{t('features.title')}</h2>
        </div>
      </div>
      <ul className="feature-grid">
        {t('features.items').map((f, i) => (
          <li key={f.t} className="card feature" style={{ '--i': i }}>
            <span className="feature-icon"><PixelIcon name={FEATURE_ICONS[i]} size={22} /></span>
            <h3>{f.t}</h3>
            <p>{f.d}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function Footer() {
  const { t } = useI18n()
  return (
    <footer className="footer">
      <div className="footer-inner">
        <Logo small />
        <span>{t('footer.made')}</span>
        <a href="#top">{t('footer.top')} <PixelIcon name="up" size={12} /></a>
      </div>
    </footer>
  )
}

export function Toasts({ items }) {
  return (
    <div className="toasts" aria-live="polite" aria-atomic="false">
      {items.map(item => (
        <div key={item.id} className={`toast ${item.kind === 'error' ? 'is-error' : ''}`}>
          <PixelIcon name={item.kind === 'error' ? 'close' : 'check'} size={14} />
          <span>{item.text}</span>
        </div>
      ))}
    </div>
  )
}
