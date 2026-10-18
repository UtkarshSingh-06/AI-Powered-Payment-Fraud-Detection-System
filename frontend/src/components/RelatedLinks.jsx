import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { relatedLinksFor } from '../utils/seo';
import './RelatedLinks.css';

export default function RelatedLinks({ title = 'Related', links }) {
  const { pathname } = useLocation();
  const items = links || relatedLinksFor(pathname);
  if (!items?.length) return null;

  return (
    <aside className="fs-related" aria-label={title}>
      <h2>{title}</h2>
      <ul>
        {items.map((item) => (
          <li key={item.to}>
            <Link to={item.to}>{item.label}</Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
