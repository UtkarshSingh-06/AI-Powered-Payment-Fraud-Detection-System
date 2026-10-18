import React, { useEffect, useRef, useState } from 'react';

/**
 * WebP-aware image with lazy loading for off-screen content.
 * Provide `src` (fallback) and optional `webpSrc`.
 */
export default function OptimizedImage({
  src,
  webpSrc,
  alt = '',
  width,
  height,
  className = '',
  eager = false,
  sizes
}) {
  const ref = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(eager);

  useEffect(() => {
    if (eager || shouldLoad || !ref.current) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px 0px' }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [eager, shouldLoad]);

  const loading = eager ? 'eager' : 'lazy';
  const decoding = 'async';

  return (
    <div ref={ref} className={`fs-optimized-image ${className}`} style={{ width, height }}>
      {shouldLoad ? (
        <picture>
          {webpSrc && <source srcSet={webpSrc} type="image/webp" sizes={sizes} />}
          <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            loading={loading}
            decoding={decoding}
            sizes={sizes}
          />
        </picture>
      ) : (
        <div
          aria-hidden
          style={{
            width: width || '100%',
            height: height || 120,
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 8
          }}
        />
      )}
    </div>
  );
}
