import { S, t, L, params, scenario, place, cand, trust, setLang, setScenario, setFac, resetFlow, saveFlow, emit } from './state.js';
import { esc, icon, $, $$, mmss, clock, toast, josa } from './util.js';
import { fill } from './i18n.js';
import { mountMap } from './map.js';
import { createMatch, frozenMatch } from './sim.js';
import { go } from './nav.js';

const MAX_PICK = 5;
const app = () => document.getElementById('app');

// ------------------------------------------------------------------ mounting
let cleanup = null;
export function mount(html, setup) {
  if (cleanup) { try { cleanup(); } catch { /* ignore */ } }
  cleanup = null;
  const root = app();
  root.innerHTML = html;
  const screen = root.firstElementChild;
  const off = setup ? setup(screen) : null;
  cleanup = typeof off === 'function' ? off : null;
  return screen;
}

// ------------------------------------------------------------------ small parts
const shortArea = (p) => L(p.area).replace(/\s*\(.*\)\s*/, '');
const cuisineLabel = (p) => t('f' + p.cuisine);
const tagLabels = (p) => p.tags.filter((g) => g.ko !== p.cuisine).slice(0, 2).map((g) => L(g));
const whenKey = { now: 'whenNowL', 15: 'when15L', 30: 'when30L' };
const placeName = (id) => L(place(id).name);

export function langBtn() {
  return `<button class="lang-btn" data-act="lang" aria-label="Change language">${icon('globe', 'xs')}${S.lang === 'ko' ? 'EN' : 'KO'}</button>`;
}
export function testBadge() {
  return `<span class="test-badge" data-hold="fac" title="${esc(t('testLong'))}">${icon('info', 'xs')}${t('test')}</span>`;
}
function stepsHtml(n) {
  const segs = [t('step1'), t('step2'), t('step3')].map((label, i) => {
    const cls = i + 1 < n ? 'done' : i + 1 === n ? (n === 3 ? 'done' : 'now') : '';
    return `<div class="seg ${cls}"><i></i><span>${i + 1}. ${label}</span></div>`;
  });
  return `<div class="steps" aria-label="Step ${n} of 3">${segs.join('')}</div>`;
}

export function whoBadges(p) {
  const tr = trust(p);
  let out = '';
  if (tr.listingOnly) out += `<span class="badge line">${icon('info', 'xs')}${t('listingOnly')}</span>`;
  else tr.named.slice(0, 2).forEach((c) => { out += `<span class="badge o">${icon('chef', 'xs')}${esc(L(S.data.curators[c.id].name))}</span>`; });
  if (tr.note?.visited) out += `<span class="badge g">${t('visited')}</span>`;
  if (p.perks?.length) out += `<span class="badge ok">${t('unistDeal')}</span>`;
  return out;
}
function quoteOf(p) {
  const tr = trust(p);
  if (tr.note) return L(tr.note.quote);
  const c = tr.named[0];
  return c ? L(S.data.curators[c.id].role) : '';
}

// press-and-hold the TEST badge to open the facilitator sheet (mobile)
function bindHold(root) {
  let timer = null;
  root.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('[data-hold="fac"]')) return;
    timer = setTimeout(() => { timer = null; openFac(); }, 650);
  });
  const clear = () => { if (timer) clearTimeout(timer); timer = null; };
  root.addEventListener('pointerup', clear);
  root.addEventListener('pointerleave', clear);
  root.addEventListener('pointercancel', clear);
}

function onLang(rerender) {
  setLang(S.lang === 'ko' ? 'en' : 'ko');
  rerender();
}

// ------------------------------------------------------------------ intro
export function intro() {
  const sc = scenario();
  const target = placeName(sc.target);
  const scBtns = S.data.scenarios.map((s) => `<button data-act="scenario" data-id="${s.id}" aria-pressed="${s.id === sc.id}">${esc(L(s.label))}</button>`).join('');
  mount(`
  <section class="screen" data-screen="intro">
    <div class="body">
      <div class="intro-top">
        <div class="brand"><span class="brand-mark">${icon('chef')}</span>${t('appName')}</div>
        <div style="display:flex;gap:8px;align-items:center">${testBadge()}${langBtn()}</div>
      </div>
      <div class="intro-hero">
        <span class="kicker">${icon('heart', 'sm')}${t('kicker')}</span>
        <h1 class="h-display">${esc(t('introTitle')).replace('\n', '<br>')}</h1>
      </div>
      <ul class="story">
        <li><span class="si o">${icon('clock')}</span><span>${t('story1')}</span></li>
        <li><span class="si r">${icon('ban')}</span><span>${t('story2', { target: esc(target), wait: sc.waitMin, eun: josa(target, '은', '는') })}</span></li>
        <li><span class="si">${icon('walk')}</span><span>${t('story3')}</span></li>
        <li><span class="si o">${icon('utensils')}</span><span>${t('story4')}</span></li>
      </ul>
      <div class="how">
        <h2 class="h-sec">${t('howTitle')}</h2>
        <ol>
          <li><span class="n">1</span><br>${t('how1')}</li>
          <li><span class="n">2</span><br>${t('how2')}</li>
          <li><span class="n">3</span><br>${t('how3')}</li>
        </ol>
      </div>
      <div class="where">
        <h2 class="h-sec">${t('whereTitle')}</h2>
        <div class="seg-ctl" role="group">${scBtns}</div>
      </div>
      <p class="fine">${icon('info')}<span>${t('fine')}</span></p>
    </div>
    <div class="dock">
      <button class="btn btn-primary btn-lg btn-block" data-act="start">${t('start')}${icon('right')}</button>
    </div>
  </section>`, (root) => {
    bindHold(root);
    root.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]');
      if (!a) return;
      const act = a.dataset.act;
      if (act === 'lang') onLang(intro);
      if (act === 'scenario') { setScenario(a.dataset.id); resetFlow(); intro(); emit('select'); }
      if (act === 'start') { resetFlow(); go('/choose'); }
    });
  });
}

