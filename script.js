// ── LOADER ──────────────────────────────────────────────────
(function () {
    const loader = document.getElementById('loader');
    if (!loader) return;

    // Step 1 @ 2.8s — fade out logo content
    setTimeout(() => {
        loader.classList.add('loader-exit');

        // Step 2 @ 2.8 + 1.1s — curtains have closed over loader, now hide it
        setTimeout(() => {
            loader.classList.add('loader-done');
            // Start hero video now that loader is gone
            if (window._videoController) {
                window._videoController.playCurrentVideo();
            }
        }, 1100);
    }, 2800);
})();
// ────────────────────────────────────────────────────────────

class VideoSectionController {
    constructor() {
        this.currentSection = 0;
        this.totalVideoSections = 6;
        this.totalSections = 7;
        this.isTransitioning = false;
        this.cooldownTimer = null;
        this.sections = [];
        this.indicators = [];
        this.videos = [];
        this.lastTouchY = 0;
        this.init();
    }

    init() {
        this.sections = document.querySelectorAll('.video-section, .static-section');
        this.indicators = document.querySelectorAll('.indicator');
        this.videos = document.querySelectorAll('.section-video');

        window.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
        window.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        window.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        window.addEventListener('keydown', this.handleKeydown.bind(this));

        this.indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => this.goToSection(index));
        });

        // Video will be started by the loader when it finishes
    }

    pauseCurrentVideo() {
        if (this.currentSection < this.totalVideoSections && this.videos[this.currentSection]) {
            this.videos[this.currentSection].pause();
        }
    }

    playCurrentVideo() {
        this.videos.forEach(video => {
            video.pause();
            video.currentTime = 0;
        });
        if (this.currentSection < this.totalVideoSections && this.videos[this.currentSection]) {
            const video = this.videos[this.currentSection];
            video.currentTime = 0;
            video.play().catch(() => {});
        }
    }

    handleWheel(e) {
        const isLastSection = this.currentSection === this.totalSections - 1;

        if (isLastSection) {
            const staticEl = this.sections[this.currentSection];
            const atTop = staticEl.scrollTop === 0;
            const scrollingUp = e.deltaY < 0;
            if (atTop && scrollingUp && !this.isTransitioning) {
                e.preventDefault();
                this.triggerSection(-1);
            }
            // Otherwise let native scroll work freely
            return;
        }

        e.preventDefault();

        // Hard gate — ignore if already locked
        if (this.isTransitioning) return;

        // Ignore tiny trackpad micro-movements — only respond to intentional scrolls
        if (Math.abs(e.deltaY) < 15) return;

        const delta = e.deltaY > 0 ? 1 : -1;
        this.pauseCurrentVideo();
        this.triggerSection(delta);
    }

    handleTouchStart(e) {
        this.lastTouchY = e.touches[0].clientY;
    }

    handleTouchMove(e) {
        const isLastSection = this.currentSection === this.totalSections - 1;

        if (isLastSection) {
            const staticEl = this.sections[this.currentSection];
            const atTop = staticEl.scrollTop === 0;
            const y = e.touches[0].clientY;
            const diff = this.lastTouchY - y;
            if (atTop && diff < -50 && !this.isTransitioning) {
                e.preventDefault();
                this.lastTouchY = y;
                this.triggerSection(-1);
            }
            return;
        }

        e.preventDefault();
        if (this.isTransitioning) return;

        const y = e.touches[0].clientY;
        const diff = this.lastTouchY - y;

        if (Math.abs(diff) > 50) {
            this.lastTouchY = y;
            this.pauseCurrentVideo();
            this.triggerSection(diff > 0 ? 1 : -1);
        }
    }

    handleKeydown(e) {
        if (this.isTransitioning) return;
        if (e.key === 'ArrowDown' || e.key === ' ') {
            e.preventDefault();
            this.pauseCurrentVideo();
            this.triggerSection(1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.pauseCurrentVideo();
            this.triggerSection(-1);
        }
    }

    triggerSection(delta) {
        if (delta > 0 && this.currentSection < this.totalSections - 1) {
            this.goToSection(this.currentSection + 1);
        } else if (delta < 0 && this.currentSection > 0) {
            this.goToSection(this.currentSection - 1);
        }
    }

    goToSection(idx) {
        if (idx < 0 || idx >= this.totalSections || this.isTransitioning || idx === this.currentSection) return;

        // Lock immediately
        this.isTransitioning = true;

        // Clear any previous cooldown
        if (this.cooldownTimer) clearTimeout(this.cooldownTimer);

        this.sections[this.currentSection].classList.remove('active');
        this.indicators[this.currentSection].classList.remove('active');

        // Reset scroll position when leaving static section
        if (this.currentSection === this.totalSections - 1) {
            this.sections[this.currentSection].scrollTop = 0;
        }

        this.currentSection = idx;

        this.sections[idx].classList.add('active');
        this.indicators[idx].classList.add('active');

        // Play video after fade, then unlock after a single fixed cooldown
        setTimeout(() => {
            this.playCurrentVideo();
        }, 650);

        // Single hard cooldown — no polling, no settle-waiting
        // 1000ms gives the transition time to complete + buffer for trackpad gesture to end
        this.cooldownTimer = setTimeout(() => {
            this.isTransitioning = false;
        }, 1000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window._videoController = new VideoSectionController();
});
