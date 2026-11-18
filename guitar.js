// King V interativa do hero: SVG + som sintetizado (Karplus-Strong) via Web Audio
(() => {
    const svg = document.getElementById('gtr-svg');
    if (!svg) return;

    const $ = (id) => document.getElementById(id);
    const range = (n) => [...Array(n).keys()];
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    /* ---------- Geometria (coordenadas do viewBox) ---------- */
    const XB = 420, XN = 1061, YC = 280, FRETS = 22, BOARD_X = 595;
    const OPEN = [40, 45, 50, 55, 59, 64]; // E2 A2 D3 G3 B3 E4 (MIDI)
    const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const fretX = (n) => XN - (XN - XB) * (1 - 2 ** (-n / 12));
    const stringY = (i, x) => YC + (i - 2.5) * (11 - (3 * (x - XB)) / (XN - XB));
    const edge = (x, a, b) => a + ((b - a) * (x - BOARD_X)) / (XN - BOARD_X);
    const gold = 'url(#gtr-gold)';

    /* ---------- Desenho ---------- */
    const pickup = (cx) =>
        `<rect x="${cx - 15}" y="238" width="30" height="84" rx="4" fill="${gold}"/>` +
        `<rect x="${cx - 9}" y="244" width="18" height="72" rx="2" fill="#09090c"/>` +
        range(6).map((i) => `<circle cx="${cx}" cy="${stringY(i, cx)}" r="2.6" fill="${gold}"/>`).join('');

    const knob = ([x, y]) =>
        `<circle cx="${x}" cy="${y}" r="10" fill="${gold}"/><circle cx="${x}" cy="${y}" r="5" fill="#15110a"/>`;

    $('gtr-hardware').innerHTML =
        `<rect x="408" y="238" width="42" height="84" rx="5" fill="${gold}"/>` +
        `<rect x="417" y="248" width="24" height="64" rx="3" fill="#14100a"/>` +
        `<path d="M438 320 Q472 352 528 332" fill="none" stroke="#ffd026" stroke-width="4" stroke-linecap="round"/>` +
        pickup(488) + pickup(554) + [[468, 222], [506, 226]].map(knob).join('');

    // Marcações em barbatana e trastes
    const inlay = (n) => {
        const a = fretX(n), b = fretX(n - 1), c = (a + b) / 2, w = (b - a) / 4;
        return `<polygon points="${c + w},269 ${c + w},291 ${c - w},280" fill="#ffd026"/>`;
    };
    const fret = (n) => {
        const x = fretX(n);
        return `<line x1="${x}" y1="${edge(x, 249, 257)}" x2="${x}" y2="${edge(x, 311, 303)}" stroke="#d9cf9f" stroke-width="1.6"/>`;
    };
    $('gtr-fretboard').innerHTML =
        [3, 5, 7, 9, 12, 15, 17, 19, 21].map(inlay).join('') +
        range(FRETS).map((n) => fret(n + 1)).join('');

    // Cordas: cada uma tem um "dedo" que aparece na casa pressionada
    const straight = (i) => `M${XB} ${stringY(i, XB)} L${XN} ${stringY(i, XN)}`;
    $('gtr-strings').innerHTML = range(6).map((i) =>
        `<path class="gtr-string" stroke-width="${3.4 - i * 0.46}" d="${straight(i)}"/>` +
        `<circle class="gtr-finger" r="6.5"/>`).join('');
    const strs = range(6).map((i) => ({
        path: svg.querySelectorAll('.gtr-string')[i],
        finger: svg.querySelectorAll('.gtr-finger')[i],
        on: false, fx: XN, amp0: 0, t0: 0, tau: 1000
    }));

    /* ---------- Áudio ---------- */
    const MODES = {
        clean: { k: 0, pre: 0.9, post: 1, tone: 7000 },
        crunch: { k: 5, pre: 2.2, post: 0.55, tone: 5200 },
        metal: { k: 18, pre: 4.5, post: 0.32, tone: 3800 }
    };
    let ctx, pre, shaper, tone, post, mode = 'crunch';

    const applyMode = () => {
        if (!ctx) return;
        const m = MODES[mode];
        shaper.curve = m.k ? Float32Array.from(range(2048), (i) => Math.tanh((m.k * (i - 1024)) / 1024) / Math.tanh(m.k)) : null;
        [pre.gain.value, post.gain.value, tone.frequency.value] = [m.pre, m.post, m.tone];
    };

    const initAudio = () => {
        if (!ctx) {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            [pre, post] = [ctx.createGain(), ctx.createGain()];
            shaper = ctx.createWaveShaper();
            shaper.oversample = '4x';
            tone = ctx.createBiquadFilter();
            tone.type = 'lowpass';
            pre.connect(shaper).connect(tone).connect(post).connect(ctx.createDynamicsCompressor()).connect(ctx.destination);
            applyMode();
        }
        if (ctx.state === 'suspended') ctx.resume();
    };

    // Karplus-Strong: ruído que realimenta um delay com média, como uma corda de verdade
    const playTone = (freq, vel) => {
        const sr = ctx.sampleRate, N = Math.round(sr / freq), len = Math.floor(sr * 2.4);
        const buffer = ctx.createBuffer(1, len, sr), d = buffer.getChannelData(0);
        for (let i = 0; i < N; i++) d[i] = Math.random() * 2 - 1;
        const rho = 10 ** ((-3 * (N / sr)) / 3.2);
        for (let i = N; i < len; i++) d[i] = rho * 0.5 * (d[i - N] + d[i - N + 1]);

        const src = ctx.createBufferSource(), env = ctx.createGain(), t = ctx.currentTime;
        src.buffer = buffer;
        src.playbackRate.value = freq / (sr / N); // afinação exata
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(0.5 * vel, t + 0.003);
        env.gain.linearRampToValueAtTime(0, t + 2.2);
        src.connect(env).connect(pre);
        src.start(t);
    };

    /* ---------- Vibração visual ---------- */
    const note = $('gtr-note');
    let raf = 0;

    const wave = (i, fx, amp, phase) => {
        const pts = range(21).map((k) => {
            const x = XB + ((fx - XB) * k) / 20;
            return `${k ? 'L' : 'M'}${x.toFixed(1)} ${(stringY(i, x) + amp * Math.sin((Math.PI * k) / 20) * Math.cos(phase)).toFixed(1)}`;
        });
        return `${pts.join(' ')} L${XN} ${stringY(i, XN)}`;
    };

    const tick = (now) => {
        let any = false;
        strs.forEach((s, i) => {
            if (!s.on) return;
            const dt = Math.max(0, now - s.t0), amp = s.amp0 * Math.exp(-dt / s.tau);
            s.on = amp >= 0.12;
            any = any || s.on;
            s.path.setAttribute('d', s.on ? wave(i, s.fx, amp, dt * 0.055) : straight(i));
            s.path.classList.toggle('is-vibrating', s.on);
            s.finger.style.opacity = s.on && s.fret ? Math.min(1, amp / (s.amp0 * 0.35)) : 0;
        });
        raf = any ? requestAnimationFrame(tick) : 0;
    };

    /* ---------- Tocar ---------- */
    const pluck = (i, fretNum = 0, vel = 1) => {
        const midi = OPEN[i] + fretNum, s = strs[i];
        if (ctx) playTone(440 * 2 ** ((midi - 69) / 12), vel);
        Object.assign(s, { on: true, fret: fretNum, fx: fretNum ? fretX(fretNum) : XN, t0: performance.now(), amp0: (7.5 - i * 0.5) * (0.55 + 0.45 * vel), tau: 1000 - i * 60 });
        if (fretNum) {
            const x = fretX(fretNum) + (fretX(fretNum - 1) - fretX(fretNum)) * 0.3;
            s.finger.setAttribute('cx', x);
            s.finger.setAttribute('cy', stringY(i, x));
        }
        note.textContent = `${NOTES[midi % 12]}${Math.floor(midi / 12) - 1} // ${6 - i}ª CORDA // CASA ${fretNum}`;
        raf = raf || requestAnimationFrame(tick);
    };

    /* ---------- Ponteiro: clique no braço / arrastar pelas cordas ---------- */
    const pt = svg.createSVGPoint();
    const toSvg = (e) => Object.assign(pt, { x: e.clientX, y: e.clientY }).matrixTransform(svg.getScreenCTM().inverse());
    const fretAt = (x) => (x < BOARD_X - 6 || x >= XN ? 0 : range(FRETS).map((n) => n + 1).find((n) => x >= fretX(n)) || FRETS);

    const nearest = (p) => {
        const dist = range(6).map((i) => Math.abs(p.y - stringY(i, p.x)));
        const i = dist.indexOf(Math.min(...dist));
        return p.x > XB - 6 && p.x < XN + 4 && dist[i] <= (p.x >= BOARD_X ? 16 : 8) ? i : -1;
    };

    let last = null;
    svg.addEventListener('pointerdown', (e) => {
        initAudio();
        svg.focus({ preventScroll: true });
        svg.setPointerCapture(e.pointerId);
        last = toSvg(e);
        const i = nearest(last);
        if (i >= 0) pluck(i, fretAt(last.x));
    });

    svg.addEventListener('pointermove', (e) => {
        if (!last) return;
        const p = toSvg(e), vel = clamp(0.5 + Math.hypot(p.x - last.x, p.y - last.y) / 50, 0.5, 1);
        if (p.x >= XB && p.x <= XN) {
            range(6).filter((i) => (last.y - stringY(i, p.x)) * (p.y - stringY(i, p.x)) < 0)
                .forEach((i, k) => setTimeout(() => pluck(i, fretAt(p.x), vel), k * 14));
        }
        last = p;
    });
    ['pointerup', 'pointercancel'].forEach((type) => svg.addEventListener(type, () => (last = null)));

    /* ---------- Timbre e teclado ---------- */
    document.querySelectorAll('.gtr-chip').forEach((btn) => btn.addEventListener('click', () => {
        mode = btn.dataset.mode;
        document.querySelectorAll('.gtr-chip').forEach((b) => b.classList.toggle('is-active', b === btn));
        applyMode();
    }));

    svg.addEventListener('keydown', (e) => {
        if (!/^[1-6]$/.test(e.key)) return;
        initAudio();
        pluck(6 - Number(e.key)); // 1 = corda mais fina
    });
})();
