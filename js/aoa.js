/* AOA 页面：中/日口语词汇累积增长折线图 + PoS 统计（纯 SVG，无依赖） */

const SERIES = {
  zh: { name: 'Chinese',  color: '#d0342c', marker: 'circle' },
  ja: { name: 'Japanese', color: '#2547d0', marker: 'square' }
};
const POS_EN = {
  'n.': 'Noun', 'v.': 'Verb', 'adj.': 'Adjective', 'adv.': 'Adverb',
  'pron.': 'Pronoun', 'interj.': 'Interjection', 'num.': 'Numeral',
  'ph.': 'Phrase', 'prep.': 'Preposition', 'ptcl.': 'Particle',
  'interrog.': 'Interrogative', 'conj.': 'Conjunction', 'quan.': 'Quantifier'
};
const MPD = 1 / 30.4375;          // months per day
const NS = 'http://www.w3.org/2000/svg';

let birthday = null;
let series = { zh: [], ja: [] };  // 每语言: [{ageM, count, date, words:[...]}]

fetch('data/aoa.json').then((r) => r.json()).then((data) => {
  birthday = new Date(data.birthday + 'T00:00:00');
  buildSeries(data.words);
  renderLegend();
  renderChart();
  renderStats(data.words);
  renderTable(data.words);
}).catch((e) => {
  document.getElementById('aoa-chart').outerHTML =
    '<p>Failed to load data/aoa.json.</p>';
  console.error(e);
});

function ageMonths(dateStr) {
  return (new Date(dateStr + 'T00:00:00') - birthday) / 86400000 * MPD;
}
function ageLabel(m) {
  const y = Math.floor(m / 12), mm = Math.round(m % 12);
  return y > 0 ? `${y}y ${mm}m` : `${mm}m`;
}

function buildSeries(words) {
  for (const key of ['zh', 'ja']) {
    const byDate = new Map();
    for (const w of words) {
      if (!w[key]) continue;
      if (!byDate.has(w.date)) byDate.set(w.date, []);
      byDate.get(w.date).push(w);
    }
    let total = 0;
    series[key] = [...byDate.keys()].sort().map((d) => {
      const ws = byDate.get(d);
      total += ws.length;
      return { date: d, ageM: ageMonths(d), count: total, words: ws };
    });
  }
}

/* ---------- 图表 ---------- */
const W = 900, H = 430, M = { l: 48, r: 120, t: 18, b: 44 };
let sx = null, sy = null;

function el(tag, attrs) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}

function renderChart() {
  const svg = document.getElementById('aoa-chart');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const maxM = Math.ceil(Math.max(...series.zh.concat(series.ja).map((p) => p.ageM))) + 1;
  const maxC = Math.max(series.zh.at(-1).count, series.ja.at(-1).count);
  const maxY = Math.ceil(maxC / 50) * 50;
  sx = (m) => M.l + (m / maxM) * (W - M.l - M.r);
  sy = (c) => H - M.b - (c / maxY) * (H - M.t - M.b);

  // 网格 + 坐标轴刻度
  for (let c = 0; c <= maxY; c += 50) {
    svg.appendChild(el('line', { x1: M.l, x2: W - M.r, y1: sy(c), y2: sy(c),
      stroke: c === 0 ? '#111' : '#ececec', 'stroke-width': 1 }));
    if (c > 0) {
      const t = el('text', { x: M.l - 8, y: sy(c) + 4, 'text-anchor': 'end', class: 'tick' });
      t.textContent = c; svg.appendChild(t);
    }
  }
  for (let m = 0; m <= maxM; m += 3) {
    const t = el('text', { x: sx(m), y: H - M.b + 18, 'text-anchor': 'middle', class: 'tick' });
    t.textContent = m; svg.appendChild(t);
    svg.appendChild(el('line', { x1: sx(m), x2: sx(m), y1: H - M.b, y2: H - M.b + 4,
      stroke: '#111', 'stroke-width': 1 }));
  }
  const xl = el('text', { x: (M.l + W - M.r) / 2, y: H - 6, 'text-anchor': 'middle', class: 'axis-label' });
  xl.textContent = 'AGE (MONTHS)'; svg.appendChild(xl);
  const yl = el('text', { x: 14, y: (M.t + H - M.b) / 2, 'text-anchor': 'middle',
    transform: `rotate(-90 14 ${(M.t + H - M.b) / 2})`, class: 'axis-label' });
  yl.textContent = 'WORDS'; svg.appendChild(yl);

  // 折线 + 数据点 + 末端直接标注
  for (const key of ['zh', 'ja']) {
    const s = SERIES[key], pts = series[key];
    svg.appendChild(el('polyline', {
      points: pts.map((p) => `${sx(p.ageM)},${sy(p.count)}`).join(' '),
      fill: 'none', stroke: s.color, 'stroke-width': 2, 'stroke-linejoin': 'round'
    }));
    for (const p of pts) {
      const x = sx(p.ageM), y = sy(p.count);
      const mark = s.marker === 'circle'
        ? el('circle', { cx: x, cy: y, r: 3, fill: s.color, stroke: '#fff', 'stroke-width': 1 })
        : el('rect', { x: x - 3, y: y - 3, width: 6, height: 6, fill: s.color, stroke: '#fff', 'stroke-width': 1 });
      svg.appendChild(mark);
      // 更大的透明命中区域
      const hit = el('circle', { cx: x, cy: y, r: 9, fill: 'transparent', style: 'cursor:pointer' });
      hit.addEventListener('mouseenter', () => showTooltip(key, p, x, y));
      hit.addEventListener('mouseleave', hideTooltip);
      hit.addEventListener('click', () => showDetail(key, p));
      svg.appendChild(hit);
    }
    const last = pts.at(-1);
    const lbl = el('text', { x: sx(last.ageM) + 10, y: sy(last.count) + 4, class: 'series-label', fill: s.color });
    lbl.textContent = `${s.name} ${last.count}`;
    svg.appendChild(lbl);
  }
}

