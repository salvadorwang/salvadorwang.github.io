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
  buildSearchIndex();
  renderLegend();
  renderChart();
  renderTable(data.words);
  initSearch();
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

/* ---------- 搜索 ---------- */
const candIndex = new Map();   // 归一化词形 -> {key, point, word}
let kanjiDict = null;          // 汉字 -> 读音干列表（懒加载）
const PAREN_RE = /[（(][^）)]*[）)]/g;
const HAS_KANJI = /[㐀-鿿豈-舘]/;

// 归一化：去空格、小写、片假名转平假名
function norm(s) {
  return s.trim().toLowerCase().replace(/\s+/g, '')
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}
// 促音同化：がくこう -> がっこう
function assimilate(s) {
  return s.replace(/[くちつ](?=[かきくけこさしすせそたちつてとぱぴぷぺぽ])/g, 'っ');
}

function addCand(form, entry) {
  if (!form) return;
  const n = norm(form);
  if (n && !candIndex.has(n)) candIndex.set(n, entry);
}

function buildSearchIndex() {
  for (const key of ['zh', 'ja']) {
    for (const point of series[key]) {
      for (const w of point.words) {
        const entry = { key, point, word: w };
        const raw = w[key];
        addCand(raw, entry);                              // 原始完整形式
        addCand(raw.replace(PAREN_RE, ''), entry);        // 去括号主形式
        const inner = [...raw.matchAll(/[（(]([^）)]*)[）)]/g)];
        for (const m of inner) addCand(m[1], entry);      // 括号内注音形式
        if (key === 'ja' && w.kana) addCand(w.kana, entry);  // 假名读音
      }
    }
  }
}

function lookup(q) {
  return candIndex.get(q) || candIndex.get(assimilate(q)) || null;
}

// 汉字查询 -> 按读音干组合展开成假名候选
function expandKanji(q) {
  let results = [''];
  for (const ch of q) {
    const opts = HAS_KANJI.test(ch) ? (kanjiDict[ch] || [ch]) : [ch];
    const next = [];
    for (const r of results) {
      for (const o of opts) {
        next.push(r + o);
        if (next.length > 4000) return next;
      }
    }
    results = next;
  }
  return results;
}

async function doSearch() {
  const input = document.getElementById('aoa-search');
  const q = norm(input.value.replace(PAREN_RE, ''));
  if (!q) return;

  let hit = lookup(q);
  if (!hit && HAS_KANJI.test(q)) {
    if (!kanjiDict) {
      try { kanjiDict = await (await fetch('data/kanji_readings.json')).json(); }
      catch (e) { kanjiDict = {}; }
    }
    for (const cand of expandKanji(q)) {
      hit = lookup(cand);
      if (hit) break;
    }
  }

  const box = document.getElementById('aoa-detail');
  if (hit) {
    showDetail(hit.key, hit.point, hit.word);
    highlightPoint(hit.key, hit.point);
  } else {
    clearHighlight();
    box.innerHTML = `<p class="aoa-miss">She can't speak this word yet.</p>`;
    box.classList.remove('hidden');
  }
}

function initSearch() {
  document.getElementById('aoa-search-btn').addEventListener('click', doSearch);
  document.getElementById('aoa-search').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
  });
}

/* ---------- 高亮 ---------- */
let highlightEl = null;
function highlightPoint(key, p) {
  clearHighlight();
  const svg = document.getElementById('aoa-chart');
  highlightEl = el('circle', {
    cx: sx(p.ageM), cy: sy(p.count), r: 8, fill: 'none',
    stroke: '#002fa7', 'stroke-width': 2.5
  });
  svg.appendChild(highlightEl);
}
function clearHighlight() {
  if (highlightEl) { highlightEl.remove(); highlightEl = null; }
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
function showDetail(key, p, hlWord) {
  const s = SERIES[key];
  const box = document.getElementById('aoa-detail');
  const items = p.words.map((w) =>
    `<li${w === hlWord ? ' class="hl"' : ''}><b>${w[key]}</b>` +
    `<span class="meaning">${w.meaning || ''}</span>` +
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

function renderTable(words) {
  const rows = words.map((w) =>
    `<tr><td>${w.date}</td><td>${ageLabel(ageMonths(w.date))}</td>` +
    `<td>${w.zh || ''}</td><td>${w.ja || ''}</td>` +
    `<td>${w.meaning || ''}</td><td>${POS_EN[w.pos] || w.pos || ''}</td></tr>`).join('');
  document.getElementById('aoa-table').innerHTML =
    `<table class="cv"><tr><th>Date</th><th>Age</th><th>Chinese</th>` +
    `<th>Japanese</th><th>Meaning</th><th>PoS</th></tr>${rows}</table>`;
}
