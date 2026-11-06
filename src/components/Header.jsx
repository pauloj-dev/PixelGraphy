import { useI18n } from '../i18n/I18n.jsx'
import PixelIcon from './PixelIcon.jsx'

export function Logo({ small = false }) {
  return (
    <span className={`logo ${small ? 'logo-sm' : ''}`}>
      <span className="logo-mark" aria-hidden="true"><i /><i /><i /><i /></span>
      <span className="logo-word">pixel<b>graphy</b></span>
    </span>
  )
}

export default function Header({ theme, onToggleTheme }) {
  const { t, lang, setLang } = useI18n()
  return (
    <header className="topbar">
      <a className="skip-link" href="#studio">{t('nav.skip')}</a>
      <div className="topbar-inner">
        <a href="#top" aria-label="PixelGraphy"><Logo /></a>
        <nav className="topnav" aria-label="Main">
          <a href="#studio">{t('nav.studio')}</a>
          <a href="#features">{t('nav.features')}</a>
        </nav>
        <div className="top-actions">
          <div className="lang-switch" role="group" aria-label={t('lang.label')}>
            <PixelIcon name="globe" size={14} />
            {['pt', 'en'].map(l => (
              <button key={l} type="button" aria-pressed={lang === l} className={lang === l ? 'is-on' : ''} onClick={() => setLang(l)}>
                {l === 'pt' ? 'PT' : 'EN'}
              </button>
            ))}
          </div>
          <button type="button" className="icon-btn theme-btn" onClick={onToggleTheme} aria-label={theme === 'dark' ? t('theme.toLight') : t('theme.toDark')} title={theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}>
            <PixelIcon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
          </button>
          <a className="btn btn-primary btn-sm top-cta" href="#studio"><span>{t('nav.start')}</span><PixelIcon name="arrow" size={14} /></a>
        </div>
      </div>
    </header>
  )
}
