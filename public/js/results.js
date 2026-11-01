// Facilitator dashboard (quantitative part): reads /api/responses with the results key and shows
// ONE 2×2 matrix — How convenient is it? × Would you pay for it? (1–10) — for each screen and the whole
// service, plus "Would you subscribe? ₩3,000/month", asked once right after booking (the sales point).
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
    S1: 'Screen 1 · Ask many places at once', S2: 'Screen 2 · The first Yes wins', S3: 'Screen 3 · Booking confirmed', S4: 'The whole service (Pass ₩3,000/mo)',
    mp: 'Worth paying for', np: 'Would pay, but not convenient', mf: 'Good, but should be free', nn2: 'Not useful',
    noData: 'No responses yet.',
    xConv: 'How convenient', yPay: 'Would pay',
    list: 'Every answer (time recorded)', recorded: 'Recorded (KST)', del: 'Delete', delAsk: 'Delete this answer? (for test runs)', grp: 'Group', ages: 'Age', sub: 'Subscribe', rates: 'Ratings 1–4 (conv/pay)',
    bSubPre: 'Would subscribe (₩3,000/mo)? · Before trying', bSubPost: 'Would subscribe (₩3,000/mo)? · After booking',
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
    gateTitle: '결과 키를 입력하세요', gateBody: '팀원만 응답을 볼 수 있어요.', open: '열기', badKey: '키가 맞지 않아요.',
    netErr: '불러오지 못했어요. 인터넷 연결을 확인해 주세요.',
    chartA: '편리함 × 지불 의향 (1–10)', showDots: '개별 응답 보기',
    behavior: '프로토타입에서의 행동', profile: '응답자',
    group: '모둠', gender: '성별', aff: '소속', age: '나이', all: '전체', count: '응답 {total}개 중 {n}개',
    kResp: '응답 수', kTried: '프로토타입 사용', kSub: '구독 의향(네) · 예약한 뒤', kPay: '서비스 전체 지불 의향 평균',
    of: '{n}명 중', item: '항목', mx: '편리', my: '지불', nn: 'n', spread: '사분면별 응답', byMean: '평균 위치',
    S1: '화면 1 · 여러 곳에 한 번에 요청', S2: '화면 2 · 먼저 수락한 곳으로', S3: '화면 3 · 예약 확정', S4: '서비스 전체 (패스 월 ₩3,000)',
    mp: '돈 낼 만해요', np: '돈은 내겠지만 불편해요', mf: '좋지만 무료여야 해요', nn2: '필요 없어요',
    noData: '아직 응답이 없어요.',
    xConv: '편리함', yPay: '지불 의향',
    list: '전체 응답 (기록 시각)', recorded: '기록 시각 (KST)', del: '삭제', delAsk: '이 응답을 삭제할까요? (테스트용)', grp: '모둠', ages: '나이', sub: '구독', rates: '평가 1–4 (편리/지불)',
    bSubPre: '구독(월 ₩3,000) 의향 · 써 보기 전', bSubPost: '구독(월 ₩3,000) 의향 · 예약한 뒤',
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
    cSub: '예약 뒤 구독', cCh: 'DM : AI 전화', cPick: '고른 곳', cYes: '첫 수락', subLine: '네 {y} · 글쎄요 {m} · 아니요 {n}',
  },
};
let lang = (localStorage.getItem('tmc.lang') || (navigator.language || '').slice(0, 2)) === 'ko' ? 'ko' : 'en';
const t = (k, v) => {
  let s = T[lang][k] ?? T.en[k] ?? k;
  if (v) s = s.replace(/\{(\w+)\}/g, (m, x) => (v[x] ?? m));
  return s;
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (s) => document.querySelector(s);

const ITEMS = ['s1', 's2', 's3', 's4'];
const QCOLOR = { mp: '#CC4410', np: '#8E6AD6', mf: '#0E9F6E', nn: '#A39B93' };
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
  if (m) history.replaceState(null, '', location.pathname);
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
  s += `<rect x="${mid}" y="18" width="${inner / 2}" height="${inner / 2}" fill="#FFF1EA"/>`;
  s += `<rect x="${mid}" y="${midY}" width="${inner / 2}" height="${inner / 2}" fill="#F1FAF6"/>`;
  s += `<rect x="${pad}" y="18" width="${inner / 2}" height="${inner / 2}" fill="#F7F3FD"/>`;
  for (let v = 1; v <= 10; v++) {
    s += `<text x="${X(v)}" y="${18 + inner + 16}" font-size="10.5" fill="#8A827B" text-anchor="middle">${v}</text>`;
    s += `<text x="${pad - 8}" y="${Y(v) + 3.5}" font-size="10.5" fill="#8A827B" text-anchor="end">${v}</text>`;
  }
  s += `<line x1="${mid}" y1="18" x2="${mid}" y2="${18 + inner}" stroke="#A39B93" stroke-dasharray="4 4"/>`;
  s += `<line x1="${pad}" y1="${midY}" x2="${pad + inner}" y2="${midY}" stroke="#A39B93" stroke-dasharray="4 4"/>`;
  const lab = (x, y, txt, anchor, color) => `<text x="${x}" y="${y}" font-size="11.5" font-weight="750" fill="${color}" text-anchor="${anchor}">${esc(txt)}</text>`;
  s += lab(pad + inner - 8, 34, qName('mp'), 'end', QCOLOR.mp) + lab(pad + 8, 34, qName('np'), 'start', '#6A44B8')
    + lab(pad + inner - 8, 18 + inner - 10, qName('mf'), 'end', '#067A55') + lab(pad + 8, 18 + inner - 10, qName('nn'), 'start', '#8A827B');
  s += `<text x="${pad + inner / 2}" y="${h - 4}" font-size="12" font-weight="700" fill="#5B5550" text-anchor="middle">${esc(xLabel)} (1–10) →</text>`;
  s += `<text x="13" y="${18 + inner / 2}" font-size="12" font-weight="700" fill="#5B5550" text-anchor="middle" transform="rotate(-90 13 ${18 + inner / 2})">${esc(yLabel)} (1–10) →</text>`;
  // individual answers: deterministic jitter so dots on the same cell stay visible
  dots.forEach((d, i) => {
    const jx = (((i * 37) % 11) - 5) * 2.2, jy = (((i * 53) % 11) - 5) * 2.2;
    s += `<circle cx="${X(d.x) + jx}" cy="${Y(d.y) + jy}" r="4.2" fill="${d.color}" fill-opacity=".38" stroke="${d.color}" stroke-opacity=".7"><title>${esc(d.title || '')}</title></circle>`;
  });
  means.forEach((m) => {
    s += `<g><circle cx="${X(m.x)}" cy="${Y(m.y)}" r="14" fill="${m.color || QCOLOR.mp}" stroke="#fff" stroke-width="2.5"><title>${esc(m.title || '')}</title></circle><text x="${X(m.x)}" y="${Y(m.y) + 4.5}" font-size="12" font-weight="800" fill="#fff" text-anchor="middle">${esc(m.label)}</text></g>`;
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
  s += `<rect x="${p}" y="${p}" width="${inner / 2}" height="${inner / 2}" fill="#F7F3FD"/><rect x="${mid}" y="${p}" width="${inner / 2}" height="${inner / 2}" fill="#FFF1EA"/>`;
  s += `<rect x="${p}" y="${mid}" width="${inner / 2}" height="${inner / 2}" fill="#FBFAF8"/><rect x="${mid}" y="${mid}" width="${inner / 2}" height="${inner / 2}" fill="#F1FAF6"/>`;
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
    s += `<g><circle cx="${cx}" cy="${cy}" r="11" fill="${QCOLOR[meanQuad(m)] || QCOLOR.mp}" stroke="#fff" stroke-width="2"><title>${esc(t(`s${i + 1}s`))}: ${f1(m.x)} / ${f1(m.y)}</title></circle><text x="${cx}" y="${cy + 4}" font-size="11.5" font-weight="800" fill="#fff" text-anchor="middle">${i + 1}</text></g>`;
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

function draw() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
  $('#lang').textContent = lang === 'ko' ? 'English' : '한국어';
  const rows = filtered();
  $('#filters').innerHTML = filtersHtml(rows);
  $('#kpis').innerHTML = kpis(rows);
  if (!ROWS.length) {
    ['#chartA', '#tableA', '#behavior', '#profile'].forEach((s) => { $(s).innerHTML = ''; });
    $('#tableA').innerHTML = `<div class="empty-state">${t('noData')}</div>`;
  }
  compareSection(rows);
  screensSection(rows, $('#dotsA').checked);
  behaviorSection(rows);
  profileSection(rows);
  listSection(rows);
}

// every answer with the time it was recorded; single rows can be deleted (test runs)
const kst = (iso) => (iso ? new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(0, 16) : '–');
function listSection(rows) {
  const subTxt = (v) => (v ? t(v) : '–');
  const body = [...rows].reverse().map((r) => `<tr>
    <td class="num">${kst(r.createdAt)}</td><td>${esc(r.group === 'teaching' ? t('teaching') : r.group || '–')}</td>
    <td>${esc(r.profile?.gender ? t(r.profile.gender) : '–')}</td><td class="num">${r.profile?.age ?? '–'}</td>
    <td>${subTxt(r.flow?.subPost)}</td>
    <td class="num">${ITEMS.map((k) => `${r.ratings?.[k]?.x ?? '–'}/${r.ratings?.[k]?.y ?? '–'}`).join(' · ')}</td>
    <td><button class="btn btn-line btn-sm danger" data-del="${esc(r.id)}">${t('del')}</button></td></tr>`).join('');
  $('#list').innerHTML = rows.length
    ? `<table class="rs-t"><thead><tr><th>${t('recorded')}</th><th>${t('grp')}</th><th>${t('gender')}</th><th class="num">${t('ages')}</th><th>${t('sub')}</th><th class="num">${t('rates')}</th><th></th></tr></thead><tbody>${body}</tbody></table>`
    : `<div class="empty-state">${t('noData')}</div>`;
}
$('#list').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-del]');
  if (!b) return;
  const r = ROWS.find((x) => x.id === b.dataset.del);
  const g = r?.group === 'teaching' ? t('teaching') : r?.group || '–';
  if (!(await confirmBox({ title: t('delTitle'), body: t('delBody', { time: kst(r?.createdAt), g }), ok: t('del') }))) return;
  const res = await fetch(`/api/responses?id=${encodeURIComponent(b.dataset.del)}`, { method: 'DELETE', headers: { authorization: `Bearer ${KEY}` } });
  if (res.ok) { notice(t('deleted')); load(); }
});

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
$('#csv1').addEventListener('click', csvAnswers);
$('#xlsx1').addEventListener('click', xlsxAll);
$('#cmp-dims').addEventListener('click', (e) => {
  const b = e.target.closest('[data-dim]');
  if (!b) return;
  CMP = b.dataset.dim;
  compareSection(filtered());
});
$('#lang').addEventListener('click', () => { lang = lang === 'ko' ? 'en' : 'ko'; if (ROWS.length || !$('#dash').hidden) draw(); else document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); }); });
// deleting everything needs the key (the buttons only exist after it) and a second yes in the pop-up
$('#wipe').addEventListener('click', async () => {
  const n = ROWS.length;
  if (!n) { notice(t('noData')); return; }
  if (!(await confirmBox({ title: t('wipeTitle', { n }), body: t('wipeBody'), ok: t('wipeOk', { n }) }))) return;
  const res = await fetch('/api/responses', { method: 'DELETE', headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' }, body: JSON.stringify({ confirm: 'DELETE' }) });
  if (res.ok) { notice(t('wiped')); load(); } else notice(t('badKey'));
});

document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
$('#lang').textContent = lang === 'ko' ? 'English' : '한국어';
readKey();
load();
