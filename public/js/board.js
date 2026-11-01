// Design board: load the live screen previews and switch their language.
let lang = 'en';
const frames = [...document.querySelectorAll('#shots iframe')];
const btn = document.getElementById('lang-toggle');

function load() {
  frames.forEach((f) => { f.src = `/?shot=${f.dataset.shot}&lang=${lang}&at=guyeong`; });
  btn.textContent = lang === 'en' ? 'Show in Korean' : 'Show in English';
}
btn.addEventListener('click', () => { lang = lang === 'en' ? 'ko' : 'en'; load(); });
load();
