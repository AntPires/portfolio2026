const snap = document.getElementById('snap'); // mantido para compatibilidade
const sections = document.querySelectorAll('.section[data-bg]');

// ─── Lenis + GSAP setup ──────────────────────
gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis({
  duration: 1.2,
  easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  touchMultiplier: 1.5,
  smoothWheel: true,
});

gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

// ─── Nav: live time ──────────────────────────
(function initNavTime() {
  const el = document.getElementById('nav-time');
  if (!el) return;
  function tick() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    el.textContent = `${h}:${m}`;
  }
  tick();
  setInterval(tick, 30000);
})();

// ─── Nav: hide on scroll down, show on scroll up ─
const nav = document.querySelector('.nav');

lenis.on('scroll', ({ scroll, direction }) => {
  if (direction === 1 && scroll > 80) {
    nav.classList.add('nav-hidden');
  } else if (direction === -1) {
    nav.classList.remove('nav-hidden');
  }
});

// ─── Background transition on scroll ────────
const bgObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        document.body.dataset.bg = entry.target.dataset.bg;
      }
    });
  },
  { root: null, rootMargin: '-50% 0px -50% 0px', threshold: 0 }
);

sections.forEach((section) => bgObserver.observe(section));

// ─── Nav active state on scroll ─────────────
const navLinks = document.querySelectorAll('.nav-link');

const navObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach((link) => {
          link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  },
  { root: null, rootMargin: '-40% 0px -60% 0px', threshold: 0 }
);

sections.forEach((section) => {
  if (section.id) navObserver.observe(section);
});

// ─── Anchor nav links scroll ─────────────────
navLinks.forEach((link) => {
  link.addEventListener('click', (e) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      lenis.scrollTo(target, { offset: 0, duration: 1.2 });
    }
  });
});

// ─── About: custom cursor + More overlay ─────
const aboutSection = document.getElementById('about');
const moreOverlay  = document.getElementById('more-overlay');
const moreClose    = document.getElementById('more-close');
const cursorLabel  = document.getElementById('cursor-label');
const cursorText   = cursorLabel.querySelector('.cursor-label-text');

function placeCursor(e) {
  cursorLabel.style.left = e.clientX + 'px';
  cursorLabel.style.top  = e.clientY + 'px';
}

function showCursor(text, state = '') {
  cursorText.textContent = text;
  cursorLabel.className = 'cursor-label visible' + (state ? ` ${state}` : '');
  cursorLabel.style.setProperty('--cursor-bg', 'var(--color-dark)');
  cursorLabel.style.setProperty('--cursor-fg', 'var(--color-cream)');
}

function hideCursor() {
  cursorLabel.classList.remove('visible');
}

// Cursor in about section
aboutSection.addEventListener('mousemove',  placeCursor);
aboutSection.addEventListener('mouseenter', () => showCursor('find out more'));
aboutSection.addEventListener('mouseleave', hideCursor);

// Wave cursor listeners are attached after DOM manipulation in initHeroBlurStagger below

// ─── Overlay: blur stagger em .more-title-serif ("how things could…") ─────────
//
// Só o span.more-title-serif (primeiro do overlay) é quebrado em chars.
// O resto do título aparece imediatamente.
// Timings lidos das variáveis CSS em .more-title-serif — ajuste lá.
// ─────────────────────────────────────────────────────────────────────────────
const overlaySerifEl   = moreOverlay.querySelector('.more-title-serif');
const overlaySerifText = overlaySerifEl ? overlaySerifEl.textContent : null;

function playOverlayBlur() {
  if (!overlaySerifEl || !overlaySerifText) return;

  const style     = getComputedStyle(overlaySerifEl);
  const stagger   = parseFloat(style.getPropertyValue('--stagger'))       || 0.03;
  const initDelay = parseFloat(style.getPropertyValue('--initial-delay')) || 0.25;

  overlaySerifEl.innerHTML = '';
  let charIndex = 0;

  [...overlaySerifText].forEach(char => {
    if (char === ' ') {
      overlaySerifEl.appendChild(document.createTextNode(' '));
    } else {
      const span = document.createElement('span');
      span.className = 'overlay-char';
      span.style.animationDelay = `${(initDelay + charIndex * stagger).toFixed(3)}s`;
      span.textContent = char;
      overlaySerifEl.appendChild(span);
      charIndex++;
    }
  });
}

