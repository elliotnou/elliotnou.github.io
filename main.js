/*
  main.js
  1. Opening (home page, once per session): a mess of scribbles draws itself
     over the blank page, rubs itself out, and the page and its pen marks
     arrive together. Click your name to play it again.
  2. Rough marks: any element with
     data-rough="underline | squiggle | timeline" (also strike, circle, star, box)
     gets a hand-drawn line fitted to it.
  3. Boil: drawn lines wobble a little, like a flipbook.

  Handy while editing:  ?still  skips all motion.  ?chaos  freezes the opening mid-mess.
*/
(() => {
  const root = document.documentElement;
  const params = new URLSearchParams(location.search);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const still = reduceMotion || params.has('still');
  const NS = 'http://www.w3.org/2000/svg';
  const sig = document.querySelector('button.name');                // home page only
  const name = document.querySelector('.sig svg, .home-sig svg');
  const chaos = document.querySelector('.chaos');
  const canMess = !!(sig && chaos);

  /* ---------- Helpers ---------- */

  // Small seeded random generator, so rough marks look the same on every load.
  function rng(seed) {
    return () => {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const f = (n) => n.toFixed(1);

  // A loose curve through a list of points.
  function smooth(pts) {
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      d += ` Q${f(pts[i][0])} ${f(pts[i][1])} ${f(mx)} ${f(my)}`;
    }
    const last = pts[pts.length - 1];
    return d + ` L${f(last[0])} ${f(last[1])}`;
  }

  function path(d) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('pathLength', '1');
    return p;
  }

  /* ---------- 2. Rough marks ---------- */

  const shapes = {
    // Out, and half-way back again.
    underline(w, h, r) {
      const y = h + 3;
      return [smooth([
        [-3, y + r() * 2], [w * 0.5, y - 1 + r() * 2], [w + 4, y - 1 + r() * 2], [w + 4, y - 1 + r() * 2],
        [w * 0.6, y + 3 + r() * 1.5], [w * 0.1, y + 2.5 + r() * 2]
      ])];
    },
    // A wavy line under the words.
    squiggle(w, h, r) {
      const y = h + 2, n = Math.max(6, Math.round(w / 7)), pts = [];
      for (let i = 0; i <= n; i++) {
        pts.push([-2 + (w + 4) * i / n + (r() - 0.5) * 1.5, y + (i % 2 ? 2.2 : -1.6) + (r() - 0.5) * 1.2]);
      }
      return [{ d: smooth(pts), dur: 700 }];
    },
    // An impatient zigzag through the middle.
    strike(w, h, r) {
      const n = Math.max(4, Math.round(w / 12)), pts = [];
      for (let i = 0; i <= n; i++) {
        pts.push([-4 + (w + 8) * i / n + (r() - 0.5) * 4, h * (i % 2 ? 0.84 : 0.46) + (r() - 0.5) * h * 0.16]);
      }
      return [smooth(pts)];
    },
    // Nearly two laps of a lopsided oval.
    circle(w, h, r) {
      const cx = w / 2, cy = h / 2, rx = w / 2 + 9, ry = h / 2 + 6, pts = [];
      const start = -2.4 + r() * 0.6;
      for (let t = 0; t <= Math.PI * 2 * 1.85; t += 0.42) {
        const k = 1 + t * 0.012;
        pts.push([cx + Math.cos(start + t) * (rx * k + (r() - 0.5) * 3), cy + Math.sin(start + t) * (ry * k + (r() - 0.5) * 3)]);
      }
      return [smooth(pts)];
    },
    // A five-point star in one go, the way you draw it in a margin.
    star(w, h, r) {
      const cx = w / 2, cy = h / 2, rad = Math.min(w, h) / 2 + 2;
      let d = '';
      for (let k = 0; k <= 5; k++) {
        const a = -Math.PI / 2 + k * (Math.PI * 4 / 5);
        d += `${k ? 'L' : 'M'}${f(cx + Math.cos(a) * rad + (r() - 0.5) * 2.5)} ${f(cy + Math.sin(a) * rad + (r() - 0.5) * 2.5)} `;
      }
      return [d];
    },
    // A rectangle drawn twice by someone in a hurry, with a hatched shadow.
    box(w, h, r) {
      const out = [];
      for (let pass = 0; pass < 2; pass++) {
        const j = () => (r() - 0.5) * (pass ? 5 : 2.5);
        const o = 2 + pass * 2;
        const c = [[-o + j(), -o + j()], [w + o + j(), -o + j()], [w + o + j(), h + o + j()], [-o + j(), h + o + j()]];
        const pts = [];
        for (let i = 0; i <= 4; i++) {
          const a = c[i % 4], b = c[(i + 1) % 4];
          pts.push(a, a, [(a[0] + b[0]) / 2 + j(), (a[1] + b[1]) / 2 + j()]);
        }
        out.push(smooth(pts.slice(0, -1)));
      }
      let hatch = '';
      for (let y = 6; y < h + 4; y += 4) hatch += `M${f(w + 5 + r())} ${f(y + 6)} L${f(w + 10 + r())} ${f(y + 1)} `;
      for (let x = 6; x < w + 6; x += 4) hatch += `M${f(x)} ${f(h + 10 + r())} L${f(x + 5)} ${f(h + 5 + r())} `;
      out.push({ d: hatch, cls: 'hatch' });
      return out;
    },
    // One pen line running down the left of a list, with a loop beside each item.
    timeline(w, h, r, host) {
      const ys = [...host.children].filter((el) => el.tagName === 'LI').map((li) => li.offsetTop + 11);
      if (!ys.length) return [];
      const x = 10, j = () => (r() - 0.5) * 1.3, pts = [];
      pts.push([x + j(), ys[0] - 15]);
      ys.forEach((y, i) => {
        if (i) pts.push([x + j() * 2, (ys[i - 1] + y) / 2 + 6]);   // the line wanders a little between jobs
        const k = 0.72;   // loop size
        pts.push(
          [x + j(), y - 9 * k], [x + 2 * k + j(), y + 5 * k], [x - 4 * k + j(), y + 9 * k],          // down, and round the bottom
          [x - 10 * k + j(), y + 3 * k], [x - 9 * k + j(), y - 5 * k], [x - 2 * k + j(), y - 6 * k], // up the far side, over the top
          [x + 3 * k + j(), y + 3 * k]                                                                // across itself and on down
        );
      });
      const end = ys[ys.length - 1];
      pts.push([x + 1 + j(), end + 16], [x - 1 + j(), end + 24]);
      return [{ d: smooth(pts), dur: 500 + ys.length * 260 }];
    }
  };

  const PAD = 14; // room around each mark so the wobble is not clipped
  function decorate(animate, baseDelay = 250) {
    document.querySelectorAll('svg.rough').forEach((s) => s.remove());
    document.querySelectorAll('[data-rough]').forEach((host, i) => {
      const make = shapes[host.dataset.rough];
      const w = host.offsetWidth, h = host.offsetHeight;
      if (!make || !w || !h) return;
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'rough');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('viewBox', `${-PAD} ${-PAD} ${w + PAD * 2} ${h + PAD * 2}`);
      svg.setAttribute('width', w + PAD * 2);
      svg.setAttribute('height', h + PAD * 2);
      const r = rng(i * 97 + 13);
      make(w, h, r, host).forEach((shape, k) => {
        const p = path(shape.d || shape);
        if (shape.cls) p.setAttribute('class', shape.cls);
        svg.append(p);
        if (!animate) return;
        if (shape.cls === 'hatch') {
          p.animate([{ opacity: 0 }, {}], { duration: 500, delay: baseDelay + 550 + i * 90, fill: 'backwards' });
        } else {
          p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
            { duration: shape.dur || 420 + k * 140, delay: baseDelay + i * 90 + k * 160, easing: 'cubic-bezier(.6,0,.3,1)', fill: 'both' });
        }
      });
      host.append(svg);
    });
  }

  /* ---------- The name, written stroke by stroke ---------- */

  // Each stroke's outline is traced, then fills with ink. Time is shared out
  // by stroke length, so long strokes take longer, like a real pen.
  function writeName(total) {
    if (!name) return 0;
    const strokes = [...name.querySelectorAll('path')];
    const lengths = strokes.map((p) => p.getTotalLength());
    const sum = lengths.reduce((a, b) => a + b, 0) || 1;
    let t = 150;
    strokes.forEach((p, i) => {
      p.getAnimations().forEach((a) => a.cancel());
      const duration = Math.max(70, total * lengths[i] / sum);
      p.animate([
        { strokeDashoffset: 1, fillOpacity: 0, strokeOpacity: 1 },
        { strokeDashoffset: 0, fillOpacity: 0, strokeOpacity: 1, offset: 0.75 },
        { strokeDashoffset: 0, fillOpacity: 1, strokeOpacity: 0 }
      ], { delay: t, duration, fill: 'both', easing: 'ease-in-out' });
      t += duration + 25;
    });
    return t;
  }

  /* ---------- 1. Opening ---------- */

  function buildChaos() {
    const W = innerWidth, H = innerHeight;
    chaos.setAttribute('viewBox', `0 0 ${W} ${H}`);
    chaos.replaceChildren();
    const r = rng((Math.random() * 1e9) | 0);
    const R = (a, b) => a + (b - a) * r();
    const made = [];
    const add = (pts, width) => { const p = path(smooth(pts)); p.style.strokeWidth = width; chaos.append(p); made.push(p); };

    // Long careless sweeps across the whole screen.
    for (let i = 0; i < 3; i++) {
      const pts = [], n = 5 + ((r() * 4) | 0);
      for (let k = 0; k < n; k++) pts.push([R(-0.05, 1.05) * W, R(-0.05, 1.05) * H]);
      add(pts, R(1, 1.6));
    }
    // Coils that wander sideways.
    for (let i = 0; i < 4; i++) {
      const cx = R(0.08, 0.92) * W, cy = R(0.1, 0.9) * H, rad = R(30, 110), turns = R(3, 7), drift = R(-60, 60), squash = R(0.45, 1), pts = [];
      for (let t = 0; t < turns * 6.283; t += 0.5) {
        pts.push([cx + drift * t / 6.283 + Math.cos(t) * rad * (1 + (r() - 0.5) * 0.25), cy + Math.sin(t) * rad * squash * (1 + (r() - 0.5) * 0.25)]);
      }
      add(pts, R(0.9, 1.5));
    }
    // Scratch-outs.
    for (let i = 0; i < 4; i++) {
      const x = R(0.05, 0.8) * W, y = R(0.08, 0.92) * H, len = R(120, 380), amp = R(14, 60), ang = R(-0.5, 0.5), n = (len / R(9, 16)) | 0, pts = [];
      for (let k = 0; k <= n; k++) {
        const u = len * k / n, v = (k % 2 ? amp : -amp) * (0.6 + r() * 0.5);
        pts.push([x + u * Math.cos(ang) - v * Math.sin(ang), y + u * Math.sin(ang) + v * Math.cos(ang)]);
      }
      add(pts, R(1.1, 2));
    }
    return made;
  }

  // Move the name to the middle of the screen, big.
  function centreName() {
    sig.style.transition = 'none';
    sig.style.transform = 'none';
    const b = sig.getBoundingClientRect();
    const s = Math.min(innerWidth * 0.8 / b.width, innerHeight * 0.4 / b.height);
    const dx = innerWidth / 2 - (b.left + b.width / 2), dy = innerHeight / 2 - (b.top + b.height / 2);
    sig.style.transform = `translate(${dx}px, ${dy}px) scale(${s}) rotate(-2deg)`;
  }

  let timers = [];
  function opening(freeze) {
    timers.forEach(clearTimeout); timers = [];
    scrollTo(0, 0);
    const replay = root.dataset.phase === 'done' || root.dataset.phase === 'settle';
    root.dataset.phase = 'chaos';   // the page (and the marks on it) fades out together

    const begin = () => {
      const scribbles = buildChaos();
      if (freeze) { scribbles.forEach((p) => { p.style.strokeDashoffset = 0; }); return; }

      const end = 1500;
      scribbles.forEach((p) => {
        p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
          { delay: Math.random() * 1150, duration: 350 + Math.random() * 500, fill: 'both', easing: 'cubic-bezier(.5,0,.3,1)' });
      });

      // Order: the mess rubs itself out and the name goes home, while the page
      // and its pen marks arrive together. The page is invisible at this point,
      // so the marks can be redrawn without anything visibly vanishing.
      timers.push(setTimeout(() => {
        decorate(true, 450);
        root.dataset.phase = 'settle';
        scribbles.forEach((p) => {
          p.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: -1 }],
            { delay: Math.random() * 280, duration: 480, fill: 'both', easing: 'cubic-bezier(.6,0,.8,.3)' });
        });
      }, end + 350));

      timers.push(setTimeout(() => {
        root.dataset.phase = 'done';
        chaos.replaceChildren();
      }, end + 1400));
    };

    // On a replay, let the page finish fading before the name jumps to the middle.
    if (replay && !freeze) timers.push(setTimeout(begin, 320)); else begin();
  }

  /* ---------- Start ---------- */

  document.querySelectorAll('.reveal').forEach((el, i) => el.style.setProperty('--n', i));

  let seen = false;
  if (canMess) {
    try { seen = sessionStorage.getItem('mess-seen') === '1'; sessionStorage.setItem('mess-seen', '1'); } catch (e) {}
  }

  const start = () => {
    if (canMess && params.has('chaos')) return opening(true);
    if (canMess && !still && !seen) return opening(false);
    // No mess this time: marks are in place before the page is shown, then draw in.
    decorate(!still, 350);
    if (!still) writeName(1300);
    root.dataset.phase = 'done';
  };
  // Marks are fitted to text, so wait for the fonts before measuring.
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(start);

  if (canMess && !reduceMotion) sig.addEventListener('click', () => opening(false));

  // Refit marks when the layout changes width (not on every mobile toolbar wobble).
  let resizeTimer, lastWidth = innerWidth;
  addEventListener('resize', () => {
    if (innerWidth === lastWidth) return;
    lastWidth = innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (root.dataset.phase === 'done') decorate(false); }, 150);
  });

  /* ---------- 3. Boil ---------- */
  const turbulence = document.querySelector('#boil feTurbulence');
  if (turbulence && !still && !params.has('chaos')) {
    let k = 0;
    setInterval(() => { k = (k + 1) % 4; turbulence.setAttribute('seed', String(k + 1)); }, 170);
  }
})();
