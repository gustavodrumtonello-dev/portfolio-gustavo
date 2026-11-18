// King V interativa: desenho em SVG + som sintetizado (Karplus-Strong) via Web Audio
(() => {
    const stage = document.getElementById('gtr-stage');
    const svg = document.getElementById('gtr-svg');
    if (!stage || !svg) return;

    const NS = 'http://www.w3.org/2000/svg';
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const el = (name, attrs = {}, parent) => {
        const node = document.createElementNS(NS, name);
        for (const key in attrs) node.setAttribute(key, attrs[key]);
        if (parent) parent.appendChild(node);
        return node;
    };

    /* ---------- Geometria ---------- */
    const XB = 420;          // x da ponte
    const XN = 1061;         // x do nut (pestana)
    const YC = 280;          // linha central do braço
    const SP_B = 11;         // espaço entre cordas na ponte
    const SP_N = 8;          // espaço entre cordas no nut
    const FRETS = 22;
    const BOARD_X = 595;     // início do espelho
    const OPEN = [40, 45, 50, 55, 59, 64]; // E2 A2 D3 G3 B3 E4 (MIDI)
    const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const STR_W = [3.4, 2.8, 2.3, 1.8, 1.4, 1.1];

    const fretX = (n) => XN - (XN - XB) * (1 - Math.pow(2, -n / 12));
    const spacing = (x) => SP_B + (SP_N - SP_B) * (x - XB) / (XN - XB);
    const stringY = (i, x) => YC + (i - 2.5) * spacing(x);
    const edgeTop = (x) => 249 + 8 * (x - BOARD_X) / (XN - BOARD_X);
    const edgeBot = (x) => 311 - 8 * (x - BOARD_X) / (XN - BOARD_X);

    /* ---------- Desenho das partes dinâmicas ---------- */
    const hardware = $('#gtr-hardware');
    const board = $('#gtr-fretboard');
    const headHw = $('#gtr-headstock-hw');
    const strGroup = $('#gtr-strings');
    const gold = 'url(#gtr-gold)';

    // Ponte + alavanca
    el('rect', { x: 408, y: 238, width: 42, height: 84, rx: 5, fill: gold, stroke: '#6b4a00', 'stroke-width': 1.2 }, hardware);
    el('rect', { x: 417, y: 248, width: 24, height: 64, rx: 3, fill: '#14100a' }, hardware);
    el('path', { d: 'M438 320 Q472 352 528 332', fill: 'none', stroke: gold, 'stroke-width': 4, 'stroke-linecap': 'round' }, hardware);
    el('circle', { cx: 528, cy: 332, r: 5.5, fill: gold }, hardware);

    // Captadores (humbuckers dourados)
    const pickup = (cx) => {
        el('rect', { x: cx - 15, y: 238, width: 30, height: 84, rx: 4, fill: gold, stroke: '#6b4a00', 'stroke-width': 1.2 }, hardware);
        el('rect', { x: cx - 9, y: 244, width: 18, height: 72, rx: 2, fill: '#09090c' }, hardware);
        for (let i = 0; i < 6; i++) el('circle', { cx, cy: stringY(i, cx), r: 2.6, fill: gold }, hardware);
    };
    pickup(488);
    pickup(554);

    // Knobs e chave seletora
    [[468, 222], [506, 226]].forEach(([cx, cy]) => {
        el('circle', { cx, cy, r: 10, fill: gold, stroke: '#6b4a00', 'stroke-width': 1 }, hardware);
        el('circle', { cx, cy, r: 6, fill: '#15110a' }, hardware);
        el('line', { x1: cx, y1: cy, x2: cx + 3, y2: cy - 6, stroke: '#ffd026', 'stroke-width': 1.6, 'stroke-linecap': 'round' }, hardware);
    });
    el('rect', { x: 520, y: 227, width: 22, height: 9, rx: 2, fill: '#0b0b0f', stroke: '#6b4a00' }, hardware);
    el('rect', { x: 529, y: 218, width: 4, height: 12, rx: 1.5, fill: gold }, hardware);

    // Selas na ponte
    for (let i = 0; i < 6; i++) {
        el('rect', { x: XB - 4, y: stringY(i, XB) - 3.5, width: 8, height: 7, rx: 1, fill: '#d9b24a' }, hardware);
    }

    // Trastes
    for (let n = 1; n <= FRETS; n++) {
        const x = fretX(n);
        el('line', { class: 'gtr-fret', x1: x, y1: edgeTop(x), x2: x, y2: edgeBot(x) }, board);
    }

    // Marcações em formato de barbatana (shark fin) + numeração
    [3, 5, 7, 9, 12, 15, 17, 19, 21].forEach((n) => {
        const a = fretX(n);
        const b = fretX(n - 1);
        const xc = (a + b) / 2;
        const w = (b - a) * 0.5;
        const tri = (cy, h) => el('polygon', {
            class: 'gtr-inlay',
            points: `${xc + w / 2},${cy - h} ${xc + w / 2},${cy + h} ${xc - w / 2},${cy}`
        }, board);
        if (n === 12) { tri(266, 7); tri(294, 7); } else { tri(280, 11); }
        const label = el('text', { class: 'gtr-fretnum', x: xc, y: edgeBot(xc) + 22 }, board);
        label.textContent = n;
    });

    // Tarraxas 3+3 e cordas na mão
    const topEdge = (x) => 252 - 26 * (x - 1064) / 132;
    const botEdge = (x) => 308 - 12 * (x - 1064) / 162;
    const PEGS = [
        { x: 1102, top: true }, { x: 1136, top: true }, { x: 1170, top: true },
        { x: 1182, top: false }, { x: 1142, top: false }, { x: 1102, top: false }
    ];
    PEGS.forEach((peg, i) => {
        const edge = peg.top ? topEdge(peg.x) : botEdge(peg.x);
        const dir = peg.top ? -1 : 1;
        const post = edge - dir * 9;
        el('line', { x1: XN, y1: stringY(i, XN), x2: peg.x, y2: post, stroke: '#cfcfd8', 'stroke-width': 1 }, headHw);
        el('circle', { cx: peg.x, cy: post, r: 3, fill: '#cfcfd8' }, headHw);
        el('line', { x1: peg.x, y1: edge, x2: peg.x, y2: edge + dir * 6, stroke: '#b8860b', 'stroke-width': 3 }, headHw);
        el('ellipse', { cx: peg.x, cy: edge + dir * 10, rx: 7, ry: 5, fill: gold, stroke: '#6b4a00', 'stroke-width': 1 }, headHw);
    });

    // Cordas (interativas)
    const straight = (i) => `M${XB} ${stringY(i, XB).toFixed(1)} L${XN} ${stringY(i, XN).toFixed(1)}`;
    const strs = [];
    for (let i = 0; i < 6; i++) {
        const path = el('path', { class: 'gtr-string', 'stroke-width': STR_W[i], d: straight(i) }, strGroup);
        const finger = el('circle', { class: 'gtr-finger', r: 6.5, cx: 0, cy: 0 }, strGroup);
        strs.push({ path, finger, on: false, fx: XN, amp0: 0, t0: 0, tau: 1000, fingerOn: false });
    }

    /* ---------- Áudio ---------- */
    let ctx = null;
    let pre, shaper, tone, post;
    let mode = 'crunch';
    const MODES = {
        clean: { k: 0, pre: 0.9, post: 1, tone: 7000 },
        crunch: { k: 5, pre: 2.2, post: 0.55, tone: 5200 },
        metal: { k: 18, pre: 4.5, post: 0.32, tone: 3800 }
    };

    const makeCurve = (k) => {
        const n = 2048;
        const curve = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const x = (i * 2) / n - 1;
            curve[i] = Math.tanh(k * x) / Math.tanh(k);
        }
        return curve;
    };

    function applyMode() {
        if (!ctx) return;
        const m = MODES[mode];
        shaper.curve = m.k ? makeCurve(m.k) : null;
        pre.gain.value = m.pre;
        post.gain.value = m.post;
        tone.frequency.value = m.tone;
    }

    function initAudio() {
        if (!ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return false;
            ctx = new AC();
            pre = ctx.createGain();
            shaper = ctx.createWaveShaper();
            shaper.oversample = '4x';
            tone = ctx.createBiquadFilter();
            tone.type = 'lowpass';
            post = ctx.createGain();
            const comp = ctx.createDynamicsCompressor();
            const out = ctx.createGain();
            out.gain.value = 0.9;
            pre.connect(shaper);
            shaper.connect(tone);
            tone.connect(post);
            post.connect(comp);
            comp.connect(out);
            out.connect(ctx.destination);
            applyMode();
        }
        if (ctx.state === 'suspended') ctx.resume();
        return true;
    }

    // Karplus-Strong: ruído filtrado que realimenta um delay com média = corda de verdade
    function playTone(freq, { vel = 1, mute = false, gain = 1 } = {}) {
        if (!ctx) return;
        const sr = ctx.sampleRate;
        const N = Math.max(2, Math.round(sr / freq));
        const dur = mute ? 0.5 : 2.6;
        const len = Math.floor(sr * dur);
        const buffer = ctx.createBuffer(1, len, sr);
        const data = buffer.getChannelData(0);

        let prev = 0;
        for (let i = 0; i < N; i++) {
            prev = prev * 0.55 + (Math.random() * 2 - 1) * 0.45;
            data[i] = prev;
        }
        const rho = Math.pow(10, (-3 * (N / sr)) / (mute ? 0.35 : 3.2));
        for (let i = N; i < len; i++) {
            data[i] = rho * 0.5 * (data[i - N] + data[i - N + 1]);
        }

        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.playbackRate.value = freq / (sr / N); // corrige o afinamento exato

        const env = ctx.createGain();
        const t = ctx.currentTime;
        const peak = 0.55 * vel * gain;
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(peak, t + 0.003);
        if (mute) {
            env.gain.exponentialRampToValueAtTime(0.0008, t + 0.2);
        } else {
            env.gain.setValueAtTime(peak, t + dur - 0.6);
            env.gain.linearRampToValueAtTime(0, t + dur - 0.15);
        }
        src.connect(env);
        env.connect(pre);
        src.start(t);
        src.stop(t + dur);
    }

    /* ---------- Vibração visual ---------- */
    let raf = 0;
    const readout = $('#gtr-note');
    const setNote = (text) => { if (readout) readout.textContent = text; };

    function buildPath(i, fx, amp, phase) {
        let d = '';
        const steps = 20;
        for (let k = 0; k <= steps; k++) {
            const u = k / steps;
            const x = XB + (fx - XB) * u;
            const y = stringY(i, x) + amp * Math.sin(Math.PI * u) * Math.cos(phase);
            d += `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)} `;
        }
        return `${d}L${XN} ${stringY(i, XN).toFixed(1)}`;
    }

    function vibrate(i, fret, vel, mute) {
        const s = strs[i];
        s.fx = fret ? fretX(fret) : XN;
        s.amp0 = (7.5 - i * 0.5) * (0.55 + 0.45 * vel);
        s.t0 = performance.now();
        s.tau = mute ? 220 : 1000 - i * 60;
        s.on = true;
        s.path.classList.add('is-vibrating');
        if (fret) {
            const a = fretX(fret);
            const b = fretX(fret - 1);
            const x = a + (b - a) * 0.3;
            s.finger.setAttribute('cx', x.toFixed(1));
            s.finger.setAttribute('cy', stringY(i, x).toFixed(1));
            s.fingerOn = true;
        } else {
            s.fingerOn = false;
            s.finger.style.opacity = 0;
        }
        stage.classList.add('is-live');
        if (!raf) raf = requestAnimationFrame(tick);
    }

    function tick(now) {
        let any = false;
        strs.forEach((s, i) => {
            if (!s.on) return;
            const dt = Math.max(0, now - s.t0);
            const amp = s.amp0 * Math.exp(-dt / s.tau);
            if (amp < 0.12) {
                s.on = false;
                s.path.setAttribute('d', straight(i));
                s.path.classList.remove('is-vibrating');
                s.finger.style.opacity = 0;
                return;
            }
            any = true;
            s.path.setAttribute('d', buildPath(i, s.fx, amp, dt * 0.055));
            s.finger.style.opacity = s.fingerOn ? Math.min(1, amp / (s.amp0 * 0.35)) : 0;
        });
        if (any) {
            raf = requestAnimationFrame(tick);
        } else {
            raf = 0;
            stage.classList.remove('is-live');
        }
    }

    /* ---------- Tocar ---------- */
    function pluck(i, fret = 0, o = {}) {
        fret = clamp(fret | 0, 0, FRETS);
        const midi = OPEN[i] + fret;
        const freq = 440 * Math.pow(2, (midi - 69) / 12);
        playTone(freq, o);
        vibrate(i, fret, o.vel || 1, o.mute);
        if (!o.quiet) {
            setNote(`${NOTES[midi % 12]}${Math.floor(midi / 12) - 1} // ${6 - i}ª CORDA // CASA ${fret}`);
        }
    }

    const CHORDS = [
        { n: 'Em', f: [0, 2, 2, 0, 0, 0] },
        { n: 'C', f: [-1, 3, 2, 0, 1, 0] },
        { n: 'G', f: [3, 2, 0, 0, 0, 3] },
        { n: 'D', f: [-1, -1, 0, 2, 3, 2] }
    ];
    let chordIdx = 0;

    function strum() {
        initAudio();
        const chord = CHORDS[chordIdx++ % CHORDS.length];
        let k = 0;
        chord.f.forEach((fret, i) => {
            if (fret < 0) return;
            setTimeout(() => pluck(i, fret, { vel: 0.85, quiet: true }), k++ * 38);
        });
        setNote(`ACORDE ${chord.n}`);
    }

    // Riff palm-muted em E: [casa, abafada?]
    const RIFF = [[0, 1], [0, 1], [0, 1], [3, 0], [0, 1], [0, 1], [5, 0], [0, 1],
                  [0, 1], [0, 1], [6, 0], [5, 0], [0, 1], [3, 0], [0, 1], [0, 1]];
    const riffBtn = $('#gtr-riff');
    let riffTimer = null;
    let riffStep = 0;

    function stopRiff() {
        clearTimeout(riffTimer);
        riffTimer = null;
        if (riffBtn) {
            riffBtn.textContent = 'RIFF';
            riffBtn.classList.remove('is-on');
        }
    }

    function toggleRiff() {
        if (riffTimer) { stopRiff(); return; }
        initAudio();
        riffBtn.textContent = 'PARAR';
        riffBtn.classList.add('is-on');
        riffStep = 0;
        const STEP = 130;
        let next = performance.now();
        const run = () => {
            const [fret, muted] = RIFF[riffStep % RIFF.length];
            pluck(0, fret, { vel: 1, mute: !!muted });
            pluck(1, fret + 2, { vel: 0.8, mute: !!muted, quiet: true });
            riffStep++;
            if (riffStep >= RIFF.length * 4) { stopRiff(); return; }
            next += STEP;
            riffTimer = setTimeout(run, Math.max(0, next - performance.now()));
        };
        riffTimer = setTimeout(() => {}, 0); // marca como ativo antes do primeiro passo
        run();
    }

    /* ---------- Ponteiro: clique no braço / arrastar pelas cordas ---------- */
    const pt = svg.createSVGPoint();
    const toSvg = (e) => {
        pt.x = e.clientX;
        pt.y = e.clientY;
        return pt.matrixTransform(svg.getScreenCTM().inverse());
    };

    const fretAt = (x) => {
        if (x < BOARD_X - 6 || x >= XN) return 0;
        for (let n = 1; n <= FRETS; n++) if (x >= fretX(n)) return n;
        return FRETS;
    };

    const nearestString = (p) => {
        if (p.x < XB - 6 || p.x > XN + 4) return -1;
        let best = -1;
        let bestDist = Infinity;
        for (let i = 0; i < 6; i++) {
            const d = Math.abs(p.y - stringY(i, p.x));
            if (d < bestDist) { bestDist = d; best = i; }
        }
        return bestDist <= (p.x >= BOARD_X ? 16 : 8) ? best : -1;
    };

    let down = false;
    let last = null;

    svg.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        initAudio();
        stage.focus({ preventScroll: true });
        down = true;
        svg.setPointerCapture(e.pointerId);
        const p = toSvg(e);
        last = p;
        const i = nearestString(p);
        if (i >= 0) pluck(i, fretAt(p.x), { vel: 1 });
    });

    svg.addEventListener('pointermove', (e) => {
        if (!down) return;
        const p = toSvg(e);
        if (last && p.x >= XB && p.x <= XN) {
            const speed = Math.hypot(p.x - last.x, p.y - last.y);
            const vel = clamp(0.5 + speed / 50, 0.5, 1);
            const fret = fretAt(p.x);
            const order = [0, 1, 2, 3, 4, 5];
            if (p.y < last.y) order.reverse();
            let k = 0;
            order.forEach((i) => {
                const sy = stringY(i, p.x);
                if ((last.y - sy) * (p.y - sy) < 0) {
                    setTimeout(() => pluck(i, fret, { vel }), k++ * 14);
                }
            });
        }
        last = p;
    });

    const release = () => { down = false; last = null; };
    svg.addEventListener('pointerup', release);
    svg.addEventListener('pointercancel', release);

    /* ---------- Botões e teclado ---------- */
    $$('.gtr-chip[data-mode]').forEach((btn) => {
        btn.addEventListener('click', () => {
            mode = btn.dataset.mode;
            $$('.gtr-chip[data-mode]').forEach((b) => b.classList.toggle('is-active', b === btn));
            applyMode();
        });
    });

    $$('.gtr-chip[data-string]').forEach((btn) => {
        btn.addEventListener('click', () => {
            initAudio();
            pluck(Number(btn.dataset.string), 0, { vel: 1 });
        });
    });

    const strumBtn = $('#gtr-strum');
    if (strumBtn) strumBtn.addEventListener('click', strum);
    if (riffBtn) riffBtn.addEventListener('click', toggleRiff);

    stage.addEventListener('keydown', (e) => {
        if (/^[1-6]$/.test(e.key)) {
            e.preventDefault();
            initAudio();
            pluck(6 - Number(e.key), 0, { vel: 1 });
        } else if (e.code === 'Space') {
            e.preventDefault();
            strum();
        } else if (e.key === 'r' || e.key === 'R') {
            toggleRiff();
        }
    });
})();
