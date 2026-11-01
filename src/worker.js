// TrustMyChef workshop prototype (sdf.seonukkim.com)
// Static files are served by Workers Static Assets; only /api/* reaches this script.
//   POST   /api/responses   save one anonymous survey response (upsert by id)
//   GET    /api/responses   list all responses        (Authorization: Bearer RESULTS_KEY)
//   DELETE /api/responses   delete all responses      (same key + {"confirm":"DELETE"})
//   DELETE /api/responses?id=…  delete one response (e.g. a test run), same key

const MAX_BODY = 32 * 1024;
const MAX_ROWS = 5000;

const GENDERS = ['female', 'male', 'other', 'na'];
const AFFS = ['undergrad', 'grad', 'intl', 'worker', 'other'];
const MEALS = ['0-3', '4-7', '8-15', '16+'];
const APPS = ['naver', 'kakao', 'google', 'instagram', 'catchtable', 'youtube', 'other'];
const ITEMS = ['s1', 's2', 's3', 's4'];
const SCENARIOS = ['guyeong', 'samsan'];
const OUTCOMES = ['normal', 'bad', 'none'];
const RESULTS = ['booked', 'none', 'stopped'];
const SUB = ['yes', 'maybe', 'no'];
const GROUPS = ['1', '2', '3', '4', 'teaching'];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/responses') {
      try {
        if (request.method === 'POST') return await save(request, env, url);
        if (request.method === 'GET') return await list(request, env);
        if (request.method === 'DELETE') return await wipe(request, env, url);
        return json({ error: 'method_not_allowed' }, 405, { allow: 'GET, POST, DELETE' });
      } catch (err) {
        if (err instanceof BadRequest) return json({ error: err.message }, 400);
        console.error(err);
        return json({ error: 'server_error' }, 500);
      }
    }
    if (url.pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404);
    return env.ASSETS.fetch(request);
  },
};

class BadRequest extends Error {}

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...extra,
    },
  });
}

// ------------------------------------------------------------------ validation
const n10 = (v) => (Number.isInteger(v) && v >= 1 && v <= 10 ? v : null);
const oneOf = (v, allowed) => (allowed.includes(v) ? v : null);
const int = (v, lo, hi) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : null);
const bool = (v) => (typeof v === 'boolean' ? v : null);
const iso = (v) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null);

function clean(b) {
  if (!b || typeof b !== 'object') throw new BadRequest('bad_json');
  const id = typeof b.id === 'string' ? b.id : '';
  if (!/^[0-9a-f-]{16,64}$/i.test(id)) throw new BadRequest('bad_id');

  const p = b.profile || {};
  const profile = {
    gender: oneOf(p.gender, GENDERS),
    age: Number.isInteger(p.age) && p.age >= 10 && p.age <= 99 ? p.age : null,
    affiliation: oneOf(p.affiliation, AFFS),
    mealsOut: oneOf(p.mealsOut, MEALS),
    apps: Array.isArray(p.apps) ? [...new Set(p.apps.filter((a) => APPS.includes(a)))] : [],
  };

  const r = b.ratings || {};
  const ratings = Object.fromEntries(ITEMS.map((k) => [k, { x: n10(r[k]?.x), y: n10(r[k]?.y) }]));

  const f = b.flow || {};
  const flow = {
    tried: bool(f.tried) ?? false,
    scenario: oneOf(f.scenario, SCENARIOS),
    chooseSec: int(f.chooseSec, 0, 3600),
    selected: int(f.selected, 0, 5),
    dm: int(f.dm, 0, 5),
    call: int(f.call, 0, 5),
    outcome: oneOf(f.outcome, OUTCOMES),
    result: oneOf(f.result, RESULTS),
    winner: typeof f.winner === 'string' && /^[a-z0-9-]{1,64}$/.test(f.winner) ? f.winner : null,
    winnerListingOnly: bool(f.winnerListingOnly),
    timeToYesSec: Number.isFinite(f.timeToYesSec) ? Math.min(600, Math.max(0, Math.round(f.timeToYesSec * 10) / 10)) : null,
    subPre: oneOf(f.subPre, SUB),   // "Would you subscribe?" (old rows only; now asked once after booking)
    subPost: oneOf(f.subPost, SUB), // ... and after booking
  };

  return {
    v: 2,
    id,
    lang: oneOf(b.lang, ['en', 'ko']) || 'en',
    group: oneOf(b.group, GROUPS),
    startedAt: iso(b.startedAt),
    submittedAt: iso(b.submittedAt),
    profile,
    ratings,
    flow,
  };
}

// ------------------------------------------------------------------ handlers
async function save(request, env, url) {
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== url.host) return json({ error: 'forbidden' }, 403);
  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ error: 'too_large' }, 413);
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new BadRequest('bad_json');
  }
  const data = clean(body);
  const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM responses').first();
  if (n >= MAX_ROWS) return json({ error: 'full' }, 507);
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO responses (id, created_at, updated_at, data) VALUES (?1, ?2, ?2, ?3)
     ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, data = excluded.data`,
  ).bind(data.id, now, JSON.stringify(data)).run();
  return json({ ok: true, id: data.id });
}

async function authorized(request, env) {
  const key = env.RESULTS_KEY;
  const got = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!key || !got) return false;
  const a = new TextEncoder().encode(got);
  const b = new TextEncoder().encode(key);
  if (a.byteLength !== b.byteLength) return false;
  return crypto.subtle.timingSafeEqual(a, b);
}

async function list(request, env) {
  if (!(await authorized(request, env))) return json({ error: 'unauthorized' }, 401);
  const { results } = await env.DB.prepare('SELECT id, created_at, updated_at, data FROM responses ORDER BY created_at').all();
  const rows = results.map((r) => ({ ...JSON.parse(r.data), createdAt: r.created_at, updatedAt: r.updated_at }));
  return json({ count: rows.length, rows });
}

async function wipe(request, env, url) {
  if (!(await authorized(request, env))) return json({ error: 'unauthorized' }, 401);
  const one = url.searchParams.get('id');
  if (one) {
    if (!/^[0-9a-f-]{16,64}$/i.test(one)) throw new BadRequest('bad_id');
    const r = await env.DB.prepare('DELETE FROM responses WHERE id = ?1').bind(one).run();
    return json({ ok: true, deleted: r.meta?.changes ?? null });
  }
  let body = {};
  try {
    body = await request.json();
  } catch {
    /* fall through */
  }
  if (body.confirm !== 'DELETE') throw new BadRequest('confirm_required');
  const res = await env.DB.prepare('DELETE FROM responses').run();
  return json({ ok: true, deleted: res.meta?.changes ?? null });
}
