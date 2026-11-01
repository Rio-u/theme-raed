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

  let x = -100, y = -100, rx = -100, ry = -100, started = false;

  window.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    x = e.clientX; y = e.clientY;
    if (!started) { started = true; rx = x; ry = y; root.classList.add('lx-cursor-on'); }
    dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;

    const t = e.target instanceof Element ? e.target : null;
    root.classList.toggle('lx-cursor-native', !!t?.closest(NATIVE));
    const view = !!t?.closest(VIEW);
    root.classList.toggle('lx-cursor-view', view);
    root.classList.toggle('lx-cursor-link', !view && !!t?.closest(LINK));
  }, { passive: true });

  document.addEventListener('pointerleave', () => root.classList.add('lx-cursor-out'));
  document.addEventListener('pointerenter', () => root.classList.remove('lx-cursor-out'));
  window.addEventListener('pointerdown', () => root.classList.add('lx-cursor-down'));
  window.addEventListener('pointerup', () => root.classList.remove('lx-cursor-down'));

  (function loop() {
    rx += (x - rx) * 0.18;
    ry += (y - ry) * 0.18;
    ring.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
    requestAnimationFrame(loop);
  })();
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

function boot() {
  if (window.__lxBooted) return; // guard against double inclusion
  keepPreviewLinks();
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
