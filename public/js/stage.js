// Presenter view for the 16:9 big screen (facilitator PC). The stage is a fixed 1600×900 canvas scaled to
// fill the screen: the phone runs the prototype on the left, this panel explains what is happening on the right.
// The panel (1110×844) sits on 12 columns of 76 px with 18 px gutters, in four rows: header 88 · 18 · steps 72 ·
// 18 · content 648. Every content screen is a 44 px top line (title left, status right) + 18 + a 586 px body,
// and every block in it spans whole columns (see app.css). Add ?grid=1 to the address to see the lines.
// Six steps: 0 Situation · 1 Choose · 2 Wait · 3 Booked · 4 Quant (rate on phones, online, 5 min) · 5 Qual (A3 +
// post-its, offline, three timed parts). It listens to app events and never drives the simulation itself.
// Copy is English first with Korean as a quieter second line. Facilitator mode: nothing here is saved.

import { S, params, scenario, place, cand, trust, resetPerson } from './state.js';
import { STR, fill } from './i18n.js';
import { esc, icon, mmss } from './util.js';
import { jumpTo, onFacClick, skipSubscribe } from './screens.js';
import { adminAdvance } from './survey.js';
import { go } from './nav.js';

const WIDE = window.matchMedia('(min-width: 1100px)');
const CANVAS = { w: 1600, h: 900 };
const GRID = new URLSearchParams(location.search).get('grid') === '1'; // layout check: column and row lines
const GAP = 18;          // gutter, and the space between blocks
const BODY_H = 586;      // content 648 − top line 44 − 18
const ROW_MAX = 116;     // tallest row of the hub diagram
const COMPACT = 100;     // lower rows drop their middle text line so nothing is cut
const NODE_H = 72;       // You and TrustMyChef nodes
const LINE_H = 24;       // the line between them
const WIRE_W = 112;      // column 4 plus both gutters: from the TrustMyChef node to the restaurant cards
const TILE_H = 88;       // number tiles on Booked
const Q_H = 56;          // question strip (what if)
const QUAL_STEPS = 3;
const TIMER_MIN = { quant: 5, q0: 7, q1: 3, q2: 8 }; // minutes: Quant · Qual write ideas · what if · A3 2×2
const SUBK = { yes: 'subYes', maybe: 'subMaybe', no: 'subNo' };
let route = location.pathname;
let tick = null;
let showResults = false;     // results stay hidden until the facilitator asks for them
let resultsData = null;
let resultsTimer = null;
let resultsKey = null;       // kept in memory only: a reload asks for the key again
const timers = {};           // one countdown per part, so Quant and each Qual part keep their own time
let timerPart = null;        // the part whose timer is on screen

// ------------------------------------------------------------------ bilingual helpers
const raw = (lang, k, v) => {
  const s = STR[lang][k] ?? STR.en[k] ?? k;
  return v ? fill(s, v) : s;
};
const en = (k, v) => raw('en', k, v);
const ko = (k, v) => raw('ko', k, v);
const bi = (k, v) => `${en(k, v)}<span class="ko">${ko(k, v)}</span>`;
const nameEn = (id) => place(id).name.en;
const nameKo = (id) => place(id).name.ko;
const whenKey = () => ({ now: 'whenNowL', 15: 'when15L', 30: 'when30L' }[S.when] || 'whenNowL');

// ------------------------------------------------------------------ 16:9 canvas
function scaleStage() {
  const s = Math.min(window.innerWidth / CANVAS.w, window.innerHeight / CANVAS.h);
  document.documentElement.style.setProperty('--stage-s', String(Math.max(0.5, s)));
}

export function initStage() {
  const el = document.getElementById('side');
  if (!el || params.shot) return;
  // the wide presenter view is the facilitator's PC: skippable, never saved
  S.admin = WIDE.matches;
  scaleStage();
  window.addEventListener('resize', () => { scaleStage(); fit(); });
  document.fonts?.ready.then(fit);
  window.addEventListener('tmc:route', (e) => { route = e.detail || location.pathname; paint(); });
  ['tmc:select', 'tmc:match', 'tmc:fac'].forEach((n) => window.addEventListener(n, paintLive));
  WIDE.addEventListener('change', () => { S.admin = WIDE.matches; scaleStage(); paint(); });
  const onClick = (e) => {
    if (onFacClick(e, () => { paintLive(); toolbar(); })) return;
    const step = e.target.closest('[data-step]');
    if (step) { goStep(Number(step.dataset.step)); return; }
    const q = e.target.closest('[data-qual]');
    if (q) { S.qual = Number(q.dataset.qual); go('/qual'); return; }
    const tm = e.target.closest('[data-timer]');
    if (tm) { timerAction(tm.dataset.timer); return; }
    const a = e.target.closest('[data-admin]');
    if (!a) return;
    const act = a.dataset.admin;
    if (act === 'next') adminNext();
    if (act === 'restart') { skipSubscribe(); resetPerson(); go('/'); }
    if (act === 'results') { showResults = !showResults; if (showResults) loadResults(); else stopResults(); paintLive(); toolbar(); }
    if (act === 'menu') document.getElementById('pv-menu')?.toggleAttribute('hidden');
  };
  el.addEventListener('click', onClick);
  el.addEventListener('submit', (e) => {
    if (!e.target.matches('#pv-keyform')) return;
    e.preventDefault();
    resultsKey = e.target.querySelector('input').value.trim() || null;
    loadResults();
  });
  // small toolbar in the canvas' bottom margin (under the panel), so it never covers the screen
  const bar = document.createElement('div');
  bar.id = 'pv-toolbar';
  (document.querySelector('.stage') || document.body).appendChild(bar);
  bar.addEventListener('click', onClick);
  paint();
}

