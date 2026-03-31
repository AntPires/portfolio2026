const snap = document.getElementById('snap');
const sections = document.querySelectorAll('.section[data-bg]');

// ─── Background transition on scroll ────────
const bgObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        document.body.dataset.bg = entry.target.dataset.bg;
      }
    });
  },
  { root: snap, rootMargin: '-50% 0px -50% 0px', threshold: 0 }
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
  { root: snap, rootMargin: '-40% 0px -60% 0px', threshold: 0 }
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
      target.scrollIntoView({ behavior: 'smooth' });
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
  moreOverlay.classList.add('visible');
  moreOverlay.scrollTop = 0;
  document.querySelector('.nav').style.display = 'none';
  hideCursor();
  requestAnimationFrame(playOverlayBlur);
}

// ── Close overlay ───────────────────────────────────────────────────────────
function closeOverlay() {
  moreOverlay.classList.remove('visible');
  document.querySelector('.nav').style.display = '';
  resetOverlayBlur();
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

// ─── Nav: sol / lua + relógio ─────────────────────────────────────────────
//
// Sol aparece das 06:00 às 17:59 (hora local).
// Lua aparece das 18:00 às 05:59.
// O relógio atualiza a cada minuto.
// A temperatura (23 °C) é texto estático por enquanto.
// ─────────────────────────────────────────────────────────────────────────────
const navSun    = document.querySelector('.nav-weather-sun');
const navMoon   = document.querySelector('.nav-weather-moon');
const navTime   = document.getElementById('nav-time');

function updateNavWidget() {
  const now  = new Date();
  const hour = now.getHours();
  const isDaytime = hour >= 6 && hour < 18;

  navSun.classList.toggle('visible', isDaytime);
  navMoon.classList.toggle('visible', !isDaytime);

  const hh = String(hour).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  navTime.textContent = `${hh}:${mm}`;
}

updateNavWidget();                           // roda imediatamente ao carregar
setInterval(updateNavWidget, 60 * 1000);    // atualiza a cada minuto

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

  // Substitui o conteúdo do span.hero-animated por chars individuais
  const text = animTarget.textContent;
  animTarget.innerHTML = '';
  let charIndex = 0;

  [...text].forEach(char => {
    if (char === ' ') {
      animTarget.appendChild(document.createTextNode(' '));
    } else {
      const span = document.createElement('span');
      span.className = 'hero-char';
      span.style.animationDelay = `${(initDelay + charIndex * stagger).toFixed(3)}s`;
      span.textContent = char;
      animTarget.appendChild(span);
      charIndex++;
    }
  });

  // Revela o hero agora que a fonte está carregada
  heroText.classList.add('fonts-ready');
})();

// ─── Scroll snap via JS — threshold configurável ──────────────────────────────
//
// SCROLL_THRESHOLD : px de delta acumulado para avançar seção (sensibilidade)
// SNAP_LOCK_MS     : ms bloqueados após um snap (impede duplo-salto)
//
// Valores maiores em SCROLL_THRESHOLD = mais resistência ao scroll acidental.
// ─────────────────────────────────────────────────────────────────────────────
const SCROLL_THRESHOLD = 60;   // px acumulados antes de pular seção
const SNAP_LOCK_MS     = 850;  // ms de lock após snap

const snapSections = [...document.querySelectorAll('#snap .section')];
let snapIdx    = 0;
let snapLocked = false;
let wheelAccum = 0;
let resetTimer = null;

// Mantém snapIdx sincronizado com a seção visível (via bgObserver já existente)
const snapSyncObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const i = snapSections.indexOf(entry.target);
        if (i !== -1) snapIdx = i;
      }
    });
  },
  { root: snap, rootMargin: '-50% 0px -50% 0px', threshold: 0 }
);
snapSections.forEach(s => snapSyncObserver.observe(s));

function goToSection(idx) {
  if (idx < 0 || idx >= snapSections.length || snapLocked) return;
  snapLocked = true;
  snapIdx    = idx;
  snapSections[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => { snapLocked = false; wheelAccum = 0; }, SNAP_LOCK_MS);
}

snap.addEventListener('wheel', (e) => {
  // Durante um snap animado, bloqueia tudo
  if (snapLocked) { e.preventDefault(); return; }

  const section      = snapSections[snapIdx];
  const scrollingDown = e.deltaY > 0;

  // Verifica se o container já chegou à borda da seção atual
  // na direção em que o usuário está scrollando.
  // Tolerância de 4px para subpixel rendering.
  const atBottom = snap.scrollTop + snap.clientHeight >= section.offsetTop + section.offsetHeight - 4;
  const atTop    = snap.scrollTop <= section.offsetTop + 4;

  // Se há mais conteúdo para ver dentro da seção, deixa o scroll nativo agir
  if (scrollingDown && !atBottom) return;
  if (!scrollingDown && !atTop)   return;

  // Chegou à borda — previne scroll nativo e acumula para o snap
  e.preventDefault();
  wheelAccum += e.deltaY;

  clearTimeout(resetTimer);
  resetTimer = setTimeout(() => { wheelAccum = 0; }, 200);

  if (wheelAccum >= SCROLL_THRESHOLD) {
    goToSection(snapIdx + 1);
  } else if (wheelAccum <= -SCROLL_THRESHOLD) {
    goToSection(snapIdx - 1);
  }
}, { passive: false });

// Touch (mobile)
// Mesma lógica do wheel: só faz snap quando a seção atual chegou à borda
// na direção do swipe. Evita salto acidental ao fazer scroll dentro de seções altas.
let touchStartY = 0;
snap.addEventListener('touchstart', e => {
  touchStartY = e.touches[0].clientY;
}, { passive: true });
snap.addEventListener('touchend', e => {
  const delta = touchStartY - e.changedTouches[0].clientY;
  if (Math.abs(delta) < 50) return;

  const section      = snapSections[snapIdx];
  const scrollingDown = delta > 0;
  const atBottom = snap.scrollTop + snap.clientHeight >= section.offsetTop + section.offsetHeight - 4;
  const atTop    = snap.scrollTop <= section.offsetTop + 4;

  if (scrollingDown && !atBottom) return;
  if (!scrollingDown && !atTop)   return;

  goToSection(snapIdx + (delta > 0 ? 1 : -1));
}, { passive: true });
