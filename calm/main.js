/*
  main.js
  1. Signature: writes itself on load, and again when clicked.
  2. Intro stream: on the first visit of a session, the bio arrives word by word.
  3. Nav: a pill slides between links on hover.
*/
(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Signature ---------- */
  const sig = document.querySelector('.signature');
  if (sig) {
    const SPEED = 520;  // svg units per second. Higher = faster pen.
    const PAUSE = 0.12; // seconds the pen lifts between strokes.
    let t = 0.15;
    sig.querySelectorAll('svg path').forEach((p) => {
      const dur = Math.max(0.18, p.getTotalLength() / SPEED);
      p.setAttribute('pathLength', '1');
      p.style.setProperty('--dur', dur + 's');
      p.style.setProperty('--delay', t + 's');
      t += dur + PAUSE;
    });

    const sign = () => {
      sig.classList.remove('signing');
      void sig.offsetWidth; // restart the animation
      sig.classList.add('signing');
    };
    // Wait for the script font so the wipe does not reveal a fallback face.
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(sign);
    sig.addEventListener('click', sign);
  }

  /* ---------- 2. Intro stream ---------- */
  let seen = false;
  try {
    seen = sessionStorage.getItem('intro-seen') === '1';
    sessionStorage.setItem('intro-seen', '1');
  } catch (e) {}

  if (!reduceMotion && !seen) {
    let i = 0;
    const wrap = (node) => {
      for (const child of [...node.childNodes]) {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          for (const part of child.textContent.split(/(\s+)/)) {
            if (!part) continue;
            if (/^\s+$/.test(part)) { frag.append(part); continue; }
            const s = document.createElement('span');
            s.className = 'w';
            s.style.setProperty('--i', i++);
            s.textContent = part;
            frag.append(s);
          }
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          if (child.classList.contains('atom')) {   // logos, emoji, set phrases arrive whole
            child.classList.add('w');
            child.style.setProperty('--i', i++);
            i += 2;
          } else wrap(child);
        }
      }
    };
    document.querySelectorAll('[data-stream]').forEach((p) => { wrap(p); i += 8; }); // a breath between paragraphs
    document.documentElement.style.setProperty('--words', i);
    document.documentElement.classList.add('streaming');
  }

  /* ---------- 3. Nav pill ---------- */
  const list = document.querySelector('.nav-list');
  const pill = list?.querySelector('.nav-pill');
  if (list && pill) {
    list.querySelectorAll('a').forEach((a) => {
      a.addEventListener('pointerenter', () => {
        const l = list.getBoundingClientRect(), r = a.getBoundingClientRect();
        pill.style.setProperty('--x', r.left - l.left + 'px');
        pill.style.setProperty('--y', r.top - l.top + 'px');
        pill.style.setProperty('--w', r.width + 'px');
        pill.style.setProperty('--h', r.height + 'px');
        if (pill.hasAttribute('data-on')) pill.setAttribute('data-slide', '');
        pill.setAttribute('data-on', '');
      });
    });
    list.addEventListener('pointerleave', () => {
      pill.removeAttribute('data-on');
      pill.removeAttribute('data-slide');
    });
  }
})();