function toolbar() {
  const bar = document.getElementById('pv-toolbar');
  if (!bar) return;
  if (!WIDE.matches) { bar.innerHTML = ''; return; }
  const menu = document.getElementById('pv-menu');
  const open = menu ? !menu.hasAttribute('hidden') : false;
  bar.innerHTML = `
    <div class="tb-pill">
      <button class="tb-btn strong" data-admin="next" title="${esc(en('pvNext'))}">${en('pvNext')} ${icon('right', 'sm')}</button>
      <button class="tb-btn" data-admin="restart" title="${esc(en('pvRestart'))}">${icon('refresh', 'sm')}</button>
      <button class="tb-btn ${showResults ? 'on' : ''}" data-admin="results">${icon('chef', 'sm')}${showResults ? en('tbHide') : en('tbResults')}</button>
      <a class="tb-btn" href="/results/" target="_blank" rel="noopener" title="${esc(ko('tbResultsPage'))}">${en('tbResultsPage')} ${icon('ext', 'xs')}</a>
      <button class="tb-btn" data-admin="menu" title="${esc(en('facOpen'))}">${icon('sliders', 'sm')}</button>
      <span class="tb-tag" title="${esc(ko('pvAdmin'))}">${icon('lock', 'xs')}${en('pvAdmin')}</span>
    </div>
    <div class="tb-menu" id="pv-menu" ${open ? '' : 'hidden'}>${menuHtml()}</div>`;
}

function menuHtml() {
  const outcomes = [['normal', 'facNormal', 'facNormalD'], ['bad', 'facBad', 'facBadD'], ['none', 'facNone', 'facNoneD']];
  const opts = outcomes.map(([v, a, b]) => `<button data-fac="outcome" data-v="${v}" data-label="${esc(en(a))}" aria-pressed="${S.fac.outcome === v}">${en(a)}<small>${en(b)}</small><small class="ko">${ko(a)} · ${ko(b)}</small></button>`).join('');
  const speed = `<div class="seg-ctl">${[['normal', 'facSpeedN'], ['fast', 'facSpeedF']].map(([v, l]) => `<button data-fac="speed" data-v="${v}" data-label="${esc(en(l))}" aria-pressed="${S.fac.speed === v}">${en(l)} · ${ko(l)}</button>`).join('')}</div>`;
  const agenda = ['ag1', 'ag2', 'ag3', 'ag4', 'ag5'].map((k, i) => `<li><span class="tm">${i + 1}</span><span>${en(k)}<small class="ko">${ko(k)}</small></span></li>`).join('');
  return `
    <div class="tb-grid">
      <div><h3>${bi('sideWhatIf')}</h3><div class="fac-opts">${opts}</div><h3>${bi('facSpeed')}</h3>${speed}</div>
      <div><h3>${bi('sideAgenda')}</h3><ol class="agenda">${agenda}</ol>
        <h3>${bi('sideLinks')}</h3><div class="side-links"><a href="/rate">${en('linkRate')} →</a><a href="/results/" target="_blank" rel="noopener">${en('linkResults')} →</a><a href="/board/" target="_blank" rel="noopener">${en('linkBoard')} →</a></div></div>
    </div>`;
}

// ------------------------------------------------------------------ navigation
function stepIndex() {
  return { '/': 0, '/choose': 1, '/wait': 2, '/booked': 3, '/rate': 4, '/thanks': 4, '/qual': 5 }[route] ?? 0;
}
function goStep(i) {
  skipSubscribe();
  if (i === 0) { resetPerson(); go('/'); }
  else if (i === 1) jumpTo('choose');
  else if (i === 2) jumpTo('wait');
  else if (i === 3) jumpTo('booked');
  else if (i === 4) go('/rate');
  else { S.qual = 0; go('/qual'); }
}
// facilitator "Next screen": walks the whole flow without answers (nothing is recorded in facilitator mode)
function adminNext() {
  if (S.subSheet) { skipSubscribe(); return; }
  const p = location.pathname;
  if (document.querySelector('[data-screen="thanks"]')) { S.qual = 0; go('/qual'); return; }
  if (p === '/') jumpTo('choose');
  else if (p === '/choose') jumpTo('wait');
  else if (p === '/wait') jumpTo('booked');
  else if (p === '/booked') go('/rate');
  else if (p === '/rate') adminAdvance();
  else if (p === '/qual' && (S.qual || 0) < QUAL_STEPS - 1) { S.qual = (S.qual || 0) + 1; go('/qual'); }
  else { resetPerson(); go('/'); }
}

