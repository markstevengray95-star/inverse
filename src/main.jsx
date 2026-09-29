import React, { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import {
  Activity, BarChart3, BookOpen, Calculator, ChevronRight, Download, FlaskConical,
  Gauge, GraduationCap, RotateCcw, Settings, ShieldCheck, Sparkles, Timer, Target
} from 'lucide-react';
import {
  CartesianGrid, ErrorBar, Line, LineChart, ReferenceLine, ResponsiveContainer, Scatter,
  ScatterChart, Tooltip, XAxis, YAxis
} from 'recharts';
import './styles.css';

const tabs = [
  ['lab','3D Practical',FlaskConical],
  ['analysis','Data & Graphs',BarChart3],
  ['theory','Theory',BookOpen],
  ['coach','Calculation Coach',Calculator],
  ['quiz','Assessment',GraduationCap],
  ['teacher','Teacher',Settings],
];

function poisson(lambda){
  if(lambda<=0) return 0;
  if(lambda<35){let L=Math.exp(-lambda),p=1,k=0; do{k++;p*=Math.random()}while(p>L); return k-1;}
  const u1=Math.random(),u2=Math.random();
  const z=Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2);
  return Math.max(0,Math.round(lambda+Math.sqrt(lambda)*z));
}

function fitLine(points){
  if(points.length<2) return null;
  const n=points.length;
  const sx=points.reduce((s,p)=>s+p.x,0), sy=points.reduce((s,p)=>s+p.y,0);
  const sxx=points.reduce((s,p)=>s+p.x*p.x,0), sxy=points.reduce((s,p)=>s+p.x*p.y,0);
  const den=n*sxx-sx*sx; if(Math.abs(den)<1e-12) return null;
  const m=(n*sxy-sx*sy)/den,b=(sy-m*sx)/n, ym=sy/n;
  const ssTot=points.reduce((s,p)=>s+(p.y-ym)**2,0);
  const ssRes=points.reduce((s,p)=>s+(p.y-(m*p.x+b))**2,0);
  return {m,b,r2:ssTot===0?1:1-ssRes/ssTot};
}

function CounterBox({value,label,unit}){
  return <div className="counter-box"><span>{label}</span><strong>{value}</strong><small>{unit}</small></div>
}

function RailTick({x,label}){
  return <group position={[x,0.42,0.48]}>
    <mesh><boxGeometry args={[0.012,0.02,0.18]}/><meshStandardMaterial color="#e4edf4" roughness={0.45}/></mesh>
    <Html center distanceFactor={10} position={[0,-0.08,0.11]}><span className="tick-label">{label}</span></Html>
  </group>
}

