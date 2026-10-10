import { t } from '../lib/i18n';
import { useId } from 'react';

/** Labelled input with hint and error wired up via aria-describedby. */
export default function Field({
  label,
  hint,
  error,
  optional = false,
  className = '',
  as = 'input',
  ...props
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const Control = as;
  return (
    <div className={`field${error ? ' field--error' : ''} ${className}`}>
      <label htmlFor={id}>
        {label}
        {optional && <span className="field__opt">{t('(optional)')}</span>}
      </label>
      <Control
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
        required={!optional}
        {...props}
      />
      {error && (
        <p className="field__error" id={errorId}>
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      )}
    </div>
  );
}
