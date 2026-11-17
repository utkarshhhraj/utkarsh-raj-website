(() => {
'use strict';
const html = document.documentElement;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const isStatic = html.classList.contains('static');
const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
const finePointer = matchMedia('(hover:hover) and (pointer:fine)').matches;
const LAPTOP = '(min-width:861px)';
const PHONE = '(max-width:860px)';
const ui = $('#ui');

/* ---------- data ---------- */
let CERTS = [];
try { CERTS = JSON.parse($('#certData').textContent); } catch (e) {}
let DECKS = [];
const deckById = id => DECKS.find(d => d.id === id);
const nn = n => String(n).padStart(2, '0');
const slideBase = (id, n) => `decks/${id}/slide-${nn(n)}`;
const pictureHTML = (id, n, sizes, alt, lazy = true) => {
  const b = slideBase(id, n);
  const set = ext => `${b}-640.${ext} 640w, ${b}-1200.${ext} 1200w, ${b}-1920.${ext} 1920w`;
  return `<picture><source type="image/avif" srcset="${set('avif')}" sizes="${sizes}"><source type="image/webp" srcset="${set('webp')}" sizes="${sizes}"><img src="${b}-1200.jpg" srcset="${set('jpg')}" sizes="${sizes}" alt="${alt}" width="1920" height="1080" decoding="async"${lazy ? ' loading="lazy"' : ''}></picture>`;
};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- email (assembled here so the address is not in the markup) ---------- */
const mailEl = $('#mail');
const address = mailEl ? `${mailEl.dataset.u}@${mailEl.dataset.d}` : '';
if (mailEl) {
  mailEl.textContent = address;
  mailEl.href = `mailto:${address}`;
  $('#emailMe').href = `mailto:${address}`;
}
const copyBtn = $('#copyMail');
if (copyBtn) copyBtn.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(address); copyBtn.textContent = 'Copied'; }
  catch (e) { copyBtn.textContent = address; }
  setTimeout(() => (copyBtn.textContent = 'Copy email'), 1800);
});

