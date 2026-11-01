// Presenter view for the 16:9 big screen (facilitator PC). The stage is a fixed 1600×900 canvas scaled to
// fill the screen: the phone runs the prototype on the left, this panel explains what is happening on the right.
// Six steps: 0 Situation · 1 Choose · 2 Wait · 3 Booked · 4 Quant (rate on phones, online) · 5 Qual (A3 + post-its,
// offline, guided up to the discussion). It listens to app events and never drives the simulation itself.
// Copy is English first with Korean as a quieter second line. Facilitator mode: nothing here is saved.

import { S, params, scenario, place, cand, trust, resetPerson } from './state.js';
import { STR, fill } from './i18n.js';
import { esc, icon, mmss } from './util.js';
import { jumpTo, onFacClick, skipSubscribe } from './screens.js';
import { adminAdvance } from './survey.js';
import { go } from './nav.js';

const WIDE = window.matchMedia('(min-width: 1100px)');
const CANVAS = { w: 1600, h: 900 };
const ROW_H = 116;
const ROW_GAP = 12;
const QUAL_STEPS = 4;
const QUAL_MIN = [6, 4, 8, 7]; // default minutes per Qual part (write · what if · A3 2×2 · discuss)
let route = location.pathname;
let tick = null;
let showResults = false;     // results stay hidden until the facilitator asks for them
let resultsData = null;
let resultsTimer = null;
const timer = { part: -1, left: QUAL_MIN[0] * 60, running: false, id: null };

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
    if (act === 'reset') resetAnswers();
  };
  el.addEventListener('click', onClick);
  el.addEventListener('submit', (e) => {
    if (!e.target.matches('#pv-keyform')) return;
    e.preventDefault();
    const v = e.target.querySelector('input').value.trim();
    try { sessionStorage.setItem('tmc.key', v); } catch { /* ignore */ }
    loadResults();
  });
  // small floating toolbar outside the 16:9 canvas so it never takes space from the screen
  const bar = document.createElement('div');
  bar.id = 'pv-toolbar';
  document.body.appendChild(bar);
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
        <h3>${bi('sideLinks')}</h3><div class="side-links"><a href="/rate">${en('linkRate')} →</a><a href="/results/" target="_blank" rel="noopener">${en('linkResults')} →</a><a href="/board/" target="_blank" rel="noopener">${en('linkBoard')} →</a></div>
        <button class="btn btn-line btn-sm tb-danger" data-admin="reset">${icon('trash', 'sm')}${en('tbReset')}</button></div>
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