// ------------------------------------------------------------------ choose (screen 1)
function visibleCands() {
  const all = scenario().candidates;
  if (S.filter === 'all') return all;
  return all.filter((c) => place(c.id).cuisine === S.filter);
}
function rowHtml(c, n) {
  const p = place(c.id);
  const sel = S.selected.has(c.id);
  const ch = S.selected.get(c.id);
  const q = quoteOf(p);
  const tags = tagLabels(p);
  return `
  <li class="row ${sel ? 'sel' : ''}" data-id="${c.id}">
    <button class="row-hit" data-act="toggle" data-id="${c.id}" aria-pressed="${sel}" aria-label="${esc(placeName(c.id))}"></button>
    <button class="thumb" data-act="detail" data-id="${c.id}" aria-label="${esc(placeName(c.id))} · ${esc(t('info'))}">
      <img src="${p.img['480']}" alt="" loading="lazy" decoding="async"><span class="ord">${n}</span>
    </button>
    <div class="row-main">
      <div class="row-name">${esc(placeName(c.id))}</div>
      <div class="row-meta">${esc([cuisineLabel(p), ...tags].join(' · '))} · ${esc(shortArea(p))}</div>
      <div class="walk">${icon('walk', 'sm')}${t('walkMin', { n: c.walkMin })}<span class="dist">· ${t('meters', { n: c.distM })}</span><span class="price" title="${esc(t('priceEst'))}">${'₩'.repeat(p.priceTier)}</span></div>
      <div class="who">${whoBadges(p)}</div>
      ${q ? `<p class="quote">${esc(q)}</p>` : ''}
    </div>
    <span class="pick" aria-hidden="true">${icon('check')}</span>
    ${sel ? `
    <div class="chan" role="group" aria-label="${esc(t('askBy'))}">
      <span class="lbl">${t('askBy')}</span>
      <button data-act="chan" data-id="${c.id}" data-ch="dm" aria-pressed="${ch === 'dm'}">${icon('chat', 'sm')}${t('dm')}</button>
      <button data-act="chan" data-id="${c.id}" data-ch="call" aria-pressed="${ch === 'call'}">${icon('bot', 'sm')}${t('call')}</button>
    </div>` : ''}
  </li>`;
}
function dockHtml() {
  const n = S.selected.size;
  let dm = 0, call = 0;
  S.selected.forEach((v) => (v === 'call' ? call++ : dm++));
  const label = n === 0 ? t('sendNone') : n === 1 ? t('send1') : t('send', { n });
  return `
    <div class="sum"><span>${t('selected', { n })}${n ? ` · ${t('selectedMix', { dm, call })}` : ''}</span>${n ? `<span class="t-cap pass-note">${icon('star', 'xs')}${t('feeNote')}</span>` : ''}</div>
    <button class="btn btn-primary btn-lg btn-block" data-act="send" ${n ? '' : 'disabled'}>${label}${n ? icon('right') : ''}</button>`;
}
function filterChips() {
  const present = new Set(scenario().candidates.map((c) => place(c.id).cuisine));
  const order = ['all', '한식', '일식', '양식', '중식', '치킨', '술집'].filter((k) => k === 'all' || present.has(k));
  return order.map((k) => `<button class="chip" data-act="filter" data-k="${k}" aria-pressed="${S.filter === k}">${t(k === 'all' ? 'fAll' : 'f' + k)}</button>`).join('');
}
function listHtml() {
  const list = visibleCands();
  const all = scenario().candidates;
  return list.map((c) => rowHtml(c, all.indexOf(c) + 1)).join('') || `<li class="empty">—</li>`;
}
function mapPins() {
  const all = scenario().candidates;
  return all.map((c, i) => ({ id: c.id, at: place(c.id).at, label: i + 1, state: S.selected.has(c.id) ? 'sel' : '' }));
}

export function demoSelect() {
  // three nearest recommended places: two by DM, one by AI call
  S.selected = new Map();
  const picks = scenario().candidates.filter((c) => !trust(place(c.id)).listingOnly).slice(0, 3);
  picks.forEach((c, i) => S.selected.set(c.id, i === 1 ? 'call' : 'dm'));
}