// ------------------------------------------------------------------ frame
function stepsHtml() {
  const now = stepIndex();
  const keys = ['pvStep0', 'step1', 'step2', 'step3', 'stepQuant', 'stepQual'];
  return keys.map((k, i) => `<li><button class="${i < now ? 'done' : i === now ? 'now' : ''}" data-step="${i}"><span class="n">${i}</span><span class="l">${en(k)}<small class="ko">${ko(k)}</small></span></button></li>`).join('');
}

// ?grid=1: the 12 columns and the row lines on top of the panel
function gridHtml() {
  if (!GRID) return '';
  const rows = [88, 106, 178, 196, 240, 258, 844].map((y) => `<b style="top:${y}px"></b>`).join('');
  return `<div class="pv-grid" aria-hidden="true">${'<i></i>'.repeat(12)}${rows}</div>`;
}

function paint() {
  const el = document.getElementById('side');
  if (!el) return;
  if (!WIDE.matches) { el.innerHTML = ''; clearInterval(tick); toolbar(); return; }
  el.innerHTML = `
    <div class="pv">
      <header class="pv-head">
        <div class="pv-brand"><span class="brand-mark">${icon('chef')}</span><div><b>TrustMyChef</b><span class="pv-title">${en('pvTitle')}<span class="ko">${ko('pvTitle')}</span></span></div></div>
        <div class="pv-qr"><div><b>${esc(location.host)}</b><small>${en('pvScan')}<span class="ko-inline">${ko('pvScan')}</span></small></div><div class="qr" id="qr"></div></div>
      </header>
      <ol class="pv-steps">${stepsHtml()}</ol>
      <section class="pv-main" id="pv-main"><div class="pv-fit" id="pv-fit">${diagram()}</div></section>
      ${gridHtml()}
    </div>`;
  toolbar();
  makeQR('qr', location.origin + '/');
  afterRender();
}

function paintLive() {
  if (!WIDE.matches) return;
  const box = document.getElementById('pv-fit');
  if (!box) return paint();
  box.innerHTML = diagram();
  afterRender();
}

function afterRender() {
  makeQR('qr-big', location.origin + '/');
  fit();
  setTimeout(fit, 250); // images and the QR can change the height right after rendering
  startTick();
}

function makeQR(id, text) {
  const qrEl = document.getElementById(id);
  if (!qrEl || qrEl.childElementCount || !window.QRCode) return;
  try { new window.QRCode(qrEl, { text, width: 360, height: 360, correctLevel: window.QRCode.CorrectLevel.M }); } catch { /* ignore */ }
}

// safety net only: every screen is laid out to fit 648 px at zoom 1
function fit() {
  const main = document.getElementById('pv-main');
  const box = document.getElementById('pv-fit');
  if (!main || !box) return;
  box.style.zoom = '1';
  const avail = main.clientHeight;
  const need = box.scrollHeight; // reading it here forces layout at zoom 1
  box.style.zoom = String(need > avail ? Math.max(0.6, (avail - 2) / need) : 1);
}

function startTick() {
  clearInterval(tick);
  const st = S.match?.state;
  if (route !== '/wait' || !st || st.result) return;
  tick = setInterval(() => {
    const el = document.getElementById('pv-elapsed');
    if (el && S.match) el.textContent = mmss(S.match.state.endedAt ?? S.match.elapsed());
    if (!S.match || S.match.state.result) clearInterval(tick);
  }, 500);
}

// ------------------------------------------------------------------ building blocks
// top line: title on the left (English + Korean), status on the right
function top(titleHtml, right = '') {
  return `<div class="pv-top"><h2 class="pv-h">${titleHtml}</h2><div class="pv-top-r">${right}</div></div>`;
}
function question(icn, enHtml, koText) {
  return `<div class="pv-q s12">${icon(icn)}<p>${enHtml}<span class="ko">${esc(koText)}</span></p></div>`;
}

// ------------------------------------------------------------------ diagrams
function diagram() {
  if (showResults) return dResults();
  if (route === '/choose') return dChoose();
  if (route === '/wait') return dWait();
  if (route === '/booked') return dBooked();
  if (route === '/rate' || route === '/thanks') return dQuant();
  if (route === '/qual') return dQual();
  return dIntro();
}

