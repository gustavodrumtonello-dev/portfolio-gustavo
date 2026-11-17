// Portfolio interactions
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
    if (dot && reticle) {
        let mouseX = innerWidth / 2;
        let mouseY = innerHeight / 2;
        let ringX = mouseX;
        let ringY = mouseY;

        addEventListener('mousemove', (event) => {
            mouseX = event.clientX;
            mouseY = event.clientY;
            dot.style.left = `${mouseX}px`;
            dot.style.top = `${mouseY}px`;
        });

        const animateCursor = () => {
            ringX += (mouseX - ringX) * 0.22;
            ringY += (mouseY - ringY) * 0.22;
            reticle.style.left = `${ringX}px`;
            reticle.style.top = `${ringY}px`;
            requestAnimationFrame(animateCursor);
        };
        animateCursor();

        $$('a, button, input, textarea, article').forEach((element) => {
            element.addEventListener('mouseenter', () => document.body.classList.add('cursor-active'));
            element.addEventListener('mouseleave', () => document.body.classList.remove('cursor-active'));
        });
    }

    // Floating particles
    const canvas = $('#metal-canvas');
    if (canvas) {
        const context = canvas.getContext('2d');
        let width = canvas.width = innerWidth;
        let height = canvas.height = innerHeight;
        const particles = Array.from({ length: 45 }, () => ({
            x: Math.random() * width, y: Math.random() * height,
            size: Math.random() * 2 + .5, speed: Math.random() * .6 + .2,
            drift: (Math.random() - .5) * .3,
            color: Math.random() > .4 ? '#FFD026' : '#FFF',
            opacity: Math.random() * .7 + .3
        }));

        addEventListener('resize', () => {
            width = canvas.width = innerWidth;
            height = canvas.height = innerHeight;
        });

        const drawParticles = () => {
            context.clearRect(0, 0, width, height);
            particles.forEach((particle) => {
                context.globalAlpha = particle.opacity;
                context.fillStyle = particle.color;
                context.beginPath();
                context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                context.fill();
                particle.y -= particle.speed;
                particle.x += particle.drift;
                if (particle.y < 0) {
                    particle.y = height;
                    particle.x = Math.random() * width;
                }
            });
            requestAnimationFrame(drawParticles);
        };
        drawParticles();
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
        }, { threshold: .12, rootMargin: '0px 0px -45px' });
        reveal.forEach((element, index) => {
            element.style.transitionDelay = `${Math.min(index * 45, 240)}ms`;
            observer.observe(element);
        });
    } else {
        reveal.forEach((element) => element.classList.add('is-visible'));
    }
});