function LabScene({distance}){
  const detectorX = -1.4 + (distance-0.15)/(1.05)*3.4;
  const ticks = Array.from({length:12},(_,i)=>({x:-1.4+i*(3.4/11),label:(0.15+i*(1.05/11)).toFixed(2)}));
  return <>
    <ambientLight intensity={0.55}/>
    <directionalLight position={[4,7,3]} intensity={2.0} castShadow shadow-mapSize={[2048,2048]}/>
    <spotLight position={[-4,5,-2]} intensity={80} angle={0.45} penumbra={0.8}/>
    <Environment preset="warehouse"/>

    <mesh receiveShadow position={[0,-0.06,0]}>
      <boxGeometry args={[7.4,0.25,3.5]}/>
      <meshStandardMaterial color="#334556" roughness={0.35} metalness={0.25}/>
    </mesh>
    <mesh receiveShadow position={[0,-0.2,0]}>
      <boxGeometry args={[7.7,0.06,3.8]}/><meshStandardMaterial color="#10202d"/>
    </mesh>

    <group position={[-2.35,0.45,0]}>
      <mesh castShadow position={[0,0.46,0]}><cylinderGeometry args={[0.16,0.16,0.92,48]}/><meshStandardMaterial color="#d3d7db" metalness={0.85} roughness={0.23}/></mesh>
      <mesh castShadow position={[0,0.93,0]}><cylinderGeometry args={[0.21,0.21,0.08,48]}/><meshStandardMaterial color="#4c5962" metalness={0.8}/></mesh>
      <mesh castShadow position={[0,0.24,0]}><cylinderGeometry args={[0.28,0.34,0.18,48]}/><meshStandardMaterial color="#141b22" metalness={0.7}/></mesh>
      <mesh rotation={[Math.PI/2,0,0]} position={[0,1.08,0]}><cylinderGeometry args={[0.06,0.06,0.18,24]}/><meshStandardMaterial color="#ffcc33" emissive="#7a5a00" emissiveIntensity={0.18}/></mesh>
      <Html center position={[0,1.35,0]} distanceFactor={8}><div className="scene-tag warning-tag">Virtual sealed source</div></Html>
    </group>

    <group position={[0,0.33,0.36]}>
      <mesh castShadow><boxGeometry args={[4.15,0.08,0.22]}/><meshStandardMaterial color="#aeb9c3" metalness={0.92} roughness={0.18}/></mesh>
      {ticks.map((t,i)=><RailTick key={i} {...t}/>)}
    </group>

    <group position={[detectorX,0.58,0.02]}>
      <mesh castShadow position={[0,-0.18,0]}><cylinderGeometry args={[0.25,0.31,0.11,40]}/><meshStandardMaterial color="#202c35" metalness={0.8}/></mesh>
      <mesh castShadow position={[0,0.25,0]}><cylinderGeometry args={[0.055,0.055,0.85,24]}/><meshStandardMaterial color="#9aa6af" metalness={0.92}/></mesh>
      <mesh castShadow rotation={[0,0,Math.PI/2]} position={[0.13,0.58,0]}>
        <cylinderGeometry args={[0.16,0.16,0.8,48]}/><meshStandardMaterial color="#213445" metalness={0.75} roughness={0.3}/>
      </mesh>
      <mesh castShadow rotation={[0,0,Math.PI/2]} position={[-0.32,0.58,0]}>
        <cylinderGeometry args={[0.13,0.13,0.08,40]}/><meshStandardMaterial color="#d0d8dd" metalness={0.9}/>
      </mesh>
      <mesh position={[-0.365,0.58,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.085,0.085,0.02,32]}/><meshStandardMaterial color="#111" roughness={0.8}/></mesh>
      <Html center position={[0.15,1.06,0]} distanceFactor={8}><div className="scene-tag">GM detector</div></Html>
    </group>

    <group position={[2.55,0.48,-0.62]}>
      <RoundedBox args={[1.4,0.82,0.72]} radius={0.08} smoothness={4} castShadow>
        <meshStandardMaterial color="#182b3a" metalness={0.45} roughness={0.32}/>
      </RoundedBox>
      <mesh position={[0,0.09,0.37]}><planeGeometry args={[0.94,0.34]}/><meshStandardMaterial color="#07100d" emissive="#17ff8d" emissiveIntensity={0.22}/></mesh>
      <Html transform position={[0,0.09,0.376]} distanceFactor={7}><div className="counter-screen">SCALER<br/><b>READY</b></div></Html>
      <mesh position={[-0.42,-0.21,0.38]}><cylinderGeometry args={[0.055,0.055,0.03,28]}/><meshStandardMaterial color="#d14545"/></mesh>
      <mesh position={[-0.2,-0.21,0.38]}><cylinderGeometry args={[0.055,0.055,0.03,28]}/><meshStandardMaterial color="#4caf75"/></mesh>
    </group>

    <mesh position={[-0.65,0.45,-0.15]} rotation={[0,Math.PI/2,0]}>
      <planeGeometry args={[0.012,1.2]}/><meshBasicMaterial color="#ffd54d" transparent opacity={0.0}/>
    </mesh>
    <ContactShadows position={[0,0.03,0]} opacity={0.45} scale={9} blur={2.8} far={5}/>
    <OrbitControls makeDefault minDistance={3.1} maxDistance={9} target={[0,0.6,0]} enablePan={true}/>
  </>
}

