// Rating survey (quantitative part of the workshop): consent + group → about you → each screen placed on
// ONE 2×2 (How convenient is it? × Would you pay for it?, both 1–10), one item per screen → thanks.
// Post-it ideas are collected on paper for the affinity diagram, so they are not asked here.
// Profile fields mirror what the team already collected in the interview forms (gender, age, affiliation,
// meals out, apps). No name, phone or e-mail is asked. Every question is required: the survey's own buttons
// always check them, on any screen size. Facilitator mode (S.admin: the presenter PC opened with ?fac=1) never
// sends answers, and only its toolbar "Next screen" (adminAdvance) moves on without them. Laptops and tablets
// without ?fac=1 are participants and their answers are saved.

import { S, t, lsGet, lsSet, setLang, resetPerson } from './state.js';
import { esc, icon, $, $$, uid, quadrant, QUAD_KEY, toast } from './util.js';
import { mount, langBtn, openPreview, shotImg } from './screens.js';
import { go } from './nav.js';

const DRAFT = 'tmc.survey3';
const QUEUE = 'tmc.queue';

export const ITEMS = [
  { id: 's1', title: 's1t', desc: 's1d', shot: 'choose' },
  { id: 's2', title: 's2t', desc: 's2d', shot: 'wait' },
  { id: 's3', title: 's3t', desc: 's3d', shot: 'booked' },
  { id: 's4', title: 's4t', desc: 's4d', shot: 'pass' },
];
// 8 participants in pairs (groups 1–4), plus Teaching just in case
const GROUPS = [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['teaching', 'groupT']];
const GENDERS = [['female', 'gF'], ['male', 'gM'], ['other', 'gO'], ['na', 'gN']];
const AFFS = [['undergrad', 'aU'], ['grad', 'aG'], ['intl', 'aI'], ['worker', 'aW'], ['other', 'aO']];
const MEALS = ['0-3', '4-7', '8-15', '16+'];
const APPS = [['naver', 'appNaver'], ['kakao', 'appKakao'], ['google', 'appGoogle'], ['instagram', 'appInsta'], ['catchtable', 'appCatch'], ['youtube', 'appYoutube'], ['other', 'appOther']];
const STEPS = 3;

function blank() {
  return {
    id: uid(),
    startedAt: new Date().toISOString(),
    step: 0,
    item: 0,
    consent: false,
    group: '',
    profile: { gender: null, age: '', affiliation: null, mealsOut: null, apps: [] },
    ratings: Object.fromEntries(ITEMS.map((i) => [i.id, { x: null, y: null }])),
  };
}
let D = lsGet(DRAFT, null) || blank();
const save = () => lsSet(DRAFT, D);

// ------------------------------------------------------------------ parts
function bar() {
  return `<header class="bar">
    <button class="icon-btn" data-act="back" aria-label="${esc(t('back'))}">${icon('left')}</button>
    <div class="title">${t('svTitle')}</div>
    ${langBtn()}
  </header>`;
}
function progress(step) {
  return `<div class="sv-progress" aria-label="${step + 1} / ${STEPS}">${Array.from({ length: STEPS }, (_, i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>`;
}
function chip(group, value, label, on) {
  return `<button class="opt-chip" data-act="opt" data-g="${group}" data-v="${esc(value)}" aria-pressed="${on}">${label}</button>`;
}
function scale(key, axis, q, lo, hi, v) {
  const btns = Array.from({ length: 10 }, (_, i) => i + 1)
    .map((n) => `<button data-act="rate" data-k="${key}" data-axis="${axis}" data-v="${n}" aria-pressed="${v === n}" aria-label="${n}">${n}</button>`).join('');
  return `<div class="scale-wrap">
    <div class="scale-q"><span>${q}</span><output data-out="${key}-${axis}">${v ?? '–'}</output></div>
    <div class="scale" role="group" aria-label="${esc(q)}">${btns}</div>
    <div class="scale-ends"><span>${lo}</span><span>${hi}</span></div>
  </div>`;
}
function quadLine(x, y) {
  const q = quadrant(x, y);
  if (!q) return `<span class="quad-mini"></span><span>${t('quadWait')}</span>`;
  // x,y 1..10 → percent inside the 44px box (centre of each cell)
  const left = ((x - 0.5) / 10) * 100;
  const bottom = ((y - 0.5) / 10) * 100;
  return `<span class="quad-mini"><i style="left:${left}%;bottom:${bottom}%"></i></span><span>${t('quadGoes')} <span class="quad-name q-${q}">${t(QUAD_KEY[q])}</span></span>`;
}
const adminNote = () => (S.admin ? `<p class="admin-note">${icon('lock', 'xs')}${t('adminNote')}</p>` : '');

