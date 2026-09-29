import React, { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import './stable.css';

const presetDistances = [0.15, 0.20, 0.25, 0.30, 0.40, 0.50, 0.65, 0.80, 1.00, 1.20];

function poisson(lambda) {
  if (lambda <= 0) return 0;
  if (lambda < 32) {
    const L = Math.exp(-lambda);
    let p = 1;
    let k = 0;
    do {
      k += 1;
      p *= Math.random();
    } while (p > L);
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
  return Math.sqrt(values.reduce((s, value) => s + (value - m) ** 2, 0) / (values.length - 1));
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

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('3D scene failed to render:', error);
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

function VirtualApparatus({ distance, counting }) {
  const detectorX = -1.25 + ((distance - 0.15) / 1.05) * 3.05;
  const ticks = Array.from({ length: 12 }, (_, i) => -1.25 + i * (3.05 / 11));

  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} />
      <pointLight position={[-3, 2, 2]} intensity={8} color="#7dd3fc" />

      <mesh position={[0, -0.18, 0]}>
        <boxGeometry args={[7.2, 0.24, 3.3]} />
        <meshStandardMaterial color="#243747" roughness={0.5} />
      </mesh>

      <group position={[-2.15, 0.35, 0]}>
        <mesh position={[0, 0.43, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.86, 36]} />
          <meshStandardMaterial color="#c5ccd2" metalness={0.75} roughness={0.28} />
        </mesh>
        <mesh position={[0, 0.91, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.12, 24]} />
          <meshStandardMaterial color="#f6d65f" emissive="#6f5700" emissiveIntensity={0.35} />
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.29, 0.34, 0.17, 36]} />
          <meshStandardMaterial color="#17222c" metalness={0.7} />
        </mesh>
      </group>

      <group position={[0.15, 0.27, 0.42]}>
        <mesh>
          <boxGeometry args={[4.0, 0.08, 0.19]} />
          <meshStandardMaterial color="#b9c4cc" metalness={0.8} roughness={0.2} />
        </mesh>
        {ticks.map((x, i) => (
          <mesh key={i} position={[x, 0.06, 0]}>
            <boxGeometry args={[0.012, 0.08 + (i % 2 === 0 ? 0.08 : 0), 0.13]} />
            <meshStandardMaterial color="#f4f7f9" />
          </mesh>
        ))}
      </group>

      <group position={[detectorX, 0.48, 0.02]}>
        <mesh position={[0, -0.19, 0]}>
          <cylinderGeometry args={[0.24, 0.30, 0.10, 36]} />
          <meshStandardMaterial color="#17242d" metalness={0.65} />
        </mesh>
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.70, 24]} />
          <meshStandardMaterial color="#aab4bb" metalness={0.9} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} position={[0.10, 0.48, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.72, 36]} />
          <meshStandardMaterial color={counting ? '#2b6687' : '#203647'} metalness={0.6} roughness={0.35} />
        </mesh>
      </group>

      {counting && Array.from({ length: 16 }, (_, i) => {
        const t = (i + 1) / 17;
        const x = -2.02 + (detectorX + 2.02) * t;
        return (
          <mesh key={i} position={[x, 0.98 + Math.sin(i * 1.9) * 0.14 * t, Math.cos(i * 2.3) * 0.18 * t]}>
            <sphereGeometry args={[0.018, 8, 8]} />
            <meshBasicMaterial color="#fde047" transparent opacity={0.65} />
          </mesh>
        );
      })}

      <group position={[2.50, 0.38, -0.62]}>
        <mesh>
          <boxGeometry args={[1.35, 0.75, 0.65]} />
          <meshStandardMaterial color="#122635" metalness={0.35} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.08, 0.34]}>
          <planeGeometry args={[0.88, 0.28]} />
          <meshStandardMaterial color="#07130d" emissive="#39ff99" emissiveIntensity={0.22} />
        </mesh>
      </group>

      <OrbitControls enablePan={false} minDistance={3.4} maxDistance={8.5} target={[0, 0.55, 0]} />
    </>
  );
}

function SceneFallback({ distance }) {
  return (
    <div className="scene-fallback">
      <div className="source-2d">Virtual source</div>
      <div className="rail-2d">
        <div className="detector-2d" style={{ left: `${((distance - 0.15) / 1.05) * 92 + 4}%` }} />
      </div>
      <strong>{distance.toFixed(2)} m</strong>
      <p>The 3D renderer is unavailable on this browser, but the practical controls and data collection still work.</p>
    </div>
  );
}

