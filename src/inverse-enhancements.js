import './inverse-enhancements.css';

const ROOT_ID = 'inverse-deep-dive';

function percent(value) {
  return `${(value * 100).toFixed(value >= 0.1 ? 1 : 2)}%`;
}

function fractionLabel(distance) {
  const squared = distance * distance;
  const rounded = Math.round(squared);
  if (Math.abs(squared - rounded) < 0.02) return `1/${rounded}`;
  return `1/${squared.toFixed(2)}`;
}

function buildDeepDive() {
  const existing = document.getElementById(ROOT_ID);
  const visualHost = document.querySelector('.inverse-visual-layout');
  if (!visualHost || existing) return;

  const section = document.createElement('section');
  section.id = ROOT_ID;
  section.className = 'inverse-deep-dive';
  section.innerHTML = `
    <div class="deep-hero card">
      <div>
        <span class="mini">Deep visual explanation</span>
        <h2>Follow the geometry from the source to the detector</h2>
        <p>The inverse-square law comes from geometry. The same total emission is distributed across spherical surfaces whose area grows with the square of distance.</p>
      </div>
      <div class="deep-formula-stack">
        <span>A = 4πr²</span>
        <span>I ∝ 1/A</span>
        <strong>I ∝ 1/r²</strong>
      </div>
    </div>

    <div class="deep-grid">
      <div class="card shell-lab-card">
        <div class="card-head">
          <div><span class="mini">Geometric spreading</span><h2>Interactive spherical-shell model</h2></div>
          <span class="model-badge">cross-section of 3D spheres</span>
        </div>
        <p class="deep-note">The diagram is a 2D cross-section. In three dimensions each circle represents a spherical wavefront centred on the source.</p>

        <div class="shell-visual-wrap">
          <svg class="shell-visual" viewBox="0 0 760 470" role="img" aria-label="Interactive inverse square shell visualisation">
            <defs>
              <radialGradient id="deepSourceGlow">
                <stop offset="0%" stop-color="#fffde0"/>
                <stop offset="35%" stop-color="#ffd84d"/>
                <stop offset="100%" stop-color="#ff9f00" stop-opacity="0"/>
              </radialGradient>
              <filter id="deepGlow"><feGaussianBlur stdDeviation="2.5" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>
            <g transform="translate(300 235)">
              <circle r="190" class="deep-reference-shell shell-four"/>
              <circle r="145" class="deep-reference-shell shell-three"/>
              <circle r="100" class="deep-reference-shell shell-two"/>
              <circle r="55" class="deep-reference-shell shell-one"/>
              <g id="deep-rays"></g>
              <circle r="36" fill="url(#deepSourceGlow)"/>
              <circle r="9" class="deep-source-core"/>
              <circle id="deep-selected-shell" r="100" class="deep-selected-shell"/>
              <g id="deep-shell-packets"></g>
              <g id="deep-detector" transform="translate(100 0)">
                <rect x="-10" y="-26" width="20" height="52" rx="4" class="deep-detector-window"/>
                <line x1="0" y1="-36" x2="0" y2="-62" class="deep-guide-line"/>
                <text x="0" y="-72" text-anchor="middle" class="deep-svg-label">fixed detector area</text>
              </g>
              <line id="deep-radius-line" x1="0" y1="0" x2="100" y2="0" class="deep-radius-line"/>
              <text id="deep-radius-label" x="50" y="-12" text-anchor="middle" class="deep-svg-label">2.00 r</text>
            </g>
            <text x="28" y="38" class="deep-svg-title">Same total emission</text>
            <text x="28" y="63" class="deep-svg-subtitle">Increasing r spreads it over a larger spherical area.</text>
            <text x="540" y="410" class="deep-svg-subtitle">packet spacing increases</text>
          </svg>
        </div>

        <div class="deep-slider-row">
          <div><span>Distance factor</span><b id="deep-distance-value">2.00 r</b></div>
          <input id="deep-distance-slider" type="range" min="1" max="4" step="0.01" value="2"/>
        </div>

        <div class="deep-metric-grid">
          <div><span>Radius factor</span><b id="metric-r">2.00×</b><small>relative to r</small></div>
          <div><span>Area factor</span><b id="metric-area">4.00×</b><small>because area ∝ r²</small></div>
          <div><span>Intensity fraction</span><b id="metric-fraction">1/4</b><small>relative to intensity at r</small></div>
          <div><span>Relative intensity</span><b id="metric-percent">25.0%</b><small>same detector area</small></div>
        </div>

        <div class="deep-intensity-bar"><span id="deep-intensity-fill"></span></div>
        <div class="deep-density-readout"><span>Visual packet spacing around shell</span><b id="deep-spacing-text">4× the area, so only 1/4 the intensity</b></div>
      </div>

      <div class="deep-side-stack">
        <div class="card derivation-card">
          <span class="mini">Derivation</span>
          <h2>Why the square appears</h2>
          <div class="derivation-step active"><i>1</i><div><b>Emission spreads outward</b><p>Imagine a fixed amount of radiation crossing every spherical surface around the source.</p></div></div>
          <div class="derivation-step"><i>2</i><div><b>Sphere area grows as r²</b><p>A sphere has surface area A = 4πr².</p></div></div>
          <div class="derivation-step"><i>3</i><div><b>Same total, larger area</b><p>Doubling r makes the spherical area four times larger.</p></div></div>
          <div class="derivation-step"><i>4</i><div><b>Fixed detector intercepts less</b><p>A detector of unchanged area samples a smaller fraction of the total emission.</p></div></div>
          <div class="derivation-result">I ∝ 1 / r²</div>
        </div>

        <div class="card comparison-table-card">
          <span class="mini">Quick comparison</span>
          <h2>Distance, area and intensity</h2>
          <table class="law-table">
            <thead><tr><th>Distance</th><th>Area factor</th><th>Intensity</th><th>%</th></tr></thead>
            <tbody>
              <tr data-distance="1"><td>r</td><td>1</td><td>1</td><td>100%</td></tr>
              <tr data-distance="2"><td>2r</td><td>4</td><td>1/4</td><td>25%</td></tr>
              <tr data-distance="3"><td>3r</td><td>9</td><td>1/9</td><td>11.1%</td></tr>
              <tr data-distance="4"><td>4r</td><td>16</td><td>1/16</td><td>6.25%</td></tr>
            </tbody>
          </table>
          <small class="table-hint">Click a row to move the visual model to that distance.</small>
        </div>
      </div>
    </div>

    <div class="card graph-explainer-card">
      <div class="card-head"><div><span class="mini">Two different graphs</span><h2>Why plotting against 1/r² is so useful</h2></div></div>
      <div class="graph-pair">
        <div class="mini-graph-panel">
          <h3>Intensity against distance r</h3>
          <svg viewBox="0 0 360 220" class="law-mini-graph">
            <line x1="48" y1="18" x2="48" y2="180" class="deep-axis"/><line x1="48" y1="180" x2="338" y2="180" class="deep-axis"/>
            <path d="M55 30 C75 92, 110 130, 165 152 C220 168, 278 174, 330 176" class="curve-path"/>
            <text x="192" y="211" text-anchor="middle">distance r</text><text x="16" y="105" transform="rotate(-90 16 105)" text-anchor="middle">intensity</text>
          </svg>
          <p>This is a curve. Doubling distance does not halve intensity; it quarters it.</p>
        </div>
        <div class="mini-graph-panel">
          <h3>Intensity against 1/r²</h3>
          <svg viewBox="0 0 360 220" class="law-mini-graph">
            <line x1="48" y1="18" x2="48" y2="180" class="deep-axis"/><line x1="48" y1="180" x2="338" y2="180" class="deep-axis"/>
            <line x1="55" y1="174" x2="330" y2="30" class="straight-path"/>
            <circle cx="88" cy="157" r="5"/><circle cx="145" cy="127" r="5"/><circle cx="220" cy="88" r="5"/><circle cx="300" cy="46" r="5"/>
            <text x="192" y="211" text-anchor="middle">1/r²</text><text x="16" y="105" transform="rotate(-90 16 105)" text-anchor="middle">intensity</text>
          </svg>
          <p>An inverse-square relationship becomes a straight-line relationship when plotted against 1/r².</p>
        </div>
      </div>
    </div>

    <div class="worked-and-practical-grid">
      <div class="card worked-example-card">
        <span class="mini">Worked-example calculator</span>
        <h2>Predict a new count rate</h2>
        <p>For an ideal inverse-square model:</p>
        <div class="worked-equation">I₂ = I₁ × (r₁ / r₂)²</div>
        <div class="worked-input-grid">
          <label>Starting corrected rate / s⁻¹<input id="worked-rate" type="number" min="0" step="1" value="80"/></label>
          <label>Starting distance r₁<input id="worked-r1" type="number" min="0.01" step="0.01" value="0.20"/></label>
          <label>New distance r₂<input id="worked-r2" type="number" min="0.01" step="0.01" value="0.40"/></label>
        </div>
        <div class="worked-result">
          <span>Predicted corrected rate</span>
          <b id="worked-answer">20.0 s⁻¹</b>
          <small id="worked-steps">80.0 × (0.20 / 0.40)² = 20.0</small>
        </div>
        <div class="worked-presets"><button data-example="double">Double distance</button><button data-example="triple">Triple distance</button><button data-example="half">Half distance</button></div>
      </div>

      <div class="card practical-link-card">
        <span class="mini">Link to the virtual practical</span>
        <h2>Why real data will not be perfectly ideal</h2>
        <div class="practical-point"><b>Background</b><span>At larger distances the source contribution becomes smaller, so background correction matters more.</span></div>
        <div class="practical-point"><b>Finite geometry</b><span>The simple law assumes a point-like source and a detector that samples a small area.</span></div>
        <div class="practical-point"><b>Distance definition</b><span>The model depends on the source-to-detector separation used in the calculation, so a consistent reference point matters.</span></div>
        <div class="practical-point"><b>Random counting</b><span>Radioactive detection is statistical, so repeat readings scatter around the ideal trend.</span></div>
        <div class="practical-warning">In the simulator, collect several distances and repeats, correct for background, then test whether corrected rate is linear with 1/r².</div>
      </div>
    </div>

    <div class="card check-card">
      <div class="card-head"><div><span class="mini">Check understanding</span><h2>Can you reason with the law?</h2></div><div class="check-score"><span>Score</span><b id="check-score-value">0/4</b></div></div>
      <div class="check-grid">
        <div class="check-question" data-q="0" data-answer="quarter"><b>1. If distance doubles, what happens to ideal intensity?</b><div><button data-choice="half">It halves</button><button data-choice="quarter">It becomes one quarter</button><button data-choice="same">It stays the same</button></div><p></p></div>
        <div class="check-question" data-q="1" data-answer="nine"><b>2. At 3r, how much larger is the spherical area?</b><div><button data-choice="three">3×</button><button data-choice="six">6×</button><button data-choice="nine">9×</button></div><p></p></div>
        <div class="check-question" data-q="2" data-answer="linear"><b>3. Which plot should be approximately linear?</b><div><button data-choice="r">rate vs r</button><button data-choice="r2">rate vs r²</button><button data-choice="linear">rate vs 1/r²</button></div><p></p></div>
        <div class="check-question" data-q="3" data-answer="geometry"><b>4. Why does intensity decrease with distance in this model?</b><div><button data-choice="source">the source instantly weakens</button><button data-choice="geometry">the same emission spreads over more area</button><button data-choice="detector">the detector shrinks</button></div><p></p></div>
      </div>
    </div>
  `;

  visualHost.insertAdjacentElement('afterend', section);
  wireDeepDive(section);
}

