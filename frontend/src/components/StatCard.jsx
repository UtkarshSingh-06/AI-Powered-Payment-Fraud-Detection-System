import React from 'react';
import { motion } from 'motion/react';
import './StatCard.css';

const PROGRESS_RING_SIZE = 80;
const STROKE = 6;
const RADIUS = (PROGRESS_RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function ProgressRing({ value, inView, delay = 0, idPrefix = 'ring' }) {
  const num = parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;
  const normalized = Math.min(100, num);
  const offset = CIRCUMFERENCE - (normalized / 100) * CIRCUMFERENCE;
  const gradId = `ringGrad-${idPrefix}`;
  return (
    <div className="stat-progress-ring">
      <svg width={PROGRESS_RING_SIZE} height={PROGRESS_RING_SIZE} viewBox={`0 0 ${PROGRESS_RING_SIZE} ${PROGRESS_RING_SIZE}`} className="stat-ring-svg">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#16a34a" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>
        </defs>
        <circle
          className="stat-ring-bg"
          cx={PROGRESS_RING_SIZE / 2}
          cy={PROGRESS_RING_SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
        />
        <motion.circle
          className="stat-ring-fill"
          cx={PROGRESS_RING_SIZE / 2}
          cy={PROGRESS_RING_SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          stroke={`url(#${gradId})`}
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={inView ? { strokeDashoffset: offset } : { strokeDashoffset: CIRCUMFERENCE }}
          transition={{ duration: 1.2, delay, ease: [0.22, 0.61, 0.36, 1] }}
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
        />
      </svg>
    </div>
  );
}

function MiniSparkline({ inView, delay = 0 }) {
  const points = [40, 25, 55, 35, 70, 45, 65, 50, 80, 60];
  const width = 64;
  const height = 32;
  const max = Math.max(...points);
  const pathD = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - (p / max) * height;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
  return (
    <div className="stat-mini-chart">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="sparklineFill" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="sparklineStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#15803d" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <motion.path
          d={pathD}
          fill="none"
          stroke="url(#sparklineStroke)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={inView ? { pathLength: 1 } : { pathLength: 0 }}
          transition={{ duration: 1, delay }}
        />
        <motion.path
          d={`${pathD} L ${width} ${height} L 0 ${height} Z`}
          fill="url(#sparklineFill)"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: delay + 0.3 }}
        />
      </svg>
    </div>
  );
}

function SpeedLines({ inView, delay = 0 }) {
  const lines = [
    'M 8 16 L 52 10',
    'M 8 16 L 48 16',
    'M 8 16 L 50 20',
    'M 12 16 L 52 14',
    'M 14 16 L 48 22',
  ];
  return (
    <div className="stat-speed-lines">
      <svg width="56" height="32" viewBox="0 0 56 32" fill="none">
        <defs>
          <linearGradient id="speedGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        {lines.map((d, i) => (
          <motion.path
            key={i}
            d={d}
            stroke="url(#speedGrad)"
            strokeWidth="1.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={inView ? { pathLength: 1 } : { pathLength: 0 }}
            transition={{ duration: 0.45, delay: delay + i * 0.06 }}
          />
        ))}
      </svg>
    </div>
  );
}

function StatCard({ stat, index, inView, icon: Icon }) {
  const isPercent = typeof stat.value === 'string' && stat.value.includes('%');
  const isSpeed = stat.value === '<100ms';
  const isActivity = stat.value === '500K+';
  const showRing = isPercent && (stat.value.startsWith('99') || stat.value.startsWith('98'));

  return (
    <motion.div
      className="stat-card-glass"
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
    >
      <div className="stat-card-pattern" aria-hidden="true" />
      <div className="stat-card-glow" aria-hidden="true" />
      <div className="stat-card-content">
        <div className="stat-icon-wrapper">
          <Icon size={28} strokeWidth={2} />
          <span className="stat-icon-glow" />
        </div>
        {showRing && (
          <div className="stat-value-with-ring">
            <ProgressRing value={stat.value} inView={inView} delay={index * 0.08 + 0.2} idPrefix={index} />
            <span className="stat-value stat-value-overlay">{stat.value}</span>
          </div>
        )}
        {!showRing && (
          <>
            {isSpeed && <SpeedLines inView={inView} delay={index * 0.08} />}
            {isActivity && <MiniSparkline inView={inView} delay={index * 0.08} />}
            <div className="stat-value">{stat.value}</div>
          </>
        )}
        <div className="stat-label">{stat.label}</div>
      </div>
    </motion.div>
  );
}

export default StatCard;
