// Wizard-of-Oz engine: plays the restaurant owners. No message ever leaves the browser.
// Each request gets a scripted timeline (sent → seen → reply for DM; dial → ring → answer → keypress for AI calls).
// The first owner who says Yes wins; every other open request is cancelled automatically.

import { trust, place } from './state.js';
import { rand, bookingCode } from './util.js';

const SPEED = { normal: 1, fast: 0.45 };

function weighted(pairs) {
  let r = Math.random() * pairs.reduce((a, [, w]) => a + w, 0);
  for (const [v, w] of pairs) {
    if ((r -= w) <= 0) return v;
  }
  return pairs[pairs.length - 1][0];
}

// Normal: a recommended place usually wins (closer places slightly more often).
// 'bad': the least trusted place wins, to stage the "what if a bad place says Yes" question.
function chooseWinner(reqs, outcome) {
  if (outcome === 'none') return -1;
  const scored = reqs.map((r, i) => {
    const tr = trust(place(r.id));
    return { i, listing: tr.listingOnly, named: tr.named.length, walk: r.walkMin };
  });
  if (outcome === 'bad') {
    scored.sort((a, b) => (b.listing - a.listing) || (a.named - b.named) || (b.walk - a.walk));
    return scored[0].i;
  }
  const pool = scored.filter((s) => !s.listing);
  const use = pool.length ? pool : scored;
  return weighted(use.map((s) => [s.i, 1 / (1 + s.walk / 6)]));
}

export function createMatch({ items, party, when, outcome, speed, onChange }) {
  const k = SPEED[speed] || 1;
  const t0 = performance.now();
  const code = bookingCode();
  const st = {
    reqs: items.map((it) => ({
      id: it.id,
      channel: it.channel,
      walkMin: it.walkMin,
      status: it.channel === 'dm' ? 'sending' : 'calling',
      msgs: [],
      timers: [],
      kind: null,
      repliedAt: null,
    })),
    log: [],
    winner: null,
    winAt: null,
    result: null, // booked | none | stopped
    code,
    t0,
    endedAt: null,
  };
  const elapsed = () => (performance.now() - t0) / 1000;
  const push = (key, vars) => st.log.push({ at: elapsed(), key, vars });
  const changed = () => onChange && onChange(st);

  function at(r, sec, fn) {
    const id = setTimeout(() => {
      if (st.result && st.result !== 'booked') return;
      fn();
      changed();
    }, sec * 1000 * k);
    r.timers.push(id);
  }
  const isOpen = (r) => !['yes', 'no', 'noanswer', 'cancelled'].includes(r.status);

  // ---- plan outcomes
  const winIdx = chooseWinner(st.reqs, outcome);
  st.reqs.forEach((r, i) => {
    if (outcome === 'none') r.kind = Math.random() < 0.6 ? 'no' : 'noanswer';
    else if (i === winIdx) r.kind = 'yes';
    else r.kind = weighted([['no', 0.5], ['late', 0.3], ['noanswer', 0.2]]);
  });

  // ---- plan reply times (seconds at normal speed)
  const replyAt = (r) => (r.channel === 'dm' ? rand(5.5, 9) : rand(6, 9.5));
  const win = st.reqs[winIdx];
  const winTime = win ? replyAt(win) : null;
  st.reqs.forEach((r) => {
    if (r.kind === 'yes') r.replyAt = winTime;
    else if (r.kind === 'no') r.replyAt = win ? Math.max(3.2, winTime - rand(1.2, 3.2)) : replyAt(r);
    else if (r.kind === 'late') r.replyAt = winTime + rand(3, 6); // will be cancelled first
    else r.replyAt = rand(12, 14); // noanswer timeout
  });

  function settleIfDone() {
    if (st.result) return;
    if (st.reqs.every((r) => !isOpen(r))) {
      st.result = 'none';
      st.endedAt = elapsed();
      push('logNone');
    }
  }

  function onYes(r) {
    st.winner = r.id;
    st.winAt = elapsed();
    st.result = 'booked';
    st.endedAt = st.winAt;
    push('logYes', { id: r.id });
    push('logBooked', { id: r.id });
    if (r.channel === 'dm') r.msgs.push({ from: 'tmc', key: 'dmBooked', vars: { n: party, code } });
    // cancel the rest a moment later, like a real dispatcher would
    setTimeout(() => {
      for (const o of st.reqs) {
        if (o === r || !isOpen(o)) continue;
        o.timers.forEach(clearTimeout);
        o.status = 'cancelled';
        o.msgs.push(o.channel === 'dm' ? { from: 'tmc', key: 'dmCancel' } : { from: 'sys', key: 'callEnd' });
        push('logCancel', { id: o.id });
      }
      changed();
    }, 600 * k);
  }

  function reply(r) {
    if (st.result === 'booked' && r.kind !== 'no') return;
    const ask = r.msgs.find((m) => m.qr);
    if (r.kind === 'yes' || r.kind === 'late') {
      if (st.result === 'booked') return;
      r.status = 'yes';
      r.repliedAt = elapsed();
      if (r.channel === 'dm') {
        if (ask) ask.picked = 'yes';
        r.msgs.push({ from: 'owner', key: 'yesReplies', idx: Math.floor(Math.random() * 3), vars: { n: party }, sim: true });
      } else {
        r.msgs.push({ from: 'owner', key: 'callYes', sim: true });
        r.msgs.push({ from: 'ai', key: 'callThanks', vars: { w: r.walkMin } });
        r.msgs.push({ from: 'sys', key: 'callEnd' });
      }
      onYes(r);
    } else if (r.kind === 'no') {
      r.status = 'no';
      r.repliedAt = elapsed();
      if (r.channel === 'dm') {
        if (ask) ask.picked = 'no';
        r.msgs.push({ from: 'owner', key: 'noReplies', idx: Math.floor(Math.random() * 3), vars: { n: party }, sim: true });
      } else {
        r.msgs.push({ from: 'owner', key: 'callNo', sim: true });
        r.msgs.push({ from: 'sys', key: 'callEnd' });
      }
      push('logNo', { id: r.id });
      settleIfDone();
    } else {
      r.status = 'noanswer';
      r.msgs.push(r.channel === 'dm' ? { from: 'sys', key: 'stNoAnswer' } : { from: 'sys', key: 'callNoAnswer' });
      push('logNoAnswer', { id: r.id });
      settleIfDone();
    }
  }

  function start() {
    for (const r of st.reqs) {
      const vars = { n: party, when, w: r.walkMin };
      if (r.channel === 'dm') {
        at(r, rand(0.5, 1), () => {
          r.status = 'sent';
          r.msgs.push({ from: 'tmc', key: 'dmAsk', vars, qr: true });
          push('logSentDm', { id: r.id });
        });
        const seen = Math.min(r.replyAt - 2.2, rand(2.2, 4.5));
        if (r.kind !== 'noanswer' || Math.random() < 0.5) at(r, Math.max(1.4, seen), () => { r.status = 'seen'; });
        if (r.kind !== 'noanswer') at(r, Math.max(2, r.replyAt - 1.6), () => { r.status = 'typing'; });
      } else {
        r.msgs.push({ from: 'sys', key: 'callDial', vars: { id: r.id } });
        push('logCalling', { id: r.id });
        at(r, 0.9, () => { r.status = 'ringing'; });
        if (r.kind !== 'noanswer') {
          at(r, Math.max(2.4, r.replyAt - rand(2.6, 3.6)), () => {
            r.status = 'oncall';
            r.msgs.push({ from: 'ai', key: 'callAsk', vars });
          });
        }
      }
      at(r, r.replyAt, () => reply(r));
    }
    changed();
  }

  function stop() {
    for (const r of st.reqs) r.timers.forEach(clearTimeout);
    if (!st.result) {
      st.result = 'stopped';
      st.endedAt = elapsed();
    }
  }

  return { state: st, start, stop, elapsed };
}

