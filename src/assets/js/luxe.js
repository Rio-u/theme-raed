/**
 * LUXE — small progressive enhancements shared by every page.
 * Everything here is optional polish: if it fails, the store still works.
 */

// Scroll reveals: [data-lx-reveal] fades/clips in once when it enters the viewport.
// [data-lx-stagger] on a parent spreads its revealed children over time.
function initReveals() {
  const items = document.querySelectorAll('[data-lx-reveal]:not(.is-revealed)');
  if (!items.length) return;

  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    items.forEach(el => el.classList.add('is-revealed'));
    return;
  }

  document.querySelectorAll('[data-lx-stagger]').forEach(group => {
    const step = Number(group.dataset.lxStagger) || 90;
    group.querySelectorAll('[data-lx-reveal]').forEach((el, i) => el.style.setProperty('--lx-delay', `${i * step}ms`));
  });

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-revealed');
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  items.forEach(el => io.observe(el));
}

// Mark the header once the page scrolls, so it can pick up a surface + hairline
// even when the sticky-header setting is off.
function initHeaderState() {
  const header = document.querySelector('.lx-header');
  if (!header) return;
  const update = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  update();
  window.addEventListener('scroll', update, { passive: true });
}

// Gentle parallax: the <img> inside [data-lx-parallax="0.08"] drifts against the scroll.
// One rAF-throttled listener for all elements; transforms only, never layout.
function initParallax() {
  const items = [...document.querySelectorAll('[data-lx-parallax] img')];
  if (!items.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let ticking = false;
  const update = () => {
    const vh = window.innerHeight;
    items.forEach(img => {
      const box = img.parentElement.getBoundingClientRect();
      if (box.bottom < 0 || box.top > vh) return;
      const speed = Number(img.parentElement.dataset.lxParallax) || 0.06;
      const progress = (box.top + box.height / 2 - vh / 2) / vh; // -1 … 1 around viewport centre
      img.style.transform = `translate3d(0, ${(-progress * speed * 100).toFixed(2)}%, 0)`;
    });
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
}

// Light / dark switch. The initial class is set in <head> (no flash); this only handles clicks.
function initThemeToggle() {
  const root = document.documentElement;
  document.querySelectorAll('[data-lx-theme-toggle]').forEach(btn => {
    const sync = () => btn.setAttribute('aria-pressed', root.classList.contains('lx-dark') ? 'true' : 'false');
    sync();
    btn.addEventListener('click', () => {
      root.classList.add('lx-theme-anim');
      const dark = !root.classList.contains('lx-dark');
      root.classList.toggle('lx-dark', dark);
      try { localStorage.setItem('lx-theme', dark ? 'dark' : 'light'); } catch (e) {}
      sync();
      setTimeout(() => root.classList.remove('lx-theme-anim'), 600);
    });
  });
}

// Custom cursor: a dot that tracks the pointer exactly and a ring that eases after it.
// Only for mouse/trackpad users who haven't asked for reduced motion.
function initCursor() {
  const root = document.documentElement;
  if (root.dataset.lxCursor === 'off') return;
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const dot = document.createElement('div');
  const ring = document.createElement('div');
  dot.className = 'lx-cursor';
  ring.className = 'lx-cursor-ring';
  ring.innerHTML = `<span>${root.lang === 'ar' ? 'عرض' : 'View'}</span>`;
  dot.setAttribute('aria-hidden', 'true');
  ring.setAttribute('aria-hidden', 'true');
  document.body.append(dot, ring);

  const VIEW = '.s-product-card-image, .lx-cat, .lx-hero__img, .lx-editorial__img, .details-slider .swiper-slide';
  const LINK = 'a, button, [role="button"], salla-button, salla-add-product-button, label, summary, .swiper-button-next, .swiper-button-prev';
  const NATIVE = 'input, textarea, select, iframe, [contenteditable="true"], .s-modal-wrapper input';

  let x = -100, y = -100, rx = -100, ry = -100, started = false, running = false;

  const setState = t => {
    root.classList.toggle('lx-cursor-native', !!t?.closest(NATIVE));
    const view = !!t?.closest(VIEW);
    root.classList.toggle('lx-cursor-view', view);
    root.classList.toggle('lx-cursor-link', !view && !!t?.closest(LINK));
  };

  // The ring trails the dot only slightly, and parks exactly on it once the mouse stops.
  const loop = () => {
    rx += (x - rx) * 0.35;
    ry += (y - ry) * 0.35;
    if (Math.abs(x - rx) < 0.3 && Math.abs(y - ry) < 0.3) { rx = x; ry = y; running = false; }
    ring.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
    if (running) requestAnimationFrame(loop);
  };
  const kick = () => { if (!running) { running = true; requestAnimationFrame(loop); } };

  window.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    x = e.clientX; y = e.clientY;
    if (!started) { started = true; rx = x; ry = y; root.classList.add('lx-cursor-on'); }
    root.classList.remove('lx-cursor-out');
    dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    setState(e.target instanceof Element ? e.target : null);
    kick();
  }, { passive: true });

  // Content scrolls under a still mouse: refresh the hover state.
  window.addEventListener('scroll', () => { if (started) setState(document.elementFromPoint(x, y)); }, { passive: true });

  // Leaving the window (or entering an iframe such as payment or login) hides it.
  document.addEventListener('mouseout', e => { if (!e.relatedTarget) root.classList.add('lx-cursor-out'); });
  window.addEventListener('blur', () => root.classList.add('lx-cursor-out'));
  window.addEventListener('pointerdown', () => root.classList.add('lx-cursor-down'));
  window.addEventListener('pointerup', () => root.classList.remove('lx-cursor-down'));
}

