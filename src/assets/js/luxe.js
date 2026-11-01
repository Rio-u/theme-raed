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

function boot() {
  if (window.__lxBooted) return; // guard against double inclusion
  window.__lxBooted = true;
  initHeaderState();
  initReveals();
  initParallax();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

// Products and sections rendered later by Twilight get revealed too.
document.addEventListener('theme::ready', initReveals);