export function choose() {
  const sc = scenario();
  const target = placeName(sc.target);
  if (!S.flow.chooseStartedAt) S.flow.chooseStartedAt = Date.now();
  let map = null;
  const screen = mount(`
  <section class="screen" data-screen="choose">
    <header class="bar">
      <button class="icon-btn" data-act="back" aria-label="${esc(t('back'))}">${icon('left')}</button>
      <div class="loc">${icon('pin', 'sm')}<span>${esc(t('youAreHere', { target }))}</span></div>
      <span style="flex:1"></span>
      ${testBadge()}${langBtn()}
    </header>
    <div class="body" id="choose-body">
      ${stepsHtml(1)}
      <div class="mapbox" id="map-choose">
        <div class="map-legend"><span><i class="dot me"></i>${t('legendMe')}</span><span><i class="dot full"></i>${t('legendFull')}</span><span><i class="dot o"></i>${t('legendPlace')}</span></div>
      </div>
      <div class="full-banner">${icon('alert')}<span>${t('fullBanner', { target: esc(target), wait: sc.waitMin })}</span></div>
      <div class="found">
        <div><h2 class="h-sec">${t('found', { n: sc.candidates.length })}</h2><p class="t-meta">${t('foundSub', { min: Math.max(...sc.candidates.map((c) => c.walkMin)) })}</p></div>
      </div>
      <div class="opts">
        <div class="opt"><span class="lbl">${t('people')}</span>
          <div class="stepper"><button data-act="party" data-d="-1" aria-label="−" ${S.party <= 1 ? 'disabled' : ''}>−</button><output id="party">${S.party}</output><button data-act="party" data-d="1" aria-label="+" ${S.party >= 8 ? 'disabled' : ''}>+</button></div>
        </div>
        <div class="opt"><label for="when">${t('when')}</label>
          <select id="when">
            <option value="now" ${S.when === 'now' ? 'selected' : ''}>${t('whenNow')}</option>
            <option value="15" ${S.when === '15' ? 'selected' : ''}>${t('when15')}</option>
            <option value="30" ${S.when === '30' ? 'selected' : ''}>${t('when30')}</option>
          </select>
        </div>
      </div>
      <div class="filters"><div class="chips" role="group">${filterChips()}</div></div>
      <div class="list-head"><span class="t-meta">${t('pickHint', { max: MAX_PICK })}</span>
        <button class="quick" data-act="${S.selected.size ? 'clear' : 'top3'}">${S.selected.size ? icon('x', 'sm') + t('clearAll') : icon('star', 'sm') + t('pickTop3')}</button></div>
      <ul class="list" id="list">${listHtml()}</ul>
    </div>
    <div class="dock" id="dock">${dockHtml()}</div>
  </section>`, (root) => {
    bindHold(root);
    const refresh = () => {
      $('#list', root).innerHTML = listHtml();
      $('#dock', root).innerHTML = dockHtml();
      const q = $('.quick', root);
      q.dataset.act = S.selected.size ? 'clear' : 'top3';
      q.innerHTML = S.selected.size ? icon('x', 'sm') + t('clearAll') : icon('star', 'sm') + t('pickTop3');
      map && map.update({ pins: mapPins() });
      emit('select');
    };
    const toggle = (id) => {
      if (S.selected.has(id)) S.selected.delete(id);
      else if (S.selected.size >= MAX_PICK) { toast(t('maxReached', { max: MAX_PICK })); return; }
      else S.selected.set(id, 'dm');
      refresh();
    };
    root.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]');
      if (!a) return;
      const { act, id } = a.dataset;
      if (act === 'back') go('/');
      else if (act === 'lang') onLang(choose);
      else if (act === 'toggle') toggle(id);
      else if (act === 'detail') openDetail(id, refresh);
      else if (act === 'chan') { S.selected.set(id, a.dataset.ch); refresh(); }
      else if (act === 'filter') { S.filter = a.dataset.k; $$('.chip', root).forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.k === S.filter))); $('#list', root).innerHTML = listHtml(); }
      else if (act === 'party') { S.party = Math.min(8, Math.max(1, S.party + Number(a.dataset.d))); $('#party', root).textContent = S.party; $$('[data-act="party"]', root).forEach((b) => { b.disabled = (b.dataset.d === '-1' && S.party <= 1) || (b.dataset.d === '1' && S.party >= 8); }); emit('select'); }
      else if (act === 'top3') { visibleCands().filter((c) => !S.selected.has(c.id)).slice(0, 3).forEach((c) => S.selected.size < MAX_PICK && S.selected.set(c.id, 'dm')); refresh(); }
      else if (act === 'clear') { S.selected.clear(); refresh(); }
      else if (act === 'send') startMatch();
    });
    $('#when', root).addEventListener('change', (e) => { S.when = e.target.value; emit('select'); });
    map = mountMap($('#map-choose', root), {
      origin: sc.origin,
      full: place(sc.target).at,
      pins: mapPins(),
      interactive: true,
      static: !!params.shot,
      onPin: (pid) => {
        if (S.filter !== 'all' && place(pid).cuisine !== S.filter) { S.filter = 'all'; refresh(); $$('.chip', root).forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.k === 'all'))); }
        const row = root.querySelector(`.row[data-id="${pid}"]`);
        if (row) { row.scrollIntoView({ behavior: 'smooth', block: 'center' }); row.classList.remove('flash'); void row.offsetWidth; row.classList.add('flash'); }
      },
    });
    return () => map && map.destroy();
  });
  return screen;
}

export function startMatch() {
  if (!S.selected.size) return;
  const items = [...S.selected].map(([id, channel]) => ({ id, channel, walkMin: cand(id).walkMin }));
  if (S.match) S.match.stop();
  S.expanded = new Set();
  const f = S.flow;
  f.tried = true;
  f.scenario = S.scenarioId;
  f.chooseSec = f.chooseStartedAt ? Math.round((Date.now() - f.chooseStartedAt) / 1000) : null;
  f.selected = items.length;
  f.dm = items.filter((i) => i.channel === 'dm').length;
  f.call = items.length - f.dm;
  f.outcome = S.fac.outcome;
  f.result = null;
  f.winner = null;
  f.timeToYesSec = null;
  if (!params.shot) saveFlow();
  S.match = createMatch({ items, party: S.party, when: S.when, outcome: S.fac.outcome, speed: S.fac.speed, onChange: () => window.dispatchEvent(new CustomEvent('tmc:match')) });
  S.match.start();
  go('/wait');
}

// ------------------------------------------------------------------ subscribe question (₩3,000/month)
// Asked once, right after every booking ('post'): by then people have tried the idea, so the answer means
// something. It is an experiment: the answer is recorded (the last one counts), nothing is charged, and the
// flow always continues. The popup cannot be dismissed without an answer.
let subNext = null;
let jumped = false; // the presenter jumped straight to Booked: no popup for that visit
export function skipSubscribe() {
  const w = app().querySelector('.sub-sheet')?.parentElement;
  if (!w) return false;
  w.remove();
  S.subSheet = null;
  emit('select');
  const next = subNext;
  subNext = null;
  next && next();
  return true;
}

