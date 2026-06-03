// ui2.js — scroll-reveal for principles and contact sections

document.addEventListener('DOMContentLoaded', () => {

    function typewriter(el, opts = {}) {
        const text = opts.text ?? el.textContent.trim();
        const typeSpeed = opts.typeSpeed ?? 45;
        const delSpeed = opts.delSpeed ?? 25;
        const typoPause = opts.typoPause ?? 380;
        const typoMin = opts.typoMin ?? 2;
        const typoMax = opts.typoMax ?? 4;
        const threshold = opts.threshold ?? 0.5;
        const cursorEl = opts.cursorEl ?? el;
        const onComplete = opts.onComplete ?? null;
        const onReset = opts.onReset ?? null;

        el.textContent = '';

        function buildSeq() {
            const CHARS = 'abcdefghijklmnopqrstuvwxyz';
            const len = typoMin + Math.floor(Math.random() * (typoMax - typoMin + 1));
            const typo = Array.from({ length: len }, () =>
                CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
            const pos = 2 + Math.floor(Math.random() * (Math.floor(text.length / 2) - 2));
            const steps = [];
            for (let i = 0; i < pos; i++)            steps.push({ t: 'a', ch: text[i], d: typeSpeed });
            for (const ch of typo) steps.push({ t: 'a', ch, d: typeSpeed });
            steps.push({ t: 'p', d: typoPause });
            for (let i = 0; i < typo.length; i++)    steps.push({ t: 'd', d: delSpeed });
            for (let i = pos; i < text.length; i++)  steps.push({ t: 'a', ch: text[i], d: typeSpeed });
            return steps;
        }

        let display = '', seq = [], idx = 0, timer = null, fwd = false;

        function tick() {
            if (fwd) {
                if (idx >= seq.length) {
                    cursorEl.classList.remove('typing');
                    onComplete?.();
                    timer = null; return;
                }
                const s = seq[idx++];
                if (s.t === 'a') display += s.ch;
                else if (s.t === 'd') display = display.slice(0, -1);
                el.textContent = display;
                timer = setTimeout(tick, s.d);
            } else {
                onReset?.();
                if (!display.length) {
                    cursorEl.classList.remove('typing');
                    timer = null; return;
                }
                display = display.slice(0, -1);
                el.textContent = display;
                timer = setTimeout(tick, delSpeed);
            }
        }

        new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (timer) { clearTimeout(timer); timer = null; }
                fwd = e.isIntersecting;
                if (fwd) { display = ''; el.textContent = ''; seq = buildSeq(); idx = 0; }
                cursorEl.classList.add('typing');
                timer = setTimeout(tick, 0);
            });
        }, { threshold }).observe(el);
    }

    // BTS frame scrub — holds first frame until pinned, scrubs while pinned, holds last frame after.
    // Tweak: scroll distance (in vh) over which all frames scrub while the section is pinned
    const BTS_SCRUB_VH = 2.5;

    const btsFrame = document.getElementById('btsFrame');
    const btsProgress = document.getElementById('btsProgress');
    const btsProgressText = document.getElementById('btsProgressText');
    const btsProgressNote = document.getElementById('btsProgressNote');
    const workflowsSection = document.querySelector('.workflows-section');

    if (btsFrame && workflowsSection) {
        BTS_FRAMES.forEach(src => { const img = new Image(); img.src = src; });

        function setBtsHeight() {
            workflowsSection.style.height = (BTS_SCRUB_VH + 1) * window.innerHeight + 'px';
        }

        let btsCurrent = -1;

        function updateBtsFrame() {
            const rect = workflowsSection.getBoundingClientRect();
            const imgRect = btsFrame.getBoundingClientRect();
            const vh = window.innerHeight;
            const centering = Math.max(0, (vh - imgRect.height) / 2);
            // When image fits viewport: scrub while fully visible.
            // When image fills/exceeds viewport: fall back to section-pin trigger.
            const scrubbing = centering > 0
                ? imgRect.top >= 0 && imgRect.bottom <= vh
                : rect.top <= 0 && rect.bottom >= vh;

            let idx;
            if (scrubbing) {
                const t = Math.max(0, Math.min(1,
                    (-rect.top + centering) / (rect.height - vh + 2 * centering)
                ));
                idx = Math.min(Math.floor(t * BTS_FRAMES.length), BTS_FRAMES.length - 1);
            } else if (rect.bottom < vh) {
                idx = BTS_FRAMES.length - 1; // section scrolled past
            } else {
                idx = 0; // section not yet reached
            }

            if (idx !== btsCurrent) {
                btsCurrent = idx;
                btsFrame.src = BTS_FRAMES[idx];
            }

            if (btsProgress) {
                btsProgress.classList.toggle('visible', scrubbing);
                if (btsProgressNote) btsProgressNote.style.opacity = scrubbing ? '0.5' : '0';
                if (scrubbing) btsProgressText.textContent = `${idx + 1} / ${BTS_FRAMES.length}`;
            }
        }

        setBtsHeight();
        window.addEventListener('scroll', updateBtsFrame, { passive: true });
        window.addEventListener('resize', () => { setBtsHeight(); updateBtsFrame(); });
        updateBtsFrame();
    }

    // Typewriter: contact link tail + emoji
    const contactLink = document.querySelector('.contact-link');
    const contactTail = document.querySelector('.contact-link-tail');
    const contactEmoji = document.querySelector('.contact-emoji');
    if (contactLink && contactTail) {
        typewriter(contactTail, {
            text: '@claybrain.studio',
            cursorEl: contactLink,
            onComplete: () => { contactEmoji.style.opacity = '1'; },
            onReset: () => { contactEmoji.style.opacity = '0'; },
        });
    }

    // Typewriter: principle headlines
    document.querySelectorAll('.principle-text h3').forEach(h3 => {
        typewriter(h3, { threshold: 0.3 });
    });

    const craftEl = document.querySelector('.tagline-craft');
    if (craftEl) {
        craftEl.innerHTML = [...craftEl.textContent].map(ch => {
            const offset = (Math.random() * 12 - 6).toFixed(1);
            return `<span style="display:inline-block;transform:translateY(${offset}px)">${ch}</span>`;
        }).join('');
    }

    const creditsToggle = document.getElementById('creditsToggle');
    const creditsSection = document.getElementById('creditsSection');
    if (creditsToggle && creditsSection) {
        creditsToggle.addEventListener('click', () => {
            const isHidden = creditsSection.hidden;
            creditsSection.hidden = !isHidden;
            creditsToggle.setAttribute('aria-expanded', String(isHidden));
            if (isHidden) {
                requestAnimationFrame(() => creditsSection.scrollIntoView({ behavior: 'smooth', block: 'end' }));
            }
        });
    }

    const revealEls = document.querySelectorAll('[data-principle]');
    const revealObs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) e.target.classList.add('visible');
        });
    }, { threshold: 0.15 });
    revealEls.forEach(el => revealObs.observe(el));

});
