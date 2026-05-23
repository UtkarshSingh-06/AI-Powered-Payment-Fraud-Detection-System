import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars } from '@react-three/drei';
import * as THREE from 'three';
import SceneFallback from './SceneFallback';

function ParticleField({ count = 800 }) {
  const ref = useRef();
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const r = 4 + Math.random() * 8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [count]);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.04;
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        size={0.04}
        color="#4ade80"
        transparent
        opacity={0.8}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function ShieldCore() {
  const meshRef = useRef();

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.35;
  });

  return (
    <Float speed={1.2} rotationIntensity={0.35} floatIntensity={0.5}>
      <group ref={meshRef}>
        <mesh>
          <icosahedronGeometry args={[1.35, 1]} />
          <meshBasicMaterial color="#22c55e" wireframe transparent opacity={0.35} />
        </mesh>
        <mesh scale={0.72}>
          <icosahedronGeometry args={[1.35, 0]} />
          <meshStandardMaterial
            color="#0a1f12"
            emissive="#16a34a"
            emissiveIntensity={0.5}
            metalness={0.85}
            roughness={0.25}
          />
        </mesh>
      </group>
    </Float>
  );
}

function Scene() {
  return (
    <>
      <color attach="background" args={['#030403']} />
      <fog attach="fog" args={['#030403', 6, 22]} />
      <ambientLight intensity={0.4} />
      <pointLight position={[4, 4, 4]} intensity={1.1} color="#4ade80" />
      <Stars radius={40} depth={50} count={1200} factor={3} saturation={0} fade speed={0.5} />
      <ParticleField />
      <ShieldCore />
    </>
  );
}

function HeroCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6.5], fov: 50 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.setClearColor('#030403');
      }}
    >
      <Scene />
    </Canvas>
  );
}

class SceneErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.warn('WebGL scene fallback:', error?.message);
  }

  render() {
    if (this.state.hasError) {
      return <SceneFallback />;
    }
    return this.props.children;
  }
}

export default function HeroScene3D({ className = '' }) {
  const [webgl, setWebgl] = React.useState(true);

  React.useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const ok = !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
      setWebgl(ok);
    } catch {
      setWebgl(false);
    }
  }, []);

  if (!webgl) {
    return <SceneFallback />;
  }

  return (
    <div className={`hero-scene-3d ${className}`} aria-hidden="true">
      <SceneErrorBoundary>
        <Suspense fallback={<SceneFallback />}>
          <HeroCanvas />
        </Suspense>
      </SceneErrorBoundary>
      <div className="hero-scene-vignette" />
      <div className="hero-scene-grid" />
    </div>
  );
}
