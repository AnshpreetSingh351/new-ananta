/* ═══════════════════════════════════════════════════════════════
   ANANTA STREET — Ultra-Smooth Scroll-Scrub Video Controller
   ─────────────────────────────────────────────────────────────
   Desktop: Scroll-to-scrub with smooth lerp + gate
   Mobile:  Swipe up → video plays fully → auto next section
   ═══════════════════════════════════════════════════════════════ */

// ── LOADER ──────────────────────────────────────────────────
(function () {
    const loader = document.getElementById('loader');
    if (!loader) return;
    setTimeout(() => {
        loader.classList.add('loader-exit');
        setTimeout(() => {
            loader.classList.add('loader-done');
            if (window._videoController) {
                window._videoController.onLoaderDone();
            }
        }, 1100);
    }, 2800);
})();

// ────────────────────────────────────────────────────────────

class VideoSectionController {
    constructor() {
        this.currentSection     = 0;
        this.totalVideoSections = 6;
        this.totalSections      = 7;
        this.isTransitioning    = false;
        this.cooldownTimer      = null;
        this.phase              = 'arrived';

        this.sections   = [];
        this.indicators = [];
        this.videos     = [];
        this.lastTouchY = 0;

        this.scrollAccum = [];
        this.targetTime  = [];
        this.renderTime  = [];

        this.SCROLL_TO_COMPLETE = 2800;
        this.LERP_FACTOR = 0.07;
        this._smoothedAccum = [];
        this._lastRAF = performance.now();

        // Scroll gate (desktop only)
        this._scrollGated = false;
        this._gateTimer   = null;

        // Mobile
        this._touchStartY = 0;

        this.init();
    }