/* ---------- IST clock ---------- */
const clock = $('#clock');
const tick = () => {
  if (!clock) return;
  try { clock.textContent = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata', hour12: false }).format(new Date()) + ' IST'; }
  catch (e) { clock.textContent = 'IST'; }
};
tick(); setInterval(tick, 20000);

/* ---------- viewer (certificates, decks, images) ---------- */
const V = {
  el: $('#viewer'), img: $('#vImg'), pic: $('#vPic'), cap: $('#vCap'), title: $('#vTitle'), count: $('#vCount'), pdf: $('#vPdf'),
  meta: $('#vMeta'), h: $('#vH'), text: $('#vText'), strip: $('#vStrip'), prevBtn: $('#vPrev'), nextBtn: $('#vNext'), closeBtn: $('#vClose'),
  mode: null, i: 0, deck: null, opener: null
};
const lockScroll = on => { if (window.__lenis) on ? window.__lenis.stop() : window.__lenis.start(); html.style.overflow = on ? 'hidden' : ''; };
function setPicture(srcsetMap, src, alt) {
  $$('source', V.pic).forEach(s => s.remove());
  if (srcsetMap) {
    for (const [type, set] of srcsetMap) {
      const s = document.createElement('source'); s.type = type; s.srcset = set; s.sizes = '90vw'; V.pic.insertBefore(s, V.img);
    }
  }
  V.img.removeAttribute('srcset');
  V.img.src = src; V.img.alt = alt || '';
}
function renderViewer() {
  const v = V;
  v.el.classList.toggle('is-deck', v.mode === 'deck');
  v.el.classList.toggle('is-image', v.mode === 'image');
  if (v.mode === 'cert') {
    const c = CERTS[v.i];
    setPicture(null, c.img, c.alt || c.title);
    v.title.textContent = c.title; v.count.textContent = `${nn(v.i + 1)} / ${nn(CERTS.length)}`;
    v.meta.textContent = c.meta; v.h.textContent = c.title; v.text.innerHTML = c.text; v.cap.textContent = '';
    v.prevBtn.hidden = v.nextBtn.hidden = false;
  } else if (v.mode === 'deck') {
    const d = v.deck, n = v.i + 1, b = slideBase(d.id, n);
    const set = ext => `${b}-640.${ext} 640w, ${b}-1200.${ext} 1200w, ${b}-1920.${ext} 1920w`;
    setPicture([['image/avif', set('avif')], ['image/webp', set('webp')]], `${b}-1920.jpg`, `${d.title}, slide ${n} of ${d.slides}`);
    v.title.textContent = d.title; v.count.textContent = `${nn(n)} / ${nn(d.slides)}`;
    v.cap.textContent = (d.captions && d.captions[n]) || '';
    v.pdf.href = d.pdf.replace(/^\//, ''); v.pdf.textContent = `PDF · ${d.pdfSize}`;
    $$('button', v.strip).forEach((t, k) => { t.setAttribute('aria-current', k === v.i ? 'true' : 'false'); if (k === v.i) t.scrollIntoView({ block: 'nearest', inline: 'center' }); });
    v.prevBtn.hidden = v.nextBtn.hidden = false;
    history.replaceState(null, '', `#deck=${d.id}&s=${n}`);
    // preload neighbours
    [n - 1, n + 1].forEach(k => { if (k >= 1 && k <= d.slides) { const im = new Image(); im.src = `${slideBase(d.id, k)}-1920.jpg`; } });
  } else {
    v.prevBtn.hidden = v.nextBtn.hidden = true;
    v.count.textContent = '';
  }
}
function openViewer(mode, opts, opener) {
  V.mode = mode; V.opener = opener || document.activeElement;
  if (mode === 'cert') V.i = opts.i;
  if (mode === 'deck') {
    V.deck = opts.deck; V.i = Math.min(Math.max(0, (opts.slide || 1) - 1), opts.deck.slides - 1);
    V.strip.innerHTML = Array.from({ length: V.deck.slides }, (_, k) =>
      `<button type="button" aria-label="Slide ${k + 1}"><img src="${slideBase(V.deck.id, k + 1)}-640.jpg" alt="" width="640" height="360" loading="lazy" decoding="async"></button>`).join('');
    $$('button', V.strip).forEach((t, k) => t.addEventListener('click', () => { V.i = k; renderViewer(); }));
  }
  if (mode === 'image') {
    setPicture(null, opts.src, opts.cap); V.cap.textContent = opts.cap || ''; V.title.textContent = opts.cap || '';
  }
  renderViewer();
  V.el.inert = false; V.el.classList.add('open'); lockScroll(true);
  setTimeout(() => V.closeBtn.focus({ preventScroll: true }), 30);
}
function closeViewer() {
  if (!V.el.classList.contains('open')) return;
  V.el.classList.remove('open'); V.el.inert = true; lockScroll(false);
  if (V.mode === 'deck') history.replaceState(null, '', location.pathname + location.search);
  if (V.opener && V.opener.focus) V.opener.focus({ preventScroll: true });
}
function step(d) {
  if (V.mode === 'cert') V.i = (V.i + d + CERTS.length) % CERTS.length;
  else if (V.mode === 'deck') V.i = Math.min(Math.max(0, V.i + d), V.deck.slides - 1);
  renderViewer();
}
V.closeBtn.addEventListener('click', closeViewer);
V.prevBtn.addEventListener('click', () => step(-1));
V.nextBtn.addEventListener('click', () => step(1));
V.el.addEventListener('click', e => { if (e.target === V.el || e.target.classList.contains('v-body') || e.target.classList.contains('v-main')) closeViewer(); });
document.addEventListener('keydown', e => {
  if (!V.el.classList.contains('open')) return;
  if (e.key === 'Escape') { e.preventDefault(); closeViewer(); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  else if (e.key === 'Tab') {
    const f = $$('button:not([hidden]),a[href]', V.el).filter(x => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});
let swipeX = null;
V.el.addEventListener('touchstart', e => { swipeX = e.touches[0].clientX; }, { passive: true });
V.el.addEventListener('touchend', e => { if (swipeX == null) return; const dx = e.changedTouches[0].clientX - swipeX; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); swipeX = null; });

document.addEventListener('click', e => {
  const t = e.target.closest('[data-cert],[data-deck],[data-image]');
  if (!t || t.closest('#viewer')) return;
  if (t.dataset.dragged === '1') { t.dataset.dragged = ''; return; }
  e.preventDefault();
  if (t.dataset.cert != null) openViewer('cert', { i: +t.dataset.cert }, t);
  else if (t.dataset.deck) { const d = deckById(t.dataset.deck); if (d) openViewer('deck', { deck: d, slide: +t.dataset.slide || 1 }, t); }
  else openViewer('image', { src: t.dataset.image, cap: t.dataset.cap }, t);
});

/* ---------- decks (D3–D5) ---------- */
function renderDecks() {
  const grid = $('#deckGrid');
  grid.innerHTML = DECKS.map(d => {
    const h = d.heroSlide || 1;
    const nums = [h, Math.min(h + 1, d.slides), Math.min(h + 2, d.slides)];
    const mine = d.mine && !/^\[Draft/.test(d.mine) ? `<div class="line-item"><span class="mono">${esc(d.mineLabel || 'My part')}</span><span>${esc(d.mine)}</span></div>` : '';
    return `<article class="deck-card rv" id="deck-${d.id}">
      <button type="button" class="deck-stack" data-deck="${d.id}" data-slide="${h}" data-cursor="Open" aria-label="Open the ${esc(d.title)} deck">
        <span class="slide s1">${pictureHTML(d.id, nums[0], '(max-width:860px) 90vw, 560px', `${esc(d.title)}, slide ${nums[0]}`)}</span>
        <span class="slide s2">${pictureHTML(d.id, nums[1], '(max-width:860px) 90vw, 560px', '')}</span>
        <span class="slide s3">${pictureHTML(d.id, nums[2], '(max-width:860px) 90vw, 560px', '')}</span>
      </button>
      <span class="mono">${esc(d.event)}</span>
      <h3>${esc(d.title)}</h3>
      <span class="badge"><b>${esc(d.result)}</b>${esc(d.field)}</span>
      <div class="lines">
        <div class="line-item"><span class="mono">The ask</span><span>${esc(d.ask)}</span></div>
        <div class="line-item"><span class="mono">Our answer</span><span>${esc(d.answer)}</span></div>
        ${mine}
      </div>
      <div class="btns">
        <button type="button" class="btn" data-deck="${d.id}" data-slide="1">Open the deck <span class="arr" aria-hidden="true">→</span></button>
        <a class="btn ghost" href="${d.pdf.replace(/^\//, '')}" download>PDF · ${esc(d.pdfSize)}</a>
      </div>
      <span class="mono deck-note">${d.slides} slides · ${esc(d.note || '')}</span>
    </article>`;
  }).join('');
}
function deepLink() {
  const m = location.hash.match(/^#deck=([\w-]+)(?:&s=(\d+))?/);
  if (!m) return;
  const d = deckById(m[1]);
  if (d) openViewer('deck', { deck: d, slide: +m[2] || 1 }, $(`#deck-${d.id} .deck-stack`));
}
const decksReady = fetch('data/decks.json', { credentials: 'same-origin' })
  .then(r => r.ok ? r.json() : [])
  .catch(() => [])
  .then(list => { DECKS = Array.isArray(list) ? list : []; renderDecks(); });


/* ---------- chess replay (data/chess.json, built by scripts/chess.mjs) ---------- */
let CHESS = null, squares = [], curPly = -1;
const boardEl = $('#board'), bMove = $('#bMove'), bNote = $('#bNote'), bSrc = $('#bSrc');
function setPly(k) {
  if (!CHESS) return;
  const last = CHESS.plies.length - 1;
  k = Math.max(0, Math.min(last, k));
  if (k === curPly) return; curPly = k;
  const p = CHESS.plies[k];
  let i = 0;
  for (const row of p.fen.split('/')) for (const ch of row) {
    if (ch >= '1' && ch <= '8') { for (let j = 0; j < +ch; j++) squares[i++].dataset.p = ''; }
    else squares[i++].dataset.p = (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase();
  }
  squares.forEach(s => s.classList.toggle('hl', s.dataset.sq === p.from || s.dataset.sq === p.to));
  bMove.textContent = p.san ? `${p.n} ${p.san}` : 'Start';
  const mover = p.san ? (p.n.endsWith('.') ? 'white' : 'black') : '';
  $$('.pbar').forEach(el => el.classList.toggle('turn', el.dataset.side === mover));
  bNote.textContent = k === CHESS.keyPly ? CHESS.keyNote : k === last ? `${CHESS.result}. White wins.` : '';
}
const chessReady = boardEl ? fetch('data/chess.json', { credentials: 'same-origin' }).then(r => r.ok ? r.json() : null).catch(() => null).then(d => {
  if (!d || !d.plies) return;
  CHESS = d;
  boardEl.innerHTML = Array.from({ length: 64 }, (_, i) => { const r = i >> 3, f = i & 7; return `<span class="sq ${(r + f) % 2 ? 'd' : 'l'}" data-sq="${'abcdefgh'[f]}${8 - r}"></span>`; }).join('');
  squares = Array.from(boardEl.children);
  // my side sits at the bottom; flip the board when I played Black
  const me = d.me === 'black' ? 'black' : 'white', opp = me === 'white' ? 'black' : 'white';
  if (me === 'black') squares.slice().reverse().forEach(s => boardEl.appendChild(s));
  const bar = (el, side, role, name) => { el.className = 'pbar ' + (role === 'Me' ? 'me' : 'opp'); el.dataset.side = side;
    el.innerHTML = `<i class="${side[0]}"></i><span class="tag">${role} · ${side === 'white' ? 'White' : 'Black'}</span><b>${esc(name || '')}</b>`; };
  bar($('#pTop'), opp, 'Opponent', d.oppName); bar($('#pBottom'), me, 'Me', d.meName);
  boardEl.setAttribute('aria-label', `Replay of ${d.white} vs ${d.black}, ${d.event}`);
  bSrc.textContent = d.caption || '';
  setPly(isStatic ? d.keyPly : d.startPly);
}) : Promise.resolve();

/* ---------- menu (U3) ---------- */
const menu = $('#menu'), menuBtn = $('#menuBtn');
const setMenu = on => {
  menu.classList.toggle('open', on); menu.inert = !on; menuBtn.setAttribute('aria-expanded', on); menuBtn.textContent = on ? 'Close' : 'Menu';
  lockScroll(on);
};
menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('open')) setMenu(false); });

/* ---------- static path ---------- */
if (isStatic || !hasGsap) {
  html.classList.remove('is-loading');
  html.classList.add('static');
  decksReady.then(deepLink);
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', () => { if (menu.classList.contains('open')) setMenu(false); }));
  return;
}

/* ================= motion ================= */
const { gsap, ScrollTrigger } = window;
gsap.registerPlugin(ScrollTrigger);
if (window.Flip) gsap.registerPlugin(window.Flip);
ScrollTrigger.config({ ignoreMobileResize: true });

/* ---------- Lenis ---------- */
let lenis = null;
if (typeof window.Lenis !== 'undefined' && document.compatMode === 'CSS1Compat') {
  lenis = new window.Lenis({ duration: 1.1, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true, syncTouch: false });
  window.__lenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
const scrollY = () => (lenis ? lenis.scroll : window.scrollY);

/* ---------- anchors with the curtain (M5) ---------- */
const curtain = $('#curtain');
function jumpTo(target) {
  const el = target === '#top' ? document.body : $(target);
  if (!el) return;
  const maxY = document.documentElement.scrollHeight - innerHeight;
  // the contact sits under the page (sticky), so its own box is not where the page ends
  const y = target === '#top' ? 0 : target === '#contact' ? maxY : Math.min(maxY, el.getBoundingClientRect().top + scrollY());
  const go = () => {
    if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
    else scrollTo(0, y);
    ScrollTrigger.update();
  };
  if (Math.abs(y - scrollY()) < innerHeight * 1.5) { lenis ? lenis.scrollTo(y, { duration: 1 }) : scrollTo({ top: y, behavior: 'smooth' }); return; }
  gsap.timeline()
    .set(curtain, { clipPath: 'inset(100% 0 0 0)' })
    .to(curtain, { clipPath: 'inset(0% 0 0 0)', duration: .45, ease: 'power3.in' })
    .add(go)
    .to(curtain, { clipPath: 'inset(0 0 100% 0)', duration: .55, ease: 'power3.out', delay: .05 });
}
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const h = a.getAttribute('href');
  if (h.length < 2 || h.startsWith('#deck=')) return;
  e.preventDefault();
  if (menu.classList.contains('open')) setMenu(false);
  jumpTo(h);
}));

/* ---------- intro (I1–I7) ---------- */
const loader = $('#loader');
const intro = new Promise(resolve => {
  if (!html.classList.contains('is-loading')) { resolve(false); return; }
  if (lenis) lenis.stop();
  const cols = $$('.digit > span', loader);
  const num = $('#ldNum'), bar = $('#ldBar');
  const target = [1, 0, 9];
  const set = (k, d) => { cols[k].style.transform = `translateY(${-d}em)`; };
  let done = false, t0 = performance.now(), timer;
  const settle = [900, 1400, 1900];
  const roll = () => {
    const t = performance.now() - t0;
    for (let k = 0; k < 3; k++) set(k, t >= settle[k] ? target[k] : Math.floor(Math.random() * 10));
    gsap.set(bar, { scaleX: Math.min(1, t / 1900) });
    if (t >= settle[2]) { num.classList.add('hit'); timer = setTimeout(finish, 650); return; }
    timer = setTimeout(roll, 110);
  };
  function finish() {
    if (done) return; done = true; clearTimeout(timer); clearTimeout(hard);
    ['wheel', 'keydown', 'pointerdown', 'touchstart'].forEach(ev => removeEventListener(ev, skip));
    try { sessionStorage.setItem('ur-intro', '1'); } catch (e) {}
    gsap.to(loader, { yPercent: -100, duration: .8, ease: 'power3.inOut', onComplete: () => { html.classList.remove('is-loading'); gsap.set(loader, { clearProps: 'all' }); } });
    if (lenis) lenis.start();
    resolve(true);
  }
  const skip = () => finish();
  const hard = setTimeout(finish, 4000);
  ['wheel', 'keydown', 'pointerdown', 'touchstart'].forEach(ev => addEventListener(ev, skip, { passive: true }));
  roll();
});

/* ---------- hero entrance (H2) ---------- */
const heroIn = gsap.timeline({ paused: true })
  .from('.hero-name .line', { yPercent: 105, duration: 1.1, ease: 'power4.out' })
  .from('.raj', { y: 60, opacity: 0, duration: 1, ease: 'power3.out' }, .15)
  .from('#heroPortrait', { y: 80, scale: .92, opacity: 0, duration: 1.1, ease: 'power3.out' }, .1)
  .from('.hero-text > *', { y: 24, opacity: 0, duration: .8, stagger: .07, ease: 'power3.out' }, .35)
  .from('.top', { y: -30, opacity: 0, duration: .8, ease: 'power3.out' }, .3);
intro.then(played => { heroIn.delay(played ? .25 : 0).play(); });

/* ---------- hero light ---------- */
const heroLight = $('#heroLight');
if (finePointer && heroLight) {
  const hx = gsap.quickTo(heroLight, '--mx', { duration: .6, ease: 'power3' });
  const hy = gsap.quickTo(heroLight, '--my', { duration: .6, ease: 'power3' });
  $('#hero').addEventListener('pointermove', e => { hx(e.clientX); hy(e.clientY); });
  gsap.set(heroLight, { '--mx': innerWidth * .3 + 'px', '--my': innerHeight * .4 + 'px' });
}

/* ---------- marquee, paused offscreen ---------- */
const mq = gsap.to('#mq', { xPercent: -50, duration: 38, ease: 'none', repeat: -1 });
ScrollTrigger.create({ trigger: '.marquee', start: 'top bottom', end: 'bottom top', onToggle: s => (s.isActive ? mq.play() : mq.pause()) });

/* ---------- scene palette for the fixed UI (section 4) ---------- */
const scenes = $$('.scene');
const rail = $$('#rail a');
const nowLabel = $('#nowLabel');
const avatar = $('#avatar');
let current = null;
function activate(sc) {
  if (current === sc) return; current = sc;
  const cs = getComputedStyle(sc);
  ui.style.setProperty('--ui-bg', cs.getPropertyValue('--bg').trim());
  ui.style.setProperty('--ui-fg', cs.getPropertyValue('--fg').trim());
  ui.style.setProperty('--ui-accent', cs.getPropertyValue('--accent').trim());
  const name = sc.dataset.scene;
  rail.forEach(a => a.classList.toggle('on', a.dataset.for === name));
  if (nowLabel && sc.dataset.label) nowLabel.textContent = sc.dataset.label;
  avatar.style.opacity = name === 'contact' ? '0' : '';
}
scenes.forEach(sc => {
  ScrollTrigger.create({ trigger: sc, start: 'top 50%', end: 'bottom 50%', onToggle: s => { if (s.isActive) activate(sc); } });
});
activate(scenes[0]);

/* ---------- header hide on scroll (U2) and avatar travel (H7–H9) ---------- */
const bar = $('#top-bar');
let traveling = false, hidden = false, lastY = 0;
const setHidden = h => { if (h === hidden) return; hidden = h; gsap.to(bar, { yPercent: h ? -160 : 0, duration: .45, ease: 'power3.out' }); };
ScrollTrigger.create({
  start: 0, end: 'max',
  onUpdate: () => {
    const y = scrollY(), dy = y - lastY; lastY = y;
    if (traveling || menu.classList.contains('open')) { setHidden(false); return; }
    if (y < innerHeight * .6) setHidden(false);
    else if (dy > 4) setHidden(true);
    else if (dy < -4) setHidden(false);
  }
});
const travel = $('#travel'), frame = $('#heroPortrait');
let landed = false;
function fly() {
  if (landed) return; landed = true;
  avatar.classList.add('on');
  const aImg = $('img', avatar);
  aImg.style.opacity = '0';
  const wasHidden = hidden;
  traveling = true; setHidden(false);
  if (window.Flip) gsap.delayedCall(wasHidden ? .45 : 0, go); else done();
  function go() {
    if (!landed) { traveling = false; return; }
    gsap.set(travel, { opacity: 1, borderRadius: 22 });
    window.Flip.fit(travel, frame, { scale: false });
    requestAnimationFrame(() => {
      window.Flip.fit(travel, aImg, { scale: false, duration: .85, ease: 'power3.inOut', onComplete: done });
      gsap.to(travel, { borderRadius: '50%', duration: .85, ease: 'power3.inOut' });
    });
  }
  function done() { aImg.style.opacity = ''; gsap.to(travel, { opacity: 0, duration: .2 }); traveling = false; }
}
function unfly() {
  if (!landed) return; landed = false;
  avatar.classList.remove('on'); gsap.killTweensOf(travel); gsap.set(travel, { opacity: 0 }); traveling = false;
}
ScrollTrigger.create({ trigger: '#hero', start: 'bottom 40%', onEnter: fly, onLeaveBack: unfly });

/* ---------- reveals (M4) ---------- */
gsap.set('.rv', { y: 40, opacity: 0 });
ScrollTrigger.batch('.rv', {
  start: 'top 88%',
  onEnter: els => gsap.to(els, { y: 0, opacity: 1, duration: .9, stagger: .08, ease: 'power3.out', overwrite: true })
});

/* ---------- counters ---------- */
function countUp(el) {
  const from = +el.dataset.from, to = +el.dataset.to, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
  const o = { v: from };
  gsap.to(o, { v: to, duration: 1.4, ease: 'expo.out', onUpdate: () => (el.textContent = pre + Math.round(o.v) + suf) });
}

/* ---------- chapters (M1, M3, C1, C3) ---------- */
const chScenes = $$('.ch-scene');
const mm = gsap.matchMedia();
mm.add({ laptop: LAPTOP, phone: PHONE }, ctx => {
  const { laptop } = ctx.conditions;
  const scrub = laptop ? true : .5;
  chScenes.forEach((sc, i) => {
    const ch = $('.chapter', sc);
    const head = $('.copy-head', sc), lines = $$('.line-item', sc), media = $('.media', sc), flt = $('.float', sc), count = $('.count', sc);
    // entrance of this chapter's content
    const tl = gsap.timeline({ paused: true })
      .from($$('.ch-index,.ch-title,.ch-event,.stat', head), { y: 40, opacity: 0, duration: .8, stagger: .07, ease: 'power3.out' })
      .from(lines, { y: 24, opacity: 0, duration: .6, stagger: .07, ease: 'power3.out' }, .25)
      .fromTo(media, { scale: .78, opacity: 0 }, { scale: 1, opacity: 1, duration: 1, ease: 'power3.out' }, 0)
      .from(flt, laptop ? { y: 80, rotate: 4, opacity: 0, duration: 1, ease: 'power3.out' } : { y: 40, opacity: 0, duration: .8, ease: 'power3.out' }, .2);
    let played = false;
    ScrollTrigger.create({
      trigger: sc, start: laptop ? 'top 55%' : 'top 75%',
      onEnter: () => { if (played) return; played = true; tl.play(); if (count) countUp(count); }
    });
    // float drift while the chapter is stuck
    if (laptop && flt) {
      gsap.fromTo(flt, { yPercent: 8 }, { yPercent: -8, ease: 'none', scrollTrigger: { trigger: sc, start: 'top top', end: 'bottom bottom', scrub } });
    }
    // cover: the next panel slides over this one (M1)
    const next = sc.nextElementSibling;
    if (laptop && next && (next.classList.contains('ch-scene') || next.dataset.scene === 'decks')) {
      gsap.timeline({ scrollTrigger: { trigger: next, start: 'top bottom', end: 'top top', scrub } })
        .to(ch, { scale: .94, ease: 'none' }, 0)
        .to($('.dim', sc), { opacity: .55, ease: 'none' }, 0);
    }
  });
  return () => {};
});

/* ---------- tilt (M6) ---------- */
if (finePointer) {
  $$('[data-tilt]').forEach(el => {
    const rx = gsap.quickTo(el, 'rotationX', { duration: .6, ease: 'power3' });
    const ry = gsap.quickTo(el, 'rotationY', { duration: .6, ease: 'power3' });
    const glare = $('.glare', el);
    gsap.set(el, { transformPerspective: 900 });
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
      ry(px * 12); rx(-py * 10);
      if (glare) { glare.style.opacity = '1'; glare.style.background = `radial-gradient(circle at ${(px + .5) * 100}% ${(py + .5) * 100}%, rgba(255,255,255,.35), transparent 55%)`; }
    });
    el.addEventListener('pointerleave', () => { rx(0); ry(0); if (glare) glare.style.opacity = '0'; });
  });
}

