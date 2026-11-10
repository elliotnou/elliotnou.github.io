/*
  scribble/main.js
  1. Opening: the signature scrawls itself huge in the middle of a mess of
     scribbles, then the mess erases itself and the signature drops into place.
     Plays once per session. Click the signature to play it again.
  2. Rough marks: any element with data-rough="underline | circle | box | strike"
     gets a hand-drawn line fitted to it.
  3. Boil: drawn lines wobble a little, like a flipbook.

  Handy while editing:  ?still  skips the opening.  ?chaos  freezes it mid-mess.
*/
(() => {
  const root = document.documentElement;
  const params = new URLSearchParams(location.search);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  const sig = document.querySelector('.sig');
  const chaos = document.querySelector('.chaos');

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
    // A coil that winds inward.
    spiral(w, h, r) {
      const cx = w / 2, cy = h / 2, rad = Math.min(w, h) / 2 + 2, pts = [];
      for (let t = 0; t < Math.PI * 5; t += 0.45) {
        const k = rad * (1 - t / (Math.PI * 5.6));
        pts.push([cx + Math.cos(t) * k + (r() - 0.5), cy + Math.sin(t) * k + (r() - 0.5)]);
      }
      return [smooth(pts)];
    },
    // A stand-in face: wobbly head, two eyes, a lopsided smile.
    smiley(w, h, r) {
      const cx = w / 2, cy = h / 2, rx = w * 0.42, ry = h * 0.44, head = [];
      for (let t = 0; t <= Math.PI * 2 * 1.2; t += 0.4) {
        head.push([cx + Math.cos(t - 1.2) * (rx + (r() - 0.5) * 3), cy + Math.sin(t - 1.2) * (ry + (r() - 0.5) * 3)]);
      }
      const eye = (x) => `M${f(x)} ${f(cy - h * 0.13)} L${f(x + r())} ${f(cy - h * 0.02)}`;
      const smile = smooth([[cx - w * 0.2, cy + h * 0.1], [cx - w * 0.06, cy + h * 0.25], [cx + w * 0.1, cy + h * 0.23], [cx + w * 0.22, cy + h * 0.06]]);
      return [smooth(head), eye(cx - w * 0.13), eye(cx + w * 0.12), smile];
    },
    // A rectangle drawn twice by someone in a hurry.
    box(w, h, r) {
      const out = [];
      for (let pass = 0; pass < 2; pass++) {
        const j = () => (r() - 0.5) * (pass ? 6 : 3);
        const o = 2 + pass * 2;
        const c = [[-o + j(), -o + j()], [w + o + j(), -o + j()], [w + o + j(), h + o + j()], [-o + j(), h + o + j()]];
        const pts = [];
        for (let i = 0; i <= 4; i++) {
          const a = c[i % 4], b = c[(i + 1) % 4];
          pts.push(a, a, [(a[0] + b[0]) / 2 + j(), (a[1] + b[1]) / 2 + j()]);
        }
        out.push(smooth(pts.slice(0, -1)));
      }
      // Hatched shadow down the right side and along the bottom.
      let hatch = '';
      for (let y = 10; y < h + 4; y += 5) hatch += `M${f(w + 5 + r())} ${f(y + 8)} L${f(w + 12 + r())} ${f(y + 1)} `;
      for (let x = 10; x < w + 6; x += 5) hatch += `M${f(x)} ${f(h + 12 + r())} L${f(x + 7)} ${f(h + 5 + r())} `;
      out.push({ d: hatch, cls: 'hatch' });
      return out;
    }
  };

  const PAD = 14; // room around each mark so the wobble is not clipped
  function decorate(animate) {
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
      make(w, h, r).forEach((shape, k) => {
        const p = path(shape.d || shape);
        if (shape.cls) p.setAttribute('class', shape.cls);
        svg.append(p);
        if (shape.cls === 'hatch') {
          if (animate) p.animate([{ opacity: 0 }, {}], { duration: 500, delay: 900 + i * 110, fill: 'backwards' });
        } else if (animate) {
          p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
            { duration: 420 + k * 140, delay: 250 + i * 110 + k * 160, easing: 'cubic-bezier(.6,0,.3,1)', fill: 'both' });
        }
      });
      host.append(svg);
    });
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

  // Move the signature to the middle of the screen, big.
  function centreSignature() {
    sig.style.transition = 'none';
    sig.style.transform = 'none';
    const b = sig.getBoundingClientRect();
    const s = Math.min(innerWidth * 0.78 / b.width, innerHeight * 0.6 / b.height);
    const dx = innerWidth / 2 - (b.left + b.width / 2), dy = innerHeight / 2 - (b.top + b.height / 2);
    sig.style.transform = `translate(${dx}px, ${dy}px) scale(${s}) rotate(-2deg)`;
  }

  let timers = [];
  function opening(freeze) {
    timers.forEach(clearTimeout); timers = [];
    scrollTo(0, 0);
    root.dataset.phase = 'chaos';
    centreSignature();

    const strokes = [...sig.querySelectorAll('path')];
    const scribbles = buildChaos();

    if (freeze) { scribbles.forEach((p) => { p.style.strokeDashoffset = 0; }); return; }

    // The signature's outline is traced, then it fills with ink.
    const timing = [[0, 320], [240, 1250], [1280, 700]]; // [delay, duration] per stroke, in ms
    strokes.forEach((p, i) => {
      const [delay, duration] = timing[i] || [0, 1500];
      p.setAttribute('pathLength', '1');
      p.animate([
        { strokeDashoffset: 1, fillOpacity: 0, strokeOpacity: 1 },
        { strokeDashoffset: 0, fillOpacity: 0, strokeOpacity: 1, offset: 0.78 },
        { strokeDashoffset: 0, fillOpacity: 1, strokeOpacity: 1 }
      ], { delay, duration, fill: 'both', easing: 'linear' });
    });

    scribbles.forEach((p) => {
      p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
        { delay: Math.random() * 1150, duration: 350 + Math.random() * 500, fill: 'both', easing: 'cubic-bezier(.5,0,.3,1)' });
    });

    // Order: the mess rubs itself out, the signature goes home, the page arrives.
    timers.push(setTimeout(() => {
      root.dataset.phase = 'settle';
      sig.style.transition = '';
      sig.style.transform = '';
      strokes.forEach((p) => p.getAnimations().forEach((a) => a.cancel()));
      scribbles.forEach((p) => {
        p.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: -1 }],
          { delay: Math.random() * 280, duration: 480, fill: 'both', easing: 'cubic-bezier(.6,0,.8,.3)' });
      });
    }, 2150));

    timers.push(setTimeout(() => {
      root.dataset.phase = 'done';
      chaos.replaceChildren();
      decorate(true);
    }, 3100));
  }

  /* ---------- Start ---------- */

  document.querySelectorAll('.reveal').forEach((el, i) => el.style.setProperty('--n', i));

  let seen = false;
  try { seen = sessionStorage.getItem('mess-seen') === '1'; sessionStorage.setItem('mess-seen', '1'); } catch (e) {}

  const start = () => {
    if (params.has('chaos')) opening(true);
    else if (reduceMotion || seen || params.has('still')) { root.dataset.phase = 'done'; decorate(!reduceMotion && !params.has('still')); }
    else opening(false);
  };
  // Marks are fitted to text, so wait for the fonts before measuring.
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(start);

  if (!reduceMotion) sig.addEventListener('click', () => opening(false));

  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (root.dataset.phase === 'done') decorate(false); }, 150);
  });

  /* ---------- 3. Boil ---------- */
  const turbulence = document.querySelector('#boil feTurbulence');
  if (turbulence && !reduceMotion && !params.has('still') && !params.has('chaos')) {
    let k = 0;
    setInterval(() => { k = (k + 1) % 4; turbulence.setAttribute('seed', String(k + 1)); }, 170);
  }
})();