function SimpleGraph({ points, fit }) {
  if (points.length < 2) {
    return <div className="empty-graph"><b>Collect at least two different distances</b><span>Your graph will appear here.</span></div>;
  }

  const width = 760;
  const height = 380;
  const pad = { left: 72, right: 30, top: 28, bottom: 58 };
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const xMin = 0;
  const xMax = Math.max(...xs) * 1.08 || 1;
  const yMin = 0;
  const yMax = Math.max(...ys) * 1.12 || 1;
  const mapX = x => pad.left + ((x - xMin) / (xMax - xMin)) * (width - pad.left - pad.right);
  const mapY = y => height - pad.bottom - ((y - yMin) / (yMax - yMin)) * (height - pad.top - pad.bottom);
  const fitStart = fit ? { x: xMin, y: fit.b } : null;
  const fitEnd = fit ? { x: xMax, y: fit.m * xMax + fit.b } : null;

  return (
    <svg className="result-graph" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Corrected count rate against inverse distance squared">
      <line x1={pad.left} x2={pad.left} y1={pad.top} y2={height - pad.bottom} className="axis" />
      <line x1={pad.left} x2={width - pad.right} y1={height - pad.bottom} y2={height - pad.bottom} className="axis" />
      {[0, 0.25, 0.5, 0.75, 1].map(frac => (
        <React.Fragment key={frac}>
          <line x1={pad.left} x2={width - pad.right} y1={mapY(yMax * frac)} y2={mapY(yMax * frac)} className="gridline" />
          <text x={pad.left - 12} y={mapY(yMax * frac) + 4} textAnchor="end" className="tick-text">{(yMax * frac).toFixed(1)}</text>
          <text x={mapX(xMax * frac)} y={height - pad.bottom + 24} textAnchor="middle" className="tick-text">{(xMax * frac).toFixed(1)}</text>
        </React.Fragment>
      ))}
      {fit && fitStart && fitEnd && (
        <line x1={mapX(fitStart.x)} y1={mapY(fitStart.y)} x2={mapX(fitEnd.x)} y2={mapY(fitEnd.y)} className="fit-line" />
      )}
      {points.map((p, i) => (
        <g key={`${p.x}-${i}`}>
          <line x1={mapX(p.x)} x2={mapX(p.x)} y1={mapY(Math.max(0, p.y - p.error))} y2={mapY(p.y + p.error)} className="error-line" />
          <circle cx={mapX(p.x)} cy={mapY(p.y)} r="6" className="point" />
        </g>
      ))}
      <text x={width / 2} y={height - 12} textAnchor="middle" className="axis-label">1 / r² / m⁻²</text>
      <text transform={`translate(18 ${height / 2}) rotate(-90)`} textAnchor="middle" className="axis-label">corrected count rate / s⁻¹</text>
    </svg>
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
  const stopRef = useRef(false);
  const webgl = useMemo(() => supportsWebGL(), []);

  const backgroundRate = backgroundRuns.length ? mean(backgroundRuns.map(r => r.rate)) : null;
  const backgroundSigma = backgroundRuns.length
    ? Math.sqrt(backgroundRuns.reduce((s, r) => s + r.counts, 0)) / Math.max(1, backgroundRuns.reduce((s, r) => s + r.time, 0))
    : 0;

  const aggregated = useMemo(() => {
    const groups = new Map();
    rows.forEach(row => {
      const key = row.distance.toFixed(2);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    });
    return [...groups.entries()].map(([key, values]) => {
      const correctedValues = values.map(v => v.correctedRate);
      const avg = mean(correctedValues);
      const sd = sampleSD(correctedValues);
      const measurementSigma = mean(values.map(v => v.sigma));
      const uncertainty = values.length > 1
        ? Math.max(sd / Math.sqrt(values.length), measurementSigma / Math.sqrt(values.length))
        : measurementSigma;
      const r = Number(key);
      return { distance: r, n: values.length, mean: avg, sd, uncertainty, invR2: 1 / (r * r) };
    }).sort((a, b) => a.distance - b.distance);
  }, [rows]);

  const graphPoints = aggregated.map(item => ({ x: item.invR2, y: item.mean, error: item.uncertainty }));
  const fit = fitLine(graphPoints);

  function hiddenRateAt(r) {
    const effectiveDistance = Math.max(0.08, r + 0.012);
    return sourceStrength / (effectiveDistance * effectiveDistance) + backgroundTrue;
  }

  async function simulateCount(rate) {
    setRunning(true);
    setDisplayCounts(0);
    setDisplayTime(0);
    stopRef.current = false;

    const wallDuration = Math.max(700, (countTime * 1000) / timeScale);
    const tickMs = 90;
    const start = performance.now();
    let previousSimTime = 0;
    let totalCounts = 0;

    return new Promise(resolve => {
      const tick = () => {
        const now = performance.now();
        const elapsedWall = Math.min(wallDuration, now - start);
        const simTime = Math.min(countTime, (elapsedWall / wallDuration) * countTime);
        const deltaTime = Math.max(0, simTime - previousSimTime);
        if (deltaTime > 0) totalCounts += poisson(rate * deltaTime);
        previousSimTime = simTime;
        setDisplayCounts(totalCounts);
        setDisplayTime(simTime);

        if (elapsedWall < wallDuration && !stopRef.current) {
          window.setTimeout(tick, tickMs);
        } else {
          setRunning(false);
          resolve({ counts: totalCounts, time: simTime });
        }
      };
      tick();
    });
  }

  async function takeBackground() {
    if (running) return;
    setSetup('background');
    const result = await simulateCount(backgroundTrue);
    if (result.time < 1) return;
    setBackgroundRuns(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      counts: result.counts,
      time: result.time,
      rate: result.counts / result.time,
    }]);
  }

  async function takeMeasurement() {
    if (running || backgroundRate === null) return;
    setSetup('measure');
    const result = await simulateCount(hiddenRateAt(distance));
    if (result.time < 1) return;
    const rawRate = result.counts / result.time;
    const correctedRate = Math.max(0, rawRate - backgroundRate);
    const rawSigma = Math.sqrt(Math.max(1, result.counts)) / result.time;
    const sigma = Math.sqrt(rawSigma ** 2 + backgroundSigma ** 2);
    const repeat = rows.filter(row => Math.abs(row.distance - distance) < 1e-6).length + 1;

    setRows(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      distance,
      repeat,
      time: result.time,
      counts: result.counts,
      rawRate,
      backgroundRate,
      correctedRate,
      sigma,
      invR2: 1 / (distance * distance),
    }]);
  }

  function resetData() {
    stopRef.current = true;
    setRows([]);
    setBackgroundRuns([]);
    setDisplayCounts(0);
    setDisplayTime(0);
    setSetup('background');
  }

  function exportCsv() {
    const header = ['distance_m', 'repeat', 'time_s', 'counts', 'raw_rate_s-1', 'background_rate_s-1', 'corrected_rate_s-1', 'sigma_s-1', 'inverse_r_squared_m-2'];
    const lines = rows.map(r => [r.distance, r.repeat, r.time, r.counts, r.rawRate, r.backgroundRate, r.correctedRate, r.sigma, r.invR2]);
    const csv = [header, ...lines].map(line => line.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'inverse-square-results.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const differentDistances = aggregated.length;
  const repeatedDistances = aggregated.filter(a => a.n > 1).length;

  return (
    <div className="stable-app">
      <header className="hero">
        <div>
          <span className="eyebrow">A-level Physics • virtual inverse-square investigation</span>
          <h1>Inverse Square Practical <em>3D Lab</em></h1>
          <p>Collect simulated detector counts, correct for background and test whether the measured intensity follows an inverse-square relationship.</p>
        </div>
        <div className="hero-badges"><span>Simulation only</span><span>Random counting</span><span>3D apparatus</span></div>
      </header>

      <nav className="main-tabs">
        <button className={tab === 'lab' ? 'active' : ''} onClick={() => setTab('lab')}>3D Practical</button>
        <button className={tab === 'results' ? 'active' : ''} onClick={() => setTab('results')}>Results & Graph</button>
        <button className={tab === 'theory' ? 'active' : ''} onClick={() => setTab('theory')}>Theory</button>
        <button className={tab === 'teacher' ? 'active' : ''} onClick={() => setTab('teacher')}>Teacher</button>
      </nav>

      <main className="content-shell">
        {tab === 'lab' && (
          <section className="lab-grid">
            <div className="card scene-card">
              <div className="card-head">
                <div><span className="mini">Interactive apparatus</span><h2>Virtual laboratory bench</h2></div>
                <span className={`ready-pill ${running ? 'live' : ''}`}>{running ? 'COUNTING' : 'READY'}</span>
              </div>

              <div className="scene-stage">
                {webgl ? (
                  <SceneBoundary fallback={<SceneFallback distance={distance} />}>
                    <Canvas camera={{ position: [4.8, 3.3, 4.9], fov: 42 }} dpr={[1, 1.35]}>
                      <VirtualApparatus distance={distance} counting={running && setup === 'measure'} />
                    </Canvas>
                  </SceneBoundary>
                ) : <SceneFallback distance={distance} />}
                <div className="digital-overlay">
                  <div><span>Distance</span><b>{distance.toFixed(2)} m</b></div>
                  <div><span>Counts</span><b>{displayCounts}</b></div>
                  <div><span>Timer</span><b>{displayTime.toFixed(1)} s</b></div>
                </div>
              </div>

              <div className="control-panel">
                <div className="slider-row">
                  <div><span>Move detector</span><b>{distance.toFixed(2)} m</b></div>
                  <input disabled={running} type="range" min="0.15" max="1.20" step="0.01" value={distance} onChange={e => setDistance(Number(e.target.value))} />
                </div>
                <div className="preset-buttons">
                  {presetDistances.map(value => <button key={value} disabled={running} className={Math.abs(value - distance) < 0.001 ? 'active' : ''} onClick={() => setDistance(value)}>{value.toFixed(2)}</button>)}
                </div>
              </div>
            </div>

            <aside className="side-stack">
              <div className="card">
                <span className="mini">Counter controls</span>
                <h2>Run a measurement</h2>
                <div className="mode-switch">
                  <button className={setup === 'background' ? 'active' : ''} disabled={running} onClick={() => setSetup('background')}>Background</button>
                  <button className={setup === 'measure' ? 'active' : ''} disabled={running} onClick={() => setSetup('measure')}>Source measurement</button>
                </div>
                <label className="field-label">Counting time</label>
                <div className="time-buttons">
                  {[10, 30, 60, 120].map(value => <button key={value} className={countTime === value ? 'active' : ''} disabled={running} onClick={() => setCountTime(value)}>{value} s</button>)}
                </div>
                {setup === 'background' ? (
                  <button className="primary-button" disabled={running} onClick={takeBackground}>{running ? 'Counting…' : 'Take background count'}</button>
                ) : (
                  <button className="primary-button" disabled={running || backgroundRate === null} onClick={takeMeasurement}>{running ? 'Counting…' : `Take reading at ${distance.toFixed(2)} m`}</button>
                )}
                {running && <button className="stop-button" onClick={() => { stopRef.current = true; }}>Stop early</button>}
                {backgroundRate === null && setup === 'measure' && <div className="notice">Take at least one background count before collecting source data.</div>}
              </div>

              <div className="card">
                <span className="mini">Practical progress</span>
                <h2>Your dataset</h2>
                <div className="stats-grid">
                  <div><span>Background runs</span><b>{backgroundRuns.length}</b></div>
                  <div><span>Background rate</span><b>{backgroundRate === null ? '—' : `${backgroundRate.toFixed(3)} s⁻¹`}</b></div>
                  <div><span>Distances</span><b>{differentDistances}</b></div>
                  <div><span>Readings</span><b>{rows.length}</b></div>
                </div>
                <div className="progress-list">
                  <div className={backgroundRuns.length >= 2 ? 'done' : ''}>Measure background more than once</div>
                  <div className={differentDistances >= 6 ? 'done' : ''}>Collect a wide range of distances</div>
                  <div className={repeatedDistances >= 3 ? 'done' : ''}>Repeat several distances</div>
                  <div className={differentDistances >= 6 ? 'done' : ''}>Analyse corrected rate against 1/r²</div>
                </div>
                <button className="secondary-button" onClick={resetData}>Reset experiment</button>
              </div>

              <div className="card safety-card">
                <b>Simulation only</b>
                <p>This app is designed for virtual learning. Any real radioactive-source practical should only be carried out under your school’s authorised procedures and staff supervision.</p>
              </div>
            </aside>
          </section>
        )}

        {tab === 'results' && (
          <section className="results-grid">
            <div className="card graph-card">
              <div className="card-head"><div><span className="mini">Processed data</span><h2>Corrected count rate vs 1/r²</h2></div>{rows.length > 0 && <button className="secondary-button" onClick={exportCsv}>Export CSV</button>}</div>
              <SimpleGraph points={graphPoints} fit={fit} />
              {fit && <div className="fit-stats"><div><span>Gradient</span><b>{fit.m.toFixed(3)}</b></div><div><span>Intercept</span><b>{fit.b.toFixed(3)}</b></div><div><span>R²</span><b>{fit.r2.toFixed(4)}</b></div></div>}
            </div>

            <div className="card table-card">
              <span className="mini">Measurements</span>
              <h2>Raw and corrected results</h2>
              <div className="table-scroll"><table><thead><tr><th>r / m</th><th>repeat</th><th>time / s</th><th>counts</th><th>raw / s⁻¹</th><th>background / s⁻¹</th><th>corrected / s⁻¹</th><th>1/r² / m⁻²</th></tr></thead><tbody>
                {rows.map(row => <tr key={row.id}><td>{row.distance.toFixed(2)}</td><td>{row.repeat}</td><td>{row.time.toFixed(1)}</td><td>{row.counts}</td><td>{row.rawRate.toFixed(3)}</td><td>{row.backgroundRate.toFixed(3)}</td><td><b>{row.correctedRate.toFixed(3)}</b></td><td>{row.invR2.toFixed(3)}</td></tr>)}
                {!rows.length && <tr><td colSpan="8" className="empty-cell">No source readings yet.</td></tr>}
              </tbody></table></div>
            </div>

            <div className="card table-card">
              <span className="mini">Repeat processing</span>
              <h2>Mean values by distance</h2>
              <div className="table-scroll"><table><thead><tr><th>r / m</th><th>repeats</th><th>mean corrected / s⁻¹</th><th>SD / s⁻¹</th><th>uncertainty / s⁻¹</th></tr></thead><tbody>
                {aggregated.map(item => <tr key={item.distance}><td>{item.distance.toFixed(2)}</td><td>{item.n}</td><td>{item.mean.toFixed(3)}</td><td>{item.sd ? item.sd.toFixed(3) : '—'}</td><td>{item.uncertainty.toFixed(3)}</td></tr>)}
              </tbody></table></div>
            </div>
          </section>
        )}

        {tab === 'theory' && (
          <section className="theory-grid">
            <div className="card theory-card"><span className="mini">Relationship</span><h2>Inverse-square law</h2><div className="formula">I ∝ 1 / r²</div><p>For an ideal point-like source, radiation spreads over an area that grows with r². The measured source contribution should therefore decrease approximately as 1/r².</p></div>
            <div className="card theory-card"><span className="mini">Processing</span><h2>Background correction</h2><div className="formula small">corrected rate = raw rate − background rate</div><p>The virtual detector records background as well as the simulated source. Measuring background allows the source contribution to be estimated.</p></div>
            <div className="card theory-card"><span className="mini">Random variation</span><h2>Counting statistics</h2><div className="formula small">σN ≈ √N</div><p>Repeated counts will vary. Longer counting times and repeated measurements make the overall trend easier to identify.</p></div>
          </section>
        )}

        {tab === 'teacher' && (
          <section className="teacher-grid">
            <div className="card"><span className="mini">Lesson pacing</span><h2>Simulation speed</h2><div className="time-buttons">{[1, 5, 10, 20].map(value => <button key={value} className={timeScale === value ? 'active' : ''} onClick={() => setTimeScale(value)}>×{value}</button>)}</div></div>
            <div className="card"><span className="mini">Hidden model</span><h2>Background level</h2><label className="slider-label"><span>{backgroundTrue.toFixed(2)} s⁻¹</span><input type="range" min="0.15" max="1.50" step="0.05" value={backgroundTrue} onChange={e => setBackgroundTrue(Number(e.target.value))} /></label></div>
            <div className="card"><span className="mini">Hidden model</span><h2>Source strength</h2><label className="slider-label"><span>{sourceStrength.toFixed(2)}</span><input type="range" min="0.15" max="0.80" step="0.01" value={sourceStrength} onChange={e => setSourceStrength(Number(e.target.value))} /></label></div>
          </section>
        )}
      </main>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<App />);
}
