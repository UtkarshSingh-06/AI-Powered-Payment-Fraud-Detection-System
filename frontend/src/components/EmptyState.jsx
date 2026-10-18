import React from 'react';
import { Link } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import './EmptyState.css';

export default function EmptyState({
  title = 'Nothing here yet',
  description = 'When data is available, it will show up in this view.',
  actionLabel,
  actionTo,
  onAction,
  icon: Icon = Inbox
}) {
  return (
    <div className="fs-empty" role="status">
      <div className="fs-empty-icon" aria-hidden>
        <Icon size={28} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {actionTo && actionLabel && (
        <Link to={actionTo} className="fs-btn-pill fs-btn-pill--white">
          {actionLabel}
        </Link>
      )}
      {!actionTo && actionLabel && onAction && (
        <button type="button" className="fs-btn-pill fs-btn-pill--white" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
