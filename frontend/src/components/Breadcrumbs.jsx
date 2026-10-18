import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { breadcrumbItems, absoluteUrl } from '../utils/seo';
import './Breadcrumbs.css';

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  if (pathname === '/' || pathname === '/login' || pathname === '/register') {
    return null;
  }

  const items = breadcrumbItems(pathname);
  if (items.length < 2) return null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: absoluteUrl(item.to || pathname)
    }))
  };

  return (
    <nav className="fs-breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            {index > 0 && <ChevronRight size={14} aria-hidden className="fs-crumb-sep" />}
            {item.current || !item.to ? (
              <span aria-current="page">{item.label}</span>
            ) : (
              <Link to={item.to}>{item.label}</Link>
            )}
          </li>
        ))}
      </ol>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </nav>
  );
}