// ------------------------------------------------------------------ screens
export function render() {
  const step = Math.min(D.step || 0, STEPS - 1);
  if (step === 0) return stepStart();
  if (step === 1) return stepAbout();
  return stepRate();
}

// required answers: the profile fields that are still empty, and the first step that is not complete
function profileGaps(P) {
  const age = parseInt(P.age, 10);
  return [
    ['gender', !P.gender], ['age', !(age >= 10 && age <= 99)], ['affiliation', !P.affiliation],
    ['mealsOut', !P.mealsOut], ['apps', !P.apps.length],
  ].filter(([, bad]) => bad).map(([k]) => k);
}
function firstGap() {
  if (!D.consent || !D.group) return { step: 0, item: 0 };
  if (profileGaps(D.profile).length) return { step: 1, item: 0 };
  const item = ITEMS.findIndex((it) => D.ratings[it.id].x == null || D.ratings[it.id].y == null);
  return item < 0 ? null : { step: 2, item };
}

// facilitator "Next screen" on the PC: move on without answers and without saving anything
export function adminAdvance() {
  if ((D.step || 0) < 2) { D.step = (D.step || 0) + 1; save(); render(); return; }
  if ((D.item || 0) < ITEMS.length - 1) { D.item = (D.item || 0) + 1; save(); render(); return; }
  finish();
}

function common(root, rerender) {
  root.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (!a) return;
    const act = a.dataset.act;
    if (act === 'lang') { setLang(S.lang === 'ko' ? 'en' : 'ko'); rerender(); }
    if (act === 'back') {
      if ((D.step || 0) === 2 && (D.item || 0) > 0) { D.item -= 1; save(); render(); }
      else if ((D.step || 0) === 0) go('/');
      else { D.step -= 1; save(); render(); }
    }
    if (act === 'rate') {
      const { k, axis } = a.dataset;
      const v = Number(a.dataset.v);
      D.ratings[k][axis] = v;
      save();
      $$(`[data-act="rate"][data-k="${k}"][data-axis="${axis}"]`, root).forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.v) === v)));
      const out = root.querySelector(`[data-out="${k}-${axis}"]`);
      if (out) out.textContent = v;
      const ql = root.querySelector(`[data-ql="${k}"]`);
      if (ql) ql.innerHTML = quadLine(D.ratings[k].x, D.ratings[k].y);
      const err = $('#err', root);
      if (err) err.hidden = true;
    }
    if (act === 'preview') openPreview(a.dataset.shot);
  });
}

function stepStart() {
  mount(`
  <section class="screen" data-screen="sv0">
    ${bar()}
    <div class="body">
      ${progress(0)}
      <div class="sv-intro">
        <h1 class="h-title">${t('svTitle')}</h1>
        <p class="t-sub" style="margin:6px 0 0">${t('svSub')}</p>
      </div>
      <div class="sv">
        ${adminNote()}
        <label class="consent"><input type="checkbox" id="consent" aria-describedby="err" ${D.consent ? 'checked' : ''}><span>${t('consentText')}</span></label>
        <p class="err" id="err" hidden>${t('needConsent')}</p>
        <div class="field" id="f-group"><span class="lbl">${t('groupL')}</span>
          <div class="opts-wrap">${GROUPS.map(([v, k]) => chip('group', v, k === v ? v : t(k), D.group === v)).join('')}</div>
          <p class="err" hidden>${t('needField')}</p>
        </div>
      </div>
    </div>
    <div class="dock"><button class="btn btn-primary btn-lg btn-block" data-act="next">${t('next')}${icon('right')}</button></div>
  </section>`, (root) => {
    common(root, stepStart);
    $('#consent', root).addEventListener('change', (e) => { D.consent = e.target.checked; save(); $('#err', root).hidden = true; });
    root.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]');
      if (!a) return;
      if (a.dataset.act === 'opt' && a.dataset.g === 'group') {
        D.group = a.dataset.v;
        save();
        $$('[data-g="group"]', root).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === D.group)));
        $('#f-group .err', root).hidden = true;
      }
      if (a.dataset.act === 'next') {
        if (!D.consent) { $('#err', root).hidden = false; toast(t('needConsent')); return; }
        if (!D.group) { $('#f-group .err', root).hidden = false; toast(t('needField')); return; }
        D.step = 1; save(); render();
      }
    });
  });
}