    init() {
        this.sections   = Array.from(document.querySelectorAll('.video-section, .static-section'));
        this.indicators = Array.from(document.querySelectorAll('.indicator'));
        this.videos     = Array.from(document.querySelectorAll('.section-video'));

        for (let i = 0; i < this.totalVideoSections; i++) {
            this.scrollAccum.push(0);
            this.targetTime.push(0);
            this.renderTime.push(0);
            this._smoothedAccum.push(0);
        }

        // ── Load every video as a blob ───────────────────────
        this.videos.forEach((video, i) => {
            video.muted       = true;
            video.playsInline = true;
            video.preload     = 'auto';
            video.pause();

            const src = video.querySelector('source')?.getAttribute('src') || video.getAttribute('src');
            if (src) {
                fetch(src)
                    .then(r => {
                        if (!r.ok) throw new Error('fetch failed');
                        return r.blob();
                    })
                    .then(blob => {
                        video.src = URL.createObjectURL(blob);
                        video.load();
                    })
                    .catch(() => {
                        video.preload = 'auto';
                        video.load();
                    });
            }
        });

        // ── Master render loop ───────────────────────────────
        const tick = (now) => {
            requestAnimationFrame(tick);
            this._smoothSeek(now);
        };
        requestAnimationFrame(tick);

        // ── Events ───────────────────────────────────────────
        window.addEventListener('wheel',      this.handleWheel.bind(this),      { passive: false });
        window.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true  });
        window.addEventListener('touchmove',  this.handleTouchMove.bind(this),  { passive: false });
        window.addEventListener('touchend',   this.handleTouchEnd.bind(this),   { passive: false });
        window.addEventListener('keydown',    this.handleKeydown.bind(this));

        this.indicators.forEach((ind, i) => {
            ind.addEventListener('click', () => this.jumpToSection(i));
        });

        // ── Progress bars ────────────────────────────────────
        this.sections.forEach((sec, i) => {
            if (i < this.totalVideoSections) {
                const bar = document.createElement('div');
                bar.className = 'video-progress-bar';
                sec.appendChild(bar);
            }
        });
    }

    /* ─── SMOOTH SEEK (desktop scrub — RAF loop) ────────── */
    _smoothSeek(now) {
        const sec = this.currentSection;
        if (!this.isVideoSection(sec)) return;

        const video = this.videos[sec];
        if (!video || video.readyState < 2) return;

        const elapsed = now - this._lastRAF;
        this._lastRAF = now;
        const dt   = Math.min(elapsed / 16.667, 3);
        const lerp = 1 - Math.pow(1 - this.LERP_FACTOR, dt);

        const diff = this.targetTime[sec] - this.renderTime[sec];

        if (Math.abs(diff) > 0.001) {
            let step = diff * lerp;
            const maxStep = 0.08;
            if (Math.abs(step) > maxStep) {
                step = Math.sign(step) * maxStep;
            }
            this.renderTime[sec] += step;
            video.currentTime = this.renderTime[sec];
        }
    }

    onLoaderDone() {
        this.phase = 'arrived';
        this.updateScrollHint('Scroll to play');
    }

    isVideoSection(idx) { return idx < this.totalVideoSections; }

    updateScrollHint(text) {
        const hint = this.sections[this.currentSection]?.querySelector('.scroll-hint span');
        if (hint) hint.textContent = text;
    }

    setProgressBar(ratio) {
        const bar = this.sections[this.currentSection]?.querySelector('.video-progress-bar');
        if (!bar) return;
        if (ratio === null) {
            bar.style.opacity = '0';
            bar.style.width   = '0%';
        } else {
            bar.style.opacity = '1';
            bar.style.width   = (ratio * 100) + '%';
        }
    }

    _normDelta(e) {
        let dy = e.deltaY || 0;
        if (e.deltaMode === 1) dy *= 40;
        if (e.deltaMode === 2) dy *= window.innerHeight;
        return dy;
    }

    _isScrollGated() {
        if (!this._scrollGated) return false;
        clearTimeout(this._gateTimer);
        this._gateTimer = setTimeout(() => {
            this._scrollGated = false;
        }, 120);
        return true;
    }

    /* ═══════════════════════════════════════════════════════
       DESKTOP: WHEEL (scroll-to-scrub)
    ═══════════════════════════════════════════════════════ */
    handleWheel(e) {
        const isLast = this.currentSection === this.totalSections - 1;
        if (isLast) {
            const el = this.sections[this.currentSection];
            if (el.scrollTop === 0 && e.deltaY < 0 && !this.isTransitioning) {
                e.preventDefault();
                this.handleNavigate(-1, Math.abs(this._normDelta(e)));
            }
            return;
        }
        e.preventDefault();
        if (this.isTransitioning) return;
        const dy = this._normDelta(e);
        if (Math.abs(dy) < 5) return;
        if (this._isScrollGated()) return;
        this.handleNavigate(dy > 0 ? 1 : -1, Math.abs(dy));
    }

    /* ═══════════════════════════════════════════════════════
       MOBILE: TOUCH — same scrub behavior as desktop
       Swipe up = video scrubs forward
       Swipe down = video scrubs backward
       Video ends → stops, swipe again to go next section
    ═══════════════════════════════════════════════════════ */
    handleTouchStart(e) {
        this._touchStartY = e.touches[0].clientY;
        this.lastTouchY   = e.touches[0].clientY;
    }

    handleTouchMove(e) {
        const y    = e.touches[0].clientY;
        const diff = this.lastTouchY - y;  // positive = swipe up

        // Always track
        this.lastTouchY = y;

        // Last section — allow native scroll, but swipe down at top goes back
        const isLast = this.currentSection === this.totalSections - 1;
        if (isLast) return;

        e.preventDefault();
        if (this.isTransitioning) return;

        // Every 2px of finger movement = scrub
        if (Math.abs(diff) > 2) {
            const amount = Math.abs(diff) * 2.5;
            this.handleNavigate(diff > 0 ? 1 : -1, amount);
        }
    }

    handleTouchEnd(e) {
        const endY = e.changedTouches[0]?.clientY || this.lastTouchY;
        const diff = this._touchStartY - endY;

        // Last section — swipe down at top goes back
        const sec = this.currentSection;
        if (sec === this.totalSections - 1) {
            const el = this.sections[sec];
            if (diff < -40 && el.scrollTop <= 5 && !this.isTransitioning) {
                this.transitionToSection(sec - 1);
            }
        }
    }

    /* ═══════════════════════════════════════════════════════
       KEYBOARD
    ═══════════════════════════════════════════════════════ */
    handleKeydown(e) {
        if (this.isTransitioning) return;
        if (e.key === 'ArrowDown' || e.key === ' ') {
            e.preventDefault();
            this.handleNavigate(1, 80);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.handleNavigate(-1, 80);
        }
    }

    /* ═══════════════════════════════════════════════════════
       DESKTOP NAVIGATION (scroll-to-scrub)
    ═══════════════════════════════════════════════════════ */
    handleNavigate(delta, amount = 60) {
        const sec = this.currentSection;
        if (!this.isVideoSection(sec)) {
            this.transitionToSection(sec + delta);
            return;
        }

        if (delta > 0) {
            if (this.phase === 'arrived' || this.phase === 'scrubbing') {
                this.scrubForward(amount);
            } else {
                this.transitionToSection(sec + 1);
            }
        } else {
            if (this.phase === 'scrubbing') {
                this.scrubBackward(amount);
            } else if (this.phase === 'done') {
                this.scrollAccum[sec] = 0;
                this.targetTime[sec]  = 0;
                this.renderTime[sec]  = 0;
                this._smoothedAccum[sec] = 0;
                this.phase = 'arrived';
                this.sections[sec].classList.remove('video-playing');
                this.setProgressBar(null);
                this.updateScrollHint('Scroll to play');
            } else {
                this.transitionToSection(sec - 1);
            }
        }
    }

    scrubForward(amount) {
        const sec   = this.currentSection;
        const video = this.videos[sec];
        if (!video) return;

        this.sections[sec].classList.add('video-playing');
        this.phase = 'scrubbing';

        amount = Math.min(amount, 100);
        this._smoothedAccum[sec] = this._smoothedAccum[sec] * 0.3 + amount * 0.7;

        this.scrollAccum[sec] = Math.min(
            this.scrollAccum[sec] + this._smoothedAccum[sec],
            this.SCROLL_TO_COMPLETE
        );
        const progress = this.scrollAccum[sec] / this.SCROLL_TO_COMPLETE;

        this.targetTime[sec] = progress * (video.duration || 5);
        this.setProgressBar(progress);

        if (progress >= 1) {
            this.phase = 'done';
            this._scrollGated = true;
            setTimeout(() => this.setProgressBar(null), 600);
            this.updateScrollHint('Scroll to continue');
        } else {
            this.updateScrollHint('Keep scrolling…');
        }
    }

    scrubBackward(amount) {
        const sec   = this.currentSection;
        const video = this.videos[sec];
        if (!video) return;

        amount = Math.min(amount, 100);
        this._smoothedAccum[sec] = this._smoothedAccum[sec] * 0.3 + amount * 0.7;

        this.scrollAccum[sec] = Math.max(
            this.scrollAccum[sec] - this._smoothedAccum[sec],
            0
        );
        const progress = this.scrollAccum[sec] / this.SCROLL_TO_COMPLETE;

        this.targetTime[sec] = progress * (video.duration || 5);
        this.setProgressBar(progress);

        if (this.scrollAccum[sec] === 0) {
            this.phase = 'arrived';
            this.sections[sec].classList.remove('video-playing');
            this.setProgressBar(null);
            this.updateScrollHint('Scroll to play');
        }
    }

    /* ═══════════════════════════════════════════════════════
       SECTION TRANSITIONS
    ═══════════════════════════════════════════════════════ */
    transitionToSection(idx) {
        if (idx < 0 || idx >= this.totalSections) return;
        if (this.isTransitioning) return;

        this.isTransitioning = true;
        if (this.cooldownTimer) clearTimeout(this.cooldownTimer);

        // Cleanup outgoing
        if (this.isVideoSection(this.currentSection)) {
            const outVideo = this.videos[this.currentSection];
            if (outVideo) outVideo.pause();
            this.sections[this.currentSection].classList.remove('video-playing');
            this.sections[this.currentSection].classList.remove('video-paused');
            this.setProgressBar(null);
        }

        this.sections[this.currentSection].classList.remove('active');
        this.indicators[this.currentSection].classList.remove('active');

        if (this.currentSection === this.totalSections - 1) {
            this.sections[this.currentSection].scrollTop = 0;
        }

        // Activate incoming
        this.currentSection = idx;
        this.phase = 'arrived';

        this.sections[idx].classList.add('active');
        this.indicators[idx].classList.add('active');

        if (this.isVideoSection(idx)) {
            this.scrollAccum[idx] = 0;
            this.targetTime[idx]  = 0;
            this.renderTime[idx]  = 0;
            this._smoothedAccum[idx] = 0;
            if (this.videos[idx]) {
                this.videos[idx].pause();
                this.videos[idx].currentTime = 0;
            }
        }

        this.cooldownTimer = setTimeout(() => {
            this.isTransitioning = false;
            if (this.isVideoSection(idx)) this.updateScrollHint('Scroll to play');
        }, 900);
    }

    jumpToSection(idx) {
        if (idx === this.currentSection || this.isTransitioning) return;
        this.transitionToSection(idx);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window._videoController = new VideoSectionController();
});