function dIntro() {
  const sc = scenario();
  const s2en = fill(STR.en.pvS2, { target: nameEn(sc.target) });
  const s2ko = fill(STR.ko.pvS2, { target: nameKo(sc.target) });
  const scene = (ic, red, b, k, small) => `<div class="pv-scene s4"><span class="pv-ic ${red ? 'r' : ''}">${icon(ic)}</span><div><b>${b}</b><span class="ko">${k}</span><small>${small}</small></div></div>`;
  return `
    ${top(bi('pvIntroTitle'))}
    <div class="pv-body">
      <div class="g12">
        ${scene('heart', true, en('pvS1'), ko('pvS1'), en('pvS1d'))}
        ${scene('ban', true, esc(s2en), esc(s2ko), en('pvS2d', { wait: sc.waitMin }))}
        ${scene('walk', false, en('pvS3'), ko('pvS3'), en('pvS3d'))}
      </div>
      <div class="pv-idea"><span class="brand-mark">${icon('chef')}</span><p>${bi('pvSolution')}</p></div>
      ${hub(sampleRows(), { avail: BODY_H - 120 - GAP - 64 - GAP })}
    </div>`;
}

// the idea as a picture: three recommended places nearby, the first one says Yes
function sampleRows() {
  const ids = scenario().candidates.filter((c) => !trust(place(c.id)).listingOnly).slice(0, 3);
  const states = ['yes', 'no', 'cancelled'];
  return ids.map((c, i) => ({ id: c.id, channel: i === 1 ? 'call' : 'dm', walkMin: c.walkMin, status: states[i] }));
}

function dChoose() {
  const rows = [...S.selected].map(([id, channel]) => ({ id, channel, walkMin: cand(id).walkMin, status: 'plan' }));
  const n = rows.length;
  const right = n ? `<span class="pv-chip w3"><span>${en('pvPicked', { n })}<span class="ko">${ko('pvPicked', { n })}</span></span></span>` : '';
  const body = n
    ? hub(rows, { owner: false, side: passCard() })
    : `<div class="g12 pv-empty-row"><div class="pv-empty s8">${icon('utensils', 'lg')}<p>${bi('pvPlanEmpty')}</p></div><aside class="s4">${passCard()}</aside></div>`;
  return `${top(bi('pvChooseTitle'), right)}<div class="pv-body">${body}</div>`;
}

// Choose: what the Pass is, as information only (the question comes after booking)
function passCard() {
  return `<div class="pv-pass">
    <span class="pass-tag">${icon('star', 'xs')}${en('pvPassT')}</span>
    <p class="pv-price"><b>${en('subPrice')}</b><span>${en('pvPerMonth')}</span></p>
    <ul>
      <li>${icon('check', 'sm')}<span>${en('pvPassSend')}<span class="ko">${ko('pvPassSend')}</span></span></li>
      <li class="free">${icon('pin', 'sm')}<span>${en('pvPassFree')}<span class="ko">${ko('pvPassFree')}</span></span></li>
    </ul>
  </div>`;
}

function dWait() {
  const st = S.match?.state;
  if (!st) return dChoose();
  let q = '';
  if (st.result === 'none') q = question('alert', `<b>${en('noneTitle')}.</b> ${en('pvNoneQ')}`, `${ko('noneTitle')}. ${ko('pvNoneQ')}`);
  else if (st.result === 'booked' && trust(place(st.winner)).listingOnly) q = question('alert', en('pvBadQ'), ko('pvBadQ'));
  const right = `<span class="pv-chip w4 ok">${icon('check', 'sm')}<span>${en('pvRule')}<span class="ko">${ko('pvRule')}</span></span></span><span class="pv-chip w4 sim"><span>${en('pvSim')}<span class="ko">${ko('pvSim')}</span></span></span>`;
  return `${top(bi('pvWaitTitle'), right)}
    <div class="pv-body">${hub(st.reqs, { st, avail: BODY_H - (q ? Q_H + GAP : 0) })}${q}</div>`;
}

function dBooked() {
  const st = S.match?.state;
  if (!st || st.result !== 'booked') return dIntro();
  const cancelled = st.reqs.filter((r) => r.status === 'cancelled').length;
  const q = trust(place(st.winner)).listingOnly ? question('alert', en('pvBadQ'), ko('pvBadQ')) : '';
  const tile = (k, v) => `<div class="pv-tile s4"><small>${en(k)}<span class="ko-inline">${ko(k)}</span></small><b>${v}</b></div>`;
  return `${top(bi('pvBookedTitle'), subChip())}
    <div class="pv-body">
      <div class="g12">${tile('pvSent', st.reqs.length)}${tile('pvTime', `${Math.max(1, Math.floor(st.winAt || 7))}s`)}${tile('pvCancelled', cancelled)}</div>
      ${hub(st.reqs, { st, avail: BODY_H - TILE_H - GAP - (q ? Q_H + GAP : 0) })}
      ${q}
    </div>`;
}

// Booked: the subscribe question pops up on the phone 1.4 s after the booking; highlighted while it is open,
// then the answer (the last answer counts)
function subChip() {
  const price = `${en('subPrice')} ${en('pvPerMonth')}`;
  if (S.subSheet) return `<span class="pv-chip w4 pay on">${icon('star', 'sm')}<span>${en('pvSubAsk')} · ${price}<span class="ko">${ko('pvSubAsk')}</span></span></span>`;
  const v = S.flow.subPost;
  if (v) return `<span class="pv-chip w4 pay ${v}">${icon(v === 'yes' ? 'check' : 'star', 'sm')}<span>${en('pvSubAfterL')}: <b>${en(SUBK[v])}</b><span class="ko">${ko('pvSubAfterL')}: ${ko(SUBK[v])}</span></span></span>`;
  return `<span class="pv-chip w4 pay">${icon('star', 'sm')}<span>${en('pvPassT')} · ${price}<span class="ko">${ko('pvPassT')}</span></span></span>`;
}

