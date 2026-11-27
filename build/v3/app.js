(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const nn = n => String(n).padStart(2, '0');
const read = id => { try { return JSON.parse($(id).textContent); } catch (e) { return []; } };
const CERTS = read('#certData');
const DECKS = read('#deckData');
const deckById = id => DECKS.find(d => d.id === id);
const slideBase = (id, n) => `decks/${id}/slide-${nn(n)}`;

/* email: assembled here so the address is not in the markup */
const mail = $('#mail');
const address = `${mail.dataset.u}@${mail.dataset.d}`;
mail.textContent = address;
mail.href = `mailto:${address}`;
$('#heroEmail').href = `mailto:${address}`;
const copyBtn = $('#copyMail');
copyBtn.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(address); copyBtn.textContent = 'Copied'; }
  catch (e) { copyBtn.textContent = address; }
  setTimeout(() => (copyBtn.textContent = 'Copy email address'), 2000);
});

/* header: hairline once the page scrolls; current section in the nav */
const head = $('#siteHead');
const onScroll = () => head.classList.toggle('scrolled', scrollY > 8);
addEventListener('scroll', onScroll, { passive: true }); onScroll();
const navLinks = $$('#nav a[href^="#"]:not(.btn)');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    navLinks.forEach(a => a.setAttribute('aria-current', a.getAttribute('href') === '#' + e.target.id ? 'true' : 'false'));
  }), { rootMargin: '-45% 0px -50% 0px' });
  ['work', 'results', 'experience', 'certificates', 'about'].forEach(id => { const el = document.getElementById(id); if (el) io.observe(el); });
}

/* phone menu */
const nav = $('#nav'), menuBtn = $('#menuBtn');
const setMenu = on => { nav.classList.toggle('open', on); menuBtn.setAttribute('aria-expanded', on); menuBtn.textContent = on ? 'Close' : 'Menu'; };
menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
nav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); menuBtn.focus(); } });

/* viewer: decks slide by slide, certificates with their story, photos */
const V = { el: $('#viewer'), img: $('#vImg'), pic: $('#vPic'), cap: $('#vCap'), title: $('#vTitle'), count: $('#vCount'), pdf: $('#vPdf'),
  meta: $('#vMeta'), h: $('#vH'), text: $('#vText'), strip: $('#vStrip'), prev: $('#vPrev'), next: $('#vNext'), close: $('#vClose'),
  mode: null, i: 0, deck: null, opener: null };