// Theme preview only: Salla renders links with the store's live domain, which drops the visitor
// out of the salla.design draft. Keep same-store links inside the preview. No-op on real stores.
function keepPreviewLinks() {
  if (location.hostname !== 'salla.design') return;
  const storePath = location.pathname.split('/')[1]; // e.g. "dev-xxxx"
  document.addEventListener('click', e => {
    const a = e.target instanceof Element ? e.target.closest('a[href]') : null;
    if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey) return;
    let url;
    try { url = new URL(a.href); } catch (err) { return; }
    if (url.host === location.host || url.pathname.split('/')[1] !== storePath) return;
    e.preventDefault();
    location.href = location.origin + url.pathname + url.search + url.hash;
  }, true);
}

// Countdown blocks: [data-lx-countdown="2026-12-31 23:59"] with <b data-u="d|h|m|s">.
// Returns false when the date is missing or already past.
function startCountdown(el) {
  const end = new Date(String(el.dataset.lxCountdown).trim().replace(' ', 'T'));
  if (isNaN(end)) return false;
  const pad = n => String(n).padStart(2, '0');
  const tick = () => {
    let s = Math.max(0, Math.floor((end - Date.now()) / 1000));
    const v = { d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 };
    el.querySelectorAll('[data-u]').forEach(b => { b.textContent = salla?.helpers?.number ? salla.helpers.number(pad(v[b.dataset.u])) : pad(v[b.dataset.u]); });
    return s > 0;
  };
  if (!tick()) return false;
  const id = setInterval(() => { if (!tick()) clearInterval(id); }, 1000);
  return true;
}

