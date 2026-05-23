import React, { useEffect, useState, useRef } from 'react';

export default function AnimatedCounter({ value, suffix = '', prefix = '', duration = 1800, inView }) {
  const [display, setDisplay] = useState(0);
  const parsed = parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;
  const isDecimal = String(value).includes('.');

  useEffect(() => {
    if (!inView) return undefined;
    let start = 0;
    const startTime = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      start = eased * parsed;
      setDisplay(start);
      if (progress < 1) requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [inView, parsed, duration]);

  const formatted = isDecimal ? display.toFixed(1) : Math.round(display).toLocaleString();

  return (
    <span>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

export function useInViewOnce(threshold = 0.2) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: '0px 0px -8% 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, inView];
}