function setPicture(sources, src, alt) {
  $$('source', V.pic).forEach(s => s.remove());
  (sources || []).forEach(([type, set]) => { const s = document.createElement('source'); s.type = type; s.srcset = set; s.sizes = '90vw'; V.pic.insertBefore(s, V.img); });
  V.img.src = src; V.img.alt = alt || '';
}
function render() {
  V.el.classList.toggle('is-deck', V.mode === 'deck');
  V.el.classList.toggle('is-image', V.mode === 'image');
  if (V.mode === 'cert') {
    const c = CERTS[V.i];
    setPicture(null, c.img, c.alt || c.title);
    V.title.textContent = c.title; V.count.textContent = `${V.i + 1} of ${CERTS.length}`;
    V.meta.textContent = c.meta; V.h.textContent = c.title; V.text.innerHTML = c.text; V.cap.textContent = '';
    V.prev.hidden = V.next.hidden = false;
  } else if (V.mode === 'deck') {
    const d = V.deck, n = V.i + 1, b = slideBase(d.id, n);
    const set = ext => `${b}-640.${ext} 640w, ${b}-1200.${ext} 1200w, ${b}-1920.${ext} 1920w`;
    setPicture([['image/avif', set('avif')], ['image/webp', set('webp')]], `${b}-1920.jpg`, `${d.title}, slide ${n} of ${d.slides}`);
    V.title.textContent = d.title; V.count.textContent = `Slide ${n} of ${d.slides}`; V.cap.textContent = '';
    V.pdf.href = d.pdf.replace(/^\//, ''); V.pdf.textContent = `Download PDF, ${d.pdfSize}`;
    $$('button', V.strip).forEach((t, k) => { t.setAttribute('aria-current', k === V.i ? 'true' : 'false'); if (k === V.i) t.scrollIntoView({ block: 'nearest', inline: 'center' }); });
    V.prev.hidden = V.next.hidden = false;
    history.replaceState(null, '', `#deck=${d.id}&s=${n}`);
    [n - 1, n + 1].forEach(k => { if (k >= 1 && k <= d.slides) new Image().src = `${slideBase(d.id, k)}-1920.jpg`; });
  } else {
    V.prev.hidden = V.next.hidden = true; V.count.textContent = '';
  }
}
function open(mode, opts, opener) {
  V.mode = mode; V.opener = opener || document.activeElement;
  if (mode === 'cert') V.i = opts.i;
  if (mode === 'deck') {
    V.deck = opts.deck; V.i = Math.min(Math.max(0, (opts.slide || 1) - 1), opts.deck.slides - 1);
    V.strip.innerHTML = Array.from({ length: V.deck.slides }, (_, k) =>
      `<button type="button" aria-label="Slide ${k + 1}"><img src="${slideBase(V.deck.id, k + 1)}-640.jpg" alt="" width="640" height="360" loading="lazy" decoding="async"></button>`).join('');
    $$('button', V.strip).forEach((t, k) => t.addEventListener('click', () => { V.i = k; render(); }));
  }
  if (mode === 'image') { setPicture(null, opts.src, opts.cap); V.cap.textContent = opts.cap || ''; V.title.textContent = opts.cap || ''; }
  render();
  V.el.inert = false; V.el.classList.add('open'); document.documentElement.style.overflow = 'hidden';
  requestAnimationFrame(() => V.close.focus({ preventScroll: true }));
}
function close() {
  if (!V.el.classList.contains('open')) return;
  V.el.classList.remove('open'); V.el.inert = true; document.documentElement.style.overflow = '';
  if (V.mode === 'deck') history.replaceState(null, '', location.pathname + location.search);
  if (V.opener && V.opener.focus) V.opener.focus({ preventScroll: true });
}
function step(d) {
  if (V.mode === 'cert') V.i = (V.i + d + CERTS.length) % CERTS.length;
  else if (V.mode === 'deck') V.i = Math.min(Math.max(0, V.i + d), V.deck.slides - 1);
  render();
}
V.close.addEventListener('click', close);
V.prev.addEventListener('click', () => step(-1));
V.next.addEventListener('click', () => step(1));
V.el.addEventListener('click', e => { if (e.target === V.el || e.target.classList.contains('v-body') || e.target.classList.contains('v-main')) close(); });
document.addEventListener('keydown', e => {
  if (!V.el.classList.contains('open')) return;
  if (e.key === 'Escape') { e.preventDefault(); close(); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  else if (e.key === 'Tab') {
    const f = $$('button:not([hidden]),a[href]', V.el).filter(x => x.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }
});
let sx = null;
V.el.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
V.el.addEventListener('touchend', e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); sx = null; });
document.addEventListener('click', e => {
  const t = e.target.closest('[data-cert],[data-deck],[data-image]');
  if (!t || t.closest('#viewer')) return;
  e.preventDefault();
  if (t.dataset.cert != null) open('cert', { i: +t.dataset.cert }, t);
  else if (t.dataset.deck) { const d = deckById(t.dataset.deck); if (d) open('deck', { deck: d, slide: +t.dataset.slide || 1 }, t); }
  else open('image', { src: t.dataset.image, cap: t.dataset.cap }, t);
});
const m = location.hash.match(/^#deck=([\w-]+)(?:&s=(\d+))?/);
if (m) { const d = deckById(m[1]); if (d) open('deck', { deck: d, slide: +m[2] || 1 }); }

/* chess replay: loads when the section is near, plays only when asked */
const boardEl = $('#board');
let CH = null, squares = [], ply = -1, timer = null;
const bMove = $('#bMove'), bNote = $('#bNote'), bPlay = $('#bPlay');
function setPly(k) {
  if (!CH) return;
  const last = CH.plies.length - 1;
  k = Math.max(CH.startPly, Math.min(last, k)); if (k === ply) return; ply = k;
  const p = CH.plies[k]; let i = 0;
  for (const row of p.fen.split('/')) for (const ch of row) {
    if (ch >= '1' && ch <= '8') { for (let j = 0; j < +ch; j++) squares[i++].dataset.p = ''; }
    else squares[i++].dataset.p = (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase();
  }
  squares.forEach(s => s.classList.toggle('hl', s.dataset.sq === p.from || s.dataset.sq === p.to));
  bMove.textContent = p.san ? `${p.n} ${p.san}` : '';
  bNote.textContent = k === CH.keyPly ? CH.keyNote : k === last ? `${CH.result}, White wins.` : '';
}
const stop = () => { clearInterval(timer); timer = null; bPlay.textContent = 'Play'; bPlay.setAttribute('aria-pressed', 'false'); };
bPlay.addEventListener('click', () => {
  if (!CH) return;
  if (timer) { stop(); return; }
  if (ply >= CH.plies.length - 1) setPly(CH.startPly);
  bPlay.textContent = 'Pause'; bPlay.setAttribute('aria-pressed', 'true');
  timer = setInterval(() => { if (ply >= CH.plies.length - 1) stop(); else setPly(ply + 1); }, 800);
});
function loadChess() {
  fetch('data/chess.json', { credentials: 'same-origin' }).then(r => r.ok ? r.json() : null).catch(() => null).then(d => {
    if (!d || !d.plies) { $('.chess-board').hidden = true; return; }
    CH = d;
    boardEl.innerHTML = Array.from({ length: 64 }, (_, i) => { const r = i >> 3, f = i & 7; return `<span class="sq ${(r + f) % 2 ? 'd' : 'l'}" data-sq="${'abcdefgh'[f]}${8 - r}"></span>`; }).join('');
    squares = Array.from(boardEl.children);
    boardEl.setAttribute('aria-label', `Replay of ${d.white} vs ${d.black}, ${d.event}`);
    const bar = (el, side, name) => { el.innerHTML = `<i class="${side[0]}"></i><span>${side === 'white' ? 'White' : 'Black'}</span><b></b>`; $('b', el).textContent = name; };
    bar($('#pTop'), 'black', d.black); bar($('#pBottom'), 'white', d.white);
    $('#bSrc').textContent = d.caption || '';
    setPly(d.keyPly || d.startPly);
  });
}
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); loadChess(); } }, { rootMargin: '600px 0px' });
  io.observe($('#chess'));
} else loadChess();
})();