function stepAbout() {
  const P = D.profile;
  mount(`
  <section class="screen" data-screen="sv1">
    ${bar()}
    <div class="body">
      ${progress(1)}
      <div class="sv-intro"><h1 class="h-title">${t('aboutTitle')}</h1><p class="t-sub" style="margin:6px 0 0">${t('aboutSub')}</p></div>
      <div class="sv">
        ${adminNote()}
        <div class="sv-card compact">
          <div class="field" id="f-gender"><span class="lbl">${t('gender')}</span><div class="opts-wrap">${GENDERS.map(([v, k]) => chip('gender', v, t(k), P.gender === v)).join('')}</div><p class="err" hidden>${t('needField')}</p></div>
          <div class="field" id="f-age"><label class="lbl" for="age">${t('age')} <span class="hint">${t('ageHint')}</span></label>
            <input class="input" id="age" type="number" inputmode="numeric" min="10" max="99" placeholder="${esc(t('agePh'))}" value="${esc(P.age)}" style="max-width:160px"><p class="err" hidden>${t('needAge')}</p></div>
          <div class="field" id="f-affiliation"><span class="lbl">${t('aff')}</span><div class="opts-wrap">${AFFS.map(([v, k]) => chip('affiliation', v, t(k), P.affiliation === v)).join('')}</div><p class="err" hidden>${t('needField')}</p></div>
          <div class="field" id="f-mealsOut"><span class="lbl">${t('meals')}</span><div class="opts-wrap">${MEALS.map((v) => chip('mealsOut', v, v, P.mealsOut === v)).join('')}</div><p class="err" hidden>${t('needField')}</p></div>
          <div class="field" id="f-apps"><span class="lbl">${t('apps')} <span class="hint">${t('appsHint')}</span></span><div class="opts-wrap">${APPS.map(([v, k]) => chip('apps', v, t(k), P.apps.includes(v))).join('')}</div><p class="err" hidden>${t('needField')}</p></div>
        </div>
      </div>
    </div>
    <div class="dock"><button class="btn btn-primary btn-lg btn-block" data-act="next">${t('next')}${icon('right')}</button></div>
  </section>`, (root) => {
    common(root, stepAbout);
    $('#age', root).addEventListener('input', (e) => { P.age = e.target.value.replace(/[^0-9]/g, '').slice(0, 2); save(); $('#f-age .err', root).hidden = true; });
    root.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]');
      if (!a) return;
      if (a.dataset.act === 'opt') {
        const g = a.dataset.g;
        const v = a.dataset.v;
        if (g === 'apps') {
          P.apps = P.apps.includes(v) ? P.apps.filter((x) => x !== v) : [...P.apps, v];
          a.setAttribute('aria-pressed', String(P.apps.includes(v)));
        } else {
          P[g] = v;
          $$(`[data-g="${g}"]`, root).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === P[g])));
        }
        save();
        const err = root.querySelector(`#f-${g} .err`);
        if (err) err.hidden = true;
      }
      if (a.dataset.act === 'next') {
        const missing = profileGaps(P);
        missing.forEach((k) => { root.querySelector(`#f-${k} .err`).hidden = false; });
        if (missing.length) {
          $(`#f-${missing[0]}`, root).scrollIntoView({ behavior: 'smooth', block: 'center' });
          toast(t('needField'));
          return;
        }
        D.step = 2; D.item = 0; save(); render();
      }
    });
  });
}