function App(){
  const [tab,setTab]=useState('lab');
  const [distance,setDistance]=useState(0.30);
  const [countTime,setCountTime]=useState(30);
  const [backgroundTrue,setBackgroundTrue]=useState(0.60);
  const [backgroundMeasured,setBackgroundMeasured]=useState(null);
  const [lastBg,setLastBg]=useState(null);
  const [k,setK]=useState(1.2);
  const [noise,setNoise]=useState(1);
  const [rows,setRows]=useState([]);
  const [currentCounts,setCurrentCounts]=useState(0);
  const [running,setRunning]=useState(false);
  const [prediction,setPrediction]=useState('');
  const [predictionFeedback,setPredictionFeedback]=useState('');
  const [mode,setMode]=useState('guided');
  const [showRegression,setShowRegression]=useState(true);
  const [method,setMethod]=useState('');
  const [graphMode,setGraphMode]=useState('inverse');

  const theoreticalRate = k/(distance*distance)+backgroundTrue;
  const uniqueDistances = new Set(rows.map(r=>r.r.toFixed(3))).size;
  const repeats = rows.reduce((m,r)=>(m[r.r.toFixed(3)]=(m[r.r.toFixed(3)]||0)+1,m),{});
  const anyRepeat = Object.values(repeats).some(v=>v>1);

  function runCounter(finalValue){
    setRunning(true); setCurrentCounts(0);
    const start=performance.now(),duration=900;
    return new Promise(resolve=>{
      const f=(now)=>{
        const p=Math.min(1,(now-start)/duration);
        setCurrentCounts(Math.round(finalValue*p));
        if(p<1) requestAnimationFrame(f); else {setRunning(false);resolve();}
      }; requestAnimationFrame(f);
    });
  }

  function noisyPoisson(mean){
    const raw=poisson(mean);
    return Math.max(0,Math.round(mean+(raw-mean)*noise));
  }

  async function measureBackground(){
    if(running) return;
    const counts=noisyPoisson(backgroundTrue*countTime);
    await runCounter(counts);
    const rate=counts/countTime;
    setBackgroundMeasured(rate);
    setLastBg({counts,time:countTime,rate});
  }

  async function takeReading(){
    if(running) return;
    if(mode==='challenge' && method.trim().length<80){
      setPredictionFeedback('Challenge mode: write a short experimental plan before collecting data.');
      return;
    }
    const mean=(k/(distance*distance)+backgroundTrue)*countTime;
    const counts=noisyPoisson(mean);
    await runCounter(counts);
    const rawRate=counts/countTime;
    const bg=backgroundMeasured ?? backgroundTrue;
    const corrected=Math.max(0,rawRate-bg);
    const sigmaRaw=Math.sqrt(Math.max(1,counts))/countTime;
    const sigmaBg=lastBg?Math.sqrt(Math.max(1,lastBg.counts))/lastBg.time:0;
    const sigma=Math.sqrt(sigmaRaw*sigmaRaw+sigmaBg*sigmaBg);
    const sameCount=rows.filter(x=>Math.abs(x.r-distance)<1e-9).length+1;
    const row={id:crypto.randomUUID(),r:distance,t:countTime,counts,rawRate,bg,corrected,sigma,repeat:sameCount,invR2:1/(distance*distance)};
    setRows(prev=>[...prev,row]);
    const pv=parseFloat(prediction);
    if(Number.isFinite(pv)){
      const pct=corrected>0?Math.abs(pv-corrected)/corrected*100:0;
      setPredictionFeedback(`Measured corrected rate ${corrected.toFixed(2)} s⁻¹. Prediction difference: ${pct.toFixed(1)}%.`);
      setPrediction('');
    }
  }

  const graphPoints=useMemo(()=>rows.map(r=>({
    x:graphMode==='inverse'?r.invR2:r.r,
    y:r.corrected,
    error:r.sigma,
    r:r.r,
  })),[rows,graphMode]);
  const regression=useMemo(()=>fitLine(graphPoints),[graphPoints]);

  function exportCsv(){
    const head=['distance_m','r_squared_m2','inverse_r_squared_m-2','count_time_s','raw_counts','raw_rate_s-1','background_rate_s-1','corrected_rate_s-1','uncertainty_s-1','repeat'];
    const body=rows.map(r=>[r.r,r.r*r.r,r.invR2,r.t,r.counts,r.rawRate,r.bg,r.corrected,r.sigma,r.repeat]);
    const blob=new Blob([[head,...body].map(r=>r.join(',')).join('\n')],{type:'text/csv'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url;a.download='inverse-square-results.csv';a.click();URL.revokeObjectURL(url);
  }

  function reset(){setRows([]);setBackgroundMeasured(null);setLastBg(null);setCurrentCounts(0);setPredictionFeedback('');}

  return <div className="app-shell">
    <header className="top-header">
      <div>
        <div className="eyebrow">AQA A-level Physics • Required Practical 12</div>
        <h1>Inverse Square Lab <span>3D</span></h1>
        <p>Virtual gamma-radiation investigation • realistic counting statistics • live data analysis</p>
      </div>
      <div className="header-badges"><span><ShieldCheck size={15}/> Virtual lab</span><span><Target size={15}/> I ∝ 1/r²</span><span><Sparkles size={15}/> {mode}</span></div>
    </header>

    <nav className="tabs">
      {tabs.map(([id,label,Icon])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon size={17}/><span>{label}</span></button>)}
    </nav>

    <main>
      {tab==='lab' && <section className="lab-layout">
        <div className="panel scene-panel">
          <div className="panel-title"><div><span className="mini-label">Interactive apparatus</span><h2>3D laboratory</h2></div><span className="status-dot">WebGL</span></div>
          <div className="scene-wrap">
            <Canvas shadows camera={{position:[4.8,3.4,4.7],fov:42}} dpr={[1,1.6]}>
              <LabScene distance={distance}/>
            </Canvas>
            <div className="scene-overlay">
              <div><span>Detector distance</span><strong>{distance.toFixed(3)} m</strong></div>
              <div><span>Model rate incl. background</span><strong>{theoreticalRate.toFixed(2)} s⁻¹</strong></div>
            </div>
          </div>
          <div className="distance-control">
            <div className="control-head"><label>Move detector along the measured track</label><b>{distance.toFixed(3)} m</b></div>
            <input type="range" min="0.15" max="1.20" step="0.01" value={distance} onChange={e=>setDistance(+e.target.value)}/>
            <div className="scale"><span>0.15 m</span><span>0.60 m</span><span>1.20 m</span></div>
          </div>
        </div>

        <div className="side-stack">
          <div className="panel console-panel">
            <div className="panel-title"><div><span className="mini-label">Digital scaler</span><h2>Detector console</h2></div><Gauge size={24}/></div>
            <div className="counter-grid">
              <CounterBox label="TIME" value={countTime} unit="s"/>
              <CounterBox label="COUNTS" value={currentCounts} unit="events"/>
              <CounterBox label="BG RATE" value={backgroundMeasured===null?'—':backgroundMeasured.toFixed(3)} unit="s⁻¹"/>
            </div>
            <label className="field-label">Count time</label>
            <div className="segmented">{[10,20,30,60,120].map(t=><button className={countTime===t?'active':''} key={t} onClick={()=>setCountTime(t)}>{t}s</button>)}</div>
            <div className="action-grid">
              <button className="primary" onClick={takeReading} disabled={running}><Activity size={17}/>{running?'Counting…':'Take reading'}</button>
              <button onClick={measureBackground} disabled={running}><Timer size={17}/>Background</button>
              <button onClick={reset}><RotateCcw size={17}/>Reset</button>
            </div>
            <div className="info-strip">{lastBg?`Background: ${lastBg.counts} counts in ${lastBg.time}s = ${lastBg.rate.toFixed(3)} s⁻¹`:'Measure a virtual background count before analysing corrected source rates.'}</div>
          </div>

          <div className="panel">
            <div className="panel-title"><div><span className="mini-label">Prediction first</span><h3>Prediction challenge</h3></div><Target size={21}/></div>
            <p className="muted">Predict the corrected count rate at the current distance before revealing a simulated reading.</p>
            <div className="inline-input"><input type="number" value={prediction} onChange={e=>setPrediction(e.target.value)} placeholder="counts s⁻¹"/><button onClick={()=>setPredictionFeedback(prediction?`Prediction locked: ${Number(prediction).toFixed(2)} s⁻¹. Now take a reading.`:'Enter a prediction first.')}>Lock</button></div>
            {predictionFeedback && <div className="feedback">{predictionFeedback}</div>}
          </div>

          <div className="panel guide-panel">
            <div className="panel-title"><div><span className="mini-label">Progress</span><h3>Guided practical</h3></div><span className="pill">{uniqueDistances}/6 distances</span></div>
            {[
              [backgroundMeasured!==null,'Measure a virtual background count'],
              [uniqueDistances>=6,'Collect at least 6 different distances'],
              [anyRepeat,'Repeat at least one distance'],
              [rows.length>=4,'Open Data & Graphs and linearise the data'],
            ].map(([done,text],i)=><div className={`guide-step ${done?'done':''}`} key={text}><span>{done?'✓':i+1}</span><div>{text}</div></div>)}
          </div>
        </div>
      </section>}

      {tab==='analysis' && <section className="analysis-stack">
        <div className="panel">
          <div className="panel-title"><div><span className="mini-label">Processed results</span><h2>Data table</h2></div><button className="icon-button" onClick={exportCsv}><Download size={17}/>CSV</button></div>
          <div className="table-scroll"><table><thead><tr><th>#</th><th>r / m</th><th>r² / m²</th><th>1/r² / m⁻²</th><th>t / s</th><th>counts</th><th>raw / s⁻¹</th><th>background / s⁻¹</th><th>corrected / s⁻¹</th><th>σ / s⁻¹</th><th>repeat</th></tr></thead>
          <tbody>{rows.map((r,i)=><tr key={r.id}><td>{i+1}</td><td>{r.r.toFixed(3)}</td><td>{(r.r*r.r).toFixed(4)}</td><td>{r.invR2.toFixed(3)}</td><td>{r.t}</td><td>{r.counts}</td><td>{r.rawRate.toFixed(3)}</td><td>{r.bg.toFixed(3)}</td><td>{r.corrected.toFixed(3)}</td><td>{r.sigma.toFixed(3)}</td><td>{r.repeat}</td></tr>)}</tbody></table></div>
          {!rows.length && <div className="empty">Collect readings in the 3D practical to populate this table.</div>}
        </div>
        <div className="analysis-grid">
          <div className="panel chart-panel">
            <div className="panel-title"><div><span className="mini-label">Graphical test</span><h2>{graphMode==='inverse'?'Corrected rate vs 1/r²':'Corrected rate vs distance'}</h2></div><select value={graphMode} onChange={e=>setGraphMode(e.target.value)}><option value="inverse">Linearised: rate vs 1/r²</option><option value="distance">Raw relationship: rate vs r</option></select></div>
            <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{top:15,right:20,bottom:15,left:10}}><CartesianGrid stroke="#1e3a4d" strokeDasharray="3 3"/><XAxis dataKey="x" type="number" name={graphMode==='inverse'?'1/r²':'r'} unit={graphMode==='inverse'?' m⁻²':' m'} stroke="#8fa8bb" domain={['auto','auto']}/><YAxis dataKey="y" type="number" name="corrected rate" unit=" s⁻¹" stroke="#8fa8bb" domain={[0,'auto']}/><Tooltip cursor={{strokeDasharray:'3 3'}} contentStyle={{background:'#091827',border:'1px solid #2c536e',borderRadius:10}}/><Scatter data={graphPoints} fill="#63d8ff"/></ScatterChart></ResponsiveContainer></div>
          </div>
          <div className="panel regression-panel">
            <span className="mini-label">Regression</span><h2>Linear analysis</h2>
            <div className="metric-row"><span>Gradient</span><b>{showRegression&&regression?regression.m.toFixed(4):'—'}</b></div>
            <div className="metric-row"><span>Intercept</span><b>{showRegression&&regression?regression.b.toFixed(4):'—'}</b></div>
            <div className="metric-row"><span>R²</span><b>{showRegression&&regression?regression.r2.toFixed(4):'—'}</b></div>
            <div className="interpretation"><b>What to look for</b><p>A straight-line trend when corrected count rate is plotted against 1/r² supports the inverse-square model. Scatter remains because radioactive counting is random.</p></div>
          </div>
        </div>
      </section>}

      {tab==='theory' && <section className="two-col">
        <div className="panel theory-card"><span className="mini-label">Core model</span><h2>Why inverse square?</h2><div className="formula">I = <span>k</span> / r²</div><p>For a point-like source spreading uniformly through three dimensions, the same emission is distributed across the surface of a sphere. Since sphere area is 4πr², intensity decreases in proportion to 1/r².</p><div className="concept-grid"><div><strong>2 × farther</strong><span>¼ intensity</span></div><div><strong>3 × farther</strong><span>⅑ intensity</span></div><div><strong>½ distance</strong><span>4 × intensity</span></div></div></div>
        <div className="panel"><span className="mini-label">Visual model</span><h2>Spreading through space</h2><div className="sphere-viz"><div className="source-dot"></div><div className="ring r1"></div><div className="ring r2"></div><div className="ring r3"></div><div className="ray ray1"></div><div className="ray ray2"></div><div className="ray ray3"></div><div className="ray ray4"></div></div><p className="muted">The same emission is spread across a rapidly increasing spherical area. The simulation’s corrected count rate therefore follows k/r².</p></div>
        <div className="panel"><span className="mini-label">Data processing</span><h2>Background correction</h2><p>The detector also records environmental background events. The simulation measures a separate background rate and subtracts it from the raw measured rate:</p><div className="equation-box">corrected rate = raw rate − background rate</div><p>That leaves a better estimate of the source contribution.</p></div>
        <div className="panel"><span className="mini-label">Randomness</span><h2>Counting statistics</h2><p>Radioactive decay is random. For N counts, a common statistical estimate of the count uncertainty is approximately √N. Longer counting times usually reduce the percentage random uncertainty.</p></div>
      </section>}

      {tab==='coach' && <Coach/>}
      {tab==='quiz' && <Quiz/>}
      {tab==='teacher' && <section className="two-col">
        <div className="panel"><span className="mini-label">Lesson setup</span><h2>Teacher controls</h2>
          <label className="field-label">Learning mode</label><select value={mode} onChange={e=>setMode(e.target.value)}><option value="guided">Guided Practical</option><option value="investigation">Investigation Mode</option><option value="challenge">Challenge Mode</option></select>
          <label className="field-label">Background level: {backgroundTrue.toFixed(1)} s⁻¹</label><input type="range" min="0.1" max="2.5" step="0.1" value={backgroundTrue} onChange={e=>setBackgroundTrue(+e.target.value)}/>
          <label className="field-label">Random variation: {noise.toFixed(1)}×</label><input type="range" min="0.3" max="2" step="0.1" value={noise} onChange={e=>setNoise(+e.target.value)}/>
          <label className="field-label">Model constant k: {k.toFixed(1)}</label><input type="range" min="0.3" max="2.2" step="0.1" value={k} onChange={e=>setK(+e.target.value)}/>
          <label className="check-row"><input type="checkbox" checked={showRegression} onChange={e=>setShowRegression(e.target.checked)}/><span>Reveal regression values to students</span></label>
        </div>
        <div className="panel"><span className="mini-label">Challenge mode</span><h2>Experimental design prompt</h2><p className="muted">Students justify their variables, measurement strategy, data processing and reliability choices before the virtual counter unlocks.</p><textarea value={method} onChange={e=>setMethod(e.target.value)} placeholder="Write a concise method plan..."/><div className={`plan-check ${method.length>=80?'good':''}`}>{method.length>=80?'Plan length is sufficient to unlock data collection in Challenge Mode.':'Write at least a short paragraph before collecting data in Challenge Mode.'}</div></div>
        <div className="panel safety-card"><ShieldCheck size={26}/><div><span className="mini-label">Safety boundary</span><h2>Simulation-only source</h2><p>This app deliberately does not teach real-world radioactive-source handling. Use it for theory, data processing, graphing and practical-planning discussion under your school’s approved procedures.</p></div></div>
      </section>}
    </main>
  </div>
}

function Coach(){
  const [N,setN]=useState(650),[t,setT]=useState(30),[bg,setBg]=useState(0.6),[r,setR]=useState(0.3);
  const raw=N/t, corrected=raw-bg, inv=1/(r*r), unc=Math.sqrt(Math.max(1,N))/t;
  return <section className="two-col"><div className="panel"><span className="mini-label">Guided calculations</span><h2>Calculation coach</h2><div className="form-grid"><label>Raw counts N<input type="number" value={N} onChange={e=>setN(+e.target.value)}/></label><label>Counting time t / s<input type="number" value={t} onChange={e=>setT(+e.target.value)}/></label><label>Background rate / s⁻¹<input type="number" step="0.01" value={bg} onChange={e=>setBg(+e.target.value)}/></label><label>Distance r / m<input type="number" step="0.01" value={r} onChange={e=>setR(+e.target.value)}/></label></div></div><div className="panel calc-steps"><span className="mini-label">Worked route</span><h2>Step by step</h2><div className="calc-step"><span>1</span><div><b>Raw count rate</b><p>{N} ÷ {t} = <strong>{raw.toFixed(3)} s⁻¹</strong></p></div></div><div className="calc-step"><span>2</span><div><b>Background correction</b><p>{raw.toFixed(3)} − {bg} = <strong>{corrected.toFixed(3)} s⁻¹</strong></p></div></div><div className="calc-step"><span>3</span><div><b>Linearising variable</b><p>1 ÷ {r}² = <strong>{inv.toFixed(3)} m⁻²</strong></p></div></div><div className="calc-step"><span>4</span><div><b>Approx. count-rate uncertainty</b><p>√{N} ÷ {t} ≈ <strong>{unc.toFixed(3)} s⁻¹</strong></p></div></div></div></section>
}

function Quiz(){
  const qs=[
    {q:'If the detector distance from an ideal point source doubles, what happens to the source intensity?',opts:['It halves','It becomes one quarter','It doubles','It is unchanged'],a:1},
    {q:'Why is a background count measured?',opts:['To make the source stronger','To estimate counts not caused by the investigated source','To remove all random uncertainty','To increase detector efficiency'],a:1},
    {q:'Which graph should be closest to a straight line for inverse-square behaviour?',opts:['Corrected rate against r','Corrected rate against r²','Corrected rate against 1/r²','Corrected rate against √r'],a:2},
    {q:'Why can repeated count-rate readings differ even when the setup is unchanged?',opts:['Radioactive decay is random','Distance has no effect','The inverse-square law is false','Background radiation is always zero'],a:0},
    {q:'What generally reduces percentage random counting uncertainty?',opts:['A shorter count time','A longer count time','Ignoring background','Using fewer readings'],a:1},
  ];
  const [ans,setAns]=useState({}),[score,setScore]=useState(null);
  return <section className="panel quiz-panel"><span className="mini-label">Exam-practical thinking</span><h2>Quick assessment</h2>{qs.map((q,i)=><div className="question" key={q.q}><b>{i+1}. {q.q}</b><div className="options">{q.opts.map((o,j)=><label key={o} className={ans[i]===j?'selected':''}><input type="radio" name={`q${i}`} onChange={()=>setAns({...ans,[i]:j})}/><span>{o}</span></label>)}</div></div>)}<button className="primary mark-btn" onClick={()=>setScore(qs.reduce((s,q,i)=>s+(ans[i]===q.a?1:0),0))}>Mark assessment <ChevronRight size={17}/></button>{score!==null&&<div className="score-card"><strong>{score}/{qs.length}</strong><span>{score===qs.length?'Excellent — full marks.':score>=3?'Good understanding. Review any missed items.':'Use the Theory tab, then try again.'}</span></div>}</section>
}

createRoot(document.getElementById('root')).render(<App/>);