function resetOverlayBlur() {
  if (overlaySerifEl) overlaySerifEl.textContent = overlaySerifText;
}

// ── Open overlay ────────────────────────────────────────────────────────────
async function openOverlay() {
  await document.fonts.ready;
  lenis.stop();
  moreOverlay.classList.add('visible');
  moreOverlay.scrollTop = 0;
  nav.style.display = 'none';
  hideCursor();
  requestAnimationFrame(playOverlayBlur);
}

// ── Close overlay ───────────────────────────────────────────────────────────
function closeOverlay() {
  moreOverlay.classList.remove('visible');
  nav.style.display = '';
  nav.classList.remove('nav-hidden');
  resetOverlayBlur();
  lenis.start();
}

aboutSection.addEventListener('click', openOverlay);
moreClose.addEventListener('click', closeOverlay);

// Fechar também com Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && moreOverlay.classList.contains('visible')) {
    closeOverlay();
  }
});


// Delay para evitar oscilação do cursor ao passar pela borda entre rows
const ROW_SWITCH_DELAY = 40; // ms

// ─── Contact rows: cursor por tipo + ação ──────────────────────────────────
//
// email   → copia endereço para o clipboard
// outros  → abre link em nova aba
//
const contactCursors = [
  { label: 'copy email address', state: 'contact-email' },
  { label: 'in/antpires',        state: 'contact-link'  },
  { label: '/antpires',          state: 'contact-link'  },
  { label: '/@antpires',         state: 'contact-link'  },
];

const contactActions = [
  () => navigator.clipboard.writeText('antoniopirescs@gmail.com'),
  () => window.open('https://www.linkedin.com/in/antpires/', '_blank', 'noopener'),
  () => window.open('https://unsplash.com/@antpires',        '_blank', 'noopener'),
  () => window.open('https://substack.com/@antpires',        '_blank', 'noopener'),
];

const contactRows     = [...document.querySelectorAll('#contact .contact-row')];
const contactSection  = document.getElementById('contact');
let activeContactIdx  = -1;
let contactSwitchTimer = null;
let isCopiedState     = false;
let copiedHideTimer   = null;

function applyContactCursor(idx) {
  activeContactIdx = idx;
  if (idx === -1) { hideCursor(); return; }
  const c = contactCursors[idx];
  cursorText.textContent = c.label;
  cursorLabel.style.setProperty('--cursor-bg', 'var(--color-dark)');
  cursorLabel.style.setProperty('--cursor-fg', 'var(--color-cream)');
  cursorLabel.className = `cursor-label visible ${c.state}`;
}

contactSection.addEventListener('mousemove', (e) => {
  placeCursor(e);
  const row    = e.target.closest('.contact-row');
  const newIdx = row ? contactRows.indexOf(row) : -1;

  // Saiu da linha do email — reseta estado de "copied"
  if (newIdx !== 0 && isCopiedState) {
    isCopiedState = false;
  }

  // Cursor permanece oculto enquanto mouse estiver na linha do email após cópia
  if (isCopiedState && newIdx === 0) return;

  if (newIdx === activeContactIdx) return;

  clearTimeout(contactSwitchTimer);
  contactSwitchTimer = setTimeout(() => applyContactCursor(newIdx), ROW_SWITCH_DELAY);
});

contactSection.addEventListener('mouseleave', () => {
  clearTimeout(contactSwitchTimer);
  clearTimeout(copiedHideTimer);
  isCopiedState = false;
  activeContactIdx = -1;
  hideCursor();
});

// SVGs para o feedback de cópia no mobile (ícone na linha do email)
const COPY_ICON_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
</svg>`;
const CHECK_ICON_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="20 6 9 17 4 12"></polyline>
</svg>`;

const emailRowIcon = contactRows[0] ? contactRows[0].querySelector('.contact-row-icon') : null;
const copyToast    = document.getElementById('copy-toast');
let   toastTimer   = null;

