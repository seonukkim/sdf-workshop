import { S, params, setLang, emit } from './state.js';
import { intro, choose, wait, booked, qual, shot } from './screens.js';
import { render as survey, thanks, flushQueue } from './survey.js';
import { initStage } from './stage.js';
import { setNav } from './nav.js';

const routes = {
  '/': intro,
  '/choose': choose,
  '/wait': wait,
  '/booked': booked,
  '/rate': survey,
  '/qual': qual,
  '/thanks': () => thanks(),
};

function renderPath(path) {
  (routes[path] || routes['/'])();
  document.getElementById('app').scrollTop = 0;
  emit('route', location.pathname);
}

function go(path, { replace = false } = {}) {
  if (location.pathname !== path) history[replace ? 'replaceState' : 'pushState']({}, '', path);
  renderPath(path);
}

async function boot() {
  setLang(S.lang);
  if (params.shot) document.documentElement.classList.add('shot');
  try {
    const res = await fetch('/data/places.json');
    S.data = await res.json();
  } catch {
    document.getElementById('app').innerHTML = '<p style="padding:24px">Could not load data. Please reload.</p>';
    return;
  }
  setNav(go);
  if (params.shot) { shot(params.shot); return; }
  initStage();
  window.addEventListener('popstate', () => renderPath(location.pathname));
  renderPath(location.pathname);
  flushQueue();
}

boot();
