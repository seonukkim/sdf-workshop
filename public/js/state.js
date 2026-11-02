import { makeT } from './i18n.js';

const qs = new URLSearchParams(location.search);

export function lsGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
export function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode: keep going without storage */
  }
}

// URL switches for facilitators and for the screen previews used by the survey and the design board.
export const params = {
  shot: qs.get('shot'),          // intro | choose | wait | call | booked
  lang: qs.get('lang'),          // en | ko
  speed: qs.get('speed'),        // normal | fast
  outcome: qs.get('outcome'),    // normal | bad | none
  at: qs.get('at'),              // guyeong | samsan
};

// Facilitator mode is only the presenter PC, opened with ?fac=1 (kept for that tab; ?fac=0 ends it).
export const FAC = (() => {
  const v = qs.get('fac');
  try {
    if (v === '1') sessionStorage.setItem('tmc.facilitator', '1');
    if (v === '0') sessionStorage.removeItem('tmc.facilitator');
    return sessionStorage.getItem('tmc.facilitator') === '1';
  } catch {
    return v === '1';
  }
})();

// Language: a ?lang= link (this page only), else what this visitor picked with the language button (remembered),
// else the phone's or computer's own setting: Korean when it is set to Korean, English for everyone else, so
// international students never land on Korean. The big screen PC starts in English because the whole room reads it.
const okLang = (v) => (v === 'en' || v === 'ko' ? v : null);
const deviceLang = () => (/^ko\b/i.test(navigator.languages?.[0] || navigator.language || '') ? 'ko' : 'en');

const savedFac = lsGet('tmc.fac', {});

export const S = {
  data: null,
  lang: okLang(params.lang) || okLang(lsGet('tmc.langPick', null)) || (FAC ? 'en' : deviceLang()),
  scenarioId: params.at || lsGet('tmc.scenario', 'guyeong'),
  party: 2,
  when: 'now',
  filter: 'all',
  selected: new Map(),   // place id -> 'dm' | 'call' (insertion order = pick order)
  match: null,           // running simulation (see sim.js)
  booking: null,
  subSheet: null,        // 'pre' | 'post' while the subscribe popup is open (the presenter view highlights it)
  admin: false,          // facilitator mode (presenter PC opened with ?fac=1): steps can be skipped, nothing is sent
  qual: 0,               // Qual (offline post-it) guide: 0 write · 1 what if · 2 A3 2×2 · 3 discuss
  // what the participant did in the prototype; kept on the phone so a later visit to /rate still has it
  flow: { ...newFlow(), ...lsGet('tmc.flow', {}) },
  fac: {
    outcome: params.outcome || savedFac.outcome || 'normal',
    speed: params.speed || savedFac.speed || 'normal',
  },
  expanded: new Set(),
};

export function newFlow() {
  return {
    tried: false,
    scenario: null,
    chooseStartedAt: null,
    chooseSec: null,
    selected: 0,
    dm: 0,
    call: 0,
    outcome: null,
    result: null,        // booked | none | stopped
    winner: null,
    winnerListingOnly: null,
    timeToYesSec: null,
    // "Would you subscribe? ₩2,500/month" asked once, right after booking (subPost); subPre stays empty now
    subPre: null,        // 'yes' | 'maybe' | 'no'
    subPost: null,
  };
}

export const t = makeT(() => S.lang);
export const L = (o) => (o ? (o[S.lang] ?? o.en ?? o.ko ?? '') : '');

// app-wide events: route, select, match, lang, fac (the presenter view listens to these)
export function emit(name, detail) {
  window.dispatchEvent(new CustomEvent(`tmc:${name}`, { detail }));
}

export function setLang(lang) {
  const changed = S.lang !== lang;
  S.lang = lang;
  if (!params.shot) lsSet('tmc.langPick', lang); // only a tap lands here; previews must not change the visitor's language
  document.documentElement.lang = lang;
  if (changed) emit('lang', lang);
}
export function setScenario(id) {
  S.scenarioId = id;
  if (!params.shot) lsSet('tmc.scenario', id);
}
export function setFac(patch) {
  Object.assign(S.fac, patch);
  lsSet('tmc.fac', S.fac);
  emit('fac', S.fac);
}

export const scenario = () => S.data.scenarios.find((s) => s.id === S.scenarioId) || S.data.scenarios[0];
export const place = (id) => S.data.places[id];
export const cand = (id) => scenario().candidates.find((c) => c.id === id);

// Who stands behind a place: named curators versus a bare map listing.
export function trust(p) {
  const named = p.curators.filter((c) => c.id !== 'listing');
  const gourmet = p.curators.find((c) => c.id === 'gourmet');
  return { named, listingOnly: named.length === 0, note: gourmet?.note || null };
}

export function saveFlow() {
  lsSet('tmc.flow', S.flow);
}

export function resetFlow() {
  if (S.match) S.match.stop();
  S.match = null;
  S.booking = null;
  S.selected = new Map();
  S.expanded = new Set();
  // the subscribe answers belong to the person, so a new run on the same phone keeps them
  const { subPre, subPost } = S.flow;
  S.flow = { ...newFlow(), subPre, subPost };
  S.filter = 'all';
  saveFlow();
}

// next participant on a shared phone: forget their answers too
export function resetPerson() {
  S.flow = newFlow();
  resetFlow();
}