/* ---------- cursor (U5) ---------- */
if (finePointer) {
  html.classList.add('cursor-on');
  const cur = $('#cursor'), dot = $('#cDot'), ring = $('#cRing'), lab = $('span', ring);
  const dx = gsap.quickTo(dot, 'x', { duration: .08 }), dy = gsap.quickTo(dot, 'y', { duration: .08 });
  const rx = gsap.quickTo(ring, 'x', { duration: .35, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: .35, ease: 'power3' });
  addEventListener('pointermove', e => { cur.classList.remove('away'); dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); }, { passive: true });
  document.addEventListener('pointerleave', () => cur.classList.add('away'));
  addEventListener('pointerdown', () => ring.classList.add('is-down'));
  addEventListener('pointerup', () => ring.classList.remove('is-down'));
  document.addEventListener('pointerover', e => {
    const t = e.target.closest('[data-cursor],a,button');
    if (t && t.dataset.cursor) { lab.textContent = t.dataset.cursor; ring.classList.add('is-label'); ring.classList.remove('is-hidden'); }
    else if (t) { ring.classList.remove('is-label'); ring.classList.add('is-hidden'); }
    else { ring.classList.remove('is-label', 'is-hidden'); }
  });
}

/* ---------- certificates (K1–K5) ---------- */
const ringEl = $('#ring'), cards = $$('.wcard', ringEl), stage3d = $('#stage3d');
const capNum = $('#capNum'), capTitle = $('#capTitle'), capMeta = $('#capMeta'), capText = $('#capText'), capLine = $('#capLine');
const N = cards.length, STEP = 28;
let capI = -1;
function caption(i) {
  i = Math.max(0, Math.min(N - 1, i));
  if (i === capI) return; capI = i;
  const c = CERTS[i] || {};
  capNum.textContent = nn(i + 1); capTitle.textContent = c.title || ''; capMeta.textContent = c.meta || ''; capText.innerHTML = c.text || '';
  capLine.style.width = `${((i + 1) / N) * 100}%`;
}
caption(0);
mm.add(LAPTOP, () => {
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  gsap.set(ringEl, { z: -880, rotationY: 0 });
  const st = ScrollTrigger.create({
    trigger: '#certificates', start: 'top top', end: '+=350%', pin: true, scrub: true,
    snap: { snapTo: 1 / (N - 1), duration: { min: .2, max: .6 }, ease: 'power2.inOut', delay: .08 },
    animation: gsap.to(ringEl, { rotationY: -STEP * (N - 1), ease: 'none' }),
    onUpdate: s => caption(Math.round(s.progress * (N - 1)))
  });
  const goTo = i => {
    i = Math.max(0, Math.min(N - 1, i));
    const y = st.start + (st.end - st.start) * (i / (N - 1));
    lenis ? lenis.scrollTo(y, { duration: .9 }) : scrollTo({ top: y, behavior: 'smooth' });
  };
  const prev = () => goTo(capI - 1), next = () => goTo(capI + 1);
  $('#capPrev').addEventListener('click', prev);
  $('#capNext').addEventListener('click', next);
  // drag the arc
  let down = null;
  const onDown = e => { if (e.button !== 0) return; down = { x: e.clientX, y: st.scroll(), moved: false, el: e.target.closest('.wcard') }; };
  const onMove = e => {
    if (!down) return;
    const dx = e.clientX - down.x;
    if (Math.abs(dx) > 6) down.moved = true;
    if (down.moved) {
      const per = (st.end - st.start) / (N - 1) / 300;
      const y = Math.max(st.start, Math.min(st.end, down.y - dx * per));
      lenis ? lenis.scrollTo(y, { immediate: true }) : scrollTo(0, y);
    }
  };
  const onUp = () => { if (down && down.moved && down.el) down.el.dataset.dragged = '1'; if (down && down.moved) goTo(capI); down = null; };
  stage3d.addEventListener('pointerdown', onDown);
  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerup', onUp);
  const onKey = e => {
    if (!st.isActive || V.el.classList.contains('open')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); } else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
  };
  addEventListener('keydown', onKey);
  return () => {
    $('#capPrev').removeEventListener('click', prev); $('#capNext').removeEventListener('click', next);
    stage3d.removeEventListener('pointerdown', onDown); removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp); removeEventListener('keydown', onKey);
    gsap.set(ringEl, { clearProps: 'transform' });
  };
});
mm.add(PHONE, () => {
  // swipe row: caption follows the card nearest the centre
  const onScroll = () => {
    const mid = ringEl.scrollLeft + ringEl.clientWidth / 2;
    let best = 0, bd = Infinity;
    cards.forEach((c, k) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = k; } });
    caption(best);
  };
  ringEl.addEventListener('scroll', onScroll, { passive: true });
  return () => ringEl.removeEventListener('scroll', onScroll);
});

