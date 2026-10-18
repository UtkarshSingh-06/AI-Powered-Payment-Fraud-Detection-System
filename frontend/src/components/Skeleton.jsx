import React from 'react';
import './Skeleton.css';

export function Skeleton({ width = '100%', height = 16, className = '', rounded = true }) {
  return (
    <span
      className={`fs-skeleton ${rounded ? 'fs-skeleton--rounded' : ''} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function SkeletonPage({ rows = 4, title = 'Loading' }) {
  return (
    <div className="fs-skeleton-page" role="status" aria-label={title}>
      <Skeleton width="40%" height={28} className="fs-skeleton-gap" />
      <Skeleton width="70%" height={14} className="fs-skeleton-gap" />
      <div className="fs-skeleton-grid">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="fs-skeleton-card">
            <Skeleton height={12} width="35%" />
            <Skeleton height={24} width="55%" className="fs-skeleton-gap" />
            <Skeleton height={10} width="80%" className="fs-skeleton-gap" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default Skeleton;
