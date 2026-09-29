import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import './interactive.css';
import './visuals.css';

const presetDistances = [0.15, 0.20, 0.25, 0.30, 0.40, 0.50, 0.65, 0.80, 1.00, 1.20];
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function poisson(lambda) {
  if (lambda <= 0) return 0;
  if (lambda < 32) {
    const L = Math.exp(-lambda);
    let p = 1;
    let k = 0;
    do { k += 1; p *= Math.random(); } while (p > L);
    return k - 1;
  }
  const u1 = Math.max(Math.random(), 1e-9);
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * z));
}

function mean(values) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function sampleSD(values) {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - m) ** 2, 0) / (values.length - 1));
}

function fitLine(points) {
  if (points.length < 2) return null;
  const n = points.length;
  const sx = points.reduce((s, p) => s + p.x, 0);
  const sy = points.reduce((s, p) => s + p.y, 0);
  const sxx = points.reduce((s, p) => s + p.x * p.x, 0);
  const sxy = points.reduce((s, p) => s + p.x * p.y, 0);
  const denominator = n * sxx - sx * sx;
  if (Math.abs(denominator) < 1e-12) return null;
  const m = (n * sxy - sx * sy) / denominator;
  const b = (sy - m * sx) / n;
  const yMean = sy / n;
  const total = points.reduce((s, p) => s + (p.y - yMean) ** 2, 0);
  const residual = points.reduce((s, p) => s + (p.y - (m * p.x + b)) ** 2, 0);
  return { m, b, r2: total === 0 ? 1 : 1 - residual / total };
}

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch {
    return false;
  }
}

class SceneBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.error('3D scene failed to render:', error); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function DetectorHitFlash({ pulse }) {
  const ring = useRef();
  const light = useRef();
  const life = useRef(0);

  useEffect(() => {
    if (pulse > 0) life.current = 1;
  }, [pulse]);

  useFrame((_, delta) => {
    life.current = Math.max(0, life.current - delta * 5.5);
    if (ring.current) {
      ring.current.scale.setScalar(1 + (1 - life.current) * 0.65);
      ring.current.material.opacity = life.current * 0.92;
    }
    if (light.current) light.current.intensity = life.current * 7;
  });

  return (
    <group position={[-0.345, 0.48, 0]}>
      <mesh ref={ring} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.15, 0.018, 10, 28]} />
        <meshBasicMaterial color="#a7f3ff" transparent opacity={0} depthWrite={false} />
      </mesh>
      <pointLight ref={light} color="#7de8ff" intensity={0} distance={1.8} />
    </group>
  );
}

