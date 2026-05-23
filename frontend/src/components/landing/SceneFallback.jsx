import React from 'react';
import './scene-shared.css';

export default function SceneFallback() {
  return (
    <div className="hero-scene-3d hero-scene-fallback" aria-hidden="true">
      <div className="fallback-orb fallback-orb-1" />
      <div className="fallback-orb fallback-orb-2" />
      <div className="fallback-orb fallback-orb-3" />
      <div className="hero-scene-vignette" />
      <div className="hero-scene-grid" />
    </div>
  );
}