/* ═══════════════════════════════════════════════════════════════
   ENQUIRY PANEL
   ═══════════════════════════════════════════════════════════════ */
(function () {
    const tab      = document.getElementById('enquiryTab');
    const panel    = document.getElementById('enquiryPanel');
    const backdrop = document.getElementById('enquiryBackdrop');
    const closeBtn = document.getElementById('enquiryClose');
    const form     = document.getElementById('enquiryForm');
    const success  = document.getElementById('efSuccess');

    function openPanel() {
        panel.classList.add('open');
        backdrop.classList.add('open');
        tab.classList.add('panel-open');
        document.body.style.overflow = 'hidden';
    }

    function closePanel() {
        panel.classList.remove('open');
        backdrop.classList.remove('open');
        tab.classList.remove('panel-open');
        document.body.style.overflow = '';
    }

    tab.addEventListener('click', openPanel);
    closeBtn.addEventListener('click', closePanel);
    backdrop.addEventListener('click', closePanel);

    document.querySelectorAll('.open-enquiry-link').forEach(link => {
        link.addEventListener('click', function (e) { e.preventDefault(); openPanel(); });
    });

    document.querySelectorAll('a').forEach(link => {
        if (link.textContent.trim() === 'About Project') {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                if (window._videoController) window._videoController.jumpToSection(0);
            });
        }
    });

    // Nav logo → go to section 0
    const navLogo = document.getElementById('navLogoLink');
    if (navLogo) {
        navLogo.addEventListener('click', function (e) {
            e.preventDefault();
            if (window._videoController) window._videoController.jumpToSection(0);
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closePanel();
    });

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        success.classList.add('visible');
        form.querySelectorAll('input, textarea, select, button[type="submit"]')
            .forEach(el => el.disabled = true);
        setTimeout(closePanel, 2800);
    });
})();