function SourceRadiation({ sourceX, detectorX, active, counting, visualBoost }) {
  const refs = useRef([]);
  const particles = useMemo(() => Array.from({ length: 76 }, (_, i) => {
    const aimed = i % 5 === 0 || i % 7 === 0;
    const a = i * 2.3999632297;
    return {
      phase: (i * 0.137) % 1,
      speed: 0.14 + (i % 9) * 0.022,
      aimed,
      dy: aimed ? Math.sin(a) * 0.035 : Math.sin(a) * (0.30 + (i % 6) * 0.055),
      dz: aimed ? Math.cos(a) * 0.035 : Math.cos(a) * (0.30 + (i % 5) * 0.06),
      size: 0.014 + (i % 4) * 0.003,
    };
  }), []);

  const visibleCount = clamp(Math.round(42 * visualBoost), 24, particles.length);

  useFrame(({ clock }) => {
    const now = clock.getElapsedTime();
    refs.current.forEach((group, i) => {
      if (!group || i >= visibleCount) return;
      const p = particles[i];
      const speed = p.speed * (counting ? 2.15 : 0.82);
      const t = (p.phase + now * speed) % 1;
      const endX = p.aimed ? detectorX + 0.08 : Math.min(2.55, sourceX + 4.5);
      group.position.x = sourceX + 0.10 + (endX - sourceX - 0.10) * t;
      group.position.y = 1.27 + p.dy * t * 1.15;
      group.position.z = p.dz * t * 1.15;
      const scale = (0.84 + Math.sin(now * 8 + i) * 0.16) * (0.85 + visualBoost * 0.16);
      group.scale.setScalar(scale);
      group.visible = active;
      group.children.forEach((child, childIndex) => {
        if (child.material) child.material.opacity = childIndex === 0 ? 0.92 : 0.28 + (1 - t) * 0.36;
      });
    });
  });

  if (!active) return null;
  return (
    <group>
      {particles.slice(0, visibleCount).map((p, i) => (
        <group key={i} ref={el => { refs.current[i] = el; }}>
          <mesh>
            <sphereGeometry args={[p.size, 10, 10]} />
            <meshBasicMaterial color={p.aimed ? '#fff7b0' : '#ffd63d'} transparent opacity={0.92} depthWrite={false} />
          </mesh>
          <mesh position={[-0.09, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.004, 0.012, 0.18, 6]} />
            <meshBasicMaterial color="#ffb300" transparent opacity={0.46} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function BackgroundRadiation({ active, counting, visualBoost }) {
  const refs = useRef([]);
  const particles = useMemo(() => Array.from({ length: 28 }, (_, i) => ({
    phase: (i * 0.193) % 1,
    x: -2.95 + (i % 9) * 0.70,
    z: -1.25 + (i % 6) * 0.48,
    speed: 0.06 + (i % 5) * 0.019,
  })), []);
  const visibleCount = clamp(Math.round(16 * visualBoost), 9, particles.length);

  useFrame(({ clock }) => {
    const now = clock.getElapsedTime();
    refs.current.forEach((group, i) => {
      if (!group || i >= visibleCount) return;
      const p = particles[i];
      const t = (p.phase + now * p.speed * (counting ? 2.0 : 0.72)) % 1;
      group.position.set(p.x + Math.sin(now * 0.7 + i) * 0.14, 2.7 - t * 2.35, p.z + Math.cos(now + i) * 0.08);
      group.visible = active;
      group.children.forEach((child, childIndex) => {
        if (child.material) child.material.opacity = childIndex === 0 ? 0.72 : 0.30;
      });
    });
  });

  if (!active) return null;
  return (
    <group>
      {particles.slice(0, visibleCount).map((_, i) => (
        <group key={i} ref={el => { refs.current[i] = el; }}>
          <mesh>
            <sphereGeometry args={[0.013, 8, 8]} />
            <meshBasicMaterial color="#82ddff" transparent opacity={0.72} depthWrite={false} />
          </mesh>
          <mesh position={[0, 0.10, 0]}>
            <cylinderGeometry args={[0.004, 0.009, 0.20, 6]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.30} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function InverseShells3D({ sourceX, visible }) {
  if (!visible) return null;
  return (
    <group position={[sourceX, 1.27, 0]}>
      {[0.58, 1.05, 1.52].map((radius, i) => (
        <mesh key={radius}>
          <sphereGeometry args={[radius, 26, 18]} />
          <meshBasicMaterial color={i === 0 ? '#ffd54a' : '#55d8ff'} wireframe transparent opacity={0.16 - i * 0.025} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function VirtualApparatus({ distance, onDistanceChange, counting, setup, showRadiation, radiationView, visualBoost, shutterOpen, onToggleShutter, displayCounts, hitPulse }) {
  const railMinX = -1.25;
  const railMaxX = 1.80;
  const sourceX = -2.15;
  const detectorX = railMinX + ((distance - 0.15) / 1.05) * (railMaxX - railMinX);
  const ticks = Array.from({ length: 22 }, (_, i) => railMinX + i * ((railMaxX - railMinX) / 21));
  const [dragging, setDragging] = useState(null);
  const [scalerPosition, setScalerPosition] = useState({ x: 2.48, z: -0.62 });
  const dragPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.46), []);
  const point = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    document.body.classList.toggle('apparatus-dragging', Boolean(dragging));
    return () => document.body.classList.remove('apparatus-dragging');
  }, [dragging]);

  function benchPoint(event) {
    return event.ray.intersectPlane(dragPlane, point);
  }

  const detectorHandlers = {
    onPointerDown: event => {
      event.stopPropagation();
      event.target.setPointerCapture?.(event.pointerId);
      setDragging('detector');
    },
    onPointerMove: event => {
      if (dragging !== 'detector') return;
      event.stopPropagation();
      const hit = benchPoint(event);
      if (!hit) return;
      const x = clamp(hit.x, railMinX, railMaxX);
      const next = 0.15 + ((x - railMinX) / (railMaxX - railMinX)) * 1.05;
      onDistanceChange(Number(clamp(next, 0.15, 1.20).toFixed(2)));
    },
    onPointerUp: event => {
      event.stopPropagation();
      event.target.releasePointerCapture?.(event.pointerId);
      setDragging(null);
    },
    onPointerCancel: () => setDragging(null),
  };

  const scalerHandlers = {
    onPointerDown: event => {
      event.stopPropagation();
      event.target.setPointerCapture?.(event.pointerId);
      setDragging('scaler');
    },
    onPointerMove: event => {
      if (dragging !== 'scaler') return;
      event.stopPropagation();
      const hit = benchPoint(event);
      if (!hit) return;
      setScalerPosition({ x: clamp(hit.x, 1.55, 2.80), z: clamp(hit.z, -1.20, 0.22) });
    },
    onPointerUp: event => {
      event.stopPropagation();
      event.target.releasePointerCapture?.(event.pointerId);
      setDragging(null);
    },
    onPointerCancel: () => setDragging(null),
  };

  const benchColor = radiationView ? '#101a23' : '#243747';
  const ambient = radiationView ? 0.38 : 0.88;

  return (
    <>
      <ambientLight intensity={ambient} />
      <directionalLight position={[4, 6, 5]} intensity={radiationView ? 1.15 : 2.1} castShadow />
      <pointLight position={[-2.15, 2.0, 0]} intensity={shutterOpen && setup === 'measure' ? 9 : 2} color="#ffd54a" />
      <pointLight position={[2.4, 1.8, -1]} intensity={radiationView ? 2 : 4} color="#65f3b4" />

      <mesh position={[0, -0.18, 0]} receiveShadow>
        <boxGeometry args={[7.2, 0.24, 3.3]} />
        <meshStandardMaterial color={benchColor} roughness={0.46} metalness={0.12} />
      </mesh>

      <group position={[sourceX, 0.35, 0]} onClick={event => { event.stopPropagation(); if (setup === 'measure') onToggleShutter(); }}>
        <mesh position={[0, 0.43, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.18, 0.86, 40]} />
          <meshStandardMaterial color="#d0d7dc" metalness={0.82} roughness={0.22} />
        </mesh>
        <mesh position={[0, 0.12, 0]} castShadow>
          <cylinderGeometry args={[0.29, 0.34, 0.17, 40]} />
          <meshStandardMaterial color="#17222c" metalness={0.72} roughness={0.28} />
        </mesh>
        <mesh position={[0, shutterOpen && setup === 'measure' ? 1.03 : 0.93, shutterOpen && setup === 'measure' ? -0.16 : 0]} rotation={[0, 0, shutterOpen && setup === 'measure' ? -0.42 : 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.12, 0.16, 28]} />
          <meshStandardMaterial color={shutterOpen && setup === 'measure' ? '#707d86' : '#46545d'} metalness={0.9} roughness={0.18} />
        </mesh>
        {setup === 'measure' && shutterOpen && (
          <>
            <mesh position={[0, 0.92, 0]}>
              <sphereGeometry args={[0.074, 22, 22]} />
              <meshStandardMaterial color="#fff4a0" emissive="#d69a00" emissiveIntensity={2.2} />
            </mesh>
            <pointLight position={[0, 0.92, 0]} color="#ffd54a" intensity={5.5} distance={1.5} />
          </>
        )}
      </group>

      <InverseShells3D sourceX={sourceX} visible={radiationView && setup === 'measure' && shutterOpen} />

      <group position={[0.15, 0.27, 0.42]}>
        <mesh castShadow>
          <boxGeometry args={[4.0, 0.08, 0.19]} />
          <meshStandardMaterial color="#c6d0d7" metalness={0.92} roughness={0.14} />
        </mesh>
        {ticks.map((x, i) => (
          <mesh key={i} position={[x - 0.15, 0.06, 0]}>
            <boxGeometry args={[0.010, 0.06 + (i % 2 === 0 ? 0.07 : 0), 0.13]} />
            <meshStandardMaterial color={i % 2 === 0 ? '#ffffff' : '#9fb0bd'} />
          </mesh>
        ))}
      </group>

      <group position={[detectorX, 0.48, 0.02]} {...detectorHandlers}>
        <mesh position={[0, -0.19, 0]} castShadow>
          <cylinderGeometry args={[0.24, 0.30, 0.10, 40]} />
          <meshStandardMaterial color={dragging === 'detector' ? '#2a6987' : '#17242d'} metalness={0.72} roughness={0.26} />
        </mesh>
        <mesh position={[0, 0.18, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.70, 28]} />
          <meshStandardMaterial color="#bcc6cd" metalness={0.94} roughness={0.15} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} position={[0.10, 0.48, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.15, 0.72, 42]} />
          <meshStandardMaterial color={counting ? '#2f84ad' : '#203647'} emissive={counting ? '#124d69' : '#000000'} emissiveIntensity={counting ? 0.75 : 0} metalness={0.68} roughness={0.25} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} position={[-0.30, 0.48, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.08, 30]} />
          <meshStandardMaterial color="#e2e8ec" metalness={0.88} roughness={0.13} />
        </mesh>
        <DetectorHitFlash pulse={hitPulse} />
      </group>

      <group position={[scalerPosition.x, 0.38, scalerPosition.z]} {...scalerHandlers}>
        <mesh castShadow>
          <boxGeometry args={[1.35, 0.75, 0.65]} />
          <meshStandardMaterial color={dragging === 'scaler' ? '#21506a' : '#122635'} metalness={0.44} roughness={0.30} />
        </mesh>
        <mesh position={[0, 0.08, 0.34]}>
          <planeGeometry args={[0.88, 0.28]} />
          <meshStandardMaterial color="#04120c" emissive="#39ff99" emissiveIntensity={0.38 + Math.min(displayCounts / 850, 0.55)} />
        </mesh>
        <mesh position={[-0.35, -0.24, 0.34]}><cylinderGeometry args={[0.045, 0.045, 0.035, 20]} /><meshStandardMaterial color="#e95151" /></mesh>
        <mesh position={[-0.12, -0.24, 0.34]}><cylinderGeometry args={[0.045, 0.045, 0.035, 20]} /><meshStandardMaterial color="#50df8f" /></mesh>
      </group>

      <SourceRadiation sourceX={sourceX} detectorX={detectorX} active={showRadiation && setup === 'measure' && shutterOpen} counting={counting} visualBoost={radiationView ? visualBoost * 1.25 : visualBoost} />
      <BackgroundRadiation active={showRadiation && setup === 'background'} counting={counting} visualBoost={visualBoost} />

      <OrbitControls enabled={!dragging} enablePan={false} minDistance={3.4} maxDistance={8.5} target={[0, 0.55, 0]} />
    </>
  );
}

function SceneFallback({ distance }) {
  return (
    <div className="scene-fallback">
      <div className="source-2d">Virtual source</div>
      <div className="rail-2d"><div className="detector-2d" style={{ left: `${((distance - 0.15) / 1.05) * 92 + 4}%` }} /></div>
      <strong>{distance.toFixed(2)} m</strong>
      <p>3D graphics are unavailable on this browser, but the practical controls and data collection still work.</p>
    </div>
  );
}

function SimpleGraph({ points, fit }) {
  if (points.length < 2) return <div className="empty-graph"><b>Collect at least two different distances</b><span>Your graph will appear here.</span></div>;
  const width = 760;
  const height = 380;
  const pad = { left: 72, right: 30, top: 28, bottom: 58 };
  const xMax = Math.max(...points.map(p => p.x)) * 1.08 || 1;
  const yMax = Math.max(...points.map(p => p.y + p.error)) * 1.12 || 1;
  const mapX = x => pad.left + (x / xMax) * (width - pad.left - pad.right);
  const mapY = y => height - pad.bottom - (y / yMax) * (height - pad.top - pad.bottom);
  return (
    <svg className="result-graph" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Corrected count rate against inverse distance squared">
      <line x1={pad.left} x2={pad.left} y1={pad.top} y2={height - pad.bottom} className="axis" />
      <line x1={pad.left} x2={width - pad.right} y1={height - pad.bottom} y2={height - pad.bottom} className="axis" />
      {[0, 0.25, 0.5, 0.75, 1].map(frac => <React.Fragment key={frac}>
        <line x1={pad.left} x2={width - pad.right} y1={mapY(yMax * frac)} y2={mapY(yMax * frac)} className="gridline" />
        <text x={pad.left - 12} y={mapY(yMax * frac) + 4} textAnchor="end" className="tick-text">{(yMax * frac).toFixed(1)}</text>
        <text x={mapX(xMax * frac)} y={height - pad.bottom + 24} textAnchor="middle" className="tick-text">{(xMax * frac).toFixed(1)}</text>
      </React.Fragment>)}
      {fit && <line x1={mapX(0)} y1={mapY(Math.max(0, fit.b))} x2={mapX(xMax)} y2={mapY(Math.max(0, fit.m * xMax + fit.b))} className="fit-line" />}
      {points.map((p, i) => <g key={`${p.x}-${i}`}>
        <line x1={mapX(p.x)} x2={mapX(p.x)} y1={mapY(Math.max(0, p.y - p.error))} y2={mapY(p.y + p.error)} className="error-line" />
        <circle cx={mapX(p.x)} cy={mapY(p.y)} r="6" className="point" />
      </g>)}
      <text x={width / 2} y={height - 12} textAnchor="middle" className="axis-label">1 / r² / m⁻²</text>
      <text transform={`translate(18 ${height / 2}) rotate(-90)`} textAnchor="middle" className="axis-label">corrected count rate / s⁻¹</text>
    </svg>
  );
}

function InverseSquareVisualiser() {
  const [demoDistance, setDemoDistance] = useState(2);
  const intensity = 1 / (demoDistance * demoDistance);
  const relativeArea = demoDistance * demoDistance;
  const cx = 285;
  const cy = 205;
  const selectedRadius = 48 + ((demoDistance - 1) / 3) * 122;
  const rayAngles = Array.from({ length: 28 }, (_, i) => (i / 28) * Math.PI * 2);
  const packetAngles = Array.from({ length: 36 }, (_, i) => (i / 36) * Math.PI * 2);

  return (
    <section className="inverse-visual-layout">
      <div className="card inverse-main-card">
        <div className="card-head">
          <div><span className="mini">Interactive visual model</span><h2>Why intensity falls as 1/r²</h2></div>
          <div className="formula-chip">I ∝ 1/r²</div>
        </div>
        <p className="visual-explainer">The same emission spreads over a spherical surface whose area grows as 4πr². Move the distance slider and watch the same number of yellow packets spread over a larger shell.</p>

        <div className="inverse-svg-wrap">
          <svg viewBox="0 0 650 410" className="inverse-svg" role="img" aria-label="Radiation spreading over expanding shells">
            <defs>
              <radialGradient id="sourceGlow"><stop offset="0%" stopColor="#fffbd1" /><stop offset="42%" stopColor="#ffd84a" /><stop offset="100%" stopColor="#ff9f00" stopOpacity="0" /></radialGradient>
              <filter id="packetGlow"><feGaussianBlur stdDeviation="2.2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>
            {[55, 108, 165].map((r, i) => <circle key={r} cx={cx} cy={cy} r={r} className={`shell shell-${i + 1}`} />)}
            {rayAngles.map((angle, i) => <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(angle) * 180} y2={cy + Math.sin(angle) * 180} className="spread-ray" />)}
            <circle cx={cx} cy={cy} r="31" fill="url(#sourceGlow)" /><circle cx={cx} cy={cy} r="8" className="source-core" />
            <circle cx={cx} cy={cy} r={selectedRadius} className="selected-shell" />
            {packetAngles.map((angle, i) => <circle key={i} cx={cx + Math.cos(angle) * selectedRadius} cy={cy + Math.sin(angle) * selectedRadius} r="4.4" className="packet-dot" filter="url(#packetGlow)" />)}
            <rect x={cx + selectedRadius - 9} y={cy - 20} width="18" height="40" rx="4" className="detector-window" />
            <text x={cx + selectedRadius + 14} y={cy - 28} className="svg-label">small detector area</text>
            <text x="28" y="38" className="svg-title">same number of emitted packets</text><text x="28" y="61" className="svg-subtitle">spread over a larger spherical surface</text>
          </svg>
        </div>

        <div className="demo-slider-row"><div><span>Distance from source</span><b>{demoDistance.toFixed(2)} r</b></div><input type="range" min="1" max="4" step="0.01" value={demoDistance} onChange={e => setDemoDistance(Number(e.target.value))} /></div>
        <div className="inverse-metrics"><div><span>Relative spherical area</span><b>{relativeArea.toFixed(2)}×</b><small>area ∝ r²</small></div><div><span>Relative intensity</span><b>{(intensity * 100).toFixed(1)}%</b><small>intensity ∝ 1/r²</small></div><div><span>1/r²</span><b>{intensity.toFixed(3)}</b><small>relative units</small></div></div>
        <div className="intensity-meter"><span style={{ width: `${intensity * 100}%` }} /></div>
      </div>

      <aside className="inverse-side-stack">
        <div className="card comparison-card"><span className="mini">Distance comparison</span><h2>Doubling distance matters a lot</h2>{[1, 2, 3, 4].map(r => <div className="comparison-row" key={r}><div className="mini-shell" style={{ '--shell-scale': `${0.42 + r * 0.13}` }}><i /></div><b>{r}r</b><span>{(100 / (r * r)).toFixed(r === 1 ? 0 : 1)}% intensity</span><small>{r * r}× area</small></div>)}</div>
        <div className="card teaching-card"><span className="mini">Key idea</span><h2>It is geometric spreading</h2><p>The source is not becoming weaker just because the detector is moved away. The radiation is spread across a larger surface, so the amount crossing a fixed detector area decreases.</p><div className="equation-stack"><b>A = 4πr²</b><b>I ∝ 1/A</b><strong>therefore I ∝ 1/r²</strong></div></div>
        <div className="card teaching-card"><span className="mini">Prediction</span><h2>Use it before measuring</h2><p>If a corrected rate were 800 s⁻¹ at r, an ideal inverse-square model predicts:</p><div className="prediction-grid"><span>at 2r <b>200 s⁻¹</b></span><span>at 3r <b>88.9 s⁻¹</b></span><span>at 4r <b>50 s⁻¹</b></span></div></div>
      </aside>
    </section>
  );
}

function App() {
  const [tab, setTab] = useState('lab');
  const [distance, setDistance] = useState(0.30);
  const [countTime, setCountTime] = useState(30);
  const [timeScale, setTimeScale] = useState(10);
  const [setup, setSetup] = useState('background');
  const [rows, setRows] = useState([]);
  const [backgroundRuns, setBackgroundRuns] = useState([]);
  const [running, setRunning] = useState(false);
  const [displayCounts, setDisplayCounts] = useState(0);
  const [displayTime, setDisplayTime] = useState(0);
  const [backgroundTrue, setBackgroundTrue] = useState(0.55);
  const [sourceStrength, setSourceStrength] = useState(0.38);
  const [showRadiation, setShowRadiation] = useState(true);
  const [radiationView, setRadiationView] = useState(false);
  const [visualBoost, setVisualBoost] = useState(1.15);
  const [soundOn, setSoundOn] = useState(false);
  const [shutterOpen, setShutterOpen] = useState(false);
  const [hitPulse, setHitPulse] = useState(0);
  const stopRef = useRef(false);
  const audioRef = useRef(null);
  const soundOnRef = useRef(false);
  const webgl = useMemo(() => supportsWebGL(), []);

  useEffect(() => () => { if (audioRef.current?.close) audioRef.current.close(); }, []);
  useEffect(() => { if (setup === 'background') setShutterOpen(false); }, [setup]);

  function primeAudio() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioRef.current) audioRef.current = new AudioCtx();
    if (audioRef.current.state === 'suspended') audioRef.current.resume();
    return audioRef.current;
  }

  function toggleSound() {
    const next = !soundOnRef.current;
    soundOnRef.current = next;
    setSoundOn(next);
    if (next) primeAudio();
  }

  function playClicks(count) {
    if (!soundOnRef.current || count <= 0) return;
    const ctx = primeAudio();
    if (!ctx) return;
    const number = Math.min(count, 7);
    for (let i = 0; i < number; i += 1) {
      const start = ctx.currentTime + i * 0.018;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = 'square';
      osc.frequency.value = 1450 + Math.random() * 850;
      filter.type = 'bandpass';
      filter.frequency.value = 1900;
      filter.Q.value = 0.7;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.035, start + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.014);
      osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      osc.start(start); osc.stop(start + 0.016);
    }
  }

  const backgroundRate = backgroundRuns.length ? mean(backgroundRuns.map(r => r.rate)) : null;
  const backgroundSigma = backgroundRuns.length ? Math.sqrt(backgroundRuns.reduce((s, r) => s + r.counts, 0)) / Math.max(1, backgroundRuns.reduce((s, r) => s + r.time, 0)) : 0;
  const aggregated = useMemo(() => {
    const groups = new Map();
    rows.forEach(row => { const key = row.distance.toFixed(2); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(row); });
    return [...groups.entries()].map(([key, values]) => {
      const correctedValues = values.map(v => v.correctedRate);
      const avg = mean(correctedValues);
      const sd = sampleSD(correctedValues);
      const measurementSigma = mean(values.map(v => v.sigma));
      const uncertainty = values.length > 1 ? Math.max(sd / Math.sqrt(values.length), measurementSigma / Math.sqrt(values.length)) : measurementSigma;
      const r = Number(key);
      return { distance: r, n: values.length, mean: avg, sd, uncertainty, invR2: 1 / (r * r) };
    }).sort((a, b) => a.distance - b.distance);
  }, [rows]);

  const graphPoints = aggregated.map(item => ({ x: item.invR2, y: item.mean, error: item.uncertainty }));
  const fit = fitLine(graphPoints);
  const differentDistances = aggregated.length;
  const repeatedDistances = aggregated.filter(a => a.n > 1).length;
  const inverseAtCurrentDistance = 1 / (distance * distance);
  const relativeIntensity = (0.15 / distance) ** 2;

  function hiddenRateAt(r) { const effectiveDistance = Math.max(0.08, r + 0.012); return sourceStrength / (effectiveDistance * effectiveDistance) + backgroundTrue; }

  async function simulateCount(rate) {
    setRunning(true); setDisplayCounts(0); setDisplayTime(0); stopRef.current = false;
    if (soundOnRef.current) primeAudio();
    const wallDuration = Math.max(750, (countTime * 1000) / timeScale);
    const tickMs = 80;
    const start = performance.now();
    let previousSimTime = 0;
    let totalCounts = 0;
    return new Promise(resolve => {
      const tick = () => {
        const now = performance.now();
        const elapsedWall = Math.min(wallDuration, now - start);
        const simTime = Math.min(countTime, (elapsedWall / wallDuration) * countTime);
        const deltaTime = Math.max(0, simTime - previousSimTime);
        const added = deltaTime > 0 ? poisson(rate * deltaTime) : 0;
        totalCounts += added;
        if (added > 0) { playClicks(added); setHitPulse(value => value + added); }
        previousSimTime = simTime;
        setDisplayCounts(totalCounts); setDisplayTime(simTime);
        if (elapsedWall < wallDuration && !stopRef.current) window.setTimeout(tick, tickMs);
        else { setRunning(false); resolve({ counts: totalCounts, time: simTime }); }
      };
      tick();
    });
  }

  async function takeBackground() {
    if (running) return;
    setSetup('background');
    const result = await simulateCount(backgroundTrue);
    if (result.time < 1) return;
    setBackgroundRuns(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, counts: result.counts, time: result.time, rate: result.counts / result.time }]);
  }

  async function takeMeasurement() {
    if (running || backgroundRate === null || !shutterOpen) return;
    setSetup('measure');
    const result = await simulateCount(hiddenRateAt(distance));
    if (result.time < 1) return;
    const rawRate = result.counts / result.time;
    const correctedRate = Math.max(0, rawRate - backgroundRate);
    const rawSigma = Math.sqrt(Math.max(1, result.counts)) / result.time;
    const sigma = Math.sqrt(rawSigma ** 2 + backgroundSigma ** 2);
    const repeat = rows.filter(row => Math.abs(row.distance - distance) < 1e-6).length + 1;
    setRows(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, distance, repeat, time: result.time, counts: result.counts, rawRate, backgroundRate, correctedRate, sigma, invR2: 1 / (distance * distance) }]);
  }

  function resetData() { stopRef.current = true; setRows([]); setBackgroundRuns([]); setDisplayCounts(0); setDisplayTime(0); setSetup('background'); setShutterOpen(false); }
  function exportCsv() {
    const header = ['distance_m', 'repeat', 'time_s', 'counts', 'raw_rate_s-1', 'background_rate_s-1', 'corrected_rate_s-1', 'sigma_s-1', 'inverse_r_squared_m-2'];
    const lines = rows.map(r => [r.distance, r.repeat, r.time, r.counts, r.rawRate, r.backgroundRate, r.correctedRate, r.sigma, r.invR2]);
    const csv = [header, ...lines].map(line => line.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'inverse-square-results.csv'; anchor.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className={`stable-app interactive-app ${radiationView ? 'radiation-view' : ''}`}>
      <header className="hero"><div><span className="eyebrow">A-level Physics • virtual inverse-square investigation</span><h1>Inverse Square Practical <em>Interactive 3D Lab</em></h1><p>Drag the apparatus, see individual teaching-visualisation packets, hear detector clicks and build the inverse-square relationship from your own data.</p></div><div className="hero-badges"><span>Mouse-draggable apparatus</span><span>Detector audio + flash</span><span>Inverse-square visual model</span></div></header>
      <nav className="main-tabs"><button className={tab === 'lab' ? 'active' : ''} onClick={() => setTab('lab')}>3D Practical</button><button className={tab === 'inverse' ? 'active' : ''} onClick={() => setTab('inverse')}>Inverse Square Visual</button><button className={tab === 'results' ? 'active' : ''} onClick={() => setTab('results')}>Results & Graph</button><button className={tab === 'theory' ? 'active' : ''} onClick={() => setTab('theory')}>Theory</button><button className={tab === 'teacher' ? 'active' : ''} onClick={() => setTab('teacher')}>Teacher</button></nav>
      <main className="content-shell">
        {tab === 'lab' && <section className="lab-grid">
          <div className="card scene-card"><div className="card-head"><div><span className="mini">Interactive apparatus</span><h2>Virtual laboratory bench</h2></div><span className={`ready-pill ${running ? 'live' : ''}`}>{running ? 'COUNTING' : 'READY'}</span></div>
            <div className="interaction-strip"><span>🖱 Drag the GM detector along the rail</span><span>🖱 Drag the scaler around the bench</span><span>↻ Drag empty space to orbit the camera</span><span>☝ Click the source to operate its virtual shutter</span></div>
            <div className="scene-stage">
              {webgl ? <SceneBoundary fallback={<SceneFallback distance={distance} />}><Canvas shadows camera={{ position: [4.8, 3.3, 4.9], fov: 42 }} dpr={[1, 1.35]}><VirtualApparatus distance={distance} onDistanceChange={value => { if (!running) setDistance(value); }} counting={running} setup={setup} showRadiation={showRadiation} radiationView={radiationView} visualBoost={visualBoost} shutterOpen={shutterOpen} onToggleShutter={() => { if (!running) setShutterOpen(open => !open); }} displayCounts={displayCounts} hitPulse={hitPulse} /></Canvas></SceneBoundary> : <SceneFallback distance={distance} />}
              <div className="digital-overlay"><div><span>Distance</span><b>{distance.toFixed(2)} m</b></div><div><span>1/r²</span><b>{inverseAtCurrentDistance.toFixed(2)} m⁻²</b></div><div><span>Ideal relative intensity</span><b>{(relativeIntensity * 100).toFixed(1)}%</b></div><div><span>Counts</span><b>{displayCounts}</b></div><div><span>Timer</span><b>{displayTime.toFixed(1)} s</b></div></div>
              {showRadiation && <div className="radiation-legend"><span><i className="gold-dot" /> source radiation visualisation</span><span><i className="blue-dot" /> background events</span><small>Teaching visualisation — gamma radiation is not visible to the eye.</small></div>}
            </div>
            <div className="control-panel"><div className="slider-row"><div><span>GM detector position</span><b>{distance.toFixed(2)} m</b></div><input disabled={running} type="range" min="0.15" max="1.20" step="0.01" value={distance} onChange={e => setDistance(Number(e.target.value))} /></div><div className="preset-buttons">{presetDistances.map(value => <button key={value} disabled={running} className={Math.abs(value - distance) < 0.001 ? 'active' : ''} onClick={() => setDistance(value)}>{value.toFixed(2)}</button>)}</div><div className="visual-controls"><button className={soundOn ? 'toggle-button active' : 'toggle-button'} onClick={toggleSound}>{soundOn ? '🔊 Detector clicks on' : '🔇 Enable detector clicks'}</button><button className={showRadiation ? 'toggle-button active' : 'toggle-button'} onClick={() => setShowRadiation(value => !value)}>{showRadiation ? '✨ Radiation packets visible' : '✨ Show radiation packets'}</button><button className={radiationView ? 'toggle-button active radiation-toggle' : 'toggle-button radiation-toggle'} onClick={() => setRadiationView(value => !value)}>{radiationView ? '◉ Radiation View on' : '◉ Radiation View'}</button>{setup === 'measure' && <button disabled={running} className={shutterOpen ? 'toggle-button warning active' : 'toggle-button warning'} onClick={() => setShutterOpen(value => !value)}>{shutterOpen ? 'Close virtual source shutter' : 'Open virtual source shutter'}</button>}</div></div>
          </div>
          <aside className="side-stack"><div className="card"><span className="mini">Counter controls</span><h2>Run a measurement</h2><div className="mode-switch"><button className={setup === 'background' ? 'active' : ''} disabled={running} onClick={() => setSetup('background')}>Background</button><button className={setup === 'measure' ? 'active' : ''} disabled={running} onClick={() => setSetup('measure')}>Source measurement</button></div><label className="field-label">Counting time</label><div className="time-buttons">{[10, 30, 60, 120].map(value => <button key={value} className={countTime === value ? 'active' : ''} disabled={running} onClick={() => setCountTime(value)}>{value} s</button>)}</div>{setup === 'background' ? <button className="primary-button" disabled={running} onClick={takeBackground}>{running ? 'Counting…' : 'Take background count'}</button> : <button className="primary-button" disabled={running || backgroundRate === null || !shutterOpen} onClick={takeMeasurement}>{running ? 'Counting…' : `Take reading at ${distance.toFixed(2)} m`}</button>}{running && <button className="stop-button" onClick={() => { stopRef.current = true; }}>Stop early</button>}{backgroundRate === null && setup === 'measure' && <div className="notice">Take a background count before collecting source data.</div>}{setup === 'measure' && !shutterOpen && <div className="notice amber">Open the virtual source shutter before starting a source measurement.</div>}</div>
            <div className="card live-counter-card"><span className="mini">Digital scaler</span><div className="live-counter"><span>{running ? 'COUNTING' : 'READY'}</span><b>{String(displayCounts).padStart(4, '0')}</b><small>{displayTime.toFixed(1)} s</small></div><p className="muted-note">Each simulated detection can produce a click and a cyan flash at the detector face.</p></div>
            <div className="card teaching-overlay-card"><span className="mini">Live inverse-square link</span><h2>What moving the detector changes</h2><div className="live-law-grid"><div><span>r</span><b>{distance.toFixed(2)} m</b></div><div><span>1/r²</span><b>{inverseAtCurrentDistance.toFixed(2)}</b></div><div><span>relative I</span><b>{(relativeIntensity * 100).toFixed(1)}%</b></div></div><div className="mini-intensity-bar"><i style={{ width: `${clamp(relativeIntensity * 100, 1, 100)}%` }} /></div><button className="secondary-button" onClick={() => setTab('inverse')}>Open full visual explanation</button></div>
            <div className="card"><span className="mini">Practical progress</span><h2>Your dataset</h2><div className="stats-grid"><div><span>Background runs</span><b>{backgroundRuns.length}</b></div><div><span>Background rate</span><b>{backgroundRate === null ? '—' : `${backgroundRate.toFixed(3)} s⁻¹`}</b></div><div><span>Distances</span><b>{differentDistances}</b></div><div><span>Readings</span><b>{rows.length}</b></div></div><div className="progress-list"><div className={backgroundRuns.length >= 2 ? 'done' : ''}>Measure background more than once</div><div className={differentDistances >= 6 ? 'done' : ''}>Collect a wide range of distances</div><div className={repeatedDistances >= 3 ? 'done' : ''}>Repeat several distances</div><div className={differentDistances >= 6 ? 'done' : ''}>Analyse corrected rate against 1/r²</div></div><button className="secondary-button" onClick={resetData}>Reset experiment</button></div>
            <div className="card safety-card"><b>Simulation only</b><p>This visualisation models the experiment. Real radioactive-source work must follow your school’s authorised procedures and staff supervision.</p></div></aside>
        </section>}
        {tab === 'inverse' && <InverseSquareVisualiser />}
        {tab === 'results' && <section className="results-grid"><div className="card graph-card"><div className="card-head"><div><span className="mini">Processed data</span><h2>Corrected count rate vs 1/r²</h2></div>{rows.length > 0 && <button className="secondary-button" onClick={exportCsv}>Export CSV</button>}</div><SimpleGraph points={graphPoints} fit={fit} />{fit && <div className="fit-stats"><div><span>Gradient</span><b>{fit.m.toFixed(3)}</b></div><div><span>Intercept</span><b>{fit.b.toFixed(3)}</b></div><div><span>R²</span><b>{fit.r2.toFixed(4)}</b></div></div>}</div><div className="card table-card"><span className="mini">Measurements</span><h2>Raw and corrected results</h2><div className="table-scroll"><table><thead><tr><th>r / m</th><th>repeat</th><th>time / s</th><th>counts</th><th>raw / s⁻¹</th><th>background / s⁻¹</th><th>corrected / s⁻¹</th><th>1/r² / m⁻²</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.distance.toFixed(2)}</td><td>{row.repeat}</td><td>{row.time.toFixed(1)}</td><td>{row.counts}</td><td>{row.rawRate.toFixed(3)}</td><td>{row.backgroundRate.toFixed(3)}</td><td><b>{row.correctedRate.toFixed(3)}</b></td><td>{row.invR2.toFixed(3)}</td></tr>)}{!rows.length && <tr><td colSpan="8" className="empty-cell">No source readings yet.</td></tr>}</tbody></table></div></div><div className="card table-card"><span className="mini">Repeat processing</span><h2>Mean values by distance</h2><div className="table-scroll"><table><thead><tr><th>r / m</th><th>repeats</th><th>mean corrected / s⁻¹</th><th>SD / s⁻¹</th><th>uncertainty / s⁻¹</th></tr></thead><tbody>{aggregated.map(item => <tr key={item.distance}><td>{item.distance.toFixed(2)}</td><td>{item.n}</td><td>{item.mean.toFixed(3)}</td><td>{item.sd ? item.sd.toFixed(3) : '—'}</td><td>{item.uncertainty.toFixed(3)}</td></tr>)}</tbody></table></div></div></section>}
        {tab === 'theory' && <section className="theory-grid enhanced-theory-grid"><div className="card theory-card hero-theory-card"><span className="mini">Relationship</span><h2>Inverse-square law</h2><div className="formula">I ∝ 1 / r²</div><div className="distance-cards"><div><b>r</b><span>100%</span></div><div><b>2r</b><span>25%</span></div><div><b>3r</b><span>11.1%</span></div><div><b>4r</b><span>6.25%</span></div></div><p>For an ideal point-like source, radiation spreads across a spherical area that grows with r².</p></div><div className="card theory-card"><span className="mini">Visual model</span><h2>What the glowing packets mean</h2><div className="particle-key"><span><i className="gold-dot" /> source radiation</span><span><i className="blue-dot" /> background events</span><span><i className="cyan-ring" /> detector response</span></div><p>The particles and flashes are deliberately visible for teaching. Gamma radiation itself is not visible to the eye.</p></div><div className="card theory-card"><span className="mini">Geometry</span><h2>Area grows as r²</h2><div className="formula small">A = 4πr²</div><p>At twice the radius the spherical surface has four times the area; at three times the radius it has nine times the area.</p></div><div className="card theory-card"><span className="mini">Processing</span><h2>Background correction</h2><div className="formula small">corrected rate = raw rate − background rate</div><p>The detector registers background events as well as the virtual source contribution.</p></div><div className="card theory-card"><span className="mini">Statistics</span><h2>Random counts</h2><div className="formula small">σN ≈ √N</div><p>Repeated measurements differ because detection is statistical. Longer count times and repeats reduce the relative random uncertainty.</p></div><div className="card theory-card"><span className="mini">Evidence</span><h2>How the graph tests the law</h2><p>If corrected count rate is proportional to 1/r², plotting corrected rate against 1/r² should give an approximately straight line. The fit and R² on the Results tab help students judge this quantitatively.</p></div></section>}
        {tab === 'teacher' && <section className="theory-grid"><div className="card theory-card"><span className="mini">Lesson pacing</span><h2>Simulation speed</h2><p>The display shows the selected experimental time while the classroom wait can be accelerated.</p><div className="time-buttons">{[1, 5, 10, 20].map(value => <button key={value} className={timeScale === value ? 'active' : ''} onClick={() => setTimeScale(value)}>×{value}</button>)}</div></div><div className="card theory-card"><span className="mini">Visual teaching mode</span><h2>Radiation visibility</h2><label className="teacher-slider">Visual packet intensity: <b>{visualBoost.toFixed(1)}×</b><input type="range" min="0.6" max="1.8" step="0.1" value={visualBoost} onChange={e => setVisualBoost(Number(e.target.value))} /></label><div className="visual-controls"><button className={showRadiation ? 'toggle-button active' : 'toggle-button'} onClick={() => setShowRadiation(v => !v)}>{showRadiation ? 'Packets visible' : 'Show packets'}</button><button className={radiationView ? 'toggle-button active' : 'toggle-button'} onClick={() => setRadiationView(v => !v)}>{radiationView ? 'Radiation View on' : 'Radiation View off'}</button></div></div><div className="card theory-card"><span className="mini">Hidden model</span><h2>Background level</h2><label className="teacher-slider">Background: <b>{backgroundTrue.toFixed(2)} s⁻¹</b><input type="range" min="0.15" max="1.3" step="0.05" value={backgroundTrue} onChange={e => setBackgroundTrue(Number(e.target.value))} /></label></div><div className="card theory-card"><span className="mini">Hidden model</span><h2>Source strength</h2><label className="teacher-slider">Source constant: <b>{sourceStrength.toFixed(2)}</b><input type="range" min="0.18" max="0.70" step="0.01" value={sourceStrength} onChange={e => setSourceStrength(Number(e.target.value))} /></label></div><div className="card theory-card"><span className="mini">Classroom display</span><h2>Radiation View</h2><p>Radiation View deliberately darkens the apparatus, brightens the virtual radiation packets, and adds spherical shells to make geometric spreading easier to see from the front of a classroom.</p></div><div className="card theory-card"><span className="mini">Important distinction</span><h2>Teaching visualisation</h2><p>The glowing particles, trails and shells are representational. They help explain the model but do not depict what gamma radiation literally looks like.</p></div></section>}
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