// step 4 · Quant: everyone does this on their own phone (online)
function dQuant() {
  const li = (n, k) => `<li><span>${n}</span><p>${bi(k)}</p></li>`;
  return `${top(bi('pvQuantTitle'), timerHtml('quant'))}
    <div class="pv-body g12">
      <div class="pv-qr-col s4">
        <div class="pv-bigqr"><div class="qr" id="qr-big"></div></div>
        <b class="pv-host">${esc(location.host)}</b>
        <ol class="pv-numbered">${li(1, 'pvQuant1')}${li(2, 'pvQuant2')}${li(3, 'pvQuant3')}</ol>
      </div>
      ${quad('qConv', 'qPay', ['qMP', 'qNP', 'qMF', 'qNN'], 's8')}
    </div>`;
}

// step 5 · Qual: offline on A3 paper with post-its, in three timed parts. The workshop's 3M pack has five
// colours, one per prompt: Choose yellow, Wait blue, Booked green, what if 1 orange, what if 2 pink.
const PART_COLORS = [['yellow', 'blue', 'green'], ['orange', 'pink'], ['yellow', 'pink', 'blue', 'green', 'orange']];
function dQual() {
  const q = Math.min(S.qual || 0, QUAL_STEPS - 1);
  const parts = ['qual1t', 'qual2t', 'qual3t'];
  const sw = (cs) => `<span class="sw">${cs.map((c) => `<i class="pi-${c}"></i>`).join('')}</span>`;
  const chips = parts.map((k, i) => `<button class="s4 ${i < q ? 'done' : i === q ? 'now' : ''}" data-qual="${i}"><span class="n">${i + 1}</span><span class="l">${en(k)}<small class="ko">${ko(k)}</small></span>${sw(PART_COLORS[i])}<span class="min">${en('pvMin', { n: TIMER_MIN[`q${i}`] })}</span></button>`).join('');
  let body = '';
  if (q === 0) {
    const feats = [['step1', 'choose'], ['step2', 'wait'], ['step3', 'booked']];
    body = feats.map(([k, shot], i) => `<figure class="pv-shot s4"><figcaption><span class="pi pi-${PART_COLORS[0][i]}">${i + 1}</span><span>${bi(k)}</span></figcaption>${phone(shot)}</figure>`).join('');
  } else if (q === 1) {
    const qs = [['alert', 'qual2a', 'bad'], ['ban', 'qual2b', 'none']];
    body = qs.map(([ic, k, shot], i) => `<figure class="pv-whatif s6"><figcaption><span class="pi big pi-${PART_COLORS[1][i]}">${icon(ic)}</span><b>${en(k)}</b><span class="ko">${ko(k)}</span></figcaption>${phone(shot)}</figure>`).join('');
  } else {
    body = quad('qual3x', 'qual3y', ['qpMP', 'qpNP', 'qpMF', 'qpNN'], 's12');
  }
  return `${top(bi(['pvQual1', 'qual2p', 'qual3p'][q]), timerHtml(`q${q}`))}
    <div class="pv-body">
      <div class="g12 pv-qual-steps">${chips}</div>
      <div class="g12 pv-qual-body">${body}</div>
    </div>`;
}

// the real app screen in a small phone frame (always the current UI)
function phone(name) {
  return `<div class="pv-phone"><iframe src="/?shot=${name}&lang=en&at=${S.scenarioId}" title="${esc(name)}" tabindex="-1" aria-hidden="true"></iframe></div>`;
}

// one 2×2: the two axes run along the 18 px cross between the cells, with their names at the ends
function quad(x, y, names, cls) {
  const cell = (k, c) => `<div class="${c}"><b>${en(k)}</b><span class="ko">${ko(k)}</span></div>`;
  return `<div class="pv-quad ${cls}">
    ${cell(names[1], 'np')}${cell(names[0], 'mp')}${cell(names[3], 'nn')}${cell(names[2], 'mf')}
    <i class="ax x" aria-hidden="true"></i><i class="ax y" aria-hidden="true"></i>
    <span class="ax-l x">${en(x)} →<span class="ko-inline">${ko(x)}</span></span>
    <span class="ax-l y">↑ ${en(y)}<span class="ko-inline">${ko(y)}</span></span>
  </div>`;
}

