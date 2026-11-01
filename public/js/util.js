const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export const icon = (name, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const rand = (a, b) => a + Math.random() * (b - a);
export const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function mmss(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function clock(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function uid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

let toastTimer;
export function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), 2200);
}

// 1–5 is low, 6–10 is high on both axes (midpoint 5.5, so no ties).
export function quadrant(x, y) {
  if (x == null || y == null) return null;
  const hiX = x >= 6;
  const hiY = y >= 6;
  if (hiX && hiY) return 'mp';
  if (!hiX && hiY) return 'np';
  if (hiX && !hiY) return 'mf';
  return 'nn';
}
export const QUAD_KEY = { mp: 'qMP', np: 'qNP', mf: 'qMF', nn: 'qNN' };

// Korean particle after a name: josa('멘모찌 구영리점', '은', '는') → '은'
export function josa(word, withFinal, withoutFinal) {
  const c = String(word).trim().charCodeAt(String(word).trim().length - 1);
  if (c >= 0xac00 && c <= 0xd7a3) return (c - 0xac00) % 28 ? withFinal : withoutFinal;
  return `${withFinal}(${withoutFinal})`;
}

export function bookingCode() {
  return 'TMC-' + String(Math.floor(1000 + Math.random() * 9000));
}