// one item per screen so nothing is cut off on small phones
function stepRate() {
  const i = Math.min(D.item || 0, ITEMS.length - 1);
  const it = ITEMS[i];
  const r = D.ratings[it.id];
  const last = i === ITEMS.length - 1;
  mount(`
  <section class="screen" data-screen="sv2">
    ${bar()}
    <div class="body">
      ${progress(2)}
      <div class="sv">
        ${adminNote()}
        <div class="rate-head"><span class="rate-tag">${t('rateTitle')}</span><span class="rate-count">${i + 1} / ${ITEMS.length}</span></div>
        <div class="rate-item solo" id="ri-${it.id}">
          <div class="rate-top">
            <div class="shot-frame"><img src="${shotImg(it.shot)}" alt="" decoding="async"><button data-act="preview" data-shot="${it.shot}" aria-label="${esc(t('tapToSee'))}"></button></div>
            <div><h3 class="h-sec">${t(it.title)}</h3><p class="t-sub" style="margin:4px 0 0">${t(it.desc)}</p>
              <button class="link-btn" data-act="preview" data-shot="${it.shot}">${t('tapToSee')}${icon('right', 'sm')}</button></div>
          </div>
          <div class="rate-q">
            ${scale(it.id, 'x', t('qConv'), t('qConv1'), t('qConv10'), r.x)}
            ${scale(it.id, 'y', t('qPay'), t('qPay1'), t('qPay10'), r.y)}
            <div class="quad-line" data-ql="${it.id}">${quadLine(r.x, r.y)}</div>
          </div>
        </div>
        <p class="err" id="err" hidden>${t('needField')}</p>
      </div>
    </div>
    <div class="dock"><button class="btn btn-primary btn-lg btn-block" data-act="go">${last ? t('submit') : `${t('next')}${icon('right')}`}</button></div>
  </section>`, (root) => {
    common(root, stepRate);
    root.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-act="go"]');
      if (!a) return;
      if (r.x == null || r.y == null) {
        $('#err', root).hidden = false;
        toast(t('needField'));
        return;
      }
      if (!last) { D.item = i + 1; save(); render(); return; }
      a.disabled = true;
      a.textContent = t('sending');
      finish();
    });
  });
}