// ------------------------------------------------------------------ timer (one line, top right)
function timerOf(part) {
  if (!timers[part]) timers[part] = { left: TIMER_MIN[part] * 60, running: false, id: null };
  return timers[part];
}
function timerHtml(part) {
  timerPart = part;
  const tm = timerOf(part);
  const up = tm.left <= 0;
  return `<div class="pv-timer ${tm.running ? 'run' : ''} ${up ? 'up' : ''}" id="pv-timer-box">
    <output id="pv-timer">${up ? en('timerUp') : mmss(tm.left)}</output>
    <button data-timer="minus" aria-label="−1 min">−1</button>
    <button class="go" data-timer="toggle">${tm.running ? en('timerPause') : en('timerStart')}</button>
    <button data-timer="plus" aria-label="+1 min">+1</button>
    <button data-timer="reset" aria-label="${esc(en('timerReset'))}">${icon('refresh', 'xs')}</button>
  </div>`;
}
function repaintTimer() {
  const box = document.getElementById('pv-timer-box');
  if (box && timerPart) box.outerHTML = timerHtml(timerPart);
}
function timerAction(act) {
  const part = timerPart;
  if (!part) return;
  const tm = timerOf(part);
  if (act === 'toggle') {
    if (!tm.running && tm.left <= 0) tm.left = TIMER_MIN[part] * 60;
    tm.running = !tm.running;
    clearInterval(tm.id);
    if (tm.running) {
      tm.id = setInterval(() => {
        tm.left = Math.max(0, tm.left - 1);
        if (tm.left === 0) { clearInterval(tm.id); tm.running = false; }
        if (timerPart !== part) return;
        const out = document.getElementById('pv-timer');
        if (tm.left === 0) repaintTimer();
        else if (out) out.textContent = mmss(tm.left);
      }, 1000);
    }
  }
  if (act === 'plus') tm.left += 60;
  if (act === 'minus') tm.left = Math.max(0, tm.left - 60);
  if (act === 'reset') { clearInterval(tm.id); tm.running = false; tm.left = TIMER_MIN[part] * 60; }
  repaintTimer();
}

// ------------------------------------------------------------------ results (hidden until asked)
async function loadResults() {
  if (!resultsKey) { resultsData = { needKey: true }; paintLive(); return; }
  try {
    const res = await fetch('/api/responses', { headers: { authorization: `Bearer ${resultsKey}` }, cache: 'no-store' });
    if (res.status === 401) { resultsKey = null; resultsData = { needKey: true, bad: true }; paintLive(); return; }
    resultsData = { rows: (await res.json()).rows || [], at: new Date() };
  } catch {
    resultsData = resultsData?.rows ? resultsData : { rows: [] };
  }
  if (showResults) paintLive();
  clearTimeout(resultsTimer);
  if (showResults) resultsTimer = setTimeout(loadResults, 8000);
}
function stopResults() { clearTimeout(resultsTimer); }

function dResults() {
  const d = resultsData;
  if (!d) return `${top(bi('tbResults'))}<div class="pv-body"></div>`;
  const fullPage = (cls) => `<a class="pv-chip ${cls}" href="/results/" target="_blank" rel="noopener">${icon('ext', 'sm')}<span>${en('pvOpenResults')}<span class="ko">${ko('pvOpenResults')}</span></span></a>`;
  if (d.needKey) {
    return `${top(bi('tbResults'), fullPage('w4'))}
      <div class="pv-body"><form class="pv-keyform" id="pv-keyform"><label>${icon('lock', 'sm')}${en('tbKey')} <span class="ko-inline">${ko('tbKey')}</span></label>
        <input class="input" type="password" autocomplete="off"><button class="btn btn-primary">${en('tbKeyOpen')}</button>
        ${d.bad ? `<p class="err">${en('tbKeyBad')}</p>` : ''}</form></div>`;
  }
  const rows = d.rows || [];
  const items = ['s1', 's2', 's3', 's4'];
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const means = items.map((k, i) => {
    const pts = rows.map((r) => r.ratings?.[k]).filter((p) => p && p.x != null && p.y != null);
    return { label: String(i + 1), x: avg(pts.map((p) => p.x)), y: avg(pts.map((p) => p.y)), n: pts.length };
  }).filter((m) => m.n);
  const dots = rows.flatMap((r) => items.map((k) => r.ratings?.[k]).filter((p) => p && p.x != null && p.y != null));
  const asked = rows.filter((r) => r.flow?.subPost);
  const yes = asked.length ? `${Math.round((asked.filter((r) => r.flow.subPost === 'yes').length / asked.length) * 100)}%` : '–';
  const names = ['s1t', 's2t', 's3t', 's4t'];
  const at = d.at ? d.at.toTimeString().slice(0, 8) : '';
  return `${top(bi('tbResults'), `<span class="pv-chip w3">${en('resUpdated')} ${at}</span>${fullPage('w4')}`)}
    <div class="pv-body g12">
      <div class="pv-res-chart s6">${resChart(means, dots)}</div>
      <div class="pv-res-side s6">
        <div class="pv-tile"><small>${en('resN')}<span class="ko-inline">${ko('resN')}</span></small><b>${rows.length}</b></div>
        <div class="pv-tile"><small>${en('resSubAfter')}<span class="ko-inline">${ko('resSubAfter')}</span></small><b>${yes}</b></div>
        <ol class="pv-res-legend">${names.map((k) => `<li>${en(k)}</li>`).join('')}</ol>
        ${rows.length ? '' : `<p class="pv-res-empty">${en('resEmpty')}</p>`}
      </div>
    </div>`;
}