function paint() {
  const el = document.getElementById('side');
  if (!el) return;
  if (!WIDE.matches) { el.innerHTML = ''; clearInterval(tick); toolbar(); return; }
  el.innerHTML = `
    <div class="pv">
      <header class="pv-head">
        <div class="pv-brand"><span class="brand-mark">${icon('chef')}</span><div><b>TrustMyChef</b><span class="pv-title">${en('pvTitle')}<span class="ko">${ko('pvTitle')}</span></span></div></div>
        <div class="pv-qr"><div class="qr" id="qr"></div><div><b>${esc(location.host)}</b><small>${en('pvScan')}</small><small class="ko">${ko('pvScan')}</small></div></div>
      </header>
      <ol class="pv-steps">${stepsHtml()}</ol>
      <section class="pv-main" id="pv-main"><div class="pv-fit" id="pv-fit">${diagram()}</div></section>
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
  document.querySelectorAll('.pv-fac .fac-opts button, .pv-fac .seg-ctl button').forEach((b) => {
    b.setAttribute('aria-pressed', String(S.fac[b.dataset.fac] === b.dataset.v));
  });
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

// keep the whole explanation on one screen: shrink the live diagram only if it would not fit
function fit() {
  const main = document.getElementById('pv-main');
  const box = document.getElementById('pv-fit');
  if (!main || !box) return;
  box.style.zoom = '1';
  const cs = getComputedStyle(main);
  const avail = main.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
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
  const tv = { wait: sc.waitMin };
  const s2en = fill(STR.en.pvS2, { target: nameEn(sc.target) });
  const s2ko = fill(STR.ko.pvS2, { target: nameKo(sc.target) });
  return `
    <div class="pv-story big">
      <div class="pv-scene"><span class="pv-ic r">${icon('heart')}</span><b>${en('pvS1')}</b><span class="ko">${ko('pvS1')}</span></div>
      <span class="pv-arrow">${icon('right')}</span>
      <div class="pv-scene"><span class="pv-ic r">${icon('ban')}</span><b>${esc(s2en)}</b><span class="ko">${esc(s2ko)}</span><small>${en('pvS2d', tv)}</small></div>
      <span class="pv-arrow">${icon('right')}</span>
      <div class="pv-scene"><span class="pv-ic">${icon('walk')}</span><b>${en('pvS3')}</b><span class="ko">${ko('pvS3')}</span></div>
    </div>
    <div class="pv-idea big"><span class="brand-mark">${icon('chef')}</span><p>${bi('pvSolution')}</p></div>
    <div class="pv-intro-hub">${hub(sampleRows(), { sample: true, owner: false })}</div>`;
}

// the idea as a picture: three recommended places nearby, the first one says Yes
function sampleRows() {
  const ids = scenario().candidates.filter((c) => !trust(place(c.id)).listingOnly).slice(0, 3);
  const states = ['yes', 'no', 'cancelled'];
  return ids.map((c, i) => ({ id: c.id, channel: i === 1 ? 'call' : 'dm', walkMin: c.walkMin, status: states[i] }));
}

function dChoose() {
  const rows = [...S.selected].map(([id, channel]) => ({ id, channel, walkMin: cand(id).walkMin, status: 'plan' }));
  return `
    <h2 class="pv-h">${bi('pvChooseTitle')}</h2>
    ${payHtml()}
    ${rows.length ? hub(rows, { owner: false }) : `<div class="pv-empty">${icon('utensils', 'lg')}<p>${bi('pvPlanEmpty')}</p></div>`}`;
}

// the money moment: highlighted while the subscribe popup is open on the phone, then both answers
function payHtml() {
  const f = S.flow;
  const ans = (v) => (v ? en({ yes: 'subYes', maybe: 'subMaybe', no: 'subNo' }[v]) : '–');
  if (S.subSheet) {
    const when = S.subSheet === 'post' ? 'subAfter' : 'subBefore';
    return `<div class="pv-pay"><span class="pass-tag">${icon('star', 'xs')}₩3,000/mo</span><p><b>${en('pvSubMoment')}</b><span class="ko">${ko('pvSubMoment')}</span>${en(when)} · ${ko(when)}</p></div>`;
  }
  if (f.subPre || f.subPost) {
    return `<div class="pv-pay on"><span class="pass-tag">${icon('check', 'xs')}${en('pvSubAnswers')}</span><p>${en('subBefore')}: <b>${ans(f.subPre)}</b> → ${en('subAfter')}: <b>${ans(f.subPost)}</b><span class="ko">${ko('subBefore')} → ${ko('subAfter')}</span></p></div>`;
  }
  return '';
}

function dWait() {
  const st = S.match?.state;
  if (!st) return dChoose();
  let extra = '';
  if (st.result === 'none') extra = `<div class="pv-q">${icon('alert')}<p><b>${en('noneTitle')}.</b> ${en('pvNoneQ')}<span class="ko">${ko('noneTitle')}. ${ko('pvNoneQ')}</span></p></div>`;
  else if (st.result === 'booked' && trust(place(st.winner)).listingOnly) extra = `<div class="pv-q">${icon('alert')}<p>${bi('pvBadQ')}</p></div>`;
  return `
    <h2 class="pv-h">${bi('pvWaitTitle')}</h2>
    <p class="pv-rule">${icon('check', 'sm')}<span>${bi('pvRule')}</span><span class="badge sim">${en('pvSim')}</span></p>
    ${hub(st.reqs, { st })}
    ${extra}`;
}

function dBooked() {
  const st = S.match?.state;
  if (!st || st.result !== 'booked') return dIntro();
  const asked = st.reqs.length;
  const cancelled = st.reqs.filter((r) => r.status === 'cancelled').length;
  const bad = trust(place(st.winner)).listingOnly;
  const stat = (k, v) => `<div><small>${en(k)}</small><small class="ko">${ko(k)}</small><b>${v}</b></div>`;
  return `
    <h2 class="pv-h">${bi('pvBookedTitle')}</h2>
    <div class="pv-stats three">
      ${stat('pvSent', asked)}${stat('pvTime', `${Math.max(1, Math.round(st.winAt || 7))}s`)}${stat('pvCancelled', cancelled)}
    </div>
    ${payHtml()}
    ${hub(st.reqs, { st })}
    ${bad ? `<div class="pv-q">${icon('alert')}<p>${bi('pvBadQ')}</p></div>` : ''}`;
}

// step 4 · Quant: everyone does this on their own phone (online)
function dQuant() {
  return `
    <div class="pv-mode on-line">${icon('phone', 'sm')}${en('pvOnline')} <span class="ko-inline">${ko('pvOnline')}</span></div>
    <h2 class="pv-h">${bi('pvQuantTitle')}</h2>
    <div class="pv-quant">
      <div class="pv-bigqr"><div class="qr" id="qr-big"></div><b>${esc(location.host)}</b></div>
      <div>
        <ol class="pv-numbered">
          <li><span>${icon('phone')}</span><p>${bi('pvQuant1')}</p></li>
          <li><span>${icon('utensils')}</span><p>${bi('pvQuant2')}</p></li>
          <li><span>${icon('check')}</span><p>${bi('pvQuant3')}</p></li>
        </ol>
        ${miniQuad('qConv', 'qPay', ['qMP', 'qNP', 'qMF', 'qNN'])}
      </div>
    </div>`;
}

// step 5 · Qual: offline on A3 paper with post-its, guided up to the discussion
function dQual() {
  const q = Math.min(S.qual || 0, QUAL_STEPS - 1);
  const keys = ['qual1t', 'qual2t', 'qual3t', 'qual4t'];
  const chips = keys.map((k, i) => `<button class="${i < q ? 'done' : i === q ? 'now' : ''}" data-qual="${i}"><span class="n">${i + 1}</span><span>${en(k)}<small class="ko">${ko(k)}</small></span></button>`).join('');
  let body = '';
  if (q === 0) {
    const feats = [['1', 'step1', 'utensils'], ['2', 'step2', 'chat'], ['3', 'step3', 'check']];
    body = `
      <div class="pv-feats">${feats.map(([n, k, ic]) => `<div><span class="pv-feat-n">${n}</span>${icon(ic)}<b>${en(k)}</b><span class="ko">${ko(k)}</span></div>`).join('')}</div>
      <p class="pv-prompt">${icon('star', 'sm')}<span>${bi('qual1d')}</span></p>`;
  } else if (q === 1) {
    body = `
      <div class="pv-whatif">
        <div>${icon('alert')}<b>${en('qual2a')}</b><span class="ko">${ko('qual2a')}</span></div>
        <div>${icon('ban')}<b>${en('qual2b')}</b><span class="ko">${ko('qual2b')}</span></div>
      </div>`;
  } else if (q === 2) {
    body = `
      ${miniQuad('qual3x', 'qual3y', ['qpMP', 'qpNP', 'qpMF', 'qpNN'], 'big')}
      <p class="pv-prompt">${icon('star', 'sm')}<span>${bi('qual3p')}</span></p>`;
  } else {
    body = `
      <ul class="pv-discuss">
        <li>${bi('qual4a')}</li>
        <li>${bi('qual4b')}</li>
        <li>${bi('qual4c')}</li>
      </ul>`;
  }
  if (timer.part !== q) { clearInterval(timer.id); Object.assign(timer, { part: q, left: QUAL_MIN[q] * 60, running: false, id: null }); }
  return `
    <div class="pv-qual-top">
      <div class="pv-mode off-line big">${icon('utensils', 'sm')}${en('pvOffline')} <span class="ko-inline">${ko('pvOffline')}</span></div>
      ${timerHtml()}
    </div>
    <div class="pv-qual-steps">${chips}</div>
    <div class="pv-qual-body">${body}</div>`;
}

function timerHtml() {
  const up = timer.left <= 0;
  return `<div class="pv-timer ${timer.running ? 'run' : ''} ${up ? 'up' : ''}">
    <output id="pv-timer">${up ? en('timerUp') : mmss(timer.left)}</output>
    <div class="pv-timer-btns">
      <button data-timer="minus" aria-label="−1 min">−1</button>
      <button class="go" data-timer="toggle">${timer.running ? en('timerPause') : en('timerStart')}</button>
      <button data-timer="plus" aria-label="+1 min">+1</button>
      <button data-timer="reset" aria-label="${esc(en('timerReset'))}">${icon('refresh', 'xs')}</button>
    </div>
  </div>`;
}
function timerAction(act) {
  if (act === 'toggle') {
    timer.running = !timer.running;
    clearInterval(timer.id);
    if (timer.running) {
      timer.id = setInterval(() => {
        timer.left -= 1;
        const out = document.getElementById('pv-timer');
        if (out) out.textContent = timer.left <= 0 ? en('timerUp') : mmss(timer.left);
        if (timer.left <= 0) { clearInterval(timer.id); timer.running = false; paintLive(); }
      }, 1000);
    }
  }
  if (act === 'plus') timer.left += 60;
  if (act === 'minus') timer.left = Math.max(0, timer.left - 60);
  if (act === 'reset') { clearInterval(timer.id); timer.running = false; timer.left = QUAL_MIN[Math.max(0, timer.part)] * 60; }
  paintLive();
}

// ------------------------------------------------------------------ results (hidden until asked)
async function loadResults() {
  let key = null;
  try { key = sessionStorage.getItem('tmc.key'); } catch { /* ignore */ }
  if (!key) { resultsData = { needKey: true }; paintLive(); return; }
  try {
    const res = await fetch('/api/responses', { headers: { authorization: `Bearer ${key}` }, cache: 'no-store' });
    if (res.status === 401) { try { sessionStorage.removeItem('tmc.key'); } catch { /* ignore */ } resultsData = { needKey: true, bad: true }; paintLive(); return; }
    resultsData = { rows: (await res.json()).rows || [], at: new Date() };
  } catch {
    resultsData = resultsData || { rows: [] };
  }
  if (showResults) paintLive();
  clearTimeout(resultsTimer);
  if (showResults) resultsTimer = setTimeout(loadResults, 8000);
}
function stopResults() { clearTimeout(resultsTimer); }

function dResults() {
  const d = resultsData;
  if (!d) return `<div class="pv-empty"><p>…</p></div>`;
  if (d.needKey) {
    return `<form class="pv-keyform" id="pv-keyform"><label>${icon('lock', 'sm')}${en('tbKey')} <span class="ko-inline">${ko('tbKey')}</span></label>
      <input class="input" type="password" autocomplete="off"><button class="btn btn-primary">${en('tbKeyOpen')}</button>
      ${d.bad ? `<p class="err">${en('tbKeyBad')}</p>` : ''}</form>`;
  }
  const rows = d.rows || [];
  const items = ['s1', 's2', 's3', 's4'];
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const means = items.map((k, i) => {
    const pts = rows.map((r) => r.ratings?.[k]).filter((p) => p && p.x != null && p.y != null);
    return { label: String(i + 1), x: avg(pts.map((p) => p.x)), y: avg(pts.map((p) => p.y)), n: pts.length };
  }).filter((m) => m.n);
  const dots = rows.flatMap((r) => items.map((k) => r.ratings?.[k]).filter((p) => p && p.x != null && p.y != null));
  const yes = (key) => { const a = rows.filter((r) => r.flow?.[key]); return a.length ? Math.round((a.filter((r) => r.flow[key] === 'yes').length / a.length) * 100) + '%' : '–'; };
  const names = ['s1t', 's2t', 's3t', 's4t'];
  return `
    <div class="pv-res">
      <div class="pv-res-chart">${resChart(means, dots)}</div>
      <div class="pv-res-side">
        <div class="pv-res-kpi"><small>${en('resN')}</small><b>${rows.length}</b></div>
        <div class="pv-res-kpi"><small>${en('resSub')} · ${en('subBefore')} → ${en('subAfter')}</small><b>${yes('subPre')} → ${yes('subPost')}</b></div>
        <ol class="pv-res-legend">${names.map((k) => `<li>${en(k)}</li>`).join('')}</ol>
        <p class="t-cap">${en('resUpdated')} ${d.at ? d.at.toTimeString().slice(0, 8) : ''}</p>
      </div>
    </div>
    ${rows.length ? '' : `<p class="pv-empty">${en('resEmpty')}</p>`}`;
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

async function resetAnswers() {
  let key = null;
  try { key = sessionStorage.getItem('tmc.key'); } catch { /* ignore */ }
  if (!key) key = window.prompt(en('tbKey'));
  if (!key) return;
  if (window.prompt(`${en('tbResetAsk')}\n${ko('tbResetAsk')}`) !== 'DELETE') return;
  const res = await fetch('/api/responses', { method: 'DELETE', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify({ confirm: 'DELETE' }) });
  if (res.ok) {
    try { sessionStorage.setItem('tmc.key', key); } catch { /* ignore */ }
    window.alert(`${en('tbResetDone')} · ${ko('tbResetDone')}`);
    if (showResults) loadResults();
  } else window.alert(en('tbKeyBad'));
}

function miniQuad(x, y, names, size = '') {
  const q = (k) => `${en(k)}<small class="ko">${ko(k)}</small>`;
  return `<div class="mq ${size}"><span class="mq-y">${en(y)} →</span>
    <div class="mq-grid"><div class="np">${q(names[1])}</div><div class="mp">${q(names[0])}</div><div class="nn">${q(names[3])}</div><div class="mf">${q(names[2])}</div></div>
    <span class="mq-x">${en(x)} →</span></div>`;
}

// ------------------------------------------------------------------ hub & spoke
const WIRE = { plan: 'w-plan', sending: 'w-live', sent: 'w-live', seen: 'w-live', typing: 'w-live', calling: 'w-live', ringing: 'w-live', oncall: 'w-live', yes: 'w-yes', no: 'w-no', noanswer: 'w-off', cancelled: 'w-off' };
const PILL = {
  plan: ['wait', 'pvNotSent'], sending: ['wait', 'stSending'], sent: ['wait', 'stSent'], seen: ['wait', 'stSeen'], typing: ['live', 'stTyping'],
  calling: ['live', 'stCalling'], ringing: ['live', 'stRinging'], oncall: ['live', 'stOnCall'], yes: ['yes', 'stYes'], no: ['no', 'stNo'],
  noanswer: ['off', 'stNoAnswer'], cancelled: ['off', 'stCancelled'],
};

function hub(rows, { st, sample, owner = true } = {}) {
  const n = rows.length;
  const H = n * ROW_H + (n - 1) * ROW_GAP;
  const mid = H / 2;
  const wires = rows.map((r, i) => {
    const y = i * (ROW_H + ROW_GAP) + ROW_H / 2;
    return `<path class="${WIRE[r.status] || 'w-plan'}" d="M0,${mid} C46,${mid} 34,${y} 80,${y}"/>`;
  }).join('');
  const elapsed = st ? mmss(st.endedAt ?? S.match?.elapsed?.() ?? 0) : '';
  return `
    <div class="hub ${sample ? 'sample' : ''} ${owner ? '' : 'no-owner'}" style="--h:${Math.max(H, 180)}px">
      <div class="hub-left">
        <div class="node-you"><span class="ava">${icon('users')}</span><div><b>${en('pvYou')} <span class="ko-inline">${ko('pvYou')}</span></b><small>${en('pvYouLine', { n: S.party, when: en(whenKey()) })}</small></div></div>
        <i class="hub-v"></i>
        <div class="node-hub"><span class="brand-mark">${icon('chef')}</span><div><b>TrustMyChef</b><small>${st ? `<span id="pv-elapsed">${elapsed}</span>` : `${en('pvHubLine')}`}</small></div></div>
      </div>
      <svg class="hub-wires" viewBox="0 0 80 ${H}" preserveAspectRatio="none" style="height:${H}px" aria-hidden="true">${wires}</svg>
      <ol class="hub-right" style="height:${H}px">${rows.map((r) => nodeHtml(r, st, owner)).join('')}</ol>
    </div>`;
}

function nodeHtml(r, st, owner = true) {
  const p = place(r.id);
  const [cls, key] = PILL[r.status] || PILL.plan;
  const win = st && st.winner === r.id;
  const tr = trust(p);
  return `<li class="pv-node s-${r.status} ${win ? 'win' : ''}" style="height:${ROW_H}px">
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

// what the owner's phone shows: a DM with Yes/No buttons, or an incoming AI call with a keypad
function ownerHtml(r) {
  const s = r.status;
  const cap = `${en('pvOwnerSees')} · ${ko('pvOwnerSees')}`;
  if (r.channel === 'dm') {
    const idle = s === 'plan' || s === 'sending';
    const body = idle ? `<em>${en('pvNotSent')}</em>`
      : s === 'cancelled' ? `<em class="strike">${en('pvReq')}</em><em>${en('stCancelled')}</em>`
        : `<b>${en('pvReq')} · ${en('pvYouLine', { n: S.party, when: en(whenKey()) })}</b>
           <div class="ow-btns"><span class="${s === 'yes' ? 'on yes' : ''}">${en('dmYesBtn')}</span><span class="${s === 'no' ? 'on no' : ''}">${en('dmNoBtn')}</span></div>
           ${s === 'typing' ? `<small class="ow-note">${en('stTyping')} <span class="typing"><i></i><i></i><i></i></span></small>` : s === 'noanswer' ? `<small class="ow-note">${en('stNoAnswer')}</small>` : ''}`;
    return `<div class="pv-owner"><span class="ow-cap">${icon('chat', 'xs')}${cap}</span>${body}</div>`;
  }
  const body = s === 'plan' ? `<em>${en('pvNotSent')}</em>`
    : s === 'noanswer' ? `<b>${en('pvMissed')}</b>`
      : s === 'cancelled' ? `<em>${en('callEnd')}</em>`
        : `<b>${en('pvIncoming')}</b>${s === 'calling' || s === 'ringing' ? `<small class="ow-note"><span class="wave"><i></i><i></i><i></i><i></i></span> ${en('stRinging')}</small>`
          : `<div class="ow-btns keypad"><span class="${s === 'yes' ? 'on yes' : ''}">1 · ${en('pvYesShort')}</span><span class="${s === 'no' ? 'on no' : ''}">2 · ${en('pvNoShort')}</span></div>`}`;
  return `<div class="pv-owner call"><span class="ow-cap">${icon('phone', 'xs')}${cap}</span>${body}</div>`;
}