// ------------------------------------------------------------------ submit
function payload() {
  const age = parseInt(D.profile.age, 10);
  return {
    v: 2,
    id: D.id,
    startedAt: D.startedAt,
    submittedAt: new Date().toISOString(),
    lang: S.lang,
    group: D.group || null,
    flow: { ...S.flow, chooseStartedAt: undefined },
    profile: { ...D.profile, age: Number.isFinite(age) ? age : null },
    ratings: D.ratings,
  };
}
async function post(body) {
  const res = await fetch('/api/responses', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error('HTTP ' + res.status);
}
let lastAnswers = null;
let lastState = 'saved'; // saved | queued | admin
async function finish() {
  if (S.admin) { lastAnswers = payload(); thanks('admin'); return; } // facilitator runs never reach the statistics
  // never send an incomplete answer: go back to the first question that is still empty
  const gap = firstGap();
  if (gap) { D.step = gap.step; D.item = gap.item; save(); render(); toast(t('needField')); return; }
  const body = payload();
  lastAnswers = body;
  try {
    await post(body);
    thanks('saved');
  } catch {
    const q = lsGet(QUEUE, []);
    q.push(body);
    lsSet(QUEUE, q);
    thanks('queued');
  }
}
export async function flushQueue() {
  const q = lsGet(QUEUE, []);
  if (!q.length) return;
  const rest = [];
  for (const b of q) {
    try { await post(b); } catch { rest.push(b); }
  }
  lsSet(QUEUE, rest);
}
window.addEventListener('online', flushQueue);

// ------------------------------------------------------------------ thanks
export function quadSvg(points, { xLabel, yLabel, size = 320 } = {}) {
  const pad = 34;
  const w = size, h = size;
  const inner = w - pad * 2;
  const X = (v) => pad + ((v - 0.5) / 10) * inner;
  const Y = (v) => h - pad - ((v - 0.5) / 10) * inner;
  const mid = pad + inner / 2;
  let s = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="2 by 2 matrix" font-family="Pretendard Variable, sans-serif">`;
  s += `<rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" fill="#fff" stroke="#DADADA"/>`;
  s += `<rect x="${mid}" y="${pad}" width="${inner / 2}" height="${inner / 2}" fill="#FFF1EA"/>`;
  s += `<line x1="${mid}" y1="${pad}" x2="${mid}" y2="${h - pad}" stroke="#BDBDBD" stroke-dasharray="4 4"/><line x1="${pad}" y1="${mid}" x2="${w - pad}" y2="${mid}" stroke="#BDBDBD" stroke-dasharray="4 4"/>`;
  const ql = (x, y, txt, anchor, color) => `<text x="${x}" y="${y}" font-size="10.5" font-weight="700" fill="${color}" text-anchor="${anchor}">${esc(txt)}</text>`;
  s += ql(w - pad - 6, pad + 14, t('qMP'), 'end', '#CC4410') + ql(pad + 6, pad + 14, t('qNP'), 'start', '#7A4CC2') + ql(w - pad - 6, h - pad - 8, t('qMF'), 'end', '#067A55') + ql(pad + 6, h - pad - 8, t('qNN'), 'start', '#8C8C8C');
  s += `<text x="${w / 2}" y="${h - 8}" font-size="11" fill="#6B6B6B" text-anchor="middle">${esc(xLabel)} →</text>`;
  s += `<text x="12" y="${h / 2}" font-size="11" fill="#6B6B6B" text-anchor="middle" transform="rotate(-90 12 ${h / 2})">${esc(yLabel)} →</text>`;
  for (const p of points) {
    s += `<g><circle cx="${X(p.x)}" cy="${Y(p.y)}" r="11" fill="${p.color || '#CC4410'}" stroke="#fff" stroke-width="2"/><text x="${X(p.x)}" y="${Y(p.y) + 4}" font-size="10.5" font-weight="800" fill="#fff" text-anchor="middle">${esc(p.label)}</text></g>`;
  }
  return s + '</svg>';
}

export function thanks(state = lastState) {
  lastState = state;
  const a = lastAnswers || payload();
  const pts = ITEMS.map((it, i) => ({ ...a.ratings[it.id], label: String(i + 1) })).filter((p) => p.x != null && p.y != null);
  const sub = state === 'admin' ? t('adminNote') : state === 'queued' ? t('thanksQueued') : t('thanksSaved');
  mount(`
  <section class="screen" data-screen="thanks">
    <header class="bar"><span class="icon-btn" aria-hidden="true"></span><div class="title">${t('svTitle')}</div>${langBtn()}</header>
    <div class="body">
      <div class="done-hero"><div class="check-pop">${icon('check')}</div><h1 class="h-title">${t('thanksTitle')}</h1><p class="t-sub" style="margin:4px 0 0">${sub}</p></div>
      <div class="sv">
        <div class="look-screen" role="status">
          <svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
          <b>${t('lookTitle')}</b><span>${t('lookBody')}</span>
        </div>
        <div class="sv-card"><h3>${t('thanksYour')}</h3>
          <div class="big-quad">${quadSvg(pts, { xLabel: t('qConv'), yLabel: t('qPay') })}</div>
          <ol class="t-meta" style="margin:8px 0 0;padding-left:18px">${ITEMS.map((it) => `<li>${t(it.title)}</li>`).join('')}</ol>
        </div>
        <p class="fine" style="margin:14px 0 0">${icon('info')}<span>${t('debrief')}</span></p>
      </div>
    </div>
  </section>`, (root) => {
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (b?.dataset.act === 'lang') { setLang(S.lang === 'ko' ? 'en' : 'ko'); thanks(state); }
    });
  });
  // a submitted draft is finished; the next visitor starts clean
  D = blank();
  save();
  resetPerson();
}
