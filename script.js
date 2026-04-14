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

// ─── Snap suave entre seções ──────────────────
// Após parar de scrollar por 120ms, snapa para a seção mais próxima do centro.
// Só snapa as seções de altura 100svh (hero + about), não work/contact.
const snapSections = [...document.querySelectorAll('.section[data-bg="hero"], .section[data-bg="green"]')];
let snapTimer;
lenis.on('scroll', () => {
  clearTimeout(snapTimer);
  snapTimer = setTimeout(() => {
    const mid = window.scrollY + window.innerHeight / 2;
    let closest = null;
    let minDist = Infinity;
    snapSections.forEach(s => {
      const sTop = s.getBoundingClientRect().top + window.scrollY;
      const sMid = sTop + s.offsetHeight / 2;
      const dist = Math.abs(mid - sMid);
      if (dist < minDist) { minDist = dist; closest = s; }
    });
    // Só snapa se o centro da seção estiver a menos de 50vh de distância.
    // Garante que o snap não puxa o usuário de volta quando já está em outra seção.
    if (closest && minDist < window.innerHeight * 0.5) {
      const targetY = closest.getBoundingClientRect().top + window.scrollY;
      lenis.scrollTo(targetY, { duration: 0.8, easing: t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2 });
    }
  }, 120);
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
aboutSection.addEventListener('mouseenter', () => showCursor('more about me'));
aboutSection.addEventListener('mouseleave', hideCursor);


// ─── Overlay: blur stagger em .more-title-serif ("how things could…") ─────────
//
// Só o span.more-title-serif (primeiro do overlay) é quebrado em chars.
// O resto do título aparece imediatamente.
// Timings lidos das variáveis CSS em .more-title-serif — ajuste lá.
// ─────────────────────────────────────────────────────────────────────────────
const overlayTitleEl   = moreOverlay.querySelector('.more-title--animated');
const overlayTitleHTML = overlayTitleEl ? overlayTitleEl.innerHTML : null;

function playOverlayBlur() {
  if (!overlayTitleEl) return;

  // Reutiliza o splitWords já definido — preserva <span class="more-title-serif"> intacto
  splitWords(overlayTitleEl);

  gsap.from(overlayTitleEl.querySelectorAll('.word'), {
    opacity: 0,
    y: 28,
    filter: 'blur(6px)',
    duration: 0.55,
    ease: 'power3.out',
    stagger: 0.035,
    clearProps: 'all',
  });
}

function resetOverlayBlur() {
  if (overlayTitleEl && overlayTitleHTML) {
    overlayTitleEl.innerHTML = overlayTitleHTML;
  }
}

// ── Overlay: ScrollTrigger animations (scroller = moreOverlay) ──────────────
let overlayAnimCtx = null;

function initOverlayAnimations() {
  if (overlayAnimCtx) { overlayAnimCtx.revert(); overlayAnimCtx = null; }

  overlayAnimCtx = gsap.context(() => {
    const sc = { scroller: moreOverlay };

    // Bio 1
    gsap.from('.more-block--col1 .more-bio', {
      scrollTrigger: { ...sc, trigger: '.more-block--col1', start: 'top 70%', toggleActions: 'play none none none' },
      opacity: 0, y: 28, duration: 0.7, stagger: 0.15, ease: 'power3.out', clearProps: 'all',
    });

    // Rail 1 — fotos com escala
    gsap.from('.rail-1 .more-photo-item', {
      scrollTrigger: { ...sc, trigger: '.rail-1', start: 'top 72%', toggleActions: 'play none none none' },
      opacity: 0, y: 32, scale: 0.97, duration: 0.65, stagger: 0.1, ease: 'power3.out', clearProps: 'all',
    });

    // Profile — foto grande
    gsap.from('.more-profile-img', {
      scrollTrigger: { ...sc, trigger: '.more-block--profile', start: 'top 70%', toggleActions: 'play none none none' },
      opacity: 0, y: 32, scale: 0.98, duration: 0.85, ease: 'power3.out', clearProps: 'all',
    });

    // Profile — parágrafos
    gsap.from('.more-profile-text .more-bio', {
      scrollTrigger: { ...sc, trigger: '.more-block--profile', start: 'top 68%', toggleActions: 'play none none none' },
      opacity: 0, y: 20, duration: 0.65, stagger: 0.12, ease: 'power3.out', clearProps: 'all',
    });

    // Career
    gsap.from('.more-career', {
      scrollTrigger: { ...sc, trigger: '.more-career', start: 'top 72%', toggleActions: 'play none none none' },
      opacity: 0, y: 24, duration: 0.7, ease: 'power3.out', clearProps: 'all',
    });

    // Rail 2 — fotos com escala
    gsap.from('.rail-2 .more-photo-item', {
      scrollTrigger: { ...sc, trigger: '.rail-2', start: 'top 72%', toggleActions: 'play none none none' },
      opacity: 0, y: 32, scale: 0.97, duration: 0.65, stagger: 0.1, ease: 'power3.out', clearProps: 'all',
    });
  });
}

// ── Open overlay ────────────────────────────────────────────────────────────
async function openOverlay() {
  await document.fonts.ready;
  lenis.stop();
  moreOverlay.classList.add('visible');
  moreOverlay.scrollTop = 0;
  nav.style.display = 'none';
  hideCursor();
  requestAnimationFrame(() => {
    // Botão fechar — desce do topo antes do título
    gsap.fromTo('.more-close',
      { opacity: 0, y: -12 },
      { opacity: 0.85, y: 0, duration: 0.45, ease: 'power3.out', delay: 0.1 }
    );

    // Título — word split com blur (mesma linguagem da página principal)
    playOverlayBlur();

    ScrollTrigger.refresh();
    initOverlayAnimations();
  });
}

// ── Close overlay ───────────────────────────────────────────────────────────
function closeOverlay() {
  moreOverlay.classList.remove('visible');
  nav.style.display = '';
  nav.classList.remove('nav-hidden');
  resetOverlayBlur();
  if (overlayAnimCtx) { overlayAnimCtx.revert(); overlayAnimCtx = null; }
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
const elevatorBtn     = document.getElementById('elevator');
let activeContactIdx  = -1;

// ─── Elevator button: visível apenas na seção contact ────────────────────────
new IntersectionObserver(
  (entries) => entries.forEach(e => elevatorBtn.classList.toggle('visible', e.isIntersecting)),
  { threshold: 0.1 }
).observe(contactSection);

elevatorBtn.addEventListener('click', () => {
  lenis.scrollTo(0, { duration: 1.4, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
});
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


// ─── Hero: entrada orquestrada (timeline) ────────────────────────────────────
document.fonts.ready.then(() => {
  const heroText = document.querySelector('.hero-text');
  if (heroText) heroText.classList.add('fonts-ready');

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  // 1. Nav desce do topo
  tl.fromTo('.nav',
    { opacity: 0, y: -20 },
    { opacity: 1, y: 0, duration: 0.55 }
  );

  // 2. Coluna esquerda: avatar e bio sobem juntos
  tl.fromTo('.hero-avatar',
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.6 },
    '-=0.25'
  );
  tl.fromTo('.hero-bio',
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.6 },
    '-=0.55'
  );

  // 3. Hero text — foco fotográfico: blur → nitidez
  tl.fromTo('.hero-text',
    { opacity: 0, y: 36, filter: 'blur(8px)' },
    { opacity: 1, y: 0,  filter: 'blur(0px)', duration: 0.95 },
    '-=0.3'
  );
});

// ─── ScrollTrigger: animações de entrada ─────────────────────────────────────

// Work rows — cascata conforme scroll
gsap.utils.toArray('.work-row').forEach((row, i) => {
  gsap.from(row, {
    scrollTrigger: {
      trigger: row,
      start: 'top 72%',
      toggleActions: 'play none none none',
    },
    opacity: 0,
    y: 20,
    scale: 0.97,
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
      start: 'top 72%',
      toggleActions: 'play none none none',
    },
    opacity: 0,
    y: 14,
    duration: 0.6,
    ease: 'power2.out',
    clearProps: 'all',
  });
});

// About text — reveal por palavras (word split)
function splitWords(el) {
  // Itera apenas text nodes para preservar spans filhos (.about-bold etc.)
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) textNodes.push(node);

  textNodes.forEach(tn => {
    const frag = document.createDocumentFragment();
    tn.textContent.split(/(\s+)/).forEach(token => {
      if (/^\s+$/.test(token)) {
        frag.appendChild(document.createTextNode(token));
      } else if (token) {
        const wrap = document.createElement('span');
        wrap.className = 'word-wrap';
        const inner = document.createElement('span');
        inner.className = 'word';
        inner.textContent = token;
        wrap.appendChild(inner);
        frag.appendChild(wrap);
      }
    });
    tn.replaceWith(frag);
  });
}

const aboutTextEl = document.querySelector('.about-text');
if (aboutTextEl) {
  splitWords(aboutTextEl);

  gsap.from('#about .word', {
    opacity: 0,
    y: 24,
    duration: 0.55,
    ease: 'power3.out',
    stagger: 0.04,
    clearProps: 'all',
    scrollTrigger: {
      trigger: '#about',
      start: 'top 60%',
      toggleActions: 'play none none none',
    },
  });
}

// About CTA button — entra depois das palavras
gsap.from('.about-cta', {
  opacity: 0,
  y: 16,
  duration: 0.5,
  ease: 'power2.out',
  clearProps: 'all',
  scrollTrigger: {
    trigger: '#about',
    start: 'top 55%',
    toggleActions: 'play none none none',
  },
});