function wireDeepDive(root) {
  const slider = root.querySelector('#deep-distance-slider');
  const selectedShell = root.querySelector('#deep-selected-shell');
  const packetsGroup = root.querySelector('#deep-shell-packets');
  const raysGroup = root.querySelector('#deep-rays');
  const detector = root.querySelector('#deep-detector');
  const radiusLine = root.querySelector('#deep-radius-line');
  const radiusLabel = root.querySelector('#deep-radius-label');
  const fill = root.querySelector('#deep-intensity-fill');

  const SVG_NS = 'http://www.w3.org/2000/svg';
  for (let i = 0; i < 30; i += 1) {
    const angle = (i / 30) * Math.PI * 2;
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', '0'); line.setAttribute('y1', '0');
    line.setAttribute('x2', String(Math.cos(angle) * 200));
    line.setAttribute('y2', String(Math.sin(angle) * 200));
    line.setAttribute('class', 'deep-ray');
    raysGroup.appendChild(line);
  }

  const packetNodes = [];
  for (let i = 0; i < 40; i += 1) {
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('r', '4.2');
    circle.setAttribute('class', 'deep-packet');
    circle.setAttribute('filter', 'url(#deepGlow)');
    packetsGroup.appendChild(circle);
    packetNodes.push(circle);
  }

  function updateShell() {
    const distance = Number(slider.value);
    const area = distance * distance;
    const intensity = 1 / area;
    const radius = 55 + ((distance - 1) / 3) * 135;

    selectedShell.setAttribute('r', radius.toFixed(2));
    detector.setAttribute('transform', `translate(${radius.toFixed(2)} 0)`);
    radiusLine.setAttribute('x2', radius.toFixed(2));
    radiusLabel.setAttribute('x', (radius / 2).toFixed(2));
    radiusLabel.textContent = `${distance.toFixed(2)} r`;

    packetNodes.forEach((node, index) => {
      const angle = (index / packetNodes.length) * Math.PI * 2;
      node.setAttribute('cx', (Math.cos(angle) * radius).toFixed(2));
      node.setAttribute('cy', (Math.sin(angle) * radius).toFixed(2));
    });

    root.querySelector('#deep-distance-value').textContent = `${distance.toFixed(2)} r`;
    root.querySelector('#metric-r').textContent = `${distance.toFixed(2)}×`;
    root.querySelector('#metric-area').textContent = `${area.toFixed(2)}×`;
    root.querySelector('#metric-fraction').textContent = fractionLabel(distance);
    root.querySelector('#metric-percent').textContent = percent(intensity);
    fill.style.width = `${intensity * 100}%`;
    root.querySelector('#deep-spacing-text').textContent = `${area.toFixed(2)}× the area, so ${fractionLabel(distance)} the ideal intensity`;
  }

  slider.addEventListener('input', updateShell);
  root.querySelectorAll('.law-table tbody tr').forEach(row => row.addEventListener('click', () => {
    slider.value = row.dataset.distance;
    updateShell();
  }));
  updateShell();

  const workedRate = root.querySelector('#worked-rate');
  const workedR1 = root.querySelector('#worked-r1');
  const workedR2 = root.querySelector('#worked-r2');
  function updateWorked() {
    const rate = Math.max(0, Number(workedRate.value) || 0);
    const r1 = Math.max(0.0001, Number(workedR1.value) || 0.0001);
    const r2 = Math.max(0.0001, Number(workedR2.value) || 0.0001);
    const answer = rate * (r1 / r2) ** 2;
    root.querySelector('#worked-answer').textContent = `${answer.toFixed(2)} s⁻¹`;
    root.querySelector('#worked-steps').textContent = `${rate.toFixed(1)} × (${r1.toFixed(2)} / ${r2.toFixed(2)})² = ${answer.toFixed(2)}`;
  }
  [workedRate, workedR1, workedR2].forEach(input => input.addEventListener('input', updateWorked));
  root.querySelectorAll('[data-example]').forEach(button => button.addEventListener('click', () => {
    const r1 = Math.max(0.01, Number(workedR1.value) || 0.2);
    if (button.dataset.example === 'double') workedR2.value = (r1 * 2).toFixed(2);
    if (button.dataset.example === 'triple') workedR2.value = (r1 * 3).toFixed(2);
    if (button.dataset.example === 'half') workedR2.value = (r1 / 2).toFixed(2);
    updateWorked();
  }));
  updateWorked();

  const answered = new Map();
  root.querySelectorAll('.check-question button').forEach(button => button.addEventListener('click', () => {
    const question = button.closest('.check-question');
    const correct = button.dataset.choice === question.dataset.answer;
    question.querySelectorAll('button').forEach(item => item.classList.remove('correct', 'wrong'));
    button.classList.add(correct ? 'correct' : 'wrong');
    question.querySelector('p').textContent = correct
      ? 'Correct.'
      : question.dataset.q === '0' ? 'Use 1/(2²): doubling distance gives one quarter.'
      : question.dataset.q === '1' ? 'Area is proportional to r², so 3² = 9.'
      : question.dataset.q === '2' ? 'If rate ∝ 1/r², plotting rate against 1/r² should be approximately linear.'
      : 'The key idea is geometric spreading over a larger spherical area.';
    answered.set(question.dataset.q, correct);
    const score = [...answered.values()].filter(Boolean).length;
    root.querySelector('#check-score-value').textContent = `${score}/4`;
  }));
}

function observe() {
  buildDeepDive();
  const appRoot = document.getElementById('root');
  if (!appRoot) return;
  const observer = new MutationObserver(() => buildDeepDive());
  observer.observe(appRoot, { childList: true, subtree: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observe);
else observe();