// Welcome / promotion dialog driven by theme settings (see layouts/master.twig).
function initPromo() {
  const box = document.getElementById('lx-promo');
  if (!box || window.self !== window.top) return;                       // never inside the editor
  if (document.body.classList.contains('cart') || /checkout/.test(location.pathname)) return;

  const timer = box.querySelector('[data-lx-countdown]');
  if (box.dataset.ends && timer && !startCountdown(timer)) return;     // offer already over

  const storeKey = 'lx-promo:' + box.dataset.key;
  const days = Number(box.dataset.days);
  try {
    const last = Number(localStorage.getItem(storeKey) || 0);
    if (last && (days <= 0 ? sessionStorage.getItem(storeKey) : Date.now() - last < days * 864e5)) return;
  } catch (e) {}

  let lastFocus = null;
  const close = () => {
    box.classList.remove('is-open');
    document.documentElement.classList.remove('lx-promo-open');
    setTimeout(() => { box.hidden = true; }, 500);
    lastFocus?.focus?.();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = e => { if (e.key === 'Escape') close(); };

  const open = () => {
    try { localStorage.setItem(storeKey, String(Date.now())); sessionStorage.setItem(storeKey, '1'); } catch (e) {}
    lastFocus = document.activeElement;
    box.hidden = false;
    requestAnimationFrame(() => box.classList.add('is-open'));
    document.documentElement.classList.add('lx-promo-open');
    box.querySelector('.lx-promo__close')?.focus({ preventScroll: true });
    document.addEventListener('keydown', onKey);
  };

  box.querySelectorAll('[data-lx-promo-close]').forEach(el => el.addEventListener('click', close));
  box.querySelector('[data-lx-copy]')?.addEventListener('click', async e => {
    const btn = e.currentTarget, label = btn.textContent;
    try { await navigator.clipboard.writeText(btn.dataset.lxCopy); } catch (err) {
      const r = document.createRange(); r.selectNodeContents(box.querySelector('.lx-promo__code-value'));
      getSelection().removeAllRanges(); getSelection().addRange(r); document.execCommand('copy');
    }
    btn.textContent = btn.dataset.copied;
    btn.classList.add('is-done');
    setTimeout(() => { btn.textContent = label; btn.classList.remove('is-done'); }, 1800);
  });

  // wait for the intro to finish, then the merchant's delay
  const delay = Math.max(0, Number(box.dataset.delay) || 0) * 1000;
  const whenReady = () => setTimeout(open, delay);
  if (document.documentElement.classList.contains('lx-ready')) whenReady();
  else new MutationObserver((m, obs) => {
    if (document.documentElement.classList.contains('lx-ready')) { obs.disconnect(); whenReady(); }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
}

// Recently viewed: product pages record their id in this browser and show the previous ones
// through Salla's own products slider (source="selected"), so prices/stock stay live.
function initRecentlyViewed() {
  const box = document.querySelector('[data-lx-recent]');
  if (!box) return;
  const current = Number(box.dataset.lxRecent);
  let ids = [];
  try { ids = JSON.parse(localStorage.getItem('lx-recent') || '[]').filter(Number.isFinite); } catch (e) {}
  const others = ids.filter(id => id !== current).slice(0, 10);
  try { localStorage.setItem('lx-recent', JSON.stringify([current, ...others].slice(0, 12))); } catch (e) {}
  if (others.length < 2) return; // not worth a row yet

  const slider = document.createElement('salla-products-slider');
  slider.setAttribute('source', 'selected');
  slider.setAttribute('source-value', JSON.stringify(others));
  slider.setAttribute('block-title', box.dataset.title || '');
  slider.setAttribute('slider-id', 'lx-recent-slider');
  box.appendChild(slider);
  box.hidden = false;
}

const fineMotion = () => matchMedia('(hover: hover) and (pointer: fine)').matches
  && !matchMedia('(prefers-reduced-motion: reduce)').matches;

// Hero depth: layers drift against the pointer (--mx/--my in -1…1).
function initHeroDepth() {
  if (!fineMotion()) return;
  document.querySelectorAll('[data-lx-hero]').forEach(hero => {
    let raf = 0;
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      const mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      const my = ((e.clientY - r.top) / r.height - 0.5) * 2;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { hero.style.setProperty('--mx', mx.toFixed(3)); hero.style.setProperty('--my', my.toFixed(3)); });
    });
    hero.addEventListener('pointerleave', () => { hero.style.setProperty('--mx', 0); hero.style.setProperty('--my', 0); });
  });
}

// Story statement: split into words that light up as the paragraph scrolls through the viewport.
function initStoryWords() {
  const el = document.querySelector('.lx-story__statement');
  if (!el || el.dataset.lxSplit) return;
  el.dataset.lxSplit = '1';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = '';
  const spans = words.map((w, i) => {
    const s = document.createElement('span');
    s.className = 'lx-word';
    s.textContent = w;
    el.append(s, i < words.length - 1 ? ' ' : '');
    return s;
  });
  const update = () => {
    const r = el.getBoundingClientRect(), vh = innerHeight;
    // 0 when the top enters the lower 85% of the screen, 1 when the bottom passes 40%
    const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.45)));
    const lit = Math.round(p * spans.length);
    spans.forEach((s, i) => s.classList.toggle('is-lit', i < lit));
  };
  addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  update();
}

