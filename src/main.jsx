import React, { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, Html, OrbitControls, RoundedBox } from '@react-three/drei';
import {
  Activity, BarChart3, BookOpen, CheckCircle2, CircleDot, Download, FlaskConical,
  Gauge, GraduationCap, Play, RotateCcw, Settings, ShieldCheck, Square, Timer,
  TriangleAlert, X
} from 'lucide-react';
import {
  CartesianGrid, ErrorBar, ReferenceLine, ResponsiveContainer,
  Scatter, ScatterChart, Tooltip, XAxis, YAxis
} from 'recharts';
import './styles.css';

const tabs = [
  ['lab', '3D Practical', FlaskConical],
  ['results', 'Results', BarChart3],
  ['theory', 'Theory', BookOpen],
  ['assessment', 'Check Understanding', GraduationCap],
  ['teacher', 'Teacher', Settings],
];

const presetDistances = [0.15, 0.20, 0.25, 0.30, 0.40, 0.50, 0.65, 0.80, 1.00, 1.20];

function poisson(lambda) {
  if (lambda <= 0) return 0;
  if (lambda < 32) {
    const L = Math.exp(-lambda);
    let p = 1;
    let k = 0;
    do { k += 1; p *= Math.random(); } while (p > L);
    return k - 1;
  }
  const u1 = Math.max(1e-12, Math.random());
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * z));
}

function fitLine(points) {
  if (points.length < 2) return null;
  const n = points.length;
  const sx = points.reduce((s, p) => s + p.x, 0);
  const sy = points.reduce((s, p) => s + p.y, 0);
  const sxx = points.reduce((s, p) => s + p.x * p.x, 0);
  const sxy = points.reduce((s, p) => s + p.x * p.y, 0);
  const den = n * sxx - sx * sx;
  if (Math.abs(den) < 1e-12) return null;
  const m = (n * sxy - sx * sy) / den;
  const b = (sy - m * sx) / n;
  const mean = sy / n;
  const ssTot = points.reduce((s, p) => s + (p.y - mean) ** 2, 0);
  const ssRes = points.reduce((s, p) => s + (p.y - (m * p.x + b)) ** 2, 0);
  return { m, b, r2: ssTot === 0 ? 1 : 1 - ssRes / ssTot };
}

function mean(values) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function sampleSD(values) {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1));
}

function RailTick({ x, label, major }) {
  return (
    <group position={[x, 0.42, 0.48]}>
      <mesh>
        <boxGeometry args={[0.012, 0.02, major ? 0.20 : 0.10]} />
        <meshStandardMaterial color={major ? '#f3f6f8' : '#8fa0ad'} roughness={0.4} />
      </mesh>
      {major && <Html center distanceFactor={10} position={[0, -0.08, 0.11]}>
        <span className="tick-label">{label}</span>
      </Html>}
    </group>
  );
}