export function openSubscribe(moment, onNext, { preview = false } = {}) {
  if (app().querySelector('.sub-sheet')) return;
  subNext = onNext;
  const f = S.flow;
  const secs = Math.max(1, Math.round(S.match?.state?.winAt || 7));
  S.subSheet = moment;
  emit('select');
  const wrap = document.createElement('div');
  const question = () => `
    <div class="pass-card">
      <span class="pass-tag">${icon('star', 'xs')}${t('subName')}</span>
      <h2 class="h-title">${moment === 'post' ? t('subQPost', { s: secs }) : t('subQ')}</h2>
      <p class="t-sub">${t('subBody')}</p>
      <div class="pass-price"><b>${t('subPrice')}</b><span>${t('subPer')}</span></div>
      <p class="sub-free">${icon('info', 'xs')}${t('subFree')}</p>
    </div>
    <div class="sub-answers" role="group" aria-label="${esc(t('subQ'))}">
      <button class="btn btn-primary btn-lg btn-block" data-ans="yes">${t('subYes')}</button>
      <button class="btn btn-line btn-lg btn-block" data-ans="maybe">${t('subMaybe')}</button>
      <button class="btn btn-line btn-lg btn-block" data-ans="no">${t('subNo')}</button>
    </div>`;
  const after = () => `
    <div class="sub-done">
      <div class="check-pop">${icon('check')}</div>
      <h2 class="h-title">${t('subThanks')}</h2>
      <p class="t-sub">${moment === 'post' ? t('subNextPost') : t('subNextPre')}</p>
      <p class="t-cap pass-test">${icon('info', 'xs')}${t('subFree')}</p>
    </div>
    <button class="btn btn-primary btn-lg btn-block" data-act="next">${t('subContinue')}${icon('right')}</button>`;
  wrap.innerHTML = `
    <div class="scrim"></div>
    <div class="sheet sub-sheet" role="dialog" aria-modal="true" aria-label="${esc(t('subQ'))}">
      <div class="grab"></div>
      <div class="sheet-body sub-body">${question()}</div>
    </div>`;
  app().appendChild(wrap);
  wrap.addEventListener('click', (e) => {
    const ans = e.target.closest('[data-ans]');
    if (ans && !preview) {
      f[moment === 'post' ? 'subPost' : 'subPre'] = ans.dataset.ans;
      saveFlow();
      emit('select');
      wrap.querySelector('.sub-body').innerHTML = after();
      return;
    }
    if (e.target.closest('[data-act="next"]')) skipSubscribe();
  });
}

