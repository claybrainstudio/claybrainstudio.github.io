// animation.js — frame scrub, logo collapse, and pin parallax

// Tweak: scroll-px over which the logo collapses (as fraction of viewport height)
const LOGO_COLLAPSE_VH = 0.60;
// Tweak: scroll delay before logo collapse begins (vh)
const LOGO_COLLAPSE_DELAY_VH = 10;

// Tweak: logo + tagline start scrolling out when about section top crosses this vh (0 = top, 1 = bottom)
const SCROLL_ATTACH_VH = 0.5;
const TAGLINE_BOTTOM_ATTACH_VH = 0.6;

// Tweak: vh of attachment travel before the bottom divider is fully visible
const DIVIDER_FADE_VH = 0.5;

// Tweak: opacity the frame image fades to when the about section scrolls into view (0–1)
const FRAME_FADE_OPACITY = 0.44;

// Tweak: scroll distance over which the frame fade happens (vh)
const FRAME_FADE_SCROLL_VH = 0.35;

// Tweak: fraction of scroll distance at which the frame fade begins (0–1)
const FRAME_FADE_START = 0.60;

// Tweak: scroll-px over which the frame image rises from bottom-aligned to centered (as fraction of viewport height)
const FRAME_ENTER_VH = 0.32;

// Tweak: number of intro frames (0 to INTRO_FRAME_COUNT-1) that play once during the scroll-in
const INTRO_FRAME_COUNT = 16;
// Tweak: scroll distance over which all intro frames play (as fraction of viewport height)
const INTRO_SCROLL_VH = 1.0;
// Tweak: number of loop frames (INTRO_FRAME_COUNT to INTRO_FRAME_COUNT+LOOP_FRAME_COUNT-1) that cycle after intro
const LOOP_FRAME_COUNT = 10;
// Tweak: scroll distance per loop cycle (as fraction of viewport height)
const LOOP_CYCLE_VH = 0.8;

// Tweak: vertical offset of the frame image initial position as a fraction of viewport height (positive = down)
const FRAME_INITIAL_OFFSET_VH = 0.10;

// Tweak: initial logo height (vh)
const LOGO_INITIAL_VH = 45;
// Tweak: offset from the top of the screen to the top of the logo area (vh)
const LOGO_INITIAL_OFFSET_VH = 5;
// Tweak: minimum logo height after scale-down (vh) — logo stops here, then follows scroll
const LOGO_MIN_VH = 30;
// Tweak: lerp speed for the tagline snap jump (0–1, higher = faster)
const TAGLINE_SNAP_SPEED = 0.18;
// Tweak: gap (vh) between bottom of logo and top of snapped tagline (negative = overlap)
const TAGLINE_SNAP_GAP_VH = -10;
// Tweak: gap (vh) between the top of the screen and the top edge of the logo area at full collapse
const LOGO_COLLAPSE_TARGET_VH = 0;

// Tweak: lead distance (vh) so logo+tagline start moving before the pin badge covers them
const PIN_LEAD_VH = 0.2;

// Tweak: viewport fraction at which the fixed layer detaches and scrolls with the page (0 = top, 1 = bottom)
const CONTACT_RELEASE_VH = 1;

// Tweak: scroll distance in px for one full symbol animation loop
const SYMBOL_SCRUB_PX = 300;

const frameImage       = document.getElementById('frameImage');
const frameArea        = document.querySelector('.frame-area');
const loadingOverlay   = document.getElementById('loadingOverlay');
const loadingBarFill   = document.getElementById('loadingBarFill');
const logoArea         = document.getElementById('logoArea');
const scrollHint       = document.getElementById('scrollHint');
const taglineAreaBottom = document.getElementById('taglineAreaBottom');
const taglinePBottom   = taglineAreaBottom.querySelector('p');
const taglineBg        = document.getElementById('taglineBg');
const taglineDivider   = document.getElementById('taglineDivider');
const aboutTracker     = document.getElementById('aboutTracker');
const principlesTracker = document.getElementById('principlesTracker');
const aboutSection     = document.getElementById('aboutSection');
const principlesSection = document.getElementById('principlesSection');
const contactSection   = document.getElementById('contactSection');
const fixedLayer       = document.getElementById('fixedLayer');
const aboutContent     = document.getElementById('aboutContent');
const pinFloating      = document.getElementById('pinFloating');
const pinFrame         = document.getElementById('pinFrame');
const pinSlot          = document.getElementById('pinSlot');

const PIN_IMG_H = 266;
let pinSlotPageTop = 0;
let pinSlotCenterX = 0;
let pinSlotHeight = 0;

function measureSlot() {
    const r = pinSlot.getBoundingClientRect();
    pinSlotPageTop = r.top + window.scrollY;
    pinSlotCenterX = r.left + r.width / 2;
    pinSlotHeight = r.height;
}

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