function resChart(means, dots) {
  const W = 520, pad = 44, inner = W - pad - 16;
  const X = (v) => pad + ((v - 0.5) / 10) * inner;
  const Y = (v) => 16 + inner - ((v - 0.5) / 10) * inner;
  const mid = pad + inner / 2, midY = 16 + inner / 2;
  let g = `<svg viewBox="0 0 ${W} ${W}" xmlns="http://www.w3.org/2000/svg" font-family="Pretendard Variable, sans-serif">`;
  g += `<rect x="${pad}" y="16" width="${inner}" height="${inner}" fill="#fff" stroke="#DCD6CE"/><rect x="${mid}" y="16" width="${inner / 2}" height="${inner / 2}" fill="#FFF1EA"/>`;
  g += `<line x1="${mid}" y1="16" x2="${mid}" y2="${16 + inner}" stroke="#A39B93" stroke-dasharray="5 5"/><line x1="${pad}" y1="${midY}" x2="${pad + inner}" y2="${midY}" stroke="#A39B93" stroke-dasharray="5 5"/>`;
  const lab = (x, y, k, anchor, c) => `<text x="${x}" y="${y}" font-size="20" font-weight="800" fill="${c}" text-anchor="${anchor}">${esc(en(k))}</text>`;
  g += lab(pad + inner - 10, 44, 'qMP', 'end', '#CC4410') + lab(pad + 10, 44, 'qNP', 'start', '#6A44B8') + lab(pad + inner - 10, 16 + inner - 14, 'qMF', 'end', '#067A55') + lab(pad + 10, 16 + inner - 14, 'qNN', 'start', '#8A827B');
  g += `<text x="${pad + inner / 2}" y="${W - 2}" font-size="18" font-weight="800" fill="#3D3935" text-anchor="middle">${esc(en('qConv'))} →</text>`;
  g += `<text x="16" y="${16 + inner / 2}" font-size="18" font-weight="800" fill="#3D3935" text-anchor="middle" transform="rotate(-90 16 ${16 + inner / 2})">${esc(en('qPay'))} →</text>`;
  dots.forEach((p, i) => { g += `<circle cx="${X(p.x) + ((i * 37) % 9) - 4}" cy="${Y(p.y) + ((i * 53) % 9) - 4}" r="5" fill="#6F6862" fill-opacity=".35"/>`; });
  // items with the same average would hide each other: nudge later ones sideways
  const placed = [];
  means.forEach((m) => {
    let cx = X(m.x);
    const cy = Y(m.y);
    while (placed.some((p) => Math.abs(p.x - cx) < 30 && Math.abs(p.y - cy) < 30)) cx += 34;
    placed.push({ x: cx, y: cy });
    g += `<g><circle cx="${cx}" cy="${cy}" r="24" fill="#CC4410" stroke="#fff" stroke-width="3"/><text x="${cx}" y="${cy + 7}" font-size="21" font-weight="800" fill="#fff" text-anchor="middle">${m.label}</text></g>`;
  });
  return g + '</svg>';
}

// ------------------------------------------------------------------ hub & spoke
// You and TrustMyChef on columns 1–3, the wires across column 4, the restaurant cards on 5–8 and what each
// owner sees on 9–12 (or a side card there). Rows shrink with the number of places (up to 5).
const WIRE = { plan: 'w-plan', sending: 'w-live', sent: 'w-live', seen: 'w-live', typing: 'w-live', calling: 'w-live', ringing: 'w-live', oncall: 'w-live', yes: 'w-yes', no: 'w-no', noanswer: 'w-off', cancelled: 'w-off' };
const PILL = {
  plan: ['wait', 'pvNotSent'], sending: ['wait', 'stSending'], sent: ['wait', 'stSent'], seen: ['wait', 'stSeen'], typing: ['live', 'stTyping'],
  calling: ['live', 'stCalling'], ringing: ['live', 'stRinging'], oncall: ['live', 'stOnCall'], yes: ['yes', 'stYes'], no: ['no', 'stNo'],
  noanswer: ['off', 'stNoAnswer'], cancelled: ['off', 'stCancelled'],
};

