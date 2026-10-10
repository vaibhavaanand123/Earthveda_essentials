import { Link } from 'react-router-dom';

export default function EmptyState({
  title,
  description,
  action = 'Browse the range',
  to = '/shop',
  children,
}) {
  return (
    <div className="empty">
      <div className="empty__peas" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {children}
      {action && (
        <Link className="btn btn--ink" to={to}>
          {action}
        </Link>
      )}
    </div>
  );
}
