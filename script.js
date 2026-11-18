// Portfolio interactions - Heavy Metal Architecture
window.addEventListener('DOMContentLoaded', () => {
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

    // Accordion
    function toggleAccordion(button) {
        const item = button.closest('.accordion-item');
        $$('.accordion-item').forEach((element) => {
            if (element !== item) element.classList.remove('active');
        });
        item.classList.toggle('active');
    }

    $$('.accordion-header').forEach((button) => {
        button.addEventListener('click', () => toggleAccordion(button));
    });

    // Custom cursor
    const dot = $('#metal-cursor-dot');
    const reticle = $('#metal-cursor-reticle');
    const guitar = $('#hero-guitar');
    let mouseX = innerWidth / 2;
    let mouseY = innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let lastMouseX = mouseX;
    let lastMouseY = mouseY;
    let mouseDistAccum = 0;
    let targetGuitarTiltX = 0;
    let targetGuitarTiltY = 0;
    let currentGuitarTiltX = 0;
    let currentGuitarTiltY = 0;

    if (dot && reticle) {
        addEventListener('mousemove', (event) => {
            mouseX = event.clientX;
            mouseY = event.clientY;
            dot.style.left = `${mouseX}px`;
            dot.style.top = `${mouseY}px`;

            // Accumulate distance for mouse lightning sparks
            const dx = mouseX - lastMouseX;
            const dy = mouseY - lastMouseY;
            mouseDistAccum += Math.hypot(dx, dy);
            lastMouseX = mouseX;
            lastMouseY = mouseY;

            if (mouseDistAccum > 35) {
                spawnMouseLightning(mouseX, mouseY);
                mouseDistAccum = 0;
            }

            // 3D Guitar perspective tilt
            if (guitar) {
                const normX = (mouseX / innerWidth) - 0.5;
                const normY = (mouseY / innerHeight) - 0.5;
                targetGuitarTiltX = -normY * 18;
                targetGuitarTiltY = normX * 22;
            }
        });

        const animateCursor = () => {
            ringX += (mouseX - ringX) * 0.22;
            ringY += (mouseY - ringY) * 0.22;
            reticle.style.left = `${ringX}px`;
            reticle.style.top = `${ringY}px`;

            if (guitar) {
                currentGuitarTiltX += (targetGuitarTiltX - currentGuitarTiltX) * 0.08;
                currentGuitarTiltY += (targetGuitarTiltY - currentGuitarTiltY) * 0.08;
                guitar.style.transform = `rotate(-25deg) rotateX(${currentGuitarTiltX.toFixed(2)}deg) rotateY(${currentGuitarTiltY.toFixed(2)}deg) translateZ(35px)`;
            }

            requestAnimationFrame(animateCursor);
        };
        animateCursor();

        $$('a, button, input, textarea, article').forEach((element) => {
            element.addEventListener('mouseenter', () => document.body.classList.add('cursor-active'));
            element.addEventListener('mouseleave', () => document.body.classList.remove('cursor-active'));
        });
    }

    // Canvas: Floating Particles & Lightning Engine
    const canvas = $('#metal-canvas');
    let spawnMouseLightning = () => {};

    if (canvas) {
        const context = canvas.getContext('2d');
        let width = canvas.width = innerWidth;
        let height = canvas.height = innerHeight;

        // Particles
        const particles = Array.from({ length: 45 }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 2 + 0.5,
            speed: Math.random() * 0.6 + 0.2,
            drift: (Math.random() - 0.5) * 0.3,
            color: Math.random() > 0.4 ? '#FFD026' : '#FFFFFF',
            opacity: Math.random() * 0.7 + 0.3
        }));

        // Lightning state
        const bolts = [];
        let flashAlpha = 0;

        function createLightningSegments(x1, y1, x2, y2, maxDepth = 5, jitter = 0.45) {
            const segments = [];
            function subdivide(ax, ay, bx, by, depth) {
                const dist = Math.hypot(bx - ax, by - ay);
                if (dist < 12 || depth >= maxDepth) {
                    segments.push({ x1: ax, y1: ay, x2: bx, y2: by });
                    return;
                }
                const midX = (ax + bx) / 2 + (Math.random() - 0.5) * dist * jitter;
                const midY = (ay + by) / 2 + (Math.random() - 0.5) * dist * jitter;
                subdivide(ax, ay, midX, midY, depth + 1);
                subdivide(midX, midY, bx, by, depth + 1);

                // Occasional branched fork
                if (depth < 3 && Math.random() < 0.4) {
                    const angle = Math.atan2(by - ay, bx - ax) + (Math.random() - 0.5) * 0.9;
                    const branchLength = dist * 0.45;
                    const fx = midX + Math.cos(angle) * branchLength;
                    const fy = midY + Math.sin(angle) * branchLength;
                    subdivide(midX, midY, fx, fy, depth + 2);
                }
            }
            subdivide(x1, y1, x2, y2, 0);
            return segments;
        }

        function triggerBackgroundLightning() {
            const startX = Math.random() * (width * 0.8) + (width * 0.1);
            const startY = 0;
            const endX = startX + (Math.random() - 0.5) * (width * 0.5);
            const endY = height * (0.65 + Math.random() * 0.35);

            bolts.push({
                segments: createLightningSegments(startX, startY, endX, endY, 6, 0.4),
                alpha: 1.0,
                decay: 0.055,
                width: 2.5,
                glowColor: '#FFD026'
            });

            // Ambient background flash
            flashAlpha = Math.random() * 0.22 + 0.12;

            // 40% chance of double-strike aftershock
            if (Math.random() < 0.4) {
                setTimeout(() => {
                    bolts.push({
                        segments: createLightningSegments(startX + 20, startY, endX + 15, endY, 5, 0.35),
                        alpha: 0.9,
                        decay: 0.065,
                        width: 1.8,
                        glowColor: '#FFF176'
                    });
                    flashAlpha = Math.max(flashAlpha, 0.18);
                }, 90);
            }
        }

        spawnMouseLightning = (mx, my) => {
            const angle = Math.random() * Math.PI * 2;
            const length = Math.random() * 70 + 40;
            const targetX = mx + Math.cos(angle) * length;
            const targetY = my + Math.sin(angle) * length;

            bolts.push({
                segments: createLightningSegments(mx, my, targetX, targetY, 4, 0.5),
                alpha: 1.0,
                decay: 0.12,
                width: 1.5,
                glowColor: Math.random() > 0.5 ? '#FFD026' : '#E0F7FF'
            });

            // Subtle local spark flash
            if (flashAlpha < 0.08) flashAlpha = 0.06;
        };

        // Click to unleash full lightning burst
        addEventListener('click', (e) => {
            for (let i = 0; i < 3; i++) {
                const angle = (Math.PI * 2 / 3) * i + (Math.random() - 0.5) * 0.5;
                const len = Math.random() * 120 + 70;
                bolts.push({
                    segments: createLightningSegments(e.clientX, e.clientY, e.clientX + Math.cos(angle) * len, e.clientY + Math.sin(angle) * len, 4, 0.45),
                    alpha: 1.0,
                    decay: 0.09,
                    width: 2.0,
                    glowColor: '#FFD026'
                });
            }
            flashAlpha = 0.2;
        });

        // Periodic background lightning scheduler
        function scheduleNextLightning() {
            const delay = Math.random() * 3200 + 2800; // between 2.8s and 6.0s
            setTimeout(() => {
                triggerBackgroundLightning();
                scheduleNextLightning();
            }, delay);
        }
        scheduleNextLightning();

        addEventListener('resize', () => {
            width = canvas.width = innerWidth;
            height = canvas.height = innerHeight;
        });

        const renderFrame = () => {
            context.clearRect(0, 0, width, height);

            // 1. Screen flash effect
            if (flashAlpha > 0.005) {
                context.fillStyle = `rgba(255, 230, 160, ${flashAlpha})`;
                context.fillRect(0, 0, width, height);
                flashAlpha *= 0.88; // rapid smooth exponential decay
            } else {
                flashAlpha = 0;
            }

            // 2. Floating particles
            particles.forEach((p) => {
                context.globalAlpha = p.opacity;
                context.fillStyle = p.color;
                context.beginPath();
                context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                context.fill();

                p.y -= p.speed;
                p.x += p.drift;
                if (p.y < 0) {
                    p.y = height;
                    p.x = Math.random() * width;
                }
            });

            // 3. Lightning bolts
            for (let i = bolts.length - 1; i >= 0; i--) {
                const bolt = bolts[i];
                context.save();

                // Outer electric glow pass
                context.strokeStyle = bolt.glowColor;
                context.lineWidth = bolt.width * 2.2;
                context.globalAlpha = bolt.alpha * 0.55;
                context.shadowBlur = 18;
                context.shadowColor = bolt.glowColor;
                context.beginPath();
                bolt.segments.forEach((seg) => {
                    context.moveTo(seg.x1, seg.y1);
                    context.lineTo(seg.x2, seg.y2);
                });
                context.stroke();

                // Core brilliant electric beam pass
                context.strokeStyle = '#FFFFFF';
                context.lineWidth = bolt.width;
                context.globalAlpha = bolt.alpha;
                context.shadowBlur = 8;
                context.shadowColor = '#FFFFFF';
                context.beginPath();
                bolt.segments.forEach((seg) => {
                    context.moveTo(seg.x1, seg.y1);
                    context.lineTo(seg.x2, seg.y2);
                });
                context.stroke();

                context.restore();

                bolt.alpha -= bolt.decay;
                if (bolt.alpha <= 0) {
                    bolts.splice(i, 1);
                }
            }

            context.globalAlpha = 1;
            requestAnimationFrame(renderFrame);
        };
        renderFrame();
    }

    // Contact form
    const form = $('#contact-form');
    if (form) form.addEventListener('submit', (event) => {
        event.preventDefault();
        alert('Mensagem enviada com sucesso para Gustavo!');
    });

    // Reveal elements on scroll
    const reveal = $$('[data-reveal]');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        reveal.forEach((element) => element.classList.add('is-visible'));
    } else if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -45px' });
        reveal.forEach((element, index) => {
            element.style.transitionDelay = `${Math.min(index * 45, 240)}ms`;
            observer.observe(element);
        });
    } else {
        reveal.forEach((element) => element.classList.add('is-visible'));
    }
});