function hub(rows, { st, owner = true, avail = BODY_H, side = '' } = {}) {
  const n = rows.length;
  const rowH = Math.min(ROW_MAX, Math.floor((avail - (n - 1) * GAP) / n));
  const H = n * rowH + (n - 1) * GAP;
  const hubH = Math.max(H, 2 * (NODE_H + LINE_H) + NODE_H); // TrustMyChef sits in the middle, You above it
  const y0 = (hubH - H) / 2;
  const mid = hubH / 2;
  const wires = rows.map((r, i) => {
    const y = y0 + i * (rowH + GAP) + rowH / 2;
    return `<path class="${WIRE[r.status] || 'w-plan'}" d="M0,${mid} C${WIRE_W / 2},${mid} ${WIRE_W / 2},${y} ${WIRE_W},${y}"/>`;
  }).join('');
  const elapsed = st ? mmss(st.endedAt ?? S.match?.elapsed?.() ?? 0) : '';
  return `
    <div class="hub ${owner ? '' : 'no-owner'} ${rowH < COMPACT ? 'compact' : ''}" style="height:${hubH}px;--row:${rowH}px">
      <div class="hub-left">
        <div class="node-you"><span class="ava">${icon('users')}</span><div><b>${en('pvYou')} <span class="ko-inline">${ko('pvYou')}</span></b><small>${en('pvYouLine', { n: S.party, when: en(whenKey()) })}</small></div></div>
        <i class="hub-v"></i>
        <div class="node-hub"><span class="brand-mark">${icon('chef')}</span><div><b>TrustMyChef</b><small>${st ? `<span id="pv-elapsed">${elapsed}</span>` : en('pvHubLine')}</small></div></div>
      </div>
      <svg class="hub-wires" viewBox="0 0 ${WIRE_W} ${hubH}" width="${WIRE_W}" height="${hubH}" aria-hidden="true">${wires}</svg>
      <ol class="hub-right">${rows.map((r) => nodeHtml(r, st, owner)).join('')}</ol>
      ${side ? `<aside class="hub-side">${side}</aside>` : ''}
    </div>`;
}

function nodeHtml(r, st, owner = true) {
  const p = place(r.id);
  const [cls, key] = PILL[r.status] || PILL.plan;
  const win = st && st.winner === r.id;
  const tr = trust(p);
  return `<li class="pv-node s-${r.status} ${win ? 'win' : ''}">
    <div class="pv-card">
      <img src="${p.img['480']}" alt="">
      <div class="pv-card-txt">
        <b>${esc(nameEn(r.id))}</b>
        <span class="ko">${esc(nameKo(r.id))}</span>
        <span class="pv-line"><small>${r.channel === 'dm' ? `${icon('chat', 'xs')}${en('dm')}` : `${icon('bot', 'xs')}${en('call')}`} · ${en('walkMin', { n: r.walkMin })}</small><span class="st ${cls}">${en(key)}${r.status === 'yes' ? icon('check', 'xs') : ''}</span></span>
      </div>
      ${tr.listingOnly ? `<span class="badge line pv-nr">${en('listingOnly')}</span>` : ''}
    </div>
    ${owner ? ownerHtml(r) : ''}
  </li>`;
}

// what the owner's phone shows, in at most three lines: caption (+ live state on the right) · the request ·
// the buttons (a DM with Yes/No, or an AI call answered on the keypad). Low rows drop the middle line.
function ownerHtml(r) {
  const s = r.status;
  const dm = r.channel === 'dm';
  let state = '';
  if (s === 'typing') state = `${en('stTyping')} <span class="typing"><i></i><i></i><i></i></span>`;
  else if (s === 'calling' || s === 'ringing') state = `<span class="wave"><i></i><i></i><i></i><i></i></span> ${en('stRinging')}`;
  else if (s === 'noanswer') state = en('stNoAnswer');
  else if (s === 'cancelled') state = en('stCancelled');
  let msg = '';
  let btns = '';
  if (s === 'plan' || s === 'sending') msg = `<em>${en('pvNotSent')}</em>`;
  else if (s === 'cancelled') msg = `<em class="strike">${dm ? en('pvReq') : en('pvIncoming')}</em>`;
  else if (!dm && s === 'noanswer') msg = `<b class="ow-msg">${en('pvMissed')}</b>`;
  else {
    msg = `<b class="ow-msg">${dm ? `${en('pvReq')} · ${en('pvYouLine', { n: S.party, when: en(whenKey()) })}` : en('pvIncoming')}</b>`;
    if (dm) btns = `<div class="ow-btns"><span class="${s === 'yes' ? 'on yes' : ''}">${en('dmYesBtn')}</span><span class="${s === 'no' ? 'on no' : ''}">${en('dmNoBtn')}</span></div>`;
    else if (s !== 'calling' && s !== 'ringing') btns = `<div class="ow-btns"><span class="${s === 'yes' ? 'on yes' : ''}">1 · ${en('pvYesShort')}</span><span class="${s === 'no' ? 'on no' : ''}">2 · ${en('pvNoShort')}</span></div>`;
  }
  return `<div class="pv-owner ${dm ? '' : 'call'} ${btns ? 'has-btns' : ''}">
    <div class="ow-top"><span class="ow-cap">${icon(dm ? 'chat' : 'phone', 'xs')}${en('pvOwnerSees')} · ${ko('pvOwnerSees')}</span>${state ? `<span class="ow-state">${state}</span>` : ''}</div>
    ${msg}${btns}
  </div>`;
}