function LabScene({ distance, setup, running, displayCounts, displayTime, pulseSeed }) {
  const railStart = -1.34;
  const railSpan = 3.56;
  const detectorX = railStart + ((distance - 0.15) / 1.05) * railSpan;
  const ticks = Array.from({ length: 22 }, (_, i) => ({
    x: railStart + i * (railSpan / 21),
    label: (0.15 + i * (1.05 / 21)).toFixed(2),
    major: i % 2 === 0,
  }));
  const pulses = Array.from({ length: 22 }, (_, i) => {
    const t = ((i * 0.173 + pulseSeed * 0.071) % 1);
    const x = -2.20 + (detectorX + 2.20) * t;
    const spread = 0.05 + t * 0.34;
    return { x, y: 1.14 + Math.sin(i * 2.7 + pulseSeed) * spread, z: Math.cos(i * 1.9 + pulseSeed) * spread };
  });

  return <>
    <ambientLight intensity={0.62} />
    <directionalLight position={[4, 7, 3]} intensity={2.1} castShadow shadow-mapSize={[2048, 2048]} />
    <spotLight position={[-4, 5, -2]} intensity={70} angle={0.45} penumbra={0.8} />
    <Environment preset="warehouse" />

    <mesh receiveShadow position={[0, -0.06, 0]}>
      <boxGeometry args={[7.6, 0.25, 3.6]} />
      <meshStandardMaterial color="#354858" roughness={0.36} metalness={0.20} />
    </mesh>
    <mesh receiveShadow position={[0, -0.2, 0]}>
      <boxGeometry args={[7.9, 0.06, 3.9]} />
      <meshStandardMaterial color="#10202d" />
    </mesh>

    <group position={[-2.35, 0.45, 0]}>
      <mesh castShadow position={[0, 0.46, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.92, 48]} />
        <meshStandardMaterial color="#d3d7db" metalness={0.85} roughness={0.22} />
      </mesh>
      <mesh castShadow position={[0, 0.93, 0]}>
        <cylinderGeometry args={[0.23, 0.23, 0.08, 48]} />
        <meshStandardMaterial color="#4c5962" metalness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 0.24, 0]}>
        <cylinderGeometry args={[0.30, 0.36, 0.18, 48]} />
        <meshStandardMaterial color="#141b22" metalness={0.7} />
      </mesh>
      {setup === 'measure' ? (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 1.08, 0]}>
          <cylinderGeometry args={[0.065, 0.065, 0.18, 24]} />
          <meshStandardMaterial color="#f0c83b" emissive="#7a5a00" emissiveIntensity={0.25} />
        </mesh>
      ) : (
        <RoundedBox args={[0.42, 0.36, 0.42]} radius={0.04} smoothness={4} position={[0, 1.08, 0]} castShadow>
          <meshStandardMaterial color="#596772" metalness={0.8} roughness={0.3} />
        </RoundedBox>
      )}
      <Html center position={[0, 1.46, 0]} distanceFactor={8}>
        <div className={`scene-tag ${setup === 'measure' ? 'warning-tag' : ''}`}>
          {setup === 'measure' ? 'Virtual source enabled' : 'Background setup'}
        </div>
      </Html>
    </group>

    {setup === 'measure' && running && pulses.map((p, i) => (
      <mesh key={`${pulseSeed}-${i}`} position={[p.x, p.y, p.z]}>
        <sphereGeometry args={[0.018, 10, 10]} />
        <meshBasicMaterial color="#ffd54d" transparent opacity={0.45 + (i % 3) * 0.16} />
      </mesh>
    ))}

    <group position={[0.05, 0.33, 0.36]}>
      <mesh castShadow>
        <boxGeometry args={[4.25, 0.08, 0.22]} />
        <meshStandardMaterial color="#aeb9c3" metalness={0.92} roughness={0.18} />
      </mesh>
      {ticks.map((t, i) => <RailTick key={i} {...t} />)}
    </group>

    <group position={[detectorX, 0.58, 0.02]}>
      <mesh castShadow position={[0, -0.18, 0]}>
        <cylinderGeometry args={[0.25, 0.31, 0.11, 40]} />
        <meshStandardMaterial color="#202c35" metalness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 0.85, 24]} />
        <meshStandardMaterial color="#9aa6af" metalness={0.92} />
      </mesh>
      <mesh castShadow rotation={[0, 0, Math.PI / 2]} position={[0.13, 0.58, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.8, 48]} />
        <meshStandardMaterial color="#213445" metalness={0.75} roughness={0.3} />
      </mesh>
      <mesh castShadow rotation={[0, 0, Math.PI / 2]} position={[-0.32, 0.58, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.08, 40]} />
        <meshStandardMaterial color="#d0d8dd" metalness={0.9} />
      </mesh>
      <mesh position={[-0.365, 0.58, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.085, 0.085, 0.02, 32]} />
        <meshStandardMaterial color="#111" roughness={0.8} />
      </mesh>
      <Html center position={[0.15, 1.06, 0]} distanceFactor={8}>
        <div className="scene-tag">GM detector</div>
      </Html>
    </group>

    <group position={[2.62, 0.50, -0.68]}>
      <RoundedBox args={[1.48, 0.88, 0.74]} radius={0.08} smoothness={4} castShadow>
        <meshStandardMaterial color="#182b3a" metalness={0.45} roughness={0.32} />
      </RoundedBox>
      <mesh position={[0, 0.11, 0.38]}>
        <planeGeometry args={[1.02, 0.38]} />
        <meshStandardMaterial color="#06100c" emissive="#16ff8e" emissiveIntensity={0.26} />
      </mesh>
      <Html transform position={[0, 0.11, 0.388]} distanceFactor={7}>
        <div className="counter-screen">
          <span>{running ? 'COUNTING' : 'SCALER'}</span>
          <b>{String(displayCounts).padStart(4, '0')}</b>
          <small>{displayTime.toFixed(1)} s</small>
        </div>
      </Html>
      <mesh position={[-0.44, -0.23, 0.39]}><cylinderGeometry args={[0.055, 0.055, 0.03, 28]} /><meshStandardMaterial color="#d14545" /></mesh>
      <mesh position={[-0.20, -0.23, 0.39]}><cylinderGeometry args={[0.055, 0.055, 0.03, 28]} /><meshStandardMaterial color="#4caf75" /></mesh>
    </group>

    <ContactShadows position={[0, 0.03, 0]} opacity={0.48} scale={9} blur={2.8} far={5} />
    <OrbitControls makeDefault minDistance={3.2} maxDistance={9} target={[0, 0.62, 0]} enablePan />
  </>;
}

