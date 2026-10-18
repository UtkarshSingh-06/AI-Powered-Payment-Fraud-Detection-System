/** Respect prefers-reduced-motion for animations and smooth scroll. */

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function motionSafe(transition) {
  if (prefersReducedMotion()) {
    return { duration: 0 };
  }
  return transition;
}
