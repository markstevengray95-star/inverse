import './required-practical.css';

const TAB_ID = 'rp-guide-tab';
const SECTION_ID = 'rp-guide-section';

function createGuide() {
  if (document.getElementById(SECTION_ID)) return;
  const nav = document.querySelector('.main-tabs');
  const shell = document.querySelector('.content-shell');
  if (!nav || !shell) return;

  const button = document.createElement('button');
  button.id = TAB_ID;
  button.textContent = 'Required Practical';
  nav.appendChild(button);

  const section = document.createElement('section');
  section.id = SECTION_ID;
  section.className = 'rp-tab-section';
  section.innerHTML = `
    <div class="rp-hero">
      <div class="card">
        <span class="mini">AQA A-level Physics • Required Practical 12</span>
        <h2>Investigation of the inverse-square law for gamma radiation</h2>
        <p>This guide links the virtual simulator to the practical skills, measurements and analysis students need to understand for the required practical and related written-paper questions.</p>
        <div class="rp-checklist">
          <div class="rp-check">Measure distance consistently from a defined reference point</div>
          <div class="rp-check">Use timed detector counts and a digital scaler</div>
          <div class="rp-check">Measure and subtract background count rate</div>
          <div class="rp-check">Process results using ICT or graphing software</div>
          <div class="rp-check">Calculate 1/r² for each detector position</div>
          <div class="rp-check">Use repeats and uncertainty to judge data quality</div>
        </div>
      </div>
      <div class="card">
        <span class="mini">AQA apparatus & techniques</span>
        <h2>What RP12 develops</h2>
        <div class="rp-badge-stack">
          <div class="rp-badge"><span>ATa</span><b>Length / distance measurement</b></div>
          <div class="rp-badge"><span>ATb</span><b>Digital instruments for time and counts</b></div>
          <div class="rp-badge"><span>ATk</span><b>ICT / software for data processing</b></div>
          <div class="rp-badge"><span>ATl</span><b>Ionising-radiation detection</b></div>
        </div>
      </div>
    </div>

    <div class="rp-grid">
      <div class="card">
        <div class="card-head"><div><span class="mini">Virtual set-up</span><h2>What each part of the apparatus is doing</h2></div><span class="rp-status">simulation model</span></div>
        <div class="rp-setup-map">
          <div class="rp-track"></div>
          <div class="rp-source">Virtual gamma source position</div>
          <div class="rp-detector">GM detector</div>
          <div class="rp-scaler">Digital scaler / counter</div>
          <div class="rp-ruler">Distance scale / ruler</div>
          <div class="rp-computer">Results + graph processing</div>
          <div class="rp-map-note">In the real practical, the radiation source and its controls are managed under the school’s authorised radiation procedures. This app keeps those parts virtual.</div>
        </div>
        <div class="rp-callouts">
          <div class="rp-callout"><i>1</i><div><b>Distance scale</b><span>Used to determine source-to-detector separation. The same reference point must be used for every reading.</span></div></div>
          <div class="rp-callout"><i>2</i><div><b>GM detector</b><span>Detects individual ionising-radiation events. The measured count varies randomly even when conditions are unchanged.</span></div></div>
          <div class="rp-callout"><i>3</i><div><b>Scaler + timing</b><span>Records the number of counts in a known interval so count rate can be calculated.</span></div></div>
          <div class="rp-callout"><i>4</i><div><b>Software / graphing</b><span>Used to calculate corrected rates, 1/r², uncertainties and the best-fit relationship.</span></div></div>
        </div>
      </div>

      <div class="card">
        <span class="mini">Variables</span>
        <h2>What changes, what is measured and what is controlled</h2>
        <div class="rp-table-wrap"><table class="rp-table"><thead><tr><th>Type</th><th>Quantity</th><th>How it is treated</th></tr></thead><tbody>
          <tr><td><b>Independent</b></td><td>Distance r</td><td>Move the detector to a range of measured positions.</td></tr>
          <tr><td><b>Dependent</b></td><td>Corrected count rate</td><td>Measure counts over time, calculate raw rate, then subtract background rate.</td></tr>
          <tr><td><b>Controlled</b></td><td>Detector orientation / geometry</td><td>Keep the apparatus aligned and use the same detector arrangement for all readings.</td></tr>
          <tr><td><b>Controlled</b></td><td>Counting method</td><td>Use consistent timing and record any deliberate changes.</td></tr>
          <tr><td><b>Controlled</b></td><td>Background treatment</td><td>Measure background separately and apply the same correction method.</td></tr>
        </tbody></table></div>
      </div>
    </div>

    <div class="rp-grid">
      <div class="card">
        <span class="mini">Method logic</span>
        <h2>How the virtual required practical should flow</h2>
        <div class="rp-method">
          <div class="rp-step"><b>Establish the background rate</b><p>Take timed background readings first. Repeating them gives a better estimate of the environmental background.</p></div>
          <div class="rp-step"><b>Select a measured detector distance</b><p>Use the rail or drag the GM detector. Record the separation from the same reference point each time.</p></div>
          <div class="rp-step"><b>Collect a timed count</b><p>Record total counts N and the elapsed time t. The random nature of detection means repeated readings will not be identical.</p></div>
          <div class="rp-step"><b>Repeat at the same distance</b><p>Repeats reveal random variation and allow a mean value to be calculated.</p></div>
          <div class="rp-step"><b>Repeat over a suitable range of r</b><p>Use enough distinct positions to reveal the trend rather than relying on only two points.</p></div>
          <div class="rp-step"><b>Process the data</b><p>Calculate raw count rate, background-corrected rate, uncertainty and 1/r².</p></div>
          <div class="rp-step"><b>Test the model graphically</b><p>Plot corrected count rate against 1/r². An approximately straight-line trend supports inverse-square behaviour.</p></div>
        </div>
      </div>

      <div class="card">
        <span class="mini">Core calculations</span>
        <h2>Equations students should be able to use</h2>
        <div class="rp-equations">
          <div class="rp-eq"><span>raw count rate</span><b>R = N / t</b></div>
          <div class="rp-eq"><span>background correction</span><b>Rcorr = Rraw − Rbg</b></div>
          <div class="rp-eq"><span>inverse-square variable</span><b>x = 1 / r²</b></div>
        </div>
        <div class="rp-callouts">
          <div class="rp-callout"><i>σ</i><div><b>Counting uncertainty</b><span>For Poisson-like counting statistics, the uncertainty in N is approximately √N, so longer counts reduce percentage uncertainty.</span></div></div>
          <div class="rp-callout"><i>m</i><div><b>Linear graph</b><span>If corrected rate is proportional to 1/r², plotting corrected rate against 1/r² should give an approximately straight line.</span></div></div>
          <div class="rp-callout"><i>b</i><div><b>Intercept</b><span>A non-zero intercept may indicate imperfect background correction, geometry effects or other systematic influences.</span></div></div>
        </div>
      </div>
    </div>

    <div class="card rp-wide">
      <div class="card-head"><div><span class="mini">AQA skills link</span><h2>What the practical demonstrates</h2></div></div>
      <div class="rp-skill-grid">
        <div class="rp-skill"><b>ATa</b><span>Read and record a range of detector distances accurately and consistently.</span></div>
        <div class="rp-skill"><b>ATb</b><span>Use digital timing/counting information to obtain quantitative results.</span></div>
        <div class="rp-skill"><b>ATk</b><span>Use digital tools or software to process, plot and interpret the data.</span></div>
        <div class="rp-skill"><b>ATl</b><span>Understand the use of an ionising-radiation detector within an authorised practical context.</span></div>
      </div>
      <p class="rp-subtle">AQA states that students’ written papers can assess knowledge and understanding of the required practicals as well as the skills exemplified by them.</p>
    </div>

    <div class="rp-grid">
      <div class="card">
        <span class="mini">Evaluation</span>
        <h2>Common reasons the results are not perfectly ideal</h2>
        <div class="rp-eval-grid">
          <div class="rp-eval"><b>Random counting</b><span>Radioactive events are statistical, so repeat measurements scatter.</span></div>
          <div class="rp-eval"><b>Background contribution</b><span>At large r, source count rate falls and background becomes a larger fraction of the total.</span></div>
          <div class="rp-eval"><b>Distance reference</b><span>An inconsistent source-to-detector reference point introduces a systematic distance error.</span></div>
          <div class="rp-eval"><b>Finite geometry</b><span>The ideal law assumes point-like geometry; real apparatus has finite dimensions.</span></div>
          <div class="rp-eval"><b>Alignment</b><span>Changing the detector orientation or alignment changes the geometry of detection.</span></div>
          <div class="rp-eval"><b>Short count times</b><span>Too few counts produce a larger percentage statistical uncertainty.</span></div>
        </div>
      </div>

      <div class="card rp-warning">
        <span class="mini">Real-lab boundary</span>
        <h2>Keep the source-handling part staff controlled</h2>
        <strong>This simulator is intended to teach the physics and data analysis.</strong>
        <p>In a real school practical, students should follow the school’s authorised radiation procedures and staff instructions. The app deliberately does not provide operational source-handling instructions.</p>
        <p>Students can still learn the required skills here: background correction, distance measurement, counting statistics, uncertainty, repeats, graphing and evaluation.</p>
      </div>
    </div>

    <div class="card rp-wide">
      <span class="mini">Exam preparation</span>
      <h2>Questions students should be ready to answer</h2>
      <div class="rp-exam-grid">
        <div class="rp-q"><b>Why is background measured?</b><p>Because the detector records environmental events as well as source-related events; the background contribution must be removed from the measured rate.</p></div>
        <div class="rp-q"><b>Why use several distances?</b><p>A range of values is needed to establish the form of the relationship and judge whether the transformed graph is linear.</p></div>
        <div class="rp-q"><b>Why take repeats?</b><p>Repeats reveal random scatter and allow a more reliable mean to be calculated.</p></div>
        <div class="rp-q"><b>Why is 1/r² plotted?</b><p>If Rcorr ∝ 1/r², a plot of corrected count rate against 1/r² should be approximately linear.</p></div>
        <div class="rp-q"><b>Why are longer counts often better?</b><p>For random counting, relative statistical uncertainty decreases as the total number of counts increases.</p></div>
        <div class="rp-q"><b>What could a non-zero intercept suggest?</b><p>Possible imperfect background correction or other systematic/geometry effects.</p></div>
      </div>
    </div>
  `;

  shell.appendChild(section);

  function showRequiredPractical() {
    [...shell.children].forEach(child => { if (child !== section) child.style.display = 'none'; });
    section.classList.add('active');
    [...nav.querySelectorAll('button')].forEach(b => b.classList.toggle('active', b === button));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  button.addEventListener('click', showRequiredPractical);

  [...nav.querySelectorAll('button')].forEach(existing => {
    if (existing === button) return;
    existing.addEventListener('click', () => {
      section.classList.remove('active');
      section.style.display = '';
      [...shell.children].forEach(child => {
        if (child !== section && child.style.display === 'none') child.style.display = '';
      });
      button.classList.remove('active');
    });
  });
}

const observer = new MutationObserver(createGuide);
observer.observe(document.documentElement, { childList: true, subtree: true });
createGuide();