function App() {
  const [tab, setTab] = useState('lab');
  const [distance, setDistance] = useState(0.30);
  const [countTime, setCountTime] = useState(30);
  const [timeScale, setTimeScale] = useState(10);
  const [setup, setSetup] = useState('background');
  const [backgroundTrue, setBackgroundTrue] = useState(0.55);
  const [sourceStrength, setSourceStrength] = useState(0.38);
  const [distanceOffset, setDistanceOffset] = useState(0.012);
  const [noise, setNoise] = useState(1);
  const [rows, setRows] = useState([]);
  const [backgroundRuns, setBackgroundRuns] = useState([]);
  const [running, setRunning] = useState(false);
  const [displayCounts, setDisplayCounts] = useState(0);
  const [displayTime, setDisplayTime] = useState(0);
  const [pulseSeed, setPulseSeed] = useState(0);
  const [graphMode, setGraphMode] = useState('inverse');
  const [showFit, setShowFit] = useState(true);
  const [showUncertainty, setShowUncertainty] = useState(true);
  const [studentMode, setStudentMode] = useState(true);
  const [selectedRow, setSelectedRow] = useState(null);
  const stopRef = useRef(false);

  const bgRate = backgroundRuns.length ? backgroundRuns.reduce((s, r) => s + r.rate, 0) / backgroundRuns.length : null;
  const bgSigma = backgroundRuns.length ? Math.sqrt(backgroundRuns.reduce((s, r) => s + r.counts, 0)) / backgroundRuns.reduce((s, r) => s + r.time, 0) : 0;

  const aggregated = useMemo(() => {
    const groups = new Map();
    rows.forEach((r) => {
      const key = r.r.toFixed(3);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    });
    return Array.from(groups.entries()).map(([key, values]) => {
      const corrected = values.map(v => v.corrected);
      const avg = mean(corrected);
      const sd = sampleSD(corrected);
      const measurementSigma = mean(values.map(v => v.sigma));
      const uncertainty = values.length > 1 ? Math.max(sd / Math.sqrt(values.length), measurementSigma / Math.sqrt(values.length)) : measurementSigma;
      const r = Number(key);
      return { r, n: values.length, mean: avg, sd, uncertainty, invR2: 1 / (r * r) };
    }).sort((a, b) => a.r - b.r);
  }, [rows]);

  const graphPoints = useMemo(() => aggregated.map(r => ({
    x: graphMode === 'inverse' ? r.invR2 : r.r,
    y: r.mean,
    error: r.uncertainty,
    r: r.r,
    n: r.n,
  })), [aggregated, graphMode]);

  const regression = useMemo(() => fitLine(graphPoints), [graphPoints]);
  const uniqueDistances = aggregated.length;
  const repeatedDistances = aggregated.filter(r => r.n >= 2).length;
  const qualityScore = [backgroundRuns.length >= 2, uniqueDistances >= 6, repeatedDistances >= 3, rows.length >= 10].filter(Boolean).length;

  function actualRateAt(r) {
    const effectiveR = Math.max(0.05, r + distanceOffset);
    return sourceStrength / (effectiveR * effectiveR) + backgroundTrue;
  }

  function noisyPoisson(meanCounts) {
    const p = poisson(meanCounts);
    return Math.max(0, Math.round(meanCounts + (p - meanCounts) * noise));
  }

  async function simulateCount(rate, duration) {
    setRunning(true);
    setDisplayCounts(0);
    setDisplayTime(0);
    stopRef.current = false;
    setPulseSeed(s => s + 1);
    const wallDuration = Math.max(700, duration * 1000 / timeScale);
    const tickMs = 80;
    const start = performance.now();
    let lastSimTime = 0;
    let total = 0;
    return new Promise(resolve => {
      const tick = () => {
        const now = performance.now();
        const elapsedWall = Math.min(wallDuration, now - start);
        const simTime = Math.min(duration, elapsedWall / wallDuration * duration);
        const deltaT = Math.max(0, simTime - lastSimTime);
        if (deltaT > 0) total += noisyPoisson(rate * deltaT);
        lastSimTime = simTime;
        setDisplayCounts(total);
        setDisplayTime(simTime);
        setPulseSeed(s => s + 1);
        if (elapsedWall < wallDuration && !stopRef.current) {
          window.setTimeout(tick, tickMs);
        } else {
          setRunning(false);
          resolve({ counts: total, time: simTime });
        }
      };
      tick();
    });
  }

  async function runBackground() {
    if (running) return;
    setSetup('background');
    const { counts, time } = await simulateCount(backgroundTrue, countTime);
    if (time < 1) return;
    const run = { id: crypto.randomUUID(), counts, time, rate: counts / time };
    setBackgroundRuns(prev => [...prev, run]);
  }

  async function takeReading() {
    if (running || bgRate === null) return;
    setSetup('measure');
    const { counts, time } = await simulateCount(actualRateAt(distance), countTime);
    if (time < 1) return;
    const rawRate = counts / time;
    const corrected = Math.max(0, rawRate - bgRate);
    const rawSigma = Math.sqrt(Math.max(counts, 1)) / time;
    const sigma = Math.sqrt(rawSigma ** 2 + bgSigma ** 2);
    const same = rows.filter(r => Math.abs(r.r - distance) < 1e-6).length + 1;
    setRows(prev => [...prev, {
      id: crypto.randomUUID(), r: distance, time, counts, rawRate,
      bgRate, corrected, sigma, repeat: same, invR2: 1 / (distance * distance),
    }]);
  }

  function stopRun() {
    stopRef.current = true;
  }

  function resetData() {
    stopRef.current = true;
    setRows([]);
    setBackgroundRuns([]);
    setDisplayCounts(0);
    setDisplayTime(0);
    setSetup('background');
  }

  function deleteReading(id) {
    setRows(prev => prev.filter(r => r.id !== id));
    if (selectedRow === id) setSelectedRow(null);
  }

  function exportCsv() {
    const header = ['distance_m', 'count_time_s', 'raw_counts', 'raw_rate_s-1', 'background_rate_s-1', 'corrected_rate_s-1', 'uncertainty_s-1', 'inverse_r_squared_m-2', 'repeat'];
    const lines = rows.map(r => [r.r, r.time, r.counts, r.rawRate, r.bgRate, r.corrected, r.sigma, r.invR2, r.repeat]);
    const csv = [header, ...lines].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inverse-square-practical-results.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return <div className="app-shell">
    <header className="top-header">
      <div>
        <div className="eyebrow">A-level Physics • Inverse-square required practical simulator</div>
        <h1>Inverse Square Practical <span>3D Lab</span></h1>
        <p>Operate the virtual apparatus, collect your own counts, process the data and test the inverse-square relationship.</p>
      </div>
      <div className="header-badges">
        <span><ShieldCheck size={15} /> Simulation only</span>
        <span><CircleDot size={15} /> Random counting</span>
        <span><Activity size={15} /> Live data</span>
      </div>
    </header>

    <nav className="tabs">
      {tabs.map(([id, label, Icon]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
        <Icon size={17} /><span>{label}</span>
      </button>)}
    </nav>

    <main>
      {tab === 'lab' && <section className="lab-layout">
        <div className="panel scene-panel">
          <div className="panel-title">
            <div><span className="mini-label">Operate the apparatus</span><h2>3D laboratory bench</h2></div>
            <span className={`status-dot ${running ? 'live' : ''}`}>{running ? 'COUNTING' : 'READY'}</span>
          </div>

          <div className="scene-wrap">
            <Canvas shadows camera={{ position: [4.8, 3.4, 4.8], fov: 42 }} dpr={[1, 1.5]}>
              <LabScene distance={distance} setup={setup} running={running} displayCounts={displayCounts} displayTime={displayTime} pulseSeed={pulseSeed} />
            </Canvas>
            <div className="scene-overlay">
              <div><span>Measured distance</span><strong>{distance.toFixed(2)} m</strong></div>
              <div><span>Scaler</span><strong>{displayCounts} counts</strong></div>
              <div><span>Timer</span><strong>{displayTime.toFixed(1)} s</strong></div>
            </div>
          </div>

          <div className="bench-controls">
            <div className="distance-card">
              <div className="control-head"><label>Move GM detector along track</label><b>{distance.toFixed(2)} m</b></div>
              <input disabled={running} type="range" min="0.15" max="1.20" step="0.01" value={distance} onChange={e => setDistance(Number(e.target.value))} />
              <div className="preset-row">
                {presetDistances.map(d => <button disabled={running} key={d} className={Math.abs(distance - d) < 0.001 ? 'selected' : ''} onClick={() => setDistance(d)}>{d.toFixed(2)}</button>)}
              </div>
            </div>

            <div className="run-card">
              <div className="setup-switch">
                <button className={setup === 'background' ? 'active' : ''} onClick={() => !running && setSetup('background')}>Background</button>
                <button className={setup === 'measure' ? 'active' : ''} onClick={() => !running && setSetup('measure')}>Measurement</button>
              </div>
              <div className="time-buttons">
                {[10, 30, 60, 120].map(t => <button disabled={running} key={t} className={countTime === t ? 'active' : ''} onClick={() => setCountTime(t)}><Timer size={14} /> {t}s</button>)}
              </div>
              {setup === 'background' ? (
                <button className="primary run-button" disabled={running} onClick={runBackground}><Play size={17} /> Take background count</button>
              ) : (
                <button className="primary run-button" disabled={running || bgRate === null} onClick={takeReading}><Play size={17} /> Take reading at {distance.toFixed(2)} m</button>
              )}
              {running && <button className="stop-button" onClick={stopRun}><Square size={15} /> Stop early</button>}
            </div>
          </div>
        </div>

        <aside className="lab-side">
          <div className="panel workflow-panel">
            <div className="panel-title"><div><span className="mini-label">Practical sequence</span><h2>Experiment progress</h2></div></div>
            <div className={`workflow-step ${backgroundRuns.length ? 'done' : 'current'}`}>
              <span>1</span><div><b>Measure background</b><small>Take at least two timed background counts.</small></div>{backgroundRuns.length > 0 && <CheckCircle2 size={18} />}
            </div>
            <div className={`workflow-step ${bgRate !== null ? 'current' : ''} ${uniqueDistances >= 6 ? 'done' : ''}`}>
              <span>2</span><div><b>Collect distance readings</b><small>Use a wide range of detector positions.</small></div>{uniqueDistances >= 6 && <CheckCircle2 size={18} />}
            </div>
            <div className={`workflow-step ${repeatedDistances >= 3 ? 'done' : ''}`}>
              <span>3</span><div><b>Repeat measurements</b><small>Repeat several distances to judge random variation.</small></div>{repeatedDistances >= 3 && <CheckCircle2 size={18} />}
            </div>
            <div className={`workflow-step ${uniqueDistances >= 6 ? 'current' : ''}`}>
              <span>4</span><div><b>Analyse results</b><small>Plot corrected rate against 1/r².</small></div>
            </div>
            <div className="quality-meter"><span>Data quality</span><div><i style={{ width: `${qualityScore * 25}%` }} /></div><b>{qualityScore}/4</b></div>
          </div>

          <div className="panel readings-panel">
            <div className="panel-title"><div><span className="mini-label">Live notebook</span><h2>Latest data</h2></div><button className="icon-button" onClick={resetData} title="Reset data"><RotateCcw size={16} /></button></div>
            <div className="metric-grid">
              <div><span>Background runs</span><b>{backgroundRuns.length}</b></div>
              <div><span>Background rate</span><b>{bgRate === null ? '—' : `${bgRate.toFixed(3)} s⁻¹`}</b></div>
              <div><span>Distance points</span><b>{uniqueDistances}</b></div>
              <div><span>Total readings</span><b>{rows.length}</b></div>
            </div>
            {bgRate === null && <div className="notice"><TriangleAlert size={17} /><span>Measure the background before taking source readings.</span></div>}
            {rows.length > 0 && <div className="mini-table-wrap"><table className="mini-table"><thead><tr><th>r / m</th><th>N</th><th>raw / s⁻¹</th><th>corrected / s⁻¹</th></tr></thead><tbody>
              {rows.slice(-6).reverse().map(r => <tr key={r.id}><td>{r.r.toFixed(2)}</td><td>{r.counts}</td><td>{r.rawRate.toFixed(2)}</td><td>{r.corrected.toFixed(2)}</td></tr>)}
            </tbody></table></div>}
          </div>

          <div className="panel safety-note">
            <ShieldCheck size={20} />
            <div><b>Simulation note</b><p>This app models the practical. Any real radioactive-source activity must follow your school’s authorised procedures and staff supervision.</p></div>
          </div>
        </aside>
      </section>}

      {tab === 'results' && <section className="results-layout">
        <div className="panel graph-panel">
          <div className="panel-title">
            <div><span className="mini-label">Processed data</span><h2>Graph your results</h2></div>
            <div className="segmented"><button className={graphMode === 'distance' ? 'active' : ''} onClick={() => setGraphMode('distance')}>Rate vs r</button><button className={graphMode === 'inverse' ? 'active' : ''} onClick={() => setGraphMode('inverse')}>Rate vs 1/r²</button></div>
          </div>
          <div className="chart-wrap">
            {graphPoints.length < 2 ? <div className="empty-state"><BarChart3 size={40} /><h3>Collect at least two distance points</h3><p>Your processed data will appear here.</p></div> : <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 35, bottom: 55, left: 55 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" dataKey="x" name={graphMode === 'inverse' ? '1/r²' : 'distance'} unit={graphMode === 'inverse' ? ' m⁻²' : ' m'} label={{ value: graphMode === 'inverse' ? '1 / r² / m⁻²' : 'distance r / m', position: 'insideBottom', offset: -38 }} />
                <YAxis type="number" dataKey="y" name="corrected count rate" unit=" s⁻¹" label={{ value: 'corrected count rate / s⁻¹', angle: -90, position: 'insideLeft', offset: -42 }} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v, name) => [Number(v).toFixed(3), name]} />
                <Scatter data={graphPoints} fill="#20c997">
                  {showUncertainty && <ErrorBar dataKey="error" width={4} strokeWidth={1.6} direction="y" />}
                </Scatter>
                {showFit && regression && graphMode === 'inverse' && <ReferenceLine segment={[
                  { x: Math.min(...graphPoints.map(p => p.x)), y: regression.m * Math.min(...graphPoints.map(p => p.x)) + regression.b },
                  { x: Math.max(...graphPoints.map(p => p.x)), y: regression.m * Math.max(...graphPoints.map(p => p.x)) + regression.b }
                ]} stroke="#ffb020" strokeWidth={2} />}
              </ScatterChart>
            </ResponsiveContainer>}
          </div>
          <div className="graph-options"><label><input type="checkbox" checked={showUncertainty} onChange={e => setShowUncertainty(e.target.checked)} /> uncertainty bars</label><label><input type="checkbox" checked={showFit} onChange={e => setShowFit(e.target.checked)} /> best-fit line</label></div>
          {regression && graphMode === 'inverse' && <div className="fit-card"><div><span>Gradient</span><b>{regression.m.toFixed(3)}</b></div><div><span>Intercept</span><b>{regression.b.toFixed(3)} s⁻¹</b></div><div><span>R²</span><b>{regression.r2.toFixed(4)}</b></div><p>A near-linear graph of corrected count rate against 1/r² supports the inverse-square model.</p></div>}
        </div>

        <div className="panel table-panel">
          <div className="panel-title"><div><span className="mini-label">Full data table</span><h2>Measurements</h2></div><button className="secondary" disabled={!rows.length} onClick={exportCsv}><Download size={15} /> Export CSV</button></div>
          <div className="table-scroll"><table className="results-table"><thead><tr><th>r / m</th><th>repeat</th><th>time / s</th><th>counts</th><th>raw / s⁻¹</th><th>background / s⁻¹</th><th>corrected / s⁻¹</th><th>± σ / s⁻¹</th><th>1/r² / m⁻²</th><th></th></tr></thead><tbody>
            {rows.map(r => <tr key={r.id} className={selectedRow === r.id ? 'selected-row' : ''} onClick={() => setSelectedRow(r.id)}><td>{r.r.toFixed(2)}</td><td>{r.repeat}</td><td>{r.time.toFixed(1)}</td><td>{r.counts}</td><td>{r.rawRate.toFixed(3)}</td><td>{r.bgRate.toFixed(3)}</td><td><b>{r.corrected.toFixed(3)}</b></td><td>{r.sigma.toFixed(3)}</td><td>{r.invR2.toFixed(3)}</td><td><button className="delete-button" onClick={(e) => { e.stopPropagation(); deleteReading(r.id); }}><X size={14} /></button></td></tr>)}
            {!rows.length && <tr><td colSpan="10" className="empty-cell">No source readings yet.</td></tr>}
          </tbody></table></div>
          <div className="aggregate-block"><h3>Mean values by distance</h3><div className="table-scroll"><table className="results-table compact"><thead><tr><th>r / m</th><th>repeats</th><th>mean corrected / s⁻¹</th><th>spread SD / s⁻¹</th><th>1/r² / m⁻²</th></tr></thead><tbody>
            {aggregated.map(a => <tr key={a.r}><td>{a.r.toFixed(2)}</td><td>{a.n}</td><td>{a.mean.toFixed(3)}</td><td>{a.sd ? a.sd.toFixed(3) : '—'}</td><td>{a.invR2.toFixed(3)}</td></tr>)}
          </tbody></table></div></div>
        </div>
      </section>}

      {tab === 'theory' && <section className="content-grid">
        <div className="panel lesson-card"><span className="mini-label">What you are testing</span><h2>The inverse-square relationship</h2><div className="equation">I ∝ 1 / r²</div><p>As radiation spreads outward from a point-like source, the same emission is distributed over a spherical area that grows as 4πr². The intensity therefore falls in proportion to 1/r².</p><div className="concept-row"><div><b>Double r</b><span>ideal intensity becomes 1/4</span></div><div><b>Triple r</b><span>ideal intensity becomes 1/9</span></div><div><b>Plot I against 1/r²</b><span>expect an approximately straight line</span></div></div></div>
        <div className="panel lesson-card"><span className="mini-label">Why the simulator varies</span><h2>Random counting statistics</h2><p>Radioactive detection is statistical. Two measurements made under identical conditions will not usually give exactly the same number of counts.</p><div className="equation small">σ<sub>N</sub> ≈ √N</div><p>Longer counting times and repeat measurements reduce the relative effect of random variation.</p></div>
        <div className="panel lesson-card"><span className="mini-label">Processing</span><h2>Background correction</h2><div className="equation small">R<sub>corrected</sub> = R<sub>raw</sub> − R<sub>background</sub></div><p>The detector registers environmental background as well as the virtual source. The app requires you to measure background first rather than secretly subtracting an ideal value.</p></div>
        <div className="panel lesson-card"><span className="mini-label">Experimental quality</span><h2>How to produce convincing data</h2><ul><li>Use several well-spaced distances.</li><li>Take repeat measurements at selected distances.</li><li>Use a consistent counting time, or record any change in timing.</li><li>Measure and subtract the background rate.</li><li>Analyse corrected rate against 1/r² rather than judging the raw curve by eye.</li></ul></div>
      </section>}

      {tab === 'assessment' && <Assessment />}

      {tab === 'teacher' && <section className="teacher-grid">
        <div className="panel teacher-card"><span className="mini-label">Simulation pacing</span><h2>Count speed</h2><p>Students still see the full selected simulation time, but the wall-clock run can be accelerated for lessons.</p><div className="time-buttons teacher-times">{[1, 5, 10, 20].map(x => <button key={x} className={timeScale === x ? 'active' : ''} onClick={() => setTimeScale(x)}>×{x}</button>)}</div></div>
        <div className="panel teacher-card"><span className="mini-label">Hidden model</span><h2>Realism controls</h2><label>Background rate: <b>{backgroundTrue.toFixed(2)} s⁻¹</b><input type="range" min="0.1" max="1.5" step="0.05" value={backgroundTrue} onChange={e => setBackgroundTrue(Number(e.target.value))} /></label><label>Random variation: <b>{noise.toFixed(1)}×</b><input type="range" min="0" max="1.8" step="0.1" value={noise} onChange={e => setNoise(Number(e.target.value))} /></label><label>Hidden zero-offset: <b>{(distanceOffset * 100).toFixed(1)} cm</b><input type="range" min="0" max="0.04" step="0.002" value={distanceOffset} onChange={e => setDistanceOffset(Number(e.target.value))} /></label></div>
        <div className="panel teacher-card"><span className="mini-label">Student experience</span><h2>Display settings</h2><label className="toggle-line"><input type="checkbox" checked={studentMode} onChange={e => setStudentMode(e.target.checked)} /> Student practical mode</label><p>Student mode keeps theoretical source parameters hidden. The current build always records only measured values in the notebook.</p></div>
        {!studentMode && <div className="panel teacher-card reveal-card"><span className="mini-label">Teacher reveal</span><h2>Underlying simulation values</h2><div className="metric-grid"><div><span>Source constant</span><b>{sourceStrength.toFixed(3)}</b></div><div><span>True background</span><b>{backgroundTrue.toFixed(3)}</b></div><div><span>Distance offset</span><b>{distanceOffset.toFixed(3)} m</b></div><div><span>Noise</span><b>{noise.toFixed(1)}×</b></div></div><label>Source strength<input type="range" min="0.15" max="0.8" step="0.01" value={sourceStrength} onChange={e => setSourceStrength(Number(e.target.value))} /></label></div>}
      </section>}
    </main>
  </div>;
}

