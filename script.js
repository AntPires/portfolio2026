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

// ── Open overlay ────────────────────────────────────────────────────────────
function openOverlay() {
  moreOverlay.classList.add('visible');
  moreOverlay.scrollTop = 0;
  document.querySelector('.nav').style.display = 'none';
  hideCursor();
}

// ── Close overlay ───────────────────────────────────────────────────────────
function closeOverlay() {
  moreOverlay.classList.remove('visible');
  document.querySelector('.nav').style.display = '';
}

aboutSection.addEventListener('click', openOverlay);
moreClose.addEventListener('click', closeOverlay);

// Fechar também com Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && moreOverlay.classList.contains('visible')) {
    closeOverlay();
  }
});

// ─── Work rows: cursor variável por empresa ────────────────────────────────
//
// Cada row tem label e cor próprios. Ao mover entre rows o cursor
// não pisca — apenas troca texto + cor suavemente (via CSS transition).
//
// Para editar: altere label/bg/fg abaixo. A ordem deve corresponder
// à ordem das .work-row no HTML.
//
const rowCursors = [
  { label: 'how design led the way at Mosaico',  bg: '#e1c237', fg: '#1e1e20' }, // Mosaico
  { label: 'balancing governance and scale at Globo',      bg: '#3786e1', fg: '#1e1e20' }, // Globo
  { label: 'merging solutions to find growth at Stone', bg: '#54c811', fg: '#1e1e20' }, // Stone
  { label: 'we changed how telcos sell at Oi',  bg: '#cb37e1', fg: '#1e1e20' }, // Oi
];

const workRows    = [...document.querySelectorAll('#work .work-row')];
const workSection = document.getElementById('work');
let activeRowIdx  = -1;
let rowSwitchTimer = null;

// ── Delay para troca de cursor entre rows ─────────────────────────────────
// Evita que o cursor fique oscilando quando o mouse fica exatamente
// na borda entre duas rows. Aumente ROW_SWITCH_DELAY se ainda oscilar.
const ROW_SWITCH_DELAY = 80; // ms — ajuste aqui se necessário

function applyRowCursor(idx) {
  activeRowIdx = idx;
  if (idx === -1) { hideCursor(); return; }
  const c = rowCursors[idx];
  cursorText.textContent = c.label;
  cursorLabel.style.setProperty('--cursor-bg', c.bg);
  cursorLabel.style.setProperty('--cursor-fg', c.fg);
  cursorLabel.className = 'cursor-label visible case-study';
}

workSection.addEventListener('mousemove', (e) => {
  placeCursor(e);
  const row    = e.target.closest('.work-row');
  const newIdx = row ? workRows.indexOf(row) : -1;

  if (newIdx === activeRowIdx) return; // mesmo alvo — nada a fazer

  // Cancela troca pendente e agenda nova com delay
  clearTimeout(rowSwitchTimer);
  rowSwitchTimer = setTimeout(() => applyRowCursor(newIdx), ROW_SWITCH_DELAY);
});

workSection.addEventListener('mouseleave', () => {
  clearTimeout(rowSwitchTimer);
  activeRowIdx = -1;
  hideCursor();
});

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

contactRows.forEach((row, idx) => {
  row.addEventListener('click', () => {
    contactActions[idx]();

    // Feedback "copied" apenas na linha do email
    if (idx === 0) {
      isCopiedState = true;
      clearTimeout(copiedHideTimer);

      cursorText.textContent = 'copied!';
      cursorLabel.style.setProperty('--cursor-bg', 'var(--color-cream)');
      cursorLabel.style.setProperty('--cursor-fg', 'var(--color-dark)');
      cursorLabel.className = 'cursor-label visible contact-copied';

      // Após 1.5s, oculta o cursor até o usuário mudar de linha
      copiedHideTimer = setTimeout(() => {
        hideCursor();
        activeContactIdx = -1; // força re-avaliação se o mouse se mover
      }, 1500);
    }
  });
});