// Frozen states for screen previews (survey thumbnails, design board).
export function frozenMatch({ items, party, when, mode }) {
  const st = {
    reqs: items.map((it) => ({ id: it.id, channel: it.channel, walkMin: it.walkMin, status: 'sent', msgs: [], timers: [] })),
    log: [],
    winner: null,
    winAt: null,
    result: null,
    code: 'TMC-4821',
    t0: 0,
    endedAt: null,
  };
  const [a, b, c] = st.reqs;
  const vars = (r) => ({ n: party, when, w: r.walkMin });
  if (a) {
    a.status = 'typing';
    a.msgs.push({ from: 'tmc', key: 'dmAsk', vars: vars(a), qr: true });
  }
  if (b) {
    b.status = 'oncall';
    b.msgs.push({ from: 'sys', key: 'callDial', vars: { id: b.id } }, { from: 'ai', key: 'callAsk', vars: vars(b) });
  }
  if (c) {
    c.status = 'no';
    c.msgs.push({ from: 'tmc', key: 'dmAsk', vars: vars(c), qr: true, picked: 'no' }, { from: 'owner', key: 'noReplies', idx: 0, vars: { n: party }, sim: true });
  }
  st.log.push({ at: 0.6, key: 'logSentDm', vars: { id: a?.id } }, { at: 0.7, key: 'logCalling', vars: { id: b?.id } }, { at: 4.1, key: 'logNo', vars: { id: c?.id } });
  if (mode === 'none') {
    if (a) { a.status = 'no'; a.msgs[0].picked = 'no'; a.msgs.push({ from: 'owner', key: 'noReplies', idx: 1, vars: { n: party }, sim: true }); }
    if (b) { b.status = 'noanswer'; b.msgs.splice(1); b.msgs.push({ from: 'sys', key: 'callNoAnswer' }); }
    st.log.push({ at: 6.2, key: 'logNo', vars: { id: a?.id } }, { at: 12.4, key: 'logNoAnswer', vars: { id: b?.id } }, { at: 12.4, key: 'logNone' });
    st.result = 'none';
    st.endedAt = 12.4;
  }
  if (mode === 'booked' && a) {
    a.status = 'yes';
    a.msgs[0].picked = 'yes';
    a.msgs.push({ from: 'owner', key: 'yesReplies', idx: 0, vars: { n: party }, sim: true });
    st.winner = a.id;
    st.winAt = 7.4;
    st.result = 'booked';
    if (b) { b.status = 'cancelled'; b.msgs.push({ from: 'sys', key: 'callEnd' }); }
  }
  return { state: st, start() {}, stop() {}, elapsed: () => 7 };
}
