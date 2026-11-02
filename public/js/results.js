// Facilitator dashboard (quantitative part): reads /api/responses with the results key and shows
// ONE 2×2 matrix — How convenient is it? × Would you pay for it? (1–10) — for each screen and the whole
// service, plus "Would you subscribe? ₩2,500/month", asked once right after booking (the sales point).
// Post-it ideas are analysed on paper (affinity diagram).
import { makeXlsx } from './xlsx.js';

const T = {
  en: {
    title: 'Workshop results', refresh: 'Refresh', csvResp: 'CSV · answers', wipe: 'Delete all answers', lock: 'Lock',
    gateTitle: 'Enter the results key', gateBody: 'Only the team can see the answers.', open: 'Open', badKey: 'Wrong key. Try again.',
    netErr: 'Could not load. Check the internet and try again.',
    chartA: 'How convenient × Would you pay (1–10)', showDots: 'Show every answer',
    behavior: 'What people did in the prototype', profile: 'Who answered',
    group: 'Group', gender: 'Gender', aff: 'Affiliation', age: 'Age', all: 'All', count: '{n} of {total} responses',
    kResp: 'Responses', kTried: 'Tried the prototype', kSub: 'Would subscribe (Yes) · after booking', kPay: 'Avg. “would pay” · whole service',
    of: 'of {n}', item: 'Item', mx: 'Conv.', my: 'Pay', nn: 'n', spread: 'Answers by quadrant', byMean: 'Mean is in',
    S1: 'Screen 1 · Ask many places at once', S2: 'Screen 2 · The first Yes wins', S3: 'Screen 3 · Booking confirmed', S4: 'The whole service (Pass ₩2,500/mo)',
    mp: 'Worth paying for', np: 'Would pay, but not convenient', mf: 'Good, but should be free', nn2: 'Not useful',
    noData: 'No responses yet.',
    xConv: 'How convenient', yPay: 'Would pay',
    list: 'Every answer · tick to delete', toList: 'Select & delete ↓', recorded: 'Recorded (KST)',
    selOne: 'Select the answer recorded {time}', selAllA: 'Select all answers shown', selCount: '{n} of {total} selected',
    selHint: 'Tick the answers to delete. The box at the top selects all.', delSel: 'Delete selected ({n})',
    delSelTitle: 'Delete {n} selected answers?', delSelOk: 'Delete {n}',
    delSelBody: 'They are removed from the server and cannot be brought back. Download CSV or XLSX first if you need a copy.',
    deletedN: '{n} answers deleted.', deletedSome: 'Deleted {n} of {total}. Try again for the rest.',
    ovTitle: 'At a glance', ovTime: 'Answers over time (KST)', ovTimeSub: 'Running total · first {a}, last {b} · each dot is one answer',
    tlTip: '{n} answers · {time} · {g}', ovSub: 'Would subscribe after booking? (₩2,500/month)', ovItems: 'Average per screen (1–10)',
    ovPay: 'Would pay for the whole service (1–10)', payTip: '{n} people gave {v}', payHigh: '6–10 (would pay)', median: 'median {v}',
    ovDur: 'How long it took', ovChoose: 'Picking places', ovYes: 'Until the first Yes', onePerson: 'one person', del: 'Delete', delAsk: 'Delete this answer? (for test runs)', grp: 'Group', ages: 'Age', sub: 'Subscribe', rates: 'Ratings 1–4 (conv/pay)',
    bSubPre: 'Would subscribe (₩2,500/mo)? · Before trying', bSubPost: 'Would subscribe (₩2,500/mo)? · After booking',
    bShift: 'Change after trying', up: 'More willing', same: 'Same', down: 'Less willing', yes: 'Yes', maybe: 'Maybe', no: 'No', teaching: 'Teaching',
    bResult: 'Result in the prototype', booked: 'Booked', none: 'No one said Yes', stopped: 'Stopped', notTried: 'Did not try',
    bSel: 'Places picked (avg.)', bTime: 'Time to choose (median)', bYes: 'Time to first Yes (median)', bOutcome: 'Facilitator setting',
    normal: 'Normal', bad: 'What if 1 (bad place)', none2: 'What if 2 (no one)',
    pGender: 'Gender', pAge: 'Age', pAff: 'Affiliation', pMeals: 'Meals out / month', pApps: 'Apps used',
    female: 'Female', male: 'Male', other: 'Other', na: 'Prefer not to say', undergrad: 'Undergraduate', grad: 'Graduate student', intl: 'International student', worker: 'Office worker',
    naver: 'Naver Map', kakao: 'KakaoMap', google: 'Google Maps', instagram: 'Instagram', catchtable: 'Catch Table', youtube: 'YouTube',
    ageStats: 'n {n} · mean {m} · median {md} · range {lo}–{hi}', unknown: 'No answer',
    wiped: 'All answers deleted.',
    midNote: 'Scale 1–10. 6 or more counts as high. Big dots = averages; small dots = single answers.',
    sec: 's',
    live: 'Live · updated {t}', liveOff: 'Offline · retrying',
    xlsx: 'XLSX · all', cancel: 'Cancel',
    wipeTitle: 'Delete all {n} answers?', wipeOk: 'Delete all {n}',
    wipeBody: 'This removes every answer on the server, not only the filtered ones. It cannot be undone. Download CSV or XLSX first if you need a copy.',
    delTitle: 'Delete this answer?', delBody: 'Recorded {time} · group {g}. It cannot be undone.', deleted: 'Answer deleted.',
    cmpTitle: 'Compare by', groupN: 'Group {n}',
    cmpNote: 'Dots 1–4 = the average of each item (x: How convenient, y: Would pay, 1–10). People can pick several apps, so one person can be in more than one app row.',
    cCat: 'Category', s1s: 'Screen 1', s2s: 'Screen 2', s3s: 'Screen 3', s4s: 'Whole service', cQuad: 'Whole service is in',
    cSub: 'Subscribe after booking', cCh: 'DM : AI call', cPick: 'Places picked', cYes: 'First Yes', subLine: 'Yes {y} · Maybe {m} · No {n}',
  },
  ko: {
    title: '워크숍 결과', refresh: '새로고침', csvResp: 'CSV · 응답', wipe: '응답 모두 삭제', lock: '잠그기',
    gateTitle: '결과 키를 입력하세요', gateBody: '팀원만 볼 수 있어요.', open: '열기', badKey: '키가 맞지 않아요.',
    netErr: '불러오지 못했어요. 인터넷 연결을 확인해 주세요.',
    chartA: '편리함 × 지불 의향 (1–10)', showDots: '개별 응답 보기',
    behavior: '프로토타입에서 한 행동', profile: '응답자',
    group: '모둠', gender: '성별', aff: '소속', age: '나이', all: '전체', count: '응답 {total}개 중 {n}개',
    kResp: '응답 수', kTried: '프로토타입 사용', kSub: '구독 의향(네) · 예약한 뒤', kPay: '서비스 전체 지불 의향 평균',
    of: '{n}명 중', item: '항목', mx: '편리', my: '지불', nn: 'n', spread: '사분면별 응답', byMean: '평균 위치',
    S1: '화면 1 · 여러 곳에 한 번에 요청', S2: '화면 2 · 먼저 수락한 곳으로', S3: '화면 3 · 예약 확정', S4: '서비스 전체 (패스 월 ₩2,500)',
    mp: '돈 낼 만해요', np: '돈은 내겠지만 불편해요', mf: '좋지만 무료여야 해요', nn2: '필요 없어요',
    noData: '아직 응답이 없어요.',
    xConv: '편리함', yPay: '지불 의향',
    list: '전체 응답 · 체크해서 삭제', toList: '선택해서 삭제 ↓', recorded: '기록 시각 (KST)',
    selOne: '{time} 응답 선택', selAllA: '보이는 응답 모두 선택', selCount: '{total}개 중 {n}개 선택',
    selHint: '지울 응답을 체크하세요. 맨 위 칸을 누르면 모두 선택돼요.', delSel: '선택 삭제 ({n})',
    delSelTitle: '선택한 응답 {n}개를 지울까요?', delSelOk: '{n}개 삭제',
    delSelBody: '서버에서 지워지고 되돌릴 수 없어요. 필요하면 먼저 CSV나 XLSX로 받아 두세요.',
    deletedN: '응답 {n}개를 지웠어요.', deletedSome: '{total}개 중 {n}개를 지웠어요. 나머지는 다시 시도해 주세요.',
    ovTitle: '한눈에 보기', ovTime: '시간대별 응답 (KST)', ovTimeSub: '누적 응답 · 처음 {a}, 마지막 {b} · 점 하나가 응답 하나',
    tlTip: '응답 {n}개 · {time} · {g}', ovSub: '예약 뒤 구독 의향 (월 ₩2,500)', ovItems: '화면별 평균 (1–10)',
    ovPay: '서비스 전체 지불 의향 분포 (1–10)', payTip: '{v}점 {n}명', payHigh: '6–10점 (지불 의향 있음)', median: '중앙값 {v}',
    ovDur: '걸린 시간', ovChoose: '식당 고르기', ovYes: '첫 수락까지', onePerson: '한 사람', del: '삭제', delAsk: '이 응답을 삭제할까요? (테스트용)', grp: '모둠', ages: '나이', sub: '구독', rates: '평가 1–4 (편리/지불)',
    bSubPre: '구독(월 ₩2,500) 의향 · 써 보기 전', bSubPost: '구독(월 ₩2,500) 의향 · 예약한 뒤',
    bShift: '써 본 뒤 변화', up: '더 긍정적', same: '같음', down: '더 부정적', yes: '네', maybe: '잘 모르겠어요', no: '아니요', teaching: 'Teaching',
    bResult: '프로토타입 결과', booked: '예약 완료', none: '수락 없음', stopped: '중간 취소', notTried: '사용 안 함',
    bSel: '고른 식당 수 (평균)', bTime: '고르는 시간 (중앙값)', bYes: '첫 수락까지 (중앙값)', bOutcome: '진행자 설정',
    normal: '기본', bad: '만약에 1 (별로인 곳)', none2: '만약에 2 (수락 없음)',
    pGender: '성별', pAge: '나이 (만)', pAff: '소속', pMeals: '한 달 외식 횟수', pApps: '사용하는 앱',
    female: '여성', male: '남성', other: '그 외', na: '답하지 않음', undergrad: '학부생', grad: '대학원생', intl: '국제학생', worker: '직장인',
    naver: '네이버 지도', kakao: '카카오맵', google: '구글 지도', instagram: '인스타그램', catchtable: '캐치테이블', youtube: '유튜브',
    ageStats: 'n {n} · 평균 {m} · 중앙값 {md} · 범위 {lo}–{hi}', unknown: '무응답',
    wiped: '모든 응답을 지웠어요.',
    midNote: '1–10점 척도. 6점 이상을 높음으로 봐요. 큰 점 = 평균, 작은 점 = 개별 응답.',
    sec: '초',
    live: '실시간 · {t} 갱신', liveOff: '연결 끊김 · 다시 시도 중',
    xlsx: 'XLSX · 전체', cancel: '취소',
    wipeTitle: '응답 {n}개를 모두 지울까요?', wipeOk: '{n}개 모두 삭제',
    wipeBody: '필터와 상관없이 서버에 있는 모든 응답이 지워지고, 되돌릴 수 없어요. 필요하면 먼저 CSV나 XLSX로 받아 두세요.',
    delTitle: '이 응답을 지울까요?', delBody: '{time} 기록 · 모둠 {g}. 되돌릴 수 없어요.', deleted: '응답을 지웠어요.',
    cmpTitle: '분류별 비교', groupN: '{n}모둠',
    cmpNote: '점 1–4 = 항목별 평균 (가로: 편리함, 세로: 지불 의향, 1–10). 앱은 여러 개 고를 수 있어서 한 사람이 여러 줄에 들어갈 수 있어요.',
    cCat: '분류', s1s: '화면 1', s2s: '화면 2', s3s: '화면 3', s4s: '서비스 전체', cQuad: '서비스 전체 위치',
    cSub: '예약 뒤 구독', cCh: 'DM : AI 전화', cPick: '고른 곳', cYes: '첫 수락', subLine: '네 {y} · 잘 모르겠어요 {m} · 아니요 {n}',
  },
};
// language, same rule as the app: a ?lang=en|ko link sets this page only; else the language last picked
// with the button here (kept apart from the app's pick, so this page never changes the big screen);
// else the device's first language: Korean if it is Korean, English for every other language
const LANG_KEY = 'tmc.resultsLang';
function startLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'en' || q === 'ko') return q;
  try { const s = localStorage.getItem(LANG_KEY); if (s === 'en' || s === 'ko') return s; } catch { /* ignore */ }
  return /^ko(-|$)/i.test(navigator.languages?.[0] || navigator.language || '') ? 'ko' : 'en';
}
let lang = startLang();
const t = (k, v) => {
  let s = T[lang][k] ?? T.en[k] ?? k;
  if (v) s = s.replace(/\{(\w+)\}/g, (m, x) => (v[x] ?? m));
  return s;
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (s) => document.querySelector(s);

const ITEMS = ['s1', 's2', 's3', 's4'];
// pastel, orange-led palette: soft orange, peach, blush and light warm gray (no yellow, no brown).
// Light fills are never the only cue: values are printed in ink next to every mark and the tables repeat them.
const QCOLOR = { mp: '#FFA36C', np: '#F7B2B7', mf: '#FFD2BA', nn: '#E4E2DF' };
const QTINT = { mp: '#FFF0E6', np: '#FFF1F2', mf: '#FFF7F1', nn: '#F8F7F6' };
// numbers inside a dot: ink on pastel fills
const onFill = () => '#1C1A19';
const quad = (x, y) => (x == null || y == null ? null : x >= 6 ? (y >= 6 ? 'mp' : 'mf') : (y >= 6 ? 'np' : 'nn'));
const qName = (q) => t(q === 'nn' ? 'nn2' : q);
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
const median = (a) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const sd = (a) => {
  if (a.length < 2) return null;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
};
const f1 = (v) => (v == null ? '–' : v.toFixed(1));
const pct = (n, d) => (d ? Math.round((n / d) * 100) + '%' : '–');

let KEY = null;
let ROWS = [];
let SIG = '';        // what is on screen now, so a background refresh only redraws when answers changed
let liveTimer = null;
const LIVE_MS = 10000;
const F = { group: 'all', gender: 'all', aff: 'all', age: 'all' };

// ------------------------------------------------------------------ key + load
// the key lives only in memory, so a reload asks for it again; a #key=… link still opens directly once
function readKey() {
  try { sessionStorage.removeItem('tmc.key'); } catch { /* ignore */ }
  const m = location.hash.match(/key=([^&]+)/);
  KEY = m ? decodeURIComponent(m[1]) : null;
  if (m) history.replaceState(null, '', location.pathname + location.search);
}

// answers are saved on the server (D1) the moment a phone submits; this page re-reads them every 10 s
async function load({ quiet = false } = {}) {
  clearTimeout(liveTimer);
  if (!KEY) { showGate(); return; }
  try {
    const res = await fetch('/api/responses', { headers: { authorization: `Bearer ${KEY}` }, cache: 'no-store' });
    if (res.status === 401) { KEY = null; showGate(t('badKey')); return; }
    if (!res.ok) throw new Error(res.status);
    const rows = (await res.json()).rows || [];
    const sig = rows.map((r) => `${r.id}:${r.updatedAt || r.createdAt}`).join(',');
    $('#gate').hidden = true;
    $('#dash').hidden = false;
    document.body.classList.remove('rs-locked');
    if (!quiet || sig !== SIG) { SIG = sig; ROWS = rows; draw(); }
    liveStamp(true);
  } catch {
    // a failed background refresh keeps the last answers on screen and tries again
    if (!quiet) { showGate(t('netErr')); return; }
    liveStamp(false);
  }
  liveTimer = setTimeout(() => load({ quiet: true }), LIVE_MS);
}

function liveStamp(ok) {
  const el = $('#live');
  if (!el) return;
  const time = new Date().toLocaleTimeString('sv-SE', { timeZone: 'Asia/Seoul' });
  el.classList.toggle('off', !ok);
  el.textContent = ok ? t('live', { t: time }) : t('liveOff');
}

function showGate(err) {
  clearTimeout(liveTimer);
  document.body.classList.add('rs-locked');
  $('#dash').hidden = true;
  $('#gate').hidden = false;
  const e = $('#gate-err');
  e.hidden = !err;
  e.textContent = err || '';
  $('#key').focus();
}

// ------------------------------------------------------------------ filters
const ageBand = (a) => (a == null ? 'unknown' : a < 20 ? '<20' : a < 25 ? '20–24' : a < 30 ? '25–29' : '30+');
function filtered() {
  return ROWS.filter((r) =>
    (F.group === 'all' || (r.group || 'unknown') === F.group)
    && (F.gender === 'all' || (r.profile?.gender || 'unknown') === F.gender)
    && (F.aff === 'all' || (r.profile?.affiliation || 'unknown') === F.aff)
    && (F.age === 'all' || ageBand(r.profile?.age) === F.age));
}
function filtersHtml(rows) {
  const sel = (key, label, values, fmt) => {
    const opts = ['all', ...values].map((v) => `<option value="${esc(v)}" ${F[key] === v ? 'selected' : ''}>${esc(v === 'all' ? t('all') : fmt(v))}</option>`).join('');
    return `<label>${label}<select data-f="${key}">${opts}</select></label>`;
  };
  const uniq = (fn) => [...new Set(ROWS.map(fn))].sort();
  return sel('group', t('group'), uniq((r) => r.group || 'unknown'), (v) => (v === 'unknown' ? t('unknown') : v === 'teaching' ? t('teaching') : v))
    + sel('gender', t('gender'), uniq((r) => r.profile?.gender || 'unknown'), (v) => (v === 'unknown' ? t('unknown') : t(v)))
    + sel('aff', t('aff'), uniq((r) => r.profile?.affiliation || 'unknown'), (v) => (v === 'unknown' ? t('unknown') : t(v)))
    + sel('age', t('age'), uniq((r) => ageBand(r.profile?.age)), (v) => (v === 'unknown' ? t('unknown') : v))
    + `<span class="count">${t('count', { n: rows.length, total: ROWS.length })}</span>`;
}

// ------------------------------------------------------------------ chart
function matrix({ means = [], dots = [], xLabel, yLabel, size = 440 }) {
  const pad = 46, w = size, h = size, inner = w - pad - 18;
  const X = (v) => pad + ((v - 0.5) / 10) * inner;
  const Y = (v) => 18 + inner - ((v - 0.5) / 10) * inner;
  const mid = pad + inner / 2, midY = 18 + inner / 2;
  let s = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" font-family="Pretendard Variable, sans-serif" role="img" aria-label="${esc(xLabel)} × ${esc(yLabel)}">`;
  s += `<rect x="${pad}" y="18" width="${inner}" height="${inner}" fill="#fff" stroke="#DCD6CE"/>`;
  s += `<rect x="${mid}" y="18" width="${inner / 2}" height="${inner / 2}" fill="${QTINT.mp}"/>`;
  s += `<rect x="${mid}" y="${midY}" width="${inner / 2}" height="${inner / 2}" fill="${QTINT.mf}"/>`;
  s += `<rect x="${pad}" y="18" width="${inner / 2}" height="${inner / 2}" fill="${QTINT.np}"/>`;
  for (let v = 1; v <= 10; v++) {
    s += `<text x="${X(v)}" y="${18 + inner + 16}" font-size="10.5" fill="#8A827B" text-anchor="middle">${v}</text>`;
    s += `<text x="${pad - 8}" y="${Y(v) + 3.5}" font-size="10.5" fill="#8A827B" text-anchor="end">${v}</text>`;
  }
  s += `<line x1="${mid}" y1="18" x2="${mid}" y2="${18 + inner}" stroke="#A39B93" stroke-dasharray="4 4"/>`;
  s += `<line x1="${pad}" y1="${midY}" x2="${pad + inner}" y2="${midY}" stroke="#A39B93" stroke-dasharray="4 4"/>`;
  const lab = (x, y, txt, anchor, color) => `<text x="${x}" y="${y}" font-size="11.5" font-weight="750" fill="${color}" text-anchor="${anchor}">${esc(txt)}</text>`;
  s += lab(pad + inner - 8, 34, qName('mp'), 'end', '#5B5550') + lab(pad + 8, 34, qName('np'), 'start', '#5B5550')
    + lab(pad + inner - 8, 18 + inner - 10, qName('mf'), 'end', '#5B5550') + lab(pad + 8, 18 + inner - 10, qName('nn'), 'start', '#8A827B');
  s += `<text x="${pad + inner / 2}" y="${h - 4}" font-size="12" font-weight="700" fill="#5B5550" text-anchor="middle">${esc(xLabel)} (1–10) →</text>`;
  s += `<text x="13" y="${18 + inner / 2}" font-size="12" font-weight="700" fill="#5B5550" text-anchor="middle" transform="rotate(-90 13 ${18 + inner / 2})">${esc(yLabel)} (1–10) →</text>`;
  // individual answers: deterministic jitter so dots on the same cell stay visible
  dots.forEach((d, i) => {
    const jx = (((i * 37) % 11) - 5) * 2.2, jy = (((i * 53) % 11) - 5) * 2.2;
    s += `<circle cx="${X(d.x) + jx}" cy="${Y(d.y) + jy}" r="4.2" fill="${d.color}" fill-opacity=".38" stroke="${d.color}" stroke-opacity=".7"><title>${esc(d.title || '')}</title></circle>`;
  });
  means.forEach((m) => {
    s += `<g><circle cx="${X(m.x)}" cy="${Y(m.y)}" r="14" fill="${m.color || QCOLOR.mp}" stroke="#fff" stroke-width="2.5"><title>${esc(m.title || '')}</title></circle><text x="${X(m.x)}" y="${Y(m.y) + 4.5}" font-size="12" font-weight="800" fill="${onFill(m.color || QCOLOR.mp)}" text-anchor="middle">${esc(m.label)}</text></g>`;
  });
  return s + '</svg>';
}

// ------------------------------------------------------------------ sections
function kpis(rows) {
  const tried = rows.filter((r) => r.flow?.tried);
  const post = rows.filter((r) => r.flow?.subPost);
  const yesPost = post.filter((r) => r.flow.subPost === 'yes').length;
  const pay = rows.map((r) => r.ratings?.s4?.y).filter((v) => v != null);
  return [
    [t('kResp'), rows.length, ''],
    [t('kTried'), pct(tried.length, rows.length), t('of', { n: rows.length })],
    [t('kSub'), pct(yesPost, post.length), t('of', { n: post.length })],
    [t('kPay'), f1(mean(pay)), '/ 10'],
  ].map(([k, v, sub]) => `<div class="kpi"><small>${k}</small><b>${v}</b><span>${sub}</span></div>`).join('');
}

function screensSection(rows, showDots) {
  const means = [], dots = [], body = [];
  ITEMS.forEach((id, i) => {
    const pts = rows.map((r) => r.ratings?.[id]).filter((p) => p && p.x != null && p.y != null);
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const mx = mean(xs), my = mean(ys);
    const q = quad(mx == null ? null : Math.round(mx * 10) / 10 >= 5.5 ? 6 : 5, my == null ? null : my >= 5.5 ? 6 : 5);
    const cnt = { mp: 0, np: 0, mf: 0, nn: 0 };
    pts.forEach((p) => { cnt[quad(p.x, p.y)]++; });
    if (mx != null) means.push({ x: mx, y: my, label: String(i + 1), color: QCOLOR[q], title: `${t(id.toUpperCase())}: ${f1(mx)} / ${f1(my)}` });
    if (showDots) pts.forEach((p) => dots.push({ x: p.x, y: p.y, color: '#6F6862', title: `${i + 1}: ${p.x}/${p.y}` }));
    const bar = pts.length ? ['mp', 'mf', 'np', 'nn'].map((k) => `<i class="q-${k}-bg" style="width:${(cnt[k] / pts.length) * 100}%" title="${qName(k)} ${cnt[k]}"></i>`).join('') : '';
    body.push(`<tr><td><span class="lbl">${i + 1}</span>${esc(t(id.toUpperCase()))}</td><td class="num">${pts.length}</td><td class="num">${f1(mx)}<br><small class="muted">±${f1(sd(xs))}</small></td><td class="num">${f1(my)}<br><small class="muted">±${f1(sd(ys))}</small></td><td>${q ? `<span class="qtag ${q}">${qName(q)}</span>` : '–'}</td><td><div class="qbar">${bar}</div><small class="muted">${['mp', 'mf', 'np', 'nn'].map((k) => `${qName(k)} ${cnt[k]}`).join(' · ')}</small></td></tr>`);
  });
  $('#chartA').innerHTML = matrix({ means, dots, xLabel: t('xConv'), yLabel: t('yPay') }) + `<p class="note">${t('midNote')}</p>`;
  $('#tableA').innerHTML = `<table class="rs-t"><thead><tr><th>${t('item')}</th><th class="num">${t('nn')}</th><th class="num">${t('mx')}</th><th class="num">${t('my')}</th><th>${t('byMean')}</th><th>${t('spread')}</th></tr></thead><tbody>${body.join('')}</tbody></table>`;
}

function bars(title, entries, total) {
  const max = Math.max(1, ...entries.map((e) => e[1]));
  return `<div class="bars"><h3>${title}</h3>${entries.map(([k, n]) => `<div class="bar-row"><span>${esc(k)}</span><div class="track"><div class="fillb" style="width:${(n / max) * 100}%"></div></div><span class="n">${n}${total ? ` <small class="muted">${pct(n, total)}</small>` : ''}</span></div>`).join('')}</div>`;
}
function countBy(rows, fn, order) {
  const m = new Map();
  rows.forEach((r) => [].concat(fn(r)).forEach((v) => m.set(v, (m.get(v) || 0) + 1)));
  const keys = order ? order.filter((k) => m.has(k)).concat([...m.keys()].filter((k) => !order.includes(k))) : [...m.keys()];
  return keys.map((k) => [k, m.get(k)]);
}

function behaviorSection(rows) {
  const tried = rows.filter((r) => r.flow?.tried);
  const res = countBy(rows, (r) => (r.flow?.tried ? r.flow?.result || 'stopped' : 'notTried'), ['booked', 'none', 'stopped', 'notTried']).map(([k, n]) => [t(k), n]);
  const outc = countBy(tried, (r) => r.flow?.outcome || 'normal', ['normal', 'bad', 'none']).map(([k, n]) => [t(k === 'none' ? 'none2' : k), n]);
  const sel = mean(tried.map((r) => r.flow?.selected).filter((v) => v != null));
  const chooseMed = median(tried.map((r) => r.flow?.chooseSec).filter((v) => v != null));
  const yesMed = median(tried.map((r) => r.flow?.timeToYesSec).filter((v) => v != null));
  const ch = [['DM', tried.reduce((s, r) => s + (r.flow?.dm || 0), 0)], ['AI call', tried.reduce((s, r) => s + (r.flow?.call || 0), 0)]];
  const ans = (key) => countBy(rows.filter((r) => r.flow?.[key]), (r) => r.flow[key], ['yes', 'maybe', 'no']).map(([k, n]) => [t(k), n]);
  $('#behavior').innerHTML = bars(t('bSubPost'), ans('subPost'), rows.filter((r) => r.flow?.subPost).length)
    + bars(t('bResult'), res, rows.length) + bars('DM vs AI call (requests)', ch)
    + bars(t('bOutcome'), outc, tried.length)
    + `<table class="rs-t"><tbody><tr><td>${t('bSel')}</td><td class="num">${f1(sel)}</td></tr><tr><td>${t('bTime')}</td><td class="num">${chooseMed == null ? '–' : Math.round(chooseMed) + t('sec')}</td></tr><tr><td>${t('bYes')}</td><td class="num">${yesMed == null ? '–' : f1(yesMed) + t('sec')}</td></tr></tbody></table>`;
}

function profileSection(rows) {
  const n = rows.length;
  const ages = rows.map((r) => r.profile?.age).filter((v) => v != null);
  const ageLine = ages.length ? t('ageStats', { n: ages.length, m: f1(mean(ages)), md: median(ages), lo: Math.min(...ages), hi: Math.max(...ages) }) : '–';
  const g = countBy(rows, (r) => r.profile?.gender || 'unknown', ['female', 'male', 'other', 'na', 'unknown']).map(([k, c]) => [t(k), c]);
  const a = countBy(rows, (r) => r.profile?.affiliation || 'unknown', ['undergrad', 'grad', 'intl', 'worker', 'other', 'unknown']).map(([k, c]) => [t(k), c]);
  const ab = countBy(rows, (r) => ageBand(r.profile?.age), ['<20', '20–24', '25–29', '30+', 'unknown']).map(([k, c]) => [k === 'unknown' ? t('unknown') : k, c]);
  const me = countBy(rows, (r) => r.profile?.mealsOut || 'unknown', ['0-3', '4-7', '8-15', '16+', 'unknown']).map(([k, c]) => [k === 'unknown' ? t('unknown') : k, c]);
  const ap = countBy(rows, (r) => (r.profile?.apps?.length ? r.profile.apps : []), ['naver', 'kakao', 'google', 'instagram', 'catchtable', 'youtube', 'other']).map(([k, c]) => [t(k), c]);
  $('#profile').innerHTML = bars(t('pGender'), g, n) + `<div class="bars"><h3>${t('pAge')}</h3><p class="t-sub" style="margin:0 0 4px">${ageLine}</p></div>` + bars('', ab, n)
    + bars(t('pAff'), a, n) + bars(t('pMeals'), me, n) + bars(t('pApps'), ap, n);
}

// ------------------------------------------------------------------ compare by category
// every value of one profile field side by side: a small 2×2 of the four item averages, then a table
const DIMS = {
  group: { label: 'group', sheet: 'group', key: (r) => [r.group || 'unknown'], order: ['1', '2', '3', '4', 'teaching', 'unknown'], fmt: (v) => (v === 'teaching' ? t('teaching') : v === 'unknown' ? t('unknown') : t('groupN', { n: v })) },
  gender: { label: 'gender', sheet: 'gender', key: (r) => [r.profile?.gender || 'unknown'], order: ['female', 'male', 'other', 'na', 'unknown'], fmt: (v) => t(v) },
  age: { label: 'age', sheet: 'age', key: (r) => [ageBand(r.profile?.age)], order: ['<20', '20–24', '25–29', '30+', 'unknown'], fmt: (v) => (v === 'unknown' ? t('unknown') : v) },
  aff: { label: 'aff', sheet: 'affiliation', key: (r) => [r.profile?.affiliation || 'unknown'], order: ['undergrad', 'grad', 'intl', 'worker', 'other', 'unknown'], fmt: (v) => t(v) },
  meals: { label: 'pMeals', sheet: 'meals out', key: (r) => [r.profile?.mealsOut || 'unknown'], order: ['0-3', '4-7', '8-15', '16+', 'unknown'], fmt: (v) => (v === 'unknown' ? t('unknown') : v) },
  apps: { label: 'pApps', sheet: 'app', key: (r) => (r.profile?.apps?.length ? r.profile.apps : ['unknown']), order: ['naver', 'kakao', 'google', 'instagram', 'catchtable', 'youtube', 'other', 'unknown'], fmt: (v) => t(v) },
};
let CMP = 'group';

function groupsBy(rows, dim) {
  const d = DIMS[dim];
  const m = new Map();
  rows.forEach((r) => d.key(r).forEach((v) => { if (!m.has(v)) m.set(v, []); m.get(v).push(r); }));
  const keys = d.order.filter((k) => m.has(k)).concat([...m.keys()].filter((k) => !d.order.includes(k)));
  return keys.map((k) => ({ key: k, label: d.fmt(k), rows: m.get(k) }));
}

function statsOf(rows) {
  const items = ITEMS.map((id) => {
    const pts = rows.map((r) => r.ratings?.[id]).filter((p) => p && p.x != null && p.y != null);
    return { x: mean(pts.map((p) => p.x)), y: mean(pts.map((p) => p.y)), n: pts.length };
  });
  const subs = rows.map((r) => r.flow?.subPost).filter(Boolean);
  const tried = rows.filter((r) => r.flow?.tried);
  return {
    n: rows.length,
    items,
    sub: { yes: subs.filter((v) => v === 'yes').length, maybe: subs.filter((v) => v === 'maybe').length, no: subs.filter((v) => v === 'no').length, n: subs.length },
    dm: tried.reduce((s, r) => s + (r.flow?.dm || 0), 0),
    call: tried.reduce((s, r) => s + (r.flow?.call || 0), 0),
    picked: mean(tried.map((r) => r.flow?.selected).filter((v) => v != null)),
    yesMed: median(tried.map((r) => r.flow?.timeToYesSec).filter((v) => v != null)),
  };
}
// where an average sits: 5.5 is the middle of a 1–10 scale
const meanQuad = (p) => (p?.x == null || p?.y == null ? null : quad(p.x >= 5.5 ? 6 : 5, p.y >= 5.5 ? 6 : 5));

function miniMatrix(items) {
  const S = 200, p = 6, inner = S - p * 2, mid = p + inner / 2;
  const X = (v) => p + ((v - 0.5) / 10) * inner;
  const Y = (v) => p + inner - ((v - 0.5) / 10) * inner;
  let s = `<svg viewBox="0 0 ${S} ${S}" xmlns="http://www.w3.org/2000/svg" font-family="Pretendard Variable, sans-serif" role="img" aria-label="${esc(t('xConv'))} × ${esc(t('yPay'))}">`;
  s += `<rect x="${p}" y="${p}" width="${inner / 2}" height="${inner / 2}" fill="${QTINT.np}"/><rect x="${mid}" y="${p}" width="${inner / 2}" height="${inner / 2}" fill="${QTINT.mp}"/>`;
  s += `<rect x="${p}" y="${mid}" width="${inner / 2}" height="${inner / 2}" fill="${QTINT.nn}"/><rect x="${mid}" y="${mid}" width="${inner / 2}" height="${inner / 2}" fill="${QTINT.mf}"/>`;
  s += `<rect x="${p}" y="${p}" width="${inner}" height="${inner}" fill="none" stroke="#DCD6CE"/>`;
  s += `<line x1="${mid}" y1="${p}" x2="${mid}" y2="${p + inner}" stroke="#A39B93" stroke-dasharray="3 3"/><line x1="${p}" y1="${mid}" x2="${p + inner}" y2="${mid}" stroke="#A39B93" stroke-dasharray="3 3"/>`;
  // items with the same average would hide each other: try spots around the average, inside the box
  const OFFS = [[0, 0], [22, 0], [-22, 0], [0, -22], [0, 22], [22, -22], [-22, 22], [22, 22], [-22, -22]];
  const clamp = (v) => Math.min(S - p - 11, Math.max(p + 11, v));
  const placed = [];
  items.forEach((m, i) => {
    if (m.x == null) return;
    let cx = clamp(X(m.x)), cy = clamp(Y(m.y));
    for (const [dx, dy] of OFFS) {
      const x = clamp(X(m.x) + dx), y = clamp(Y(m.y) + dy);
      if (!placed.some((q) => Math.abs(q.x - x) < 20 && Math.abs(q.y - y) < 20)) { cx = x; cy = y; break; }
    }
    placed.push({ x: cx, y: cy });
    s += `<g><circle cx="${cx}" cy="${cy}" r="11" fill="${QCOLOR[meanQuad(m)] || QCOLOR.mp}" stroke="#fff" stroke-width="2"><title>${esc(t(`s${i + 1}s`))}: ${f1(m.x)} / ${f1(m.y)}</title></circle><text x="${cx}" y="${cy + 4}" font-size="11.5" font-weight="800" fill="${onFill(QCOLOR[meanQuad(m)] || QCOLOR.mp)}" text-anchor="middle">${i + 1}</text></g>`;
  });
  return s + '</svg>';
}

function subBar(sub) {
  if (!sub.n) return '<span class="muted">–</span>';
  const w = (k) => (sub[k] / sub.n) * 100;
  return `<div class="subbar" title="${esc(t('subLine', { y: sub.yes, m: sub.maybe, n: sub.no }))}"><i class="sb-yes" style="width:${w('yes')}%"></i><i class="sb-maybe" style="width:${w('maybe')}%"></i><i class="sb-no" style="width:${w('no')}%"></i></div>
    <small>${t('subLine', { y: pct(sub.yes, sub.n), m: pct(sub.maybe, sub.n), n: pct(sub.no, sub.n) })}</small>`;
}

function compareSection(rows) {
  $('#cmp-dims').innerHTML = Object.entries(DIMS).map(([k, d]) => `<button type="button" data-dim="${k}" aria-pressed="${CMP === k}">${esc(t(d.label))}</button>`).join('');
  if (!rows.length) {
    $('#cmp-minis').innerHTML = '';
    $('#cmp-table').innerHTML = `<div class="empty-state">${t('noData')}</div>`;
    $('#cmp-note').textContent = '';
    return;
  }
  const groups = groupsBy(rows, CMP).map((g) => ({ ...g, s: statsOf(g.rows) }));
  $('#cmp-minis').innerHTML = groups.map((g) => `<div class="cmp-card"><div class="cmp-head"><b>${esc(g.label)}</b><span>n ${g.s.n}</span></div>${miniMatrix(g.s.items)}<div class="cmp-sub">${subBar(g.s.sub)}</div></div>`).join('');
  const head = [t('cCat'), 'n', t('s1s'), t('s2s'), t('s3s'), t('s4s'), t('cQuad'), t('cSub'), t('cCh'), t('cPick'), t('cYes')];
  const body = groups.map(({ label, s }) => {
    const q = meanQuad(s.items[3]);
    return `<tr><td><b>${esc(label)}</b></td><td class="num">${s.n}</td>${s.items.map((it) => `<td class="num">${f1(it.x)} / ${f1(it.y)}</td>`).join('')}
      <td>${q ? `<span class="qtag ${q}">${qName(q)}</span>` : '–'}</td><td>${subBar(s.sub)}</td>
      <td class="num">${s.dm} : ${s.call}</td><td class="num">${f1(s.picked)}</td><td class="num">${s.yesMed == null ? '–' : f1(s.yesMed) + t('sec')}</td></tr>`;
  }).join('');
  $('#cmp-table').innerHTML = `<table class="rs-t"><thead><tr>${head.map((h, i) => `<th class="${i === 0 || i === 6 || i === 7 ? '' : 'num'}">${esc(h)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
  $('#cmp-note').textContent = t('cmpNote');
}

// ------------------------------------------------------------------ at a glance
// Pastel and warm: soft orange = the money side (would pay, subscribe yes), blush = convenient, peach = maybe,
// light warm gray = no or low. Every mark also carries its value in ink, so the light fills never stand alone.
// Thin marks, hairline solid grid, values at bar tips, tooltips on hover and focus.
const VC = { pay: '#FFA36C', line: '#FF8A4C', payFill: 'rgba(255, 163, 108, .28)', conv: '#F7B2B7', yes: '#FFA36C', maybe: '#FFD2BA', no: '#E4E2DF', low: '#E9E6E2', grid: '#ECE8E2', axis: '#8A827B', ink: '#1C1A19', ink2: '#5B5550', dot: '#C9C4BE' };
const FONT = 'font-family="Pretendard Variable, sans-serif"';
const tipAttr = (s) => `data-tip="${esc(s)}" tabindex="0" aria-label="${esc(s)}"`;
const clock = (ms, sec) => new Date(ms).toLocaleTimeString('sv-SE', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', ...(sec ? { second: '2-digit' } : {}) });
const groupName = (g) => (g === 'teaching' ? t('teaching') : g ? t('groupN', { n: g }) : t('unknown'));
const emptyFig = () => `<div class="ov-empty">${esc(t('noData'))}</div>`;
const niceMax = (v) => { const steps = [1, 2, 4, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000]; return steps.find((s) => s >= v) || Math.ceil(v / 1000) * 1000; };
// bars: 4px rounded data end, square at the baseline
const hBar = (x0, x1, y, h, fill, extra = '') => {
  const r = Math.min(4, (x1 - x0) / 2, h / 2);
  if (x1 - x0 < 1) return '';
  return `<path d="M${x0},${y} H${x1 - r} A${r},${r} 0 0 1 ${x1},${y + r} V${y + h - r} A${r},${r} 0 0 1 ${x1 - r},${y + h} H${x0} Z" fill="${fill}" ${extra}/>`;
};
const vBar = (x, w, yTop, yBase, fill, extra = '') => {
  const r = Math.min(4, w / 2, (yBase - yTop) / 2);
  if (yBase - yTop < 1) return '';
  return `<path d="M${x},${yBase} V${yTop + r} A${r},${r} 0 0 1 ${x + r},${yTop} H${x + w - r} A${r},${r} 0 0 1 ${x + w},${yTop + r} V${yBase} Z" fill="${fill}" ${extra}/>`;
};

let TL = null; // the answers-over-time chart, kept for the hover crosshair
function timelineChart(rows) {
  const pts = rows.map((r) => ({ t: Date.parse(r.createdAt), g: r.group })).filter((p) => Number.isFinite(p.t)).sort((a, b) => a.t - b.t);
  TL = null;
  if (!pts.length) return emptyFig();
  const W = 1100, H = 230, L = 40, R = 48, T = 16, B = 28;
  const first = pts[0].t, last = pts[pts.length - 1].t;
  const span = Math.max(last - first, 10 * 60e3); // show at least ten minutes
  const t0 = first - span * 0.03, t1 = first + span * 1.03;
  const n = pts.length, yMax = niceMax(n);
  const X = (v) => L + ((v - t0) / (t1 - t0)) * (W - L - R);
  const Y = (v) => T + (1 - v / yMax) * (H - T - B);
  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" ${FONT} role="img" aria-label="${esc(t('ovTime'))}">`;
  [0, yMax / 2, yMax].forEach((v) => {
    s += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="${VC.grid}"/>`;
    s += `<text x="${L - 8}" y="${Y(v) + 4}" font-size="12" fill="${VC.axis}" text-anchor="end">${v}</text>`;
  });
  const stepMin = [1, 2, 5, 10, 15, 30, 60, 120, 180, 360, 720, 1440].find((m) => (t1 - t0) / (m * 60e3) <= 7) || 1440;
  for (let tk = Math.ceil(t0 / (stepMin * 60e3)) * stepMin * 60e3; tk <= t1; tk += stepMin * 60e3) {
    s += `<text x="${X(tk)}" y="${H - 8}" font-size="12" fill="${VC.axis}" text-anchor="middle">${clock(tk)}</text>`;
  }
  // a running total stays flat until the next answer arrives, so the line steps (no false slope between answers)
  const line = pts.map((p, i) => (i ? `H${X(p.t).toFixed(1)} V${Y(i + 1).toFixed(1)}` : `M${X(p.t).toFixed(1)},${Y(1).toFixed(1)}`)).join(' ');
  s += `<path d="M${X(first).toFixed(1)},${Y(0)} ${line.replace(/^M/, 'L')} V${Y(0)} Z" fill="${VC.payFill}"/>`;
  s += `<path d="${line}" fill="none" stroke="${VC.line}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
  if (n <= 80) pts.forEach((p, i) => { s += `<circle cx="${X(p.t).toFixed(1)}" cy="${Y(i + 1).toFixed(1)}" r="4" fill="${VC.line}" stroke="#fff" stroke-width="2"/>`; });
  s += `<text x="${X(last) + 10}" y="${Y(n) + 4}" font-size="13" font-weight="800" fill="${VC.ink}">${n}</text>`;
  s += `<line class="tl-cross" x1="0" x2="0" y1="${T}" y2="${H - B}" stroke="${VC.ink2}" visibility="hidden"/><circle class="tl-dot" r="6" fill="${VC.line}" stroke="#fff" stroke-width="2" visibility="hidden"/>`;
  s += `<rect class="tl-hit" x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="transparent"/>`;
  TL = { pts, W, L, R, X, Y };
  return s + '</svg>';
}
function timelineMark(i) {
  const svg = $('#ov-time svg');
  if (!svg) return;
  const cross = svg.querySelector('.tl-cross'), dot = svg.querySelector('.tl-dot');
  if (i == null || !TL) { cross?.setAttribute('visibility', 'hidden'); dot?.setAttribute('visibility', 'hidden'); return; }
  const x = TL.X(TL.pts[i].t), y = TL.Y(i + 1);
  cross.setAttribute('x1', x); cross.setAttribute('x2', x); cross.setAttribute('visibility', 'visible');
  dot.setAttribute('cx', x); dot.setAttribute('cy', y); dot.setAttribute('visibility', 'visible');
}
// the crosshair finds the nearest answer in time; the reader never has to hit a 2px line
function timelineHover(e) {
  const svg = $('#ov-time svg');
  if (!svg || !TL) return;
  const r = svg.getBoundingClientRect();
  const sx = ((e.clientX - r.left) / r.width) * TL.W;
  if (sx < TL.L - 10 || sx > TL.W - TL.R + 10) { timelineMark(null); hideTip(); return; }
  let best = 0;
  TL.pts.forEach((p, i) => { if (Math.abs(TL.X(p.t) - sx) < Math.abs(TL.X(TL.pts[best].t) - sx)) best = i; });
  timelineMark(best);
  const p = TL.pts[best];
  showTip(t('tlTip', { n: best + 1, time: clock(p.t, true), g: groupName(p.g) }), e.clientX, e.clientY);
}

function subscribeChart(rows) {
  const subs = rows.map((r) => r.flow?.subPost).filter(Boolean);
  if (!subs.length) return emptyFig();
  const c = { yes: 0, maybe: 0, no: 0 };
  subs.forEach((v) => { c[v] = (c[v] || 0) + 1; });
  const W = 540, H = 40, gap = 2;
  let x = 0, s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" ${FONT} role="img" aria-label="${esc(t('ovSub'))}">`;
  const keys = ['yes', 'maybe', 'no'].filter((k) => c[k]);
  keys.forEach((k, i) => {
    const w = (c[k] / subs.length) * (W - gap * (keys.length - 1));
    s += `<rect x="${x.toFixed(1)}" y="4" width="${Math.max(1, w).toFixed(1)}" height="32" rx="${i === 0 || i === keys.length - 1 ? 4 : 0}" fill="${VC[k]}" ${tipAttr(`${pct(c[k], subs.length)} · ${t(k)} (${c[k]})`)}/>`;
    x += w + gap;
  });
  s += '</svg>';
  const legend = ['yes', 'maybe', 'no'].map((k) => `<span><i style="background:${VC[k]}"></i>${esc(t(k))} <b>${pct(c[k], subs.length)}</b> <small>(${c[k]})</small></span>`).join('');
  // the same answers split by group, on the same colours
  const groups = groupsBy(rows.filter((r) => r.flow?.subPost), 'group');
  const split = groups.length > 1 ? `<div class="ov-split">${groups.map((g) => {
    const s2 = statsOf(g.rows).sub;
    return `<div class="ov-split-row" ${tipAttr(`${g.label} · ${t('subLine', { y: s2.yes, m: s2.maybe, n: s2.no })}`)}><span>${esc(g.label)}</span>${subBar(s2)}</div>`;
  }).join('')}</div>` : '';
  return `${s}<div class="ov-legend">${legend}</div>${split}`;
}

function itemBarsChart(rows) {
  const st = statsOf(rows).items;
  if (!st.some((it) => it.n)) return emptyFig();
  const W = 540, L = 104, R = 44, T = 4, rowH = 50, H = T + rowH * 4 + 26;
  const X = (v) => L + (v / 10) * (W - L - R);
  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" ${FONT} role="img" aria-label="${esc(t('ovItems'))}">`;
  [0, 2, 4, 6, 8, 10].forEach((v) => {
    s += `<line x1="${X(v)}" x2="${X(v)}" y1="${T}" y2="${T + rowH * 4}" stroke="${VC.grid}"/>`;
    s += `<text x="${X(v)}" y="${H - 8}" font-size="12" fill="${VC.axis}" text-anchor="middle">${v}</text>`;
  });
  st.forEach((it, i) => {
    const y = T + i * rowH;
    s += `<text x="${L - 10}" y="${y + rowH / 2 + 4}" font-size="13" font-weight="700" fill="${VC.ink2}" text-anchor="end">${esc(t(`s${i + 1}s`))}</text>`;
    [['conv', it.x, 9], ['pay', it.y, 25]].forEach(([k, v, dy]) => {
      if (v == null) return;
      const label = `${f1(v)} · ${t(k === 'conv' ? 'xConv' : 'yPay')} · ${t(`s${i + 1}s`)} (n ${it.n})`;
      s += hBar(X(0), X(v), y + dy, 13, VC[k], tipAttr(label));
      s += `<text x="${X(v) + 6}" y="${y + dy + 11}" font-size="12" font-weight="700" fill="${VC.ink2}">${f1(v)}</text>`;
    });
  });
  s += '</svg>';
  return `${s}<div class="ov-legend"><span><i style="background:${VC.conv}"></i>${esc(t('xConv'))}</span><span><i style="background:${VC.pay}"></i>${esc(t('yPay'))}</span></div>`;
}

// emphasis: scores 6–10 (would pay) in orange, 1–5 in gray
function payHistChart(rows) {
  const vals = rows.map((r) => r.ratings?.s4?.y).filter((v) => v != null);
  if (!vals.length) return emptyFig();
  const counts = Array.from({ length: 10 }, (_, i) => vals.filter((v) => v === i + 1).length);
  const W = 540, H = 210, L = 12, R = 12, T = 22, B = 26;
  const band = (W - L - R) / 10, bw = Math.min(24, band - 10);
  const max = Math.max(...counts);
  const Y = (c) => T + (1 - c / max) * (H - T - B);
  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" ${FONT} role="img" aria-label="${esc(t('ovPay'))}">`;
  s += `<line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" stroke="${VC.grid}"/>`;
  counts.forEach((c, i) => {
    const x = L + i * band + (band - bw) / 2;
    s += vBar(x, bw, Y(c), H - B, i >= 5 ? VC.pay : VC.low, tipAttr(t('payTip', { n: c, v: i + 1 })));
    if (c) s += `<text x="${x + bw / 2}" y="${Y(c) - 6}" font-size="12" font-weight="700" fill="${VC.ink2}" text-anchor="middle">${c}</text>`;
    s += `<text x="${x + bw / 2}" y="${H - 8}" font-size="12" fill="${VC.axis}" text-anchor="middle">${i + 1}</text>`;
  });
  s += '</svg>';
  const high = vals.filter((v) => v >= 6).length;
  return `${s}<div class="ov-legend"><span><i style="background:${VC.pay}"></i>${esc(t('payHigh'))} <b>${pct(high, vals.length)}</b></span><span><i style="background:${VC.low}"></i>1–5</span><span>${esc(t('median', { v: f1(median(vals)) }))}</span></div>`;
}

// each dot is one person; the dark tick is the median
function durationChart(rows) {
  const tried = rows.filter((r) => r.flow?.tried);
  const lanes = [['ovChoose', tried.map((r) => r.flow?.chooseSec).filter((v) => v != null)], ['ovYes', tried.map((r) => r.flow?.timeToYesSec).filter((v) => v != null)]];
  if (!lanes.some(([, v]) => v.length)) return emptyFig();
  const W = 540, L = 132, R = 56, laneH = 64;
  const H = lanes.length * laneH;
  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" ${FONT} role="img" aria-label="${esc(t('ovDur'))}">`;
  lanes.forEach(([k, vals], li) => {
    const y = li * laneH + 22;
    s += `<text x="${L - 12}" y="${y + 4}" font-size="13" font-weight="700" fill="${VC.ink2}" text-anchor="end">${esc(t(k))}</text>`;
    if (!vals.length) { s += `<text x="${L}" y="${y + 4}" font-size="12" fill="${VC.axis}">–</text>`; return; }
    const max = niceMax(Math.max(...vals, 1));
    const X = (v) => L + (v / max) * (W - L - R);
    s += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="${VC.grid}"/>`;
    s += `<text x="${L}" y="${y + 26}" font-size="11.5" fill="${VC.axis}">0</text><text x="${W - R}" y="${y + 26}" font-size="11.5" fill="${VC.axis}" text-anchor="end">${max}${t('sec')}</text>`;
    vals.forEach((v, i) => {
      const jy = ((i * 37) % 9) - 4;
      s += `<circle cx="${X(v).toFixed(1)}" cy="${y + jy}" r="4.5" fill="${VC.dot}" stroke="#fff" stroke-width="2" ${tipAttr(`${v}${t('sec')} · ${t(k)}`)}/>`;
    });
    const md = median(vals);
    s += `<line x1="${X(md)}" x2="${X(md)}" y1="${y - 12}" y2="${y + 12}" stroke="${VC.ink}" stroke-width="2.5" stroke-linecap="round"/>`;
    s += `<text x="${W - R + 8}" y="${y + 4}" font-size="12.5" font-weight="800" fill="${VC.ink}">${f1(md)}${t('sec')}</text>`;
  });
  return `${s}</svg><div class="ov-legend"><span><i class="tick"></i>${esc(t('median', { v: '' }).trim())}</span><span><i class="dot"></i>${esc(t('onePerson'))}</span></div>`;
}

function overviewSection(rows) {
  $('#ov-time').innerHTML = timelineChart(rows);
  $('#ov-sub').innerHTML = subscribeChart(rows);
  $('#ov-items').innerHTML = itemBarsChart(rows);
  $('#ov-pay').innerHTML = payHistChart(rows);
  $('#ov-dur').innerHTML = durationChart(rows);
  const times = rows.map((r) => Date.parse(r.createdAt)).filter(Number.isFinite);
  $('#ov-time-sub').textContent = times.length ? t('ovTimeSub', { a: clock(Math.min(...times)), b: clock(Math.max(...times)) }) : '';
}
function showTip(text, x, y) {
  const el = $('#rs-tip');
  el.textContent = text;
  el.hidden = false;
  const w = el.offsetWidth, h = el.offsetHeight;
  el.style.left = `${Math.min(window.innerWidth - w - 8, Math.max(8, x + 14))}px`;
  el.style.top = `${Math.max(8, y - h - 12)}px`;
}
function hideTip() { const el = $('#rs-tip'); if (el) el.hidden = true; }

function labels() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
  $('#lang').textContent = lang === 'ko' ? 'English' : '한국어';
}

function draw() {
  labels();
  const rows = filtered();
  $('#filters').innerHTML = filtersHtml(rows);
  $('#kpis').innerHTML = kpis(rows);
  if (!ROWS.length) {
    ['#chartA', '#tableA', '#behavior', '#profile'].forEach((s) => { $(s).innerHTML = ''; });
    $('#tableA').innerHTML = `<div class="empty-state">${t('noData')}</div>`;
  }
  overviewSection(rows);
  compareSection(rows);
  screensSection(rows, $('#dotsA').checked);
  behaviorSection(rows);
  profileSection(rows);
  listSection(rows);
}

// every answer with the time it was recorded; tick one, several or all, then delete the ticked ones
const kst = (iso) => (iso ? new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(0, 16) : '–');
const SELECTED = new Set(); // survives the 10-second live refresh
const TRASH = '<svg class="ic sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/></svg>';
function listSection(rows) {
  const ids = new Set(ROWS.map((r) => r.id));
  [...SELECTED].forEach((id) => { if (!ids.has(id)) SELECTED.delete(id); });
  const subTxt = (v) => (v ? t(v) : '–');
  const body = [...rows].reverse().map((r) => {
    const on = SELECTED.has(r.id);
    return `<tr class="${on ? 'sel' : ''}">
    <td class="chk"><input type="checkbox" data-sel="${esc(r.id)}" ${on ? 'checked' : ''} aria-label="${esc(t('selOne', { time: kst(r.createdAt) }))}"></td>
    <td class="num">${kst(r.createdAt)}</td><td>${esc(r.group === 'teaching' ? t('teaching') : r.group || '–')}</td>
    <td>${esc(r.profile?.gender ? t(r.profile.gender) : '–')}</td><td class="num">${r.profile?.age ?? '–'}</td>
    <td>${subTxt(r.flow?.subPost)}</td>
    <td class="num">${ITEMS.map((k) => `${r.ratings?.[k]?.x ?? '–'}/${r.ratings?.[k]?.y ?? '–'}`).join(' · ')}</td></tr>`;
  }).join('');
  $('#list').innerHTML = rows.length
    ? `<div class="list-tools"><span class="sel-count" id="selCount"></span><button class="btn btn-sm rs-wipe" id="delSel" disabled>${TRASH}<span></span></button></div>
      <table class="rs-t"><thead><tr><th class="chk"><input type="checkbox" id="selAll" aria-label="${esc(t('selAllA'))}"></th><th>${t('recorded')}</th><th>${t('grp')}</th><th>${t('gender')}</th><th class="num">${t('ages')}</th><th>${t('sub')}</th><th class="num">${t('rates')}</th></tr></thead><tbody>${body}</tbody></table>`
    : `<div class="empty-state">${t('noData')}</div>`;
  syncSelection(rows);
}
// only answers you can see (after filters) count, so a filter never deletes hidden answers
function visibleSelection(rows = filtered()) { return rows.map((r) => r.id).filter((id) => SELECTED.has(id)); }
function syncSelection(rows = filtered()) {
  const n = visibleSelection(rows).length;
  const all = $('#selAll');
  if (all) { all.checked = n > 0 && n === rows.length; all.indeterminate = n > 0 && n < rows.length; }
  const c = $('#selCount');
  if (c) c.textContent = n ? t('selCount', { n, total: rows.length }) : t('selHint');
  const b = $('#delSel');
  if (b) { b.disabled = !n; b.querySelector('span').textContent = t('delSel', { n }); }
}
$('#list').addEventListener('change', (e) => {
  if (e.target.id === 'selAll') {
    filtered().forEach((r) => (e.target.checked ? SELECTED.add(r.id) : SELECTED.delete(r.id)));
    document.querySelectorAll('#list [data-sel]').forEach((c) => { c.checked = SELECTED.has(c.dataset.sel); c.closest('tr').classList.toggle('sel', c.checked); });
  } else {
    const c = e.target.closest('[data-sel]');
    if (!c) return;
    if (c.checked) SELECTED.add(c.dataset.sel); else SELECTED.delete(c.dataset.sel);
    c.closest('tr').classList.toggle('sel', c.checked);
  }
  syncSelection();
});
$('#list').addEventListener('click', (e) => { if (e.target.closest('#delSel')) deleteSelected(); });

// deleting needs the key (the list only exists after it) and a second yes in the pop-up
async function deleteSelected() {
  const ids = visibleSelection();
  const n = ids.length;
  if (!n) return;
  const everything = n === ROWS.length;
  const ok = await confirmBox({
    title: everything ? t('wipeTitle', { n }) : t('delSelTitle', { n }),
    body: everything ? t('wipeBody') : t('delSelBody'),
    ok: everything ? t('wipeOk', { n }) : t('delSelOk', { n }),
  });
  if (!ok) return;
  const auth = { authorization: `Bearer ${KEY}` };
  let done = 0;
  if (everything) {
    const res = await fetch('/api/responses', { method: 'DELETE', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ confirm: 'DELETE' }) });
    if (res.ok) done = n;
  } else {
    for (const id of ids) {
      const res = await fetch(`/api/responses?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: auth });
      if (res.ok) done += 1;
    }
  }
  ids.forEach((id) => SELECTED.delete(id));
  notice(done === n ? t('deletedN', { n }) : t('deletedSome', { n: done, total: n }));
  load();
}

// ------------------------------------------------------------------ confirm pop-up + notice (in the page, not browser dialogs)
function confirmBox({ title, body, ok }) {
  const d = $('#confirm');
  if (typeof d.showModal !== 'function') return Promise.resolve(window.confirm(`${title}\n\n${body}`));
  $('#confirm-title').textContent = title;
  $('#confirm-body').textContent = body;
  $('#confirm-ok').textContent = ok;
  d.querySelector('[value="cancel"]').textContent = t('cancel');
  d.returnValue = '';
  return new Promise((resolve) => {
    d.addEventListener('close', () => resolve(d.returnValue === 'ok'), { once: true });
    d.showModal();
    d.querySelector('[value="cancel"]').focus(); // Cancel is the default
  });
}
let noticeTimer = null;
function notice(msg) {
  const n = $('#notice');
  n.textContent = msg;
  n.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { n.hidden = true; }, 5000);
}

// ------------------------------------------------------------------ CSV + XLSX
const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
function saveFile(name, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function answerTable(rows) {
  const head = ['id', 'recordedAtKST', 'recordedAt', 'submittedAt', 'lang', 'group', 'gender', 'age', 'affiliation', 'mealsOut', 'apps',
    ...ITEMS.flatMap((i) => [`${i}_convenient`, `${i}_pay`, `${i}_quadrant`]),
    'tried', 'scenario', 'selected', 'dm', 'call', 'subscribeBefore', 'subscribeAfter', 'facilitatorOutcome', 'result', 'winner', 'winnerNoRecommender', 'timeToYesSec', 'chooseSec'];
  const body = rows.map((r) => [r.id, kst(r.createdAt), r.createdAt, r.submittedAt, r.lang, r.group, r.profile?.gender, r.profile?.age, r.profile?.affiliation, r.profile?.mealsOut, (r.profile?.apps || []).join(';'),
    ...ITEMS.flatMap((i) => [r.ratings?.[i]?.x, r.ratings?.[i]?.y, quad(r.ratings?.[i]?.x, r.ratings?.[i]?.y)]),
    r.flow?.tried == null ? null : String(r.flow.tried), r.flow?.scenario, r.flow?.selected, r.flow?.dm, r.flow?.call, r.flow?.subPre, r.flow?.subPost, r.flow?.outcome, r.flow?.result, r.flow?.winner,
    r.flow?.winnerListingOnly == null ? null : String(r.flow.winnerListingOnly), r.flow?.timeToYesSec, r.flow?.chooseSec]);
  return [head, ...body];
}
// one sheet per profile field; raw codes and English names keep the files easy to analyse
const r2 = (v) => (v == null ? null : Math.round(v * 100) / 100);
const QNAME_EN = { mp: T.en.mp, np: T.en.np, mf: T.en.mf, nn: T.en.nn2 };
function compareTable(rows, dim) {
  const head = ['category', 'n', 's1_convenient', 's1_pay', 's2_convenient', 's2_pay', 's3_convenient', 's3_pay', 's4_convenient', 's4_pay', 's4_quadrant',
    'subscribe_yes', 'subscribe_maybe', 'subscribe_no', 'subscribe_yes_pct', 'dm_requests', 'ai_call_requests', 'places_picked_avg', 'first_yes_sec_median'];
  const body = groupsBy(rows, dim).map(({ key, rows: rs }) => {
    const s = statsOf(rs);
    const q = meanQuad(s.items[3]);
    return [key, s.n, ...s.items.flatMap((it) => [r2(it.x), r2(it.y)]), q ? QNAME_EN[q] : null,
      s.sub.yes, s.sub.maybe, s.sub.no, s.sub.n ? Math.round((s.sub.yes / s.sub.n) * 100) : null, s.dm, s.call, r2(s.picked), r2(s.yesMed)];
  });
  return [head, ...body];
}
function csvAnswers() {
  const text = '﻿' + answerTable(filtered()).map((r) => r.map(csvCell).join(',')).join('\n');
  saveFile(`tmc-answers-${today()}.csv`, new Blob([text], { type: 'text/csv;charset=utf-8' }));
}
function xlsxAll() {
  const rows = filtered();
  const sheets = [{ name: 'Answers', rows: answerTable(rows) }, ...Object.entries(DIMS).map(([k, d]) => ({ name: `By ${d.sheet}`, rows: compareTable(rows, k) }))];
  saveFile(`tmc-results-${today()}.xlsx`, new Blob([makeXlsx(sheets)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}
// ------------------------------------------------------------------ events
$('#gate-form').addEventListener('submit', (e) => {
  e.preventDefault();
  KEY = $('#key').value.trim();
  load();
});
$('#lock').addEventListener('click', () => {
  KEY = null; ROWS = []; SIG = '';
  $('#key').value = '';
  showGate();
});
$('#filters').addEventListener('change', (e) => {
  const s = e.target.closest('[data-f]');
  if (!s) return;
  F[s.dataset.f] = s.value;
  draw();
});
$('#dotsA').addEventListener('change', draw);
$('#refresh').addEventListener('click', () => load());
document.addEventListener('visibilitychange', () => { if (!document.hidden && KEY && !$('#dash').hidden) load({ quiet: true }); });
$('#toList').addEventListener('click', () => {
  const card = $('#list-card');
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  card.classList.remove('flash');
  void card.offsetWidth;
  card.classList.add('flash');
});
$('#csv1').addEventListener('click', csvAnswers);
$('#xlsx1').addEventListener('click', xlsxAll);
$('#cmp-dims').addEventListener('click', (e) => {
  const b = e.target.closest('[data-dim]');
  if (!b) return;
  CMP = b.dataset.dim;
  compareSection(filtered());
});
$('#lang').addEventListener('click', () => {
  lang = lang === 'ko' ? 'en' : 'ko';
  try { localStorage.setItem(LANG_KEY, lang); } catch { /* ignore */ }
  // a button pick wins over a ?lang= link, so a reload keeps it
  const u = new URL(location.href);
  if (u.searchParams.has('lang')) { u.searchParams.delete('lang'); history.replaceState(null, '', u.pathname + u.search); }
  if (ROWS.length || !$('#dash').hidden) draw(); else labels();
});
// tooltips for the charts: hover or keyboard focus shows the value (the tables keep every value too)
document.addEventListener('pointermove', (e) => {
  const m = e.target.closest?.('[data-tip]');
  if (m) showTip(m.getAttribute('data-tip'), e.clientX, e.clientY);
  else if (!e.target.closest?.('#ov-time svg')) hideTip();
});
document.addEventListener('focusin', (e) => {
  const m = e.target.closest?.('[data-tip]');
  if (!m) return;
  const r = m.getBoundingClientRect();
  showTip(m.getAttribute('data-tip'), r.left + r.width / 2, r.top);
});
document.addEventListener('focusout', hideTip);
$('#ov-time').addEventListener('pointermove', timelineHover);
$('#ov-time').addEventListener('pointerleave', () => { timelineMark(null); hideTip(); });

labels();
readKey();
load();