// ------------------------------------------------------------------ detail sheet
function curatorCards(p) {
  const tr = trust(p);
  if (tr.listingOnly) {
    return `<div class="cur"><div class="cur-top"><span class="cur-ava list">${icon('info')}</span><div><div class="cur-name">${t('noRecTitle')}</div><div class="cur-role">${t('noRecBody')}</div></div></div></div>`;
  }
  return tr.named.map((c) => {
    const meta = S.data.curators[c.id];
    const note = c.note;
    const details = note?.details?.[S.lang] || [];
    const href = S.lang === 'en' ? (c.urlEn || c.url) : c.url;
    return `<div class="cur">
      <div class="cur-top"><span class="cur-ava">${icon('chef')}</span><div><div class="cur-name">${esc(L(meta.name))}</div><div class="cur-role">${esc(L(meta.role))}</div></div></div>
      ${note ? `<q>${esc(L(note.quote))}</q>` : ''}
      ${details.length ? `<ul>${details.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
      ${href ? `<a href="${esc(href)}" target="_blank" rel="noopener">${icon('ext', 'xs')}${t('source')}</a>` : ''}
    </div>`;
  }).join('');
}
function mapLinks(p) {
  return Object.entries(p.maps || {}).map(([k, url]) => `<a class="btn btn-line btn-sm" href="${esc(url)}" target="_blank" rel="noopener">${esc(k)}${icon('ext', 'xs')}</a>`).join('');
}

export function openDetail(id, onChange) {
  const p = place(id);
  const c = cand(id);
  const tr = trust(p);
  const tips = tr.note?.tips?.[S.lang] || [];
  const sel = S.selected.has(id);
  const host = app();
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="scrim" data-act="close"></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(placeName(id))}">
      <div class="grab"></div>
      <div class="sheet-body">
        <div class="d-hero"><img src="${p.img['960']}" alt=""><span class="credit">${t('photoBy')}</span></div>
        <div class="d-head">
          <h2 class="h-title">${esc(placeName(id))}</h2>
          <p class="t-meta" style="margin:2px 0 6px">${esc([cuisineLabel(p), ...tagLabels(p)].join(' · '))} · ${esc(shortArea(p))}</p>
          ${c ? `<div class="walk">${icon('walk', 'sm')}${t('walkMin', { n: c.walkMin })}<span class="dist">· ${t('meters', { n: c.distM })}</span><span class="price">${'₩'.repeat(p.priceTier)} <small>${t('priceEst')}</small></span></div>` : ''}
          <div class="who" style="margin-top:8px">${whoBadges(p)}</div>
        </div>
        <div class="d-sec"><h3>${icon('chef', 'sm')}${t('whoRec')}</h3>${curatorCards(p)}</div>
        ${tips.length ? `<div class="d-sec"><h3>${icon('info', 'sm')}${t('tips')}</h3><ul style="margin:0;padding-left:18px;color:var(--ink-2);font-size:14px">${tips.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
        ${p.perks?.length ? `<div class="d-sec"><h3>${t('unistDeal')}</h3><ul style="margin:0;padding-left:18px;color:var(--ink-2);font-size:14px">${p.perks.map((x) => `<li>${esc(L(x))}</li>`).join('')}</ul></div>` : ''}
        <div class="d-sec"><h3>${t('info')}</h3>
          <dl class="kv">
            <dt>${t('address')}</dt><dd>${esc(S.lang === 'en' ? (p.addressEn || p.address) : p.address)}</dd>
            <dt>${t('phone')}</dt><dd class="masked">052-●●●-●●●●</dd>
            <dt>${t('insta')}</dt><dd class="masked">@●●●●●●●</dd>
          </dl>
          <p class="t-cap" style="margin:8px 0 0;display:flex;gap:4px;align-items:center">${icon('lock', 'xs')}${t('hiddenTest')}</p>
          <div class="map-links">${mapLinks(p)}</div>
        </div>
      </div>
      ${c ? `<div class="sheet-foot"><button class="btn ${sel ? 'btn-line' : 'btn-primary'} btn-lg btn-block" data-act="pick">${sel ? t('unchoose') : t('choose')}</button></div>` : ''}
    </div>`;
  host.appendChild(wrap);
  const close = () => wrap.remove();
  wrap.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (!a) return;
    if (a.dataset.act === 'close') close();
    if (a.dataset.act === 'pick') {
      if (S.selected.has(id)) S.selected.delete(id);
      else if (S.selected.size >= MAX_PICK) { toast(t('maxReached', { max: MAX_PICK })); return; }
      else S.selected.set(id, 'dm');
      close();
      onChange && onChange();
    }
  });
}

// ------------------------------------------------------------------ wait (screen 2)
const ST = {
  sending: ['wait', 'stSending'], sent: ['wait', 'stSent'], seen: ['wait', 'stSeen'], typing: ['live', 'stTyping'],
  calling: ['live', 'stCalling'], ringing: ['live', 'stRinging'], oncall: ['live', 'stOnCall'],
  yes: ['yes', 'stYes'], no: ['no', 'stNo'], noanswer: ['off', 'stNoAnswer'], cancelled: ['off', 'stCancelled'],
};
function msgText(m) {
  const v = { ...(m.vars || {}) };
  if (v.when) v.when = t(whenKey[v.when] || 'whenNowL');
  if (v.id) v.name = placeName(v.id);
  const s = t(m.key);
  return Array.isArray(s) ? fill(s[m.idx || 0], v) : t(m.key, v);
}
function msgHtml(m) {
  const text = esc(msgText(m));
  if (m.from === 'sys') return `<div class="msg sys">${text}</div>`;
  const who = m.from === 'owner'
    ? `${icon('utensils', 'xs')}${t('owner')} <span class="badge sim">${t('simReply')}</span>`
    : m.from === 'ai' ? `${icon('bot', 'xs')}${t('aiName')}` : `${icon('chef', 'xs')}${t('tmcBot')}`;
  const qr = m.qr ? `<div class="qr"><span class="${m.picked === 'yes' ? 'picked' : ''}">${t('dmYesBtn')}</span><span class="${m.picked === 'no' ? 'picked no' : ''}">${t('dmNoBtn')}</span></div>` : '';
  return `<div class="msg ${m.from}"><div class="who-l">${who}</div>${text}${qr}</div>`;
}
function statusPill(r) {
  const [cls, key] = ST[r.status] || ST.sent;
  const extra = r.status === 'typing' ? ' <span class="typing"><i></i><i></i><i></i></span>'
    : r.status === 'oncall' || r.status === 'ringing' ? ' <span class="wave"><i></i><i></i><i></i><i></i></span>'
      : r.status === 'yes' ? icon('check', 'xs') : '';
  return `<span class="st ${cls}">${t(key)}${extra}</span>`;
}
function reqHtml(r, st) {
  const p = place(r.id);
  const open = S.expanded.has(r.id);
  const win = st.winner === r.id;
  const out = ['no', 'noanswer', 'cancelled'].includes(r.status);
  const last = [...r.msgs].reverse().find((m) => m.from === 'owner' || m.from === 'ai');
  return `
  <li class="req ${win ? 'win' : ''} ${out ? 'out' : ''}">
    <button class="req-head" data-act="expand" data-id="${r.id}" aria-expanded="${open}">
      <span class="req-thumb"><img src="${p.img['480']}" alt=""><span class="req-ch">${icon(r.channel === 'dm' ? 'chat' : 'bot')}</span></span>
      <span style="min-width:0">
        <span class="req-name" style="display:block">${esc(placeName(r.id))}</span>
        <span class="req-line">${r.channel === 'dm' ? t('dm') : t('call')} · ${t('walkMin', { n: r.walkMin })}</span>
        ${!open && last ? `<span class="quote" style="margin-top:4px">${last.from === 'owner' ? t('owner') + ': ' : ''}${esc(msgText(last))}</span>` : ''}
      </span>
      ${statusPill(r)}
    </button>
    ${open ? `<div class="thread">${r.msgs.map(msgHtml).join('') || `<div class="msg sys">…</div>`}</div>` : ''}
  </li>`;
}
function logHtml(st) {
  return st.log.map((e) => {
    const v = { ...(e.vars || {}) };
    if (v.id) v.name = placeName(v.id);
    return `<li><time>${mmss(e.at)}</time><span>${esc(t(e.key, v))}</span></li>`;
  }).join('');
}

export function wait() {
  if (!S.match) { go('/choose', { replace: true }); return; }
  const st = S.match.state;
  let autoTimer = null;
  let tick = null;
  const banner = () => t('bookedBanner', { name: esc(placeName(st.winner)), iga: josa(placeName(st.winner), '이', '가') });
  const title = () => (st.result === 'booked' ? banner()
    : st.result === 'none' ? t('noneTitle')
      : st.reqs.length === 1 ? t('asking1') : t('asking', { n: st.reqs.length }));
  const radarCls = () => (st.result === 'booked' ? 'done' : st.result === 'none' ? 'none' : '');
  const radarIcon = () => (st.result === 'booked' ? icon('check', 'lg') : st.result === 'none' ? icon('x', 'lg') : icon('chat', 'lg'));
  const resultHtml = () => {
    if (st.result === 'booked') {
      return `<div class="result-panel ok"><div class="h-sec">${icon('check')}${banner()}</div></div>`;
    }
    if (st.result === 'none') {
      const no = st.reqs.filter((r) => r.status === 'no').length;
      const na = st.reqs.filter((r) => r.status === 'noanswer').length;
      return `<div class="result-panel none"><div class="h-sec">${icon('alert')}${t('noneTitle')}</div><p class="t-sub" style="margin:0">${t('noneBody', { no, na })}</p></div>`;
    }
    return '';
  };
  const dockInner = () => (st.result === 'booked'
    ? `<button class="btn btn-primary btn-lg btn-block" data-act="see">${t('seeBooking')}${icon('right')}</button>`
    : st.result === 'none'
      ? `<button class="btn btn-primary btn-lg btn-block" data-act="other">${t('tryOther')}</button>`
      : `<button class="btn btn-line btn-lg btn-block" data-act="stop">${icon('x')}${t('stop')}</button>`);

  if (!S.expanded.size && st.reqs[0]) S.expanded.add(st.reqs[0].id);

  mount(`
  <section class="screen" data-screen="wait">
    <header class="bar">
      <span class="icon-btn" aria-hidden="true"></span>
      <div class="title">${t('step2')}</div>
      ${testBadge()}${langBtn()}
    </header>
    <div class="body">
      ${stepsHtml(st.result === 'booked' ? 3 : 2)}
      <div class="wait-hero">
        <div class="radar ${radarCls()}" id="w-radar"><div class="core">${radarIcon()}</div></div>
        <div><h1 class="h-title" id="w-title">${title()}</h1><span class="timer" id="w-timer">${mmss(st.endedAt ?? S.match.elapsed())}</span></div>
      </div>
      <p class="rule">${icon('info', 'sm')}<span>${t('ruleFirst')}</span></p>
      <div id="w-result">${resultHtml()}</div>
      <ul class="reqs" id="w-reqs">${st.reqs.map((r) => reqHtml(r, st)).join('')}</ul>
      <details class="log" id="w-log" ${params.shot ? '' : 'open'}><summary>${icon('sliders', 'sm')}${t('logTitle')}${icon('down', 'sm chev')}</summary><ol id="w-logl">${logHtml(st)}</ol></details>
    </div>
    <div class="dock" id="w-dock">${dockInner()}</div>
  </section>`, (root) => {
    bindHold(root);
    let lastResult = st.result;
    const paint = () => {
      if (st.winner && !S.expanded.has(st.winner) && lastResult !== st.result) S.expanded.add(st.winner);
      $('#w-reqs', root).innerHTML = st.reqs.map((r) => reqHtml(r, st)).join('');
      $('#w-logl', root).innerHTML = logHtml(st);
      $('#w-title', root).innerHTML = title();
      const radar = $('#w-radar', root);
      radar.className = `radar ${radarCls()}`;
      radar.firstElementChild.innerHTML = radarIcon();
      if (lastResult !== st.result) {
        $('#w-result', root).innerHTML = resultHtml();
        $('#w-dock', root).innerHTML = dockInner();
        root.querySelector('.steps').outerHTML = stepsHtml(st.result === 'booked' ? 3 : 2);
        recordResult();
        if (st.result === 'booked' && !params.shot) autoTimer = setTimeout(() => go('/booked'), 3600);
        lastResult = st.result;
      }
    };
    const onMatch = () => paint();
    window.addEventListener('tmc:match', onMatch);
    if (!params.shot) {
      tick = setInterval(() => {
        const el = $('#w-timer', root);
        if (el) el.textContent = mmss(st.endedAt ?? S.match.elapsed());
      }, 250);
    }
    if (st.result === 'booked' && !params.shot && lastResult === 'booked') {
      // came back to this screen after booking
    }
    root.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]');
      if (!a) return;
      const act = a.dataset.act;
      if (act === 'lang') onLang(wait);
      else if (act === 'expand') {
        const id = a.dataset.id;
        if (S.expanded.has(id)) S.expanded.delete(id); else S.expanded.add(id);
        $('#w-reqs', root).innerHTML = st.reqs.map((r) => reqHtml(r, st)).join('');
      } else if (act === 'stop') {
        S.match.stop();
        S.flow.result = 'stopped';
        toast(t('stopped'));
        go('/choose');
      } else if (act === 'see') go('/booked');
      else if (act === 'other') {
        st.reqs.forEach((r) => S.selected.delete(r.id));
        S.match = null;
        go('/choose');
      }
    });
    return () => {
      window.removeEventListener('tmc:match', onMatch);
      clearInterval(tick);
      clearTimeout(autoTimer);
    };
  });
}

function recordResult() {
  const st = S.match?.state;
  if (!st) return;
  const f = S.flow;
  f.result = st.result;
  if (st.result === 'booked') {
    f.winner = st.winner;
    f.winnerListingOnly = trust(place(st.winner)).listingOnly;
    f.timeToYesSec = Math.round(st.winAt * 10) / 10;
  }
  if (!params.shot) saveFlow();
}

// ------------------------------------------------------------------ booked (screen 3)
export function booked() {
  const st = S.match?.state;
  if (!st || st.result !== 'booked') { go('/', { replace: true }); return; }
  recordResult();
  const sc = scenario();
  const id = st.winner;
  const p = place(id);
  const c = cand(id);
  const tr = trust(p);
  const offset = S.when === 'now' ? 0 : Number(S.when);
  const arrive = clock(new Date(Date.now() + (c.walkMin + offset + 2) * 60000));
  const others = st.reqs.filter((r) => r.id !== id);
  const oLabel = (r) => (r.status === 'no' ? `<span class="st no">${t('oNo')}</span>` : r.status === 'noanswer' ? `<span class="st off">${t('oNoAnswer')}</span>` : `<span class="st off">${t('oCancelled')}</span>`);
  let holdEnd = st.holdEnd || (st.holdEnd = Date.now() + 10 * 60 * 1000);
  if (params.shot) holdEnd = Date.now() + (9 * 60 + 41) * 1000;
  let map = null;
  let tick = null;
  mount(`
  <section class="screen" data-screen="booked">
    <header class="bar">
      <span class="icon-btn" aria-hidden="true"></span>
      <div class="title">${t('step3')}</div>
      ${testBadge()}${langBtn()}
    </header>
    <div class="body">
      ${stepsHtml(3)}
      <div class="done-hero">
        <div class="check-pop">${icon('check')}</div>
        <h1 class="h-title">${t('bookedTitle')}</h1>
        <p class="t-sub" style="margin:4px 0 0">${t('firstYes', { s: Math.max(1, Math.round(st.winAt || 7)) })}</p>
      </div>
      <div class="ticket">
        <div class="ticket-top">
          <div class="ph"><img src="${p.img['480']}" alt=""></div>
          <div style="min-width:0">
            <div class="req-name">${esc(placeName(id))}</div>
            <div class="t-meta">${esc(cuisineLabel(p))} · ${esc(shortArea(p))}</div>
            <div class="who" style="margin-top:6px">${whoBadges(p)}</div>
          </div>
        </div>
        <div class="ticket-grid">
          <div><small>${t('tPeople')}</small><b>${S.party}</b></div>
          <div><small>${t('tArrive')}</small><b>${arrive}</b></div>
          <div class="hold"><small>${t('tHold')}</small><b id="hold">${mmss((holdEnd - Date.now()) / 1000)}</b></div>
        </div>
        <div class="t-cap" style="padding:0 14px 12px">${t('bookingNo')} <b class="num" style="color:var(--ink)">${st.code}</b></div>
      </div>
      ${tr.listingOnly ? `<p class="warn-note">${icon('alert', 'sm')}<span>${t('badWarn')}</span></p>` : ''}
      <div class="mini-map">
        <div class="mapbox" id="map-booked"></div>
        <div class="walkline"><span class="walk">${icon('walk', 'sm')}${t('walkThere', { n: c.walkMin, m: c.distM })}</span></div>
        <div class="map-links" style="padding:0 12px 12px;margin:0">${mapLinks(p)}</div>
      </div>
      ${others.length ? `<div class="others"><b>${t('othersTitle')}</b><ul>${others.map((r) => `<li><span>${esc(placeName(r.id))}</span>${oLabel(r)}</li>`).join('')}</ul></div>` : ''}
      <div class="fee"><span>${t('feeCall')}</span><b>${t('feeTest')}</b></div>
    </div>
    <div class="dock">
      <div class="row2">
        <button class="btn btn-line btn-lg" data-act="restart" aria-label="${esc(t('startOver'))}">${icon('refresh')}</button>
        <button class="btn btn-primary btn-lg" data-act="rate">${t('rateNext')}${icon('right')}</button>
      </div>
    </div>
  </section>`, (root) => {
    bindHold(root);
    map = mountMap($('#map-booked', root), {
      origin: sc.origin,
      full: null,
      pins: [{ id, at: p.at, label: '✓', state: 'win' }],
      route: c.route,
      interactive: true,
      static: !!params.shot,
    });
    if (!params.shot) {
      tick = setInterval(() => {
        const el = $('#hold', root);
        if (el) el.textContent = mmss((holdEnd - Date.now()) / 1000);
      }, 1000);
    }
    root.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]');
      if (!a) return;
      if (a.dataset.act === 'lang') onLang(booked);
      if (a.dataset.act === 'restart') { resetFlow(); go('/'); }
      if (a.dataset.act === 'rate') go('/rate');
    });
    // the subscribe question, after they have seen the value (skipped for previews and presenter jumps)
    const subTimer = !params.shot && !jumped
      ? setTimeout(() => openSubscribe('post', null), 1400) : null; // after the answer they stay on the booking
    jumped = false;
    return () => { clearInterval(tick); clearTimeout(subTimer); map && map.destroy(); };
  });
}

// ------------------------------------------------------------------ qual (offline part, on paper)
export function qual() {
  const steps = ['qual1t', 'qual2t', 'qual3t'];
  const icons = ['utensils', 'alert', 'sliders'];
  const now = Math.min(S.qual || 0, steps.length - 1);
  mount(`
  <section class="screen" data-screen="qual">
    <header class="bar"><span class="icon-btn" aria-hidden="true"></span><div class="title">${t('stepQual')}</div>${testBadge()}${langBtn()}</header>
    <div class="body">
      <div class="qual-hero">
        <div class="postits" aria-hidden="true"><i></i><i></i><i></i></div>
        <h1 class="h-title">${t('qualPhoneTitle')}</h1>
        <p class="t-sub">${t('qualPhoneBody')}</p>
      </div>
      <ol class="qual-list">${steps.map((k, i) => `<li class="${i < now ? 'done' : i === now ? 'now' : ''}"><span class="n">${icon(icons[i], 'sm')}</span><b>${t(k)}</b></li>`).join('')}</ol>
    </div>
    <div class="dock"><button class="btn btn-line btn-lg btn-block" data-act="home">${icon('refresh')}${t('qualHome')}</button></div>
  </section>`, (root) => {
    bindHold(root);
    root.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]');
      if (!a) return;
      if (a.dataset.act === 'lang') onLang(qual);
      if (a.dataset.act === 'home') { resetFlow(); go('/'); }
    });
  });
}

// ------------------------------------------------------------------ facilitator
export function facOptions() {
  const out = [['normal', 'facNormal', 'facNormalD'], ['bad', 'facBad', 'facBadD'], ['none', 'facNone', 'facNoneD']];
  return out.map(([k, a, b]) => `<button data-fac="outcome" data-v="${k}" aria-pressed="${S.fac.outcome === k}">${t(a)}<small>${t(b)}</small></button>`).join('');
}
export function speedOptions() {
  return `<div class="seg-ctl">${[['normal', 'facSpeedN'], ['fast', 'facSpeedF']].map(([k, l]) => `<button data-fac="speed" data-v="${k}" aria-pressed="${S.fac.speed === k}">${t(l)}</button>`).join('')}</div>`;
}
export function onFacClick(e, after) {
  const b = e.target.closest('[data-fac]');
  if (!b) return false;
  setFac({ [b.dataset.fac]: b.dataset.v });
  toast(`${t('facSaved')}: ${b.dataset.label || b.firstChild?.textContent?.trim() || b.dataset.v}`);
  after && after();
  return true;
}

export function openFac() {
  if (app().querySelector('.sheet')) return;
  const wrap = document.createElement('div');
  const paint = () => {
    wrap.innerHTML = `
    <div class="scrim" data-act="close"></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(t('facTitle'))}">
      <div class="grab"></div>
      <div class="sheet-body">
        <div class="d-head"><h2 class="h-title">${icon('sliders')} ${t('facTitle')}</h2></div>
        <div class="fac-row"><span class="lbl">${t('facOutcome')}</span><div class="fac-opts">${facOptions()}</div></div>
        <div class="fac-row"><span class="lbl">${t('facSpeed')}</span>${speedOptions()}</div>
      </div>
      <div class="sheet-foot"><button class="btn btn-dark btn-lg btn-block" data-act="close">${t('close')}</button></div>
    </div>`;
  };
  paint();
  app().appendChild(wrap);
  wrap.addEventListener('click', (e) => {
    if (onFacClick(e, paint)) return;
    if (e.target.closest('[data-act="close"]')) wrap.remove();
  });
}

// ------------------------------------------------------------------ presenter jumps
// Used by the presenter view (stage.js) to show any of the three main screens on demand.
export function jumpTo(step) {
  if (step === 'intro') { resetFlow(); go('/'); return; }
  if (step === 'choose') { if (S.match) S.match.stop(); S.match = null; go('/choose'); return; }
  if (!S.selected.size) demoSelect();
  if (step === 'wait') { startMatch(); return; }
  if (step === 'booked') {
    const items = [...S.selected].map(([pid, channel]) => ({ id: pid, channel, walkMin: cand(pid).walkMin }));
    if (S.match) S.match.stop();
    S.match = frozenMatch({ items, party: S.party, when: S.when, mode: 'booked' });
    S.flow.tried = true;
    jumped = true;
    go('/booked');
  }
}

// ------------------------------------------------------------------ preview shots (iframes)
export function shot(name) {
  if (params.at) setScenario(params.at);
  demoSelect();
  if (name === 'bad') {
    // "What if 1": a place with no recommender answers first
    const weak = scenario().candidates.find((c) => trust(place(c.id)).listingOnly);
    const d = [...S.selected]; // [dm, call, dm]; keep the AI call in second place like the other shots
    if (weak) S.selected = new Map([[weak.id, 'dm'], d[1], d[0]]);
  }
  const items = [...S.selected].map(([id, channel]) => ({ id, channel, walkMin: cand(id).walkMin }));
  if (name === 'intro') return intro();
  if (name === 'pass') {
    // the Pass question as people see it: on the booking screen, right after a Yes
    S.match = frozenMatch({ items, party: S.party, when: S.when, mode: 'booked' });
    const screen = booked();
    openSubscribe('post', null, { preview: true });
    return screen;
  }
  if (name === 'choose') {
    const screen = choose();
    // previews should show the picked rows, so scroll the list into view
    const body = screen.querySelector('#choose-body');
    const head = screen.querySelector('.list-head');
    if (body && head) body.scrollTop = head.getBoundingClientRect().top - body.getBoundingClientRect().top - 8;
    return screen;
  }
  const mode = name === 'booked' || name === 'bad' ? 'booked' : name === 'none' ? 'none' : 'wait';
  S.match = frozenMatch({ items, party: S.party, when: S.when, mode });
  if (mode === 'booked') return booked();
  S.expanded = new Set([name === 'call' ? items[1].id : items[0].id]);
  return wait();
}

// preview overlay: show one screen full size (used by the survey)
export function openPreview(name) {
  const wrap = document.createElement('div');
  const scale = Math.min(1, (app().clientWidth - 32) / 390, (app().clientHeight - 140) / 844);
  wrap.innerHTML = `
    <div class="scrim" data-act="close"></div>
    <div class="sheet" role="dialog" aria-modal="true" style="align-items:center">
      <div class="grab"></div>
      <div style="width:${Math.round(390 * scale)}px;height:${Math.round(844 * scale)}px;margin:8px auto;border-radius:18px;overflow:hidden;border:3px solid #1a1a1a;position:relative">
        <iframe src="/?shot=${name}&lang=${S.lang}&at=${S.scenarioId}" title="preview" style="width:390px;height:844px;border:0;transform:scale(${scale});transform-origin:0 0;position:absolute;left:0;top:0"></iframe>
      </div>
      <div class="sheet-foot" style="width:100%"><button class="btn btn-dark btn-lg btn-block" data-act="close">${t('close')}</button></div>
    </div>`;
  app().appendChild(wrap);
  wrap.addEventListener('click', (e) => { if (e.target.closest('[data-act="close"]')) wrap.remove(); });
}