/* ---------- 悬停提示 ---------- */
function showTooltip(key, p, x, y) {
  const tip = document.getElementById('aoa-tooltip');
  tip.innerHTML = `<b>${SERIES[key].name} · ${p.count} words</b>` +
    `Age ${p.ageM.toFixed(1)} m (${ageLabel(p.ageM)}) · ${p.date}` +
    `<span>+${p.words.length} this day — click for details</span>`;
  tip.classList.remove('hidden');
  const wrap = tip.parentElement.getBoundingClientRect();
  const px = (x / W) * wrap.width, py = (y / H) * wrap.height;
  tip.style.left = Math.min(px + 14, wrap.width - 230) + 'px';
  tip.style.top = Math.max(py - 60, 4) + 'px';
}
function hideTooltip() {
  document.getElementById('aoa-tooltip').classList.add('hidden');
}

/* ---------- 点击详情 ---------- */
function showDetail(key, p) {
  const s = SERIES[key];
  const box = document.getElementById('aoa-detail');
  const items = p.words.map((w) =>
    `<li><b>${w[key]}</b><span class="meaning">${w.meaning || ''}</span>` +
    `<span class="pos">${POS_EN[w.pos] || w.pos || '—'}</span></li>`).join('');
  box.innerHTML =
    `<div class="detail-head" style="border-color:${s.color}">` +
    `<span class="dot" style="background:${s.color}"></span>` +
    `<b>${s.name}</b> · ${p.date} · age ${ageLabel(p.ageM)} · ` +
    `${p.words.length} new word${p.words.length > 1 ? 's' : ''} (total ${p.count})` +
    `<button id="detail-close" aria-label="Close">✕</button></div>` +
    `<ul>${items}</ul>`;
  box.classList.remove('hidden');
  document.getElementById('detail-close').addEventListener('click',
    () => box.classList.add('hidden'));
}

/* ---------- 图例 / 统计面板 / 数据表 ---------- */
function renderLegend() {
  document.getElementById('aoa-legend').innerHTML =
    Object.values(SERIES).map((s) =>
      `<span class="lg"><span class="sw ${s.marker}" style="background:${s.color}"></span>${s.name}</span>`
    ).join('');
}

function renderStats(words) {
  const box = document.getElementById('aoa-stats');
  const totZh = series.zh.at(-1).count, totJa = series.ja.at(-1).count;
  const pos = { zh: {}, ja: {} };
  for (const w of words) {
    for (const key of ['zh', 'ja']) {
      if (!w[key]) continue;
      const p = w.pos || '—';
      pos[key][p] = (pos[key][p] || 0) + 1;
    }
  }
  const bars = (key) => {
    const entries = Object.entries(pos[key]).sort((a, b) => b[1] - a[1]);
    const max = entries[0][1];
    return entries.map(([p, n]) =>
      `<div class="pos-row"><span class="pos-name">${POS_EN[p] || p}</span>` +
      `<span class="pos-bar"><i style="width:${(n / max) * 100}%;background:${SERIES[key].color}"></i></span>` +
      `<span class="pos-num">${n}</span></div>`).join('');
  };
  box.innerHTML =
    `<p class="side-label">Total</p>
     <div class="tot-row"><span class="sw circle" style="background:${SERIES.zh.color}"></span>Chinese<b>${totZh}</b></div>
     <div class="tot-row"><span class="sw square" style="background:${SERIES.ja.color}"></span>Japanese<b>${totJa}</b></div>
     <div class="tot-row total">Total<b>${totZh + totJa}</b></div>
     <p class="side-label">Chinese PoS</p>${bars('zh')}
     <p class="side-label">Japanese PoS</p>${bars('ja')}`;
}

function renderTable(words) {
  const rows = words.map((w) =>
    `<tr><td>${w.date}</td><td>${ageLabel(ageMonths(w.date))}</td>` +
    `<td>${w.zh || ''}</td><td>${w.ja || ''}</td>` +
    `<td>${w.meaning || ''}</td><td>${POS_EN[w.pos] || w.pos || ''}</td></tr>`).join('');
  document.getElementById('aoa-table').innerHTML =
    `<table class="cv"><tr><th>Date</th><th>Age</th><th>Chinese</th>` +
    `<th>Japanese</th><th>Meaning</th><th>PoS</th></tr>${rows}</table>`;
}
