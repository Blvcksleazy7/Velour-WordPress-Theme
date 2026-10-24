# Velour Editorial Scroll Motion Design

## Objective

Add a restrained editorial scroll-reveal system to the Velour WordPress theme without changing its layout, copy, typography, or visual identity.

## Experience

- Page sections enter once with a soft fade and a short upward movement.
- Editorial images use the same reveal with a very subtle scale settle.
- Repeated product, category, principle, and bundle items receive short staggered delays.
- Motion begins only as content approaches the viewport and never tracks the user's scroll continuously.
- Header navigation, footer utilities, forms, checkout controls, and the Presence Profile quiz retain their existing behavior.

## Motion Rules

- Standard duration: `650ms`.
- Standard offset: `24px` upward.
- Image scale: `0.985` to `1`.
- Stagger: `90ms` per item, capped so large product grids do not feel slow.
- Easing: a restrained ease-out curve suitable for editorial content.
- Reveals run once; elements are unobserved after entering.

## Architecture

The shared `assets/js/velour.js` script exposes and initializes `initVelourScrollReveals(root, environment)`. It uses `IntersectionObserver` when available and reveals everything immediately when the API is unavailable or reduced motion is requested.

Templates opt into motion with `data-velour-reveal` and optional `data-velour-reveal-group` attributes. CSS applies hidden/transformed states only after JavaScript adds a readiness class to the document root, so content remains visible with JavaScript disabled or interrupted.

## Coverage

- Homepage hero copy, section headings, product grids, categories, presence statement, and story image/copy.
- About hero, story, and principles.
- Bundles hero and bundle features.
- Contact hero, concierge copy, and form container.
- WooCommerce archive headings and product cards through shared selectors/hooks.
- WooCommerce single-product primary content through a conservative shared hook.

Presence Profile steps are excluded because they already own their transition system. Forms animate only as whole containers; individual inputs do not animate.

## Accessibility And Performance

- `prefers-reduced-motion: reduce` disables reveal transforms and delays.
- No content is hidden before JavaScript has initialized successfully.
- No scroll event listeners, animation libraries, parallax, or continuous transforms are introduced.
- Observer work is released after each element is revealed.
- Motion does not alter document flow or cause layout shifts.

## Verification

- Automated tests cover initialization, intersection reveal, unobserving, unsupported browser fallback, reduced-motion fallback, CSS progressive enhancement, and template hooks.
- Existing theme tests must continue to pass.
- Desktop and mobile staging checks confirm content remains legible, stable, and visible with JavaScript and reduced motion disabled.