contactRows.forEach((row, idx) => {
  row.addEventListener('click', () => {
    contactActions[idx]();

    // Feedback "copied" apenas na linha do email
    if (idx === 0) {
      isCopiedState = true;
      clearTimeout(copiedHideTimer);

      // Desktop: cursor label
      cursorText.textContent = 'copied!';
      cursorLabel.style.setProperty('--cursor-bg', 'var(--color-cream)');
      cursorLabel.style.setProperty('--cursor-fg', 'var(--color-dark)');
      cursorLabel.className = 'cursor-label visible contact-copied';

      // Mobile: troca ícone da row para checkmark
      if (emailRowIcon) emailRowIcon.innerHTML = CHECK_ICON_SVG;

      // Toast: aparece em todos os dispositivos
      if (copyToast) {
        clearTimeout(toastTimer);
        copyToast.classList.add('visible');
        toastTimer = setTimeout(() => copyToast.classList.remove('visible'), 1500);
      }

      // Após 1.5s, restaura estado original
      copiedHideTimer = setTimeout(() => {
        hideCursor();
        activeContactIdx = -1;
        if (emailRowIcon) emailRowIcon.innerHTML = COPY_ICON_SVG;
      }, 1500);
    }
  });
});


// ─── Hero: blur stagger — apenas na frase final (.hero-animated) ─────────────
//
// Só o span.hero-animated é quebrado em chars com a animação blur→nítido.
// Os timings são lidos das variáveis CSS em .hero-text (ajuste lá):
//   --stagger        → intervalo entre chars
//   --initial-delay  → pausa antes do primeiro char
// ─────────────────────────────────────────────────────────────────────────────
(async function initHeroBlurStagger() {
  await document.fonts.ready;

  const heroText    = document.querySelector('.hero-text');
  const animTarget  = document.querySelector('.hero-animated');
  if (!heroText || !animTarget) return;

  const style     = getComputedStyle(heroText);
  const stagger   = parseFloat(style.getPropertyValue('--stagger'))       || 0.01;
  const initDelay = parseFloat(style.getPropertyValue('--initial-delay')) || 0.1;

  // Snapshot childNodes before clearing — preserves element nodes like <a class="wave-hover">
  const children = [...animTarget.childNodes];
  animTarget.innerHTML = '';
  let charIndex = 0;

  function splitTextIntoChars(container, text) {
    [...text].forEach(char => {
      if (char === ' ') {
        container.appendChild(document.createTextNode(' '));
      } else {
        const span = document.createElement('span');
        span.className = 'hero-char';
        span.style.animationDelay = `${(initDelay + charIndex * stagger).toFixed(3)}s`;
        span.textContent = char;
        container.appendChild(span);
        charIndex++;
      }
    });
  }

  children.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      splitTextIntoChars(animTarget, node.textContent);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Clone the element (e.g. <a class="wave-hover">) without its children
      const clone = node.cloneNode(false);
      splitTextIntoChars(clone, node.textContent);
      animTarget.appendChild(clone);
    }
  });

  // Re-attach wave cursor listeners to the newly created clone
  const waveLinkNew = animTarget.querySelector('.wave-hover');
  if (waveLinkNew) {
    waveLinkNew.addEventListener('mousemove',  placeCursor);
    waveLinkNew.addEventListener('mouseenter', () => showCursor('check us out', 'contact-link'));
    waveLinkNew.addEventListener('mouseleave', hideCursor);
  }

  // Revela o hero agora que a fonte está carregada
  heroText.classList.add('fonts-ready');
})();

// ─── ScrollTrigger: animações de entrada ─────────────────────────────────────

// Work rows — cascata conforme scroll
gsap.utils.toArray('.work-row').forEach((row, i) => {
  gsap.from(row, {
    scrollTrigger: {
      trigger: row,
      start: 'top 88%',
      toggleActions: 'play none none none',
    },
    opacity: 0,
    y: 20,
    duration: 0.55,
    delay: i * 0.06,
    ease: 'power2.out',
    clearProps: 'all',
  });
});

// Títulos e subtítulo das seções
gsap.utils.toArray('.section-title, .work-subtitle').forEach(el => {
  gsap.from(el, {
    scrollTrigger: {
      trigger: el,
      start: 'top 90%',
      toggleActions: 'play none none none',
    },
    opacity: 0,
    y: 14,
    duration: 0.6,
    ease: 'power2.out',
    clearProps: 'all',
  });
});

// About text — fade suave
gsap.from('.about-text', {
  scrollTrigger: {
    trigger: '#about',
    start: 'top 65%',
    toggleActions: 'play none none none',
  },
  opacity: 0,
  y: 12,
  duration: 0.7,
  ease: 'power2.out',
  clearProps: 'all',
});