function Assessment() {
  const questions = [
    { q: 'Why must the background count rate be measured?', options: ['To make the source stronger', 'To subtract counts not due to the source', 'To change the detector distance'], a: 1 },
    { q: 'Which graph should be approximately linear for an inverse-square relationship?', options: ['corrected rate against r', 'corrected rate against r²', 'corrected rate against 1/r²'], a: 2 },
    { q: 'If distance doubles, the ideal source intensity becomes…', options: ['half', 'one quarter', 'double'], a: 1 },
    { q: 'Why are repeat readings useful?', options: ['They remove all uncertainty', 'They show random variation and improve the mean', 'They make background unnecessary'], a: 1 },
  ];
  const [answers, setAnswers] = useState({});
  const score = questions.reduce((s, q, i) => s + (answers[i] === q.a ? 1 : 0), 0);
  return <section className="assessment-grid"><div className="panel assessment-card"><span className="mini-label">Practical check</span><h2>Can you explain your results?</h2>{questions.map((q, i) => <div className="quiz-question" key={q.q}><b>{i + 1}. {q.q}</b><div>{q.options.map((o, j) => <button key={o} className={answers[i] === j ? (j === q.a ? 'correct' : 'wrong') : ''} onClick={() => setAnswers(a => ({ ...a, [i]: j }))}>{o}</button>)}</div></div>)}<div className="score-card"><Gauge size={22} /><div><span>Score</span><b>{score}/{questions.length}</b></div></div></div></section>;
}

createRoot(document.getElementById('root')).render(<App />);