/* ---------- reveal decks once rendered; deep link ---------- */
decksReady.then(() => {
  const fresh = $$('#deckGrid .rv');
  gsap.set(fresh, { y: 40, opacity: 0 });
  ScrollTrigger.batch(fresh, { start: 'top 88%', onEnter: els => gsap.to(els, { y: 0, opacity: 1, duration: .9, stagger: .1, ease: 'power3.out', overwrite: true }) });
  ScrollTrigger.refresh();
  deepLink();
});

/* ---------- chess: scroll scrubs the moves on laptop, autoplay on phone ---------- */
chessReady.then(() => {
  if (!CHESS) return;
  const first = CHESS.startPly, last = CHESS.plies.length - 1;
  mm.add(LAPTOP, () => {
    ScrollTrigger.create({ trigger: '#chess', start: 'top top', end: () => '+=' + innerHeight * 2,
      onUpdate: s => setPly(Math.round(first + s.progress * (last - first))) });
  });
  mm.add(PHONE, () => {
    let t = null, hold = 0;
    const stepPly = () => { if (curPly >= last) { if (++hold > 4) { hold = 0; setPly(first); } } else setPly(curPly + 1); };
    const st = ScrollTrigger.create({ trigger: '#board', start: 'top 85%', end: 'bottom 15%',
      onToggle: s => { clearInterval(t); if (s.isActive) t = setInterval(stepPly, 700); } });
    return () => { clearInterval(t); st.kill(); };
  });
  ScrollTrigger.refresh();
});

/* ---------- about portrait parallax ---------- */
mm.add(LAPTOP, () => {
  gsap.fromTo('.about .portrait img', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'bottom top', scrub: true } });
});

/* ---------- contact (O1–O5) ---------- */
const contactIn = gsap.timeline({ paused: true })
  .from('.contact h2', { y: 60, opacity: 0, duration: 1, ease: 'power3.out' })
  .from('.contact .lead, .c-actions > *', { y: 30, opacity: 0, duration: .8, stagger: .08, ease: 'power3.out' }, .2)
  .from('.c-portrait', { y: 60, opacity: 0, duration: 1, ease: 'power3.out' }, .1);
ScrollTrigger.create({ trigger: '[data-scene="next"]', start: 'top 60%', onEnter: () => contactIn.play() });

addEventListener('load', () => ScrollTrigger.refresh());
})();
