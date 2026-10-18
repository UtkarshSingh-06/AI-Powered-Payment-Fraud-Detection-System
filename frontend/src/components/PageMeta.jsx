import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  SITE_NAME,
  absoluteUrl,
  resolvePageMeta,
  DEFAULT_DESCRIPTION
} from '../utils/seo';
import { trackPageView } from '../utils/analytics';

function upsertMeta(attr, key, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function upsertJsonLd(id, data) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export default function PageMeta({ title, description, image, noIndex, schema } = {}) {
  const location = useLocation();
  const resolved = resolvePageMeta(location.pathname);
  const pageTitle = title || resolved.title || SITE_NAME;
  const pageDescription = description || resolved.description || DEFAULT_DESCRIPTION;
  const canonical = absoluteUrl(location.pathname || '/');
  const ogImage = absoluteUrl(image || '/og-image.png');
  const robots = noIndex || resolved.noIndex ? 'noindex, nofollow' : 'index, follow';

  useEffect(() => {
    document.title = pageTitle;
    upsertMeta('name', 'description', pageDescription);
    upsertMeta('name', 'robots', robots);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:title', pageTitle);
    upsertMeta('property', 'og:description', pageDescription);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:image', ogImage);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', pageTitle);
    upsertMeta('name', 'twitter:description', pageDescription);
    upsertMeta('name', 'twitter:image', ogImage);
    upsertLink('canonical', canonical);

    const graph = schema || {
      '@context': 'https://schema.org',
      '@type': resolved.schemaType || 'WebPage',
      name: pageTitle,
      description: pageDescription,
      url: canonical,
      isPartOf: {
        '@type': 'WebSite',
        name: SITE_NAME,
        url: absoluteUrl('/')
      },
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        url: absoluteUrl('/'),
        logo: absoluteUrl('/favicon.svg')
      }
    };
    upsertJsonLd('fs-jsonld', graph);
    trackPageView(location.pathname);
  }, [pageTitle, pageDescription, canonical, ogImage, robots, schema, location.pathname, resolved.schemaType]);

  return null;
}
