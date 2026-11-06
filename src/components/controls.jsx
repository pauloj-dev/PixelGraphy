import { useId } from 'react'

export function Field({ label, hint, children, htmlFor }) {
  return (
    <div className="field">
      {label && <label className="field-label" htmlFor={htmlFor}>{label}</label>}
      {children}
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  )
}

/** Radio-group semantics with button looks. */
export function Segmented({ label, value, options, onChange, className = '', columns }) {
  const name = useId()
  return (
    <fieldset className={`segmented ${className}`} style={columns ? { '--cols': columns } : undefined}>
      {label && <legend className="field-label">{label}</legend>}
      <div className="segmented-track">
        {options.map(opt => (
          <label key={String(opt.value)} className={`seg-option ${value === opt.value ? 'is-on' : ''}`} title={opt.title}>
            <input type="radio" name={name} value={String(opt.value)} checked={value === opt.value} onChange={() => onChange(opt.value)} />
            {opt.icon}
            <span className={opt.icon && opt.compact ? 'sr-only' : undefined}>{opt.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function Toggle({ label, checked, onChange, disabled, title }) {
  return (
    <label className={`toggle ${disabled ? 'is-disabled' : ''}`} title={title}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-ui" aria-hidden="true"><i /></span>
      <span>{label}</span>
    </label>
  )
}

export function Button({ variant = 'ghost', icon, children, className = '', ...props }) {
  return (
    <button type="button" className={`btn btn-${variant} ${className}`} {...props}>
      {icon}
      {children && <span>{children}</span>}
    </button>
  )
}