// Marquee: skew follows scroll velocity, then settles.
function initMarqueeVelocity() {
  const bands = [...document.querySelectorAll('[data-lx-marquee]')];
  if (!bands.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let lastY = scrollY, skew = 0, raf = 0;
  const settle = () => {
    skew *= 0.88;
    bands.forEach(b => b.style.setProperty('--lx-skew', `${skew.toFixed(2)}deg`));
    raf = Math.abs(skew) > 0.05 ? requestAnimationFrame(settle) : 0;
  };
  addEventListener('scroll', () => {
    const v = scrollY - lastY; lastY = scrollY;
    skew = Math.max(-10, Math.min(10, skew + v * -0.08));
    if (!raf) raf = requestAnimationFrame(settle);
  }, { passive: true });
}

// Category index: the hovered row's image floats after the pointer.
function initIndexFloat() {
  if (!fineMotion()) return;
  document.querySelectorAll('[data-lx-index]').forEach(sec => {
    const fig = sec.querySelector('.lx-index__float');
    const img = fig?.querySelector('img');
    if (!fig || !img) return;
    let x = 0, y = 0, fx = 0, fy = 0, running = false;
    const loop = () => {
      fx += (x - fx) * 0.14; fy += (y - fy) * 0.14;
      fig.style.transform = `translate3d(${(fx - fig.offsetWidth / 2).toFixed(1)}px, ${(fy - fig.offsetHeight / 2).toFixed(1)}px, 0)`;
      running = fig.classList.contains('is-on') || Math.abs(x - fx) > 0.5;
      if (running) requestAnimationFrame(loop);
    };
    sec.querySelectorAll('.lx-index__link').forEach(link => {
      link.addEventListener('pointerenter', e => {
        img.src = link.dataset.image;
        if (!fig.classList.contains('is-on')) { fx = x = e.clientX; fy = y = e.clientY; }
        fig.classList.add('is-on');
        if (!running) { running = true; requestAnimationFrame(loop); }
      });
      link.addEventListener('pointerleave', () => fig.classList.remove('is-on'));
    });
    sec.addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; });
  });
}

// Shop the look: hotspot ↔ list highlight.
function initLookbook() {
  document.querySelectorAll('[data-lx-look]').forEach(sec => {
    const all = sec.querySelectorAll('[data-look]');
    const set = n => all.forEach(el => el.classList.toggle('is-active', el.dataset.look === n));
    all.forEach(el => {
      el.addEventListener('pointerenter', () => set(el.dataset.look));
      el.addEventListener('focus', () => set(el.dataset.look));
      el.addEventListener('pointerleave', () => set(null));
    });
    // a tapped dot scrolls its list item into view on small screens
    sec.querySelectorAll('.lx-look__dot').forEach(dot => dot.addEventListener('click', () => {
      set(dot.dataset.look);
      sec.querySelector(`.lx-look__item[data-look="${dot.dataset.look}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }));
  });
}

// Magnetic controls drift a few pixels toward the pointer.
function initMagnetic() {
  if (!fineMotion()) return;
  document.querySelectorAll('[data-lx-magnetic]').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--tx', `${((e.clientX - r.left - r.width / 2) * 0.25).toFixed(1)}px`);
      el.style.setProperty('--ty', `${((e.clientY - r.top - r.height / 2) * 0.25).toFixed(1)}px`);
    });
    el.addEventListener('pointerleave', () => { el.style.setProperty('--tx', '0px'); el.style.setProperty('--ty', '0px'); });
  });
}

function boot() {
  if (window.__lxBooted) return; // guard against double inclusion
  keepPreviewLinks();
  initHeroDepth();
  initStoryWords();
  initMarqueeVelocity();
  initIndexFloat();
  initLookbook();
  initMagnetic();
  initRecentlyViewed();
  initPromo();
  window.__lxBooted = true;
  initHeaderState();
  initReveals();
  initParallax();
  initThemeToggle();
  initCursor();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

// Products and sections rendered later by Twilight get revealed too.
document.addEventListener('theme::ready', initReveals);
