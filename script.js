'use strict';

document.querySelectorAll('[data-copy]').forEach(button => {
  button.addEventListener('click', async () => {
    const text = document.getElementById(button.dataset.copy).textContent;
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = 'Copied';
      document.getElementById('copy-status').textContent = 'BibTeX copied to clipboard.';
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(document.getElementById(button.dataset.copy));
      selection.removeAllRanges();
      selection.addRange(range);
      button.textContent = 'Text selected';
      document.getElementById('copy-status').textContent = 'Citation selected. Press Control+C or Command+C to copy.';
    }
    window.setTimeout(() => { button.textContent = 'Copy BibTeX'; }, 2500);
  });
});

const modal = document.querySelector('#figure-dialog');
if (modal && typeof modal.showModal === 'function') {
  document.querySelectorAll('[data-zoom]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      const image = link.querySelector('img');
      modal.querySelector('img').src = image.src;
      modal.querySelector('img').alt = image.alt;
      modal.showModal();
    });
  });
  modal.querySelector('button').addEventListener('click', () => modal.close());
  modal.addEventListener('click', event => { if (event.target === modal) modal.close(); });
}

const guideStates = [
  {title:'Identify the user', dialogue:'The user requests a flight change. Their identity has not been established.', result:'Ask for the user ID before looking up the reservation.', gate:'MUTATION GATE · CLOSED', node:0},
  {title:'Check the request against policy', dialogue:'The user has been identified and the reservation loaded. Eligibility still needs to be checked.', result:'Check fare eligibility and the requested flight before offering the change.', gate:'MUTATION GATE · CLOSED', node:2},
  {title:'Obtain explicit confirmation', dialogue:'The change is eligible and its details have been presented. The user has not yet confirmed.', result:'Ask the user to confirm the complete change summary before proceeding.', gate:'MUTATION GATE · CLOSED', node:3},
  {title:'Authorize the requested change', dialogue:'Identity, reservation details, eligibility, and explicit confirmation are grounded in the conversation.', result:'Recommend the change with the verified arguments, then check the tool result.', gate:'MUTATION GATE · OPEN', node:4}
];
const guardStates = [
  {title:'A required step is missing', dialogue:'The agent found a flight and proposed booking it. The conversation contains no insurance offer or explicit confirmation.', result:'Offer insurance and ask the user to confirm the complete booking summary before calling the booking tool.', gate:'BLOCK + REMEDIATION'},
  {title:'The prerequisites are satisfied', dialogue:'The conversation establishes the required details, records the insurance decision, and includes explicit confirmation.', result:'The proposed booking may proceed once the verifier finds every applicable policy requirement satisfied.', gate:'PASS'}
];
document.querySelectorAll('[data-demo]').forEach(demo => {
  const states = demo.dataset.demo === 'guide' ? guideStates : guardStates;
  demo.querySelectorAll('[data-state]').forEach(button => {
    button.addEventListener('click', () => {
      const state = states[Number(button.dataset.state)];
      demo.querySelectorAll('[data-state]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      for (const key of ['title', 'dialogue', 'result', 'gate']) demo.querySelector(`[data-output="${key}"]`).textContent = state[key];
      demo.querySelectorAll('[data-node]').forEach(node => {
        const current = Number(node.dataset.node) === state.node;
        node.classList.toggle('active', current);
        if (current) node.setAttribute('aria-current', 'step'); else node.removeAttribute('aria-current');
      });
    });
  });
});

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      document.querySelectorAll('.nav-links a').forEach(link => {
        if (link.hash === '#' + entry.target.id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-15% 0px -60% 0px' });
  document.querySelectorAll('main section[id]').forEach(section => observer.observe(section));
}

(() => {
  'use strict';
  const root = document.querySelector('[data-explorer="policyguide"]');
  if (!root) return;

  // PolicyGuide v1, Table 1, base splits only. Each row is [Pass¹, Pass⁴].
  const data = {
    airline: { name: 'Airline', tasks: 50, values: [[0.640, 0.460], [0.710, 0.580], [0.775, 0.620]], note: 'Airline combines legitimate-mutation and refusal-required tasks. The paper reports a tradeoff against PolicyGuard: better mutation completion, but lower refusal-slice reliability.' },
    retail: { name: 'Retail', tasks: 114, values: [[0.800, 0.596], [0.645, 0.360], [0.809, 0.614]], note: 'The retail Pass⁴ gain over ReAct is 1.8 percentage points and is not statistically significant. The reported overall average should not obscure this small domain-level gain.' },
    telecom: { name: 'Telecom', tasks: 114, values: [[0.384, 0.193], [0.406, 0.202], [0.866, 0.614]], note: 'Telecom requires ordered diagnosis, user-side device actions, and verification. Many of these steps do not trigger an agent-side mutation guard.' }
  };
  const methods = ['ReAct', 'PolicyGuard', 'PolicyGuide'];
  const metrics = { pass1: { index: 0, name: 'Pass¹' }, pass4: { index: 1, name: 'Pass⁴' } };
  let state = { domain: 'telecom', metric: 'pass4' };
  const chart = root.querySelector('[data-guide-chart]');
  const svgNS = 'http://www.w3.org/2000/svg';
  function svgElement(name, attributes, content) {
    const node = document.createElementNS(svgNS, name);
    Object.entries(attributes || {}).forEach(([key, value]) => node.setAttribute(key, String(value)));
    if (content !== undefined) node.textContent = content;
    return node;
  }
  function renderChart(values, label) {
    const width = Math.max(240, Math.min(640, Math.round(chart.getBoundingClientRect().width || 640)));
    const barWidth = width - 24;
    const textSize = width < 420 ? 16 : 21;
    const svg = svgElement('svg', { viewBox: `0 0 ${width} 304`, role: 'img', 'aria-labelledby': 'guide-chart-title guide-chart-description', width: '100%' });
    svg.append(svgElement('title', { id: 'guide-chart-title' }, `${label}: task success by system`));
    svg.append(svgElement('desc', { id: 'guide-chart-description' }, methods.map((method, i) => `${method}: ${values[i].toFixed(3)}`).join('; ') + '. Higher is better. Scale: zero to one.'));
    values.forEach((value, i) => {
      const y = 24 + i * 76;
      svg.append(svgElement('text', { x: 12, y, fill: 'var(--ink)', 'font-size': textSize, 'font-weight': i === 2 ? 700 : 500 }, methods[i]));
      svg.append(svgElement('text', { x: width - 12, y, fill: 'var(--ink)', 'font-size': textSize, 'text-anchor': 'end', 'font-weight': 600 }, value.toFixed(3)));
      svg.append(svgElement('rect', { x: 12, y: y + 12, width: barWidth, height: 23, rx: 4, fill: 'var(--soft)' }));
      svg.append(svgElement('rect', { x: 12, y: y + 12, width: barWidth * value, height: 23, rx: 4, fill: i === 2 ? 'var(--accent)' : '#9ba7b8' }));
    });
    [0, 0.5, 1].forEach(value => {
      const x = 12 + barWidth * value;
      svg.append(svgElement('line', { x1: x, x2: x, y1: 250, y2: 258, stroke: 'var(--muted)' }));
      svg.append(svgElement('text', { x, y: 282, fill: 'var(--muted)', 'font-size': width < 420 ? 14 : 19, 'text-anchor': value === 0 ? 'start' : value === 1 ? 'end' : 'middle' }, value.toFixed(1)));
    });
    chart.replaceChildren(svg);
  }
  function render() {
    const domain = data[state.domain];
    const metric = metrics[state.metric];
    const values = domain.values.map(row => row[metric.index]);
    const delta = (values[2] - values[0]) * 100;
    root.querySelectorAll('[data-guide-domain]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.guideDomain === state.domain)));
    root.querySelectorAll('[data-guide-metric]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.guideMetric === state.metric)));
    const summary = root.querySelector('[data-guide-summary]');
    const headline = document.createElement('strong');
    headline.textContent = `PolicyGuide: +${delta.toFixed(1)} percentage points over ReAct.`;
    const detail = document.createElement('p');
    detail.textContent = `${domain.name} · ${domain.tasks} tasks · ${metric.name}: ${values[0].toFixed(3)} → ${values[2].toFixed(3)}.`;
    summary.replaceChildren(headline, detail);
    root.querySelector('[data-guide-note]').textContent = domain.note;
    renderChart(values, `${domain.name} base split · ${metric.name}`);
  }
  root.querySelectorAll('[data-guide-domain]').forEach(button => button.addEventListener('click', () => { state.domain = button.dataset.guideDomain; render(); }));
  root.querySelectorAll('[data-guide-metric]').forEach(button => button.addEventListener('click', () => { state.metric = button.dataset.guideMetric; render(); }));
  root.querySelector('[data-guide-reset]').addEventListener('click', () => { state = { domain: 'telecom', metric: 'pass4' }; render(); });
  chart.hidden = false;
  render();
  root.querySelectorAll('button').forEach(button => { button.disabled = false; });
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => {
      const domain = data[state.domain];
      const metric = metrics[state.metric];
      renderChart(domain.values.map(row => row[metric.index]), `${domain.name} base split · ${metric.name}`);
    }).observe(chart);
  }
})();