let smoothY = 0;
let targetY = 0;
let animating = false;
let taglineBottomVisible = false;
let taglineSnapOffset = 0;
let taglineSnapTarget = 0;
let taglineBgAlpha = 1;

function startAnimation(frames) {
    let currentFrame = 0;
    let currentSymbolFrame = 0;

    function smoothUpdate() {
        smoothY += (targetY - smoothY) * 0.15;
        if (Math.abs(smoothY - targetY) < 0.5) smoothY = targetY;

        const y = smoothY;
        const vh = window.innerHeight;
        const LOGO_COLLAPSE_PX = vh * LOGO_COLLAPSE_VH;

        // Shared: section offsets used across phases ──────────────────────
        const contentRect = aboutSection.getBoundingClientRect();
        const aboutTop = contentRect.top;
        const topOffset = Math.min(0, aboutTop - vh * SCROLL_ATTACH_VH - PIN_LEAD_VH * vh);
        const bottomOffset = Math.min(0, aboutTop - vh * TAGLINE_BOTTOM_ATTACH_VH);

        // ── PHASE 1: Logo scales down, frames scrub to final frame ────────

        // P1: Logo collapse (height + vertical drift + scroll-out)
        const logoDelayPx = LOGO_COLLAPSE_DELAY_VH / 100 * vh;
        const logoT = clamp((y - logoDelayPx) / LOGO_COLLAPSE_PX, 0, 1);
        const logoEased = 1 - Math.pow(1 - logoT, 3); // cubic ease-out
        logoArea.style.height = lerp(LOGO_INITIAL_VH, LOGO_MIN_VH, logoEased) + 'vh';
        const logoInitialOffsetPx = LOGO_INITIAL_OFFSET_VH / 100 * vh;
        const logoCollapseY = lerp(logoInitialOffsetPx, LOGO_COLLAPSE_TARGET_VH / 100 * vh, logoEased);
        logoArea.style.transform = `translateY(${logoCollapseY + topOffset}px)`;

        // P1: Frame scrub — intro plays once, loop frames cycle with scroll
        const introScrollPx = INTRO_SCROLL_VH * vh;
        const introProgress = clamp(y / introScrollPx, 0, 1);
        let idx;
        if (introProgress < 1) {
            idx = clamp(Math.floor(introProgress * INTRO_FRAME_COUNT), 0, INTRO_FRAME_COUNT - 1);
        } else {
            const loopScroll = y - introScrollPx;
            const loopProgress = (loopScroll / (vh * LOOP_CYCLE_VH)) % 1;
            idx = INTRO_FRAME_COUNT + Math.floor(loopProgress * LOOP_FRAME_COUNT);
        }
        if (idx !== currentFrame) {
            currentFrame = idx;
            frameImage.src = frames[idx];
        }

        // P1: Frame area rises from bottom-aligned to viewport-centered
        const frameEnterPx = vh * FRAME_ENTER_VH;
        const frameEnterT = clamp(1 - y / frameEnterPx, 0, 1);
        const imgH = frameArea.offsetHeight;
        const lockedTop = (vh - imgH) / 2;
        const initialTop = (vh - imgH) / 2 + vh * FRAME_INITIAL_OFFSET_VH;
        frameArea.style.top = lerp(lockedTop, initialTop, frameEnterT) + 'px';

        // P1: Frame fade (starts partway through scrub)
        const fadeStart = introScrollPx * FRAME_FADE_START;
        const fadeT = clamp((y - fadeStart) / (FRAME_FADE_SCROLL_VH * vh), 0, 1);
        frameImage.style.opacity = lerp(1, FRAME_FADE_OPACITY, fadeT);

        // P1: Scroll hint fades out immediately on scroll
        scrollHint.style.opacity = Math.max(0, 1 - y / 60);

        // ── PHASE 2: Tagline snaps under logo, about section scrolls in ───

        // P2: Tagline fade-in (tied to logo collapse progress)
        taglineAreaBottom.style.opacity = logoT;
        if (logoT > 0 && !taglineBottomVisible) {
            taglineBottomVisible = true;
            taglinePBottom.classList.remove('rising');
            void taglinePBottom.offsetWidth;
            taglinePBottom.classList.add('rising');
        } else if (logoT === 0 && taglineBottomVisible) {
            taglineBottomVisible = false;
            taglinePBottom.classList.remove('rising');
        }

        // P2: Tagline snaps up under the logo, then follows logo out of view
        taglineSnapTarget = aboutTop < vh ? (LOGO_MIN_VH + TAGLINE_SNAP_GAP_VH) / 100 * vh - vh + taglineAreaBottom.offsetHeight : 0;
        taglineSnapOffset += (taglineSnapTarget - taglineSnapOffset) * TAGLINE_SNAP_SPEED;
        if (Math.abs(taglineSnapOffset - taglineSnapTarget) < 0.5) taglineSnapOffset = taglineSnapTarget;
        taglineAreaBottom.style.transform = `translateY(${taglineSnapOffset + topOffset}px)`;
        taglineDivider.style.transform = `translateY(${bottomOffset}px)`;
        taglineDivider.style.opacity = Math.min(1, -topOffset / (DIVIDER_FADE_VH * vh));

        // P2: About tracker overlay (mirrors about section bounding rect)
        aboutTracker.style.top = contentRect.top + 'px';
        aboutTracker.style.height = contentRect.height + 'px';

        // P2: Tagline background fades out during snap travel, then as about section fills screen
        const snapBgTarget = Math.abs(taglineSnapTarget) > 1 ? 0.7 : 1;
        taglineBgAlpha += (snapBgTarget - taglineBgAlpha) * TAGLINE_SNAP_SPEED;
        const bgOpacity = Math.max(0, Math.min(1, taglineBgAlpha * (1 + bottomOffset / (vh * 0.375))));
        taglineBg.style.setProperty('--tagline-bg-alpha', bgOpacity);

        // P2: Symbol animation scrub (loops continuously with scroll)
        const symbolIdx = Math.floor(y / SYMBOL_SCRUB_PX * SYMBOL_FRAMES.length) % SYMBOL_FRAMES.length;
        if (symbolIdx !== currentSymbolFrame) {
            currentSymbolFrame = symbolIdx;
            if (pinFrame) pinFrame.src = SYMBOL_FRAMES[symbolIdx];
        }

        // P2: Pin badge parallaxes into its slot in the about section
        const slotCenterVP = pinSlotPageTop + (pinSlotHeight - PIN_IMG_H) / 2 - y - 50;
        const aboutTopPage = pinSlotPageTop - 80;
        const aboutEnterScroll = aboutTopPage - vh;
        const pinTravelRange = vh * 0.35;
        const pinStartScroll = aboutEnterScroll - pinTravelRange * 0.5;
        const pinEndScroll = pinStartScroll + pinTravelRange;
        const pinT = clamp((y - pinStartScroll) / (pinEndScroll - pinStartScroll), 0, 1);
        const pinEased = 1 - Math.pow(1 - pinT, 3);
        const pinY = pinT >= 1
            ? slotCenterVP
            : lerp(vh + 200, slotCenterVP, pinEased);
        pinFloating.style.left = (pinSlotCenterX - pinFloating.offsetWidth / 2) + 'px';
        pinFloating.style.top = pinY + 'px';
        pinFloating.classList.toggle('visible', pinT > 0);
        if (pinT > 0.3) aboutContent.classList.add('visible');

        // ── PHASE 3: Principles section scrolls in ────────────────────────

        const principlesRect = principlesSection.getBoundingClientRect();
        principlesTracker.style.top = principlesRect.top + 'px';
        principlesTracker.style.height = principlesRect.height + 'px';

        // ── PHASE 4: Contact section — release fixed layer to scroll with page ──

        const contactRect = contactSection.getBoundingClientRect();
        if (contactRect.top <= vh * CONTACT_RELEASE_VH) {
            const releaseTop = (contactRect.top + window.scrollY) - vh * CONTACT_RELEASE_VH;
            fixedLayer.style.position = 'absolute';
            fixedLayer.style.top = releaseTop + 'px';
            fixedLayer.style.bottom = 'auto';
            fixedLayer.style.height = vh + 'px';
        } else {
            fixedLayer.style.position = 'fixed';
            fixedLayer.style.top = '0';
            fixedLayer.style.bottom = '0';
            fixedLayer.style.height = '';
        }

        if (Math.abs(smoothY - targetY) > 0.5 || Math.abs(taglineSnapOffset - taglineSnapTarget) > 0.5) {
            requestAnimationFrame(smoothUpdate);
        } else {
            animating = false;
        }
    }

    function onScroll() {
        targetY = window.scrollY;
        if (!animating) {
            animating = true;
            requestAnimationFrame(smoothUpdate);
        }
    }

    measureSlot();

    history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
        measureSlot();
        targetY = window.scrollY;
        smoothY = targetY;
        smoothUpdate();
    });
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            targetY = window.scrollY;
            smoothY = targetY;
            if (!animating) {
                animating = true;
                requestAnimationFrame(smoothUpdate);
            }
        }
    });

    smoothY = 0;
    targetY = 0;
    smoothUpdate();
}

function preloadFrames(frames, onProgress) {
    return new Promise((resolve) => {
        let done = 0;
        frames.forEach((src) => {
            const img = new Image();
            img.onload = img.onerror = () => {
                done++;
                onProgress(done / frames.length);
                if (done === frames.length) resolve();
            };
            img.src = src;
        });
    });
}

async function init() {
    frameImage.src = FRAMES[0];
    await preloadFrames(FRAMES, (progress) => {
        loadingBarFill.style.width = Math.round(progress * 100) + '%';
    });
    preloadFrames(SYMBOL_FRAMES, () => {});
    setTimeout(() => loadingOverlay.classList.add('hidden'), 200);
    startAnimation(FRAMES);
}

init();
