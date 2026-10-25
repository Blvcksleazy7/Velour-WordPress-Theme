(function () {
	'use strict';

	function initVelourNavigation(root) {
		if (!root || typeof root.querySelector !== 'function') {
			return;
		}

		const toggle = root.querySelector('[data-mobile-menu]');
		const panel = root.querySelector('[data-velour-mobile-panel]');

		if (!toggle || !panel) {
			return;
		}

		const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
		const scrollContainers = [root.documentElement, root.body].filter(Boolean);
		const openLabel = toggle.getAttribute('data-label-open') || 'Open menu';
		const closeLabel = toggle.getAttribute('data-label-close') || 'Close menu';
		let previousFocus = null;
		let previousScrollLocks = [];

		const getFocusableElements = () => Array.from(panel.querySelectorAll(focusableSelector));

		const setToggleState = (expanded) => {
			toggle.setAttribute('aria-expanded', String(expanded));
			toggle.setAttribute('aria-label', expanded ? closeLabel : openLabel);
		};

		const close = (restoreFocus) => {
			setToggleState(false);
			panel.hidden = true;
			previousScrollLocks.forEach(({ element, wasLocked }) => {
				if (!wasLocked) {
					element.classList.remove('velour-menu-open');
				}
			});
			previousScrollLocks = [];

			if (restoreFocus && previousFocus && typeof previousFocus.focus === 'function') {
				previousFocus.focus();
			}

			previousFocus = null;
		};

		const open = () => {
			previousFocus = root.activeElement || toggle;
			previousScrollLocks = scrollContainers.map((element) => ({
				element,
				wasLocked: element.classList.contains('velour-menu-open'),
			}));
			previousScrollLocks.forEach(({ element }) => element.classList.add('velour-menu-open'));
			setToggleState(true);
			panel.hidden = false;

			const firstFocusable = getFocusableElements()[0];
			if (firstFocusable && typeof firstFocusable.focus === 'function') {
				firstFocusable.focus();
			} else if (typeof panel.focus === 'function') {
				panel.focus();
			}
		};

		toggle.addEventListener('click', () => {
			if (toggle.getAttribute('aria-expanded') === 'true') {
				close(true);
			} else {
				open();
			}
		});

		panel.querySelectorAll('a[href]').forEach((link) => {
			link.addEventListener('click', () => close(true));
		});

		if (typeof root.addEventListener === 'function') {
			root.addEventListener('keydown', (event) => {
				if (toggle.getAttribute('aria-expanded') !== 'true') {
					return;
				}

				if (event.key === 'Escape') {
					close(true);
					return;
				}

				if (event.key !== 'Tab') {
					return;
				}

				const focusableElements = getFocusableElements();
				if (focusableElements.length === 0) {
					event.preventDefault();
					panel.focus();
					return;
				}

				const firstFocusable = focusableElements[0];
				const lastFocusable = focusableElements[focusableElements.length - 1];
				const focusIsInside = focusableElements.includes(root.activeElement);

				if (event.shiftKey && (!focusIsInside || root.activeElement === firstFocusable)) {
					event.preventDefault();
					lastFocusable.focus();
				} else if (!event.shiftKey && (!focusIsInside || root.activeElement === lastFocusable)) {
					event.preventDefault();
					firstFocusable.focus();
				}
			});
		}

		setToggleState(false);
		panel.hidden = true;
	}

	function initVelourScrollReveals(root, environment) {
		if (!root || typeof root.querySelectorAll !== 'function') {
			return;
		}

		const targets = Array.from(root.querySelectorAll('[data-velour-reveal]'));
		if (targets.length === 0) {
			return;
		}

		const runtime = environment || globalThis;
		const revealAll = () => {
			targets.forEach((target) => target.classList.add('is-revealed'));
		};
		const reducedMotion = typeof runtime.matchMedia === 'function'
			&& runtime.matchMedia('(prefers-reduced-motion: reduce)').matches;

		if (reducedMotion || typeof runtime.IntersectionObserver !== 'function') {
			revealAll();
			return;
		}

		Array.from(root.querySelectorAll('[data-velour-reveal-group]')).forEach((group) => {
			Array.from(group.querySelectorAll('[data-velour-reveal]')).forEach((target, index) => {
				if (target.style && typeof target.style.setProperty === 'function') {
					target.style.setProperty('--velour-reveal-delay', `${Math.min(index * 90, 360)}ms`);
				}
			});
		});

		let observer;
		try {
			observer = new runtime.IntersectionObserver((entries, activeObserver) => {
				entries.forEach((entry) => {
					if (!entry.isIntersecting || entry.target.classList.contains('is-revealed')) {
						return;
					}

					entry.target.classList.add('is-revealed');
					activeObserver.unobserve(entry.target);
				});
			}, {
				rootMargin: '0px 0px -8% 0px',
				threshold: 0.14,
			});
		} catch (error) {
			revealAll();
			return;
		}

		if (root.documentElement && root.documentElement.classList) {
			root.documentElement.classList.add('velour-motion-ready');
		}
		targets.forEach((target) => observer.observe(target));
	}

	globalThis.initVelourNavigation = initVelourNavigation;
	globalThis.initVelourScrollReveals = initVelourScrollReveals;

	if (typeof document !== 'undefined') {
		const initialize = () => {
			initVelourNavigation(document);
			initVelourScrollReveals(document, globalThis);
		};

		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', initialize);
		} else {
			initialize();
		}
	}
})();
