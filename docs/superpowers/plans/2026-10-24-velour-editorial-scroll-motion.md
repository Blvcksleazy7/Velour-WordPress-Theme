# Velour Editorial Scroll Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add restrained, accessible editorial scroll reveals across the Velour WordPress theme without changing page layout or existing Presence Profile transitions.

**Architecture:** Templates opt into motion through data attributes. The shared theme script initializes one `IntersectionObserver`, while CSS activates hidden states only after successful JavaScript setup so no-JavaScript and failure states remain readable.

**Tech Stack:** WordPress PHP templates, vanilla JavaScript, CSS, Node.js built-in test runner

**Spec:** `docs/superpowers/specs/2026-10-24-velour-editorial-scroll-motion-design.md`

## Global Constraints

- Do not redesign or restructure page layouts.
- Do not add an animation library, parallax, or continuous scroll listeners.
- Keep content visible without JavaScript and when `prefers-reduced-motion: reduce` is active.
- Exclude Presence Profile steps, header navigation, footer utilities, checkout controls, and individual form fields.
- Preserve all existing unrelated working-tree changes.

## Review Focus

- Browsers without `IntersectionObserver` must show every opted-in element immediately.
- Reduced-motion visitors must see content without transforms, delays, or animation.
- An observer callback firing more than once must not replay a reveal.
- Large product grids must use capped stagger delays rather than increasingly long waits.
- Dynamically absent sections and empty WooCommerce states must not cause JavaScript errors.

---

### Task 1: Shared Reveal Controller

**Files:**
- Modify: `wordpress-theme/velour-standard/assets/js/velour.js`
- Modify: `wordpress-theme/tests/theme-structure.test.mjs`

**Interfaces:**
- Consumes: elements marked with `[data-velour-reveal]` and optional groups marked with `[data-velour-reveal-group]`
- Produces: global `initVelourScrollReveals(root, environment)` and element state class `is-revealed`

- [ ] **Step 1: Write failing controller tests**

Add tests asserting that the initializer reveals and unobserves intersecting targets, immediately reveals targets without observer support, bypasses motion for reduced-motion users, tolerates an empty document, and caps generated group delays.

- [ ] **Step 2: Run tests to verify failure**

Run: `node --test wordpress-theme/tests/theme-structure.test.mjs`

Expected: new reveal-controller assertions fail because `initVelourScrollReveals` does not exist.

- [ ] **Step 3: Implement `initVelourScrollReveals(root, environment)`**

Use one observer with threshold `0.14` and bottom root margin `-8%`. Add the readiness class only after targets exist and motion support is confirmed; reveal once and unobserve each target. Generate `90ms` group delays with a finite cap.

- [ ] **Step 4: Run controller tests**

Run: `node --test wordpress-theme/tests/theme-structure.test.mjs`

Expected: all controller and existing navigation tests pass.

### Task 2: Editorial Motion Styling And Template Hooks

**Files:**
- Modify: `wordpress-theme/velour-standard/style.css`
- Modify: `wordpress-theme/velour-standard/front-page.php`
- Modify: `wordpress-theme/velour-standard/page-templates/about.php`
- Modify: `wordpress-theme/velour-standard/page-templates/bundles.php`
- Modify: `wordpress-theme/velour-standard/page-templates/contact.php`
- Modify: `wordpress-theme/velour-standard/archive-product.php`
- Modify: `wordpress-theme/velour-standard/single-product.php`
- Modify: `wordpress-theme/velour-standard/template-parts/product-card.php`
- Modify: `wordpress-theme/tests/theme-structure.test.mjs`

**Interfaces:**
- Consumes: `velour-motion-ready`, `is-revealed`, and `--velour-reveal-delay` from Task 1
- Produces: explicit editorial reveal targets without changing semantic structure or content

- [ ] **Step 1: Write failing markup and CSS tests**

Assert that key page templates contain reveal hooks, repeated item containers contain group hooks, CSS scopes hidden states beneath `velour-motion-ready`, image reveals use the approved subtle scale, and reduced-motion rules neutralize motion.

- [ ] **Step 2: Run tests to verify failure**

Run: `node --test wordpress-theme/tests/theme-structure.test.mjs`

Expected: new template and stylesheet assertions fail before hooks and rules are added.

- [ ] **Step 3: Add explicit reveal hooks to templates**

Mark whole editorial units rather than individual words or form fields. Keep the Presence Profile template untouched. Add conservative WooCommerce hooks around archive and single-product regions without replacing WooCommerce rendering.

- [ ] **Step 4: Add the shared CSS motion rules**

Use `650ms`, `24px`, image scale `0.985`, and an ease-out curve. Scope all hidden states to the readiness class and ensure reduced-motion rules remove transitions, transforms, and delays.

- [ ] **Step 5: Run the complete theme test suite**

Run: `node --test wordpress-theme/tests/theme-structure.test.mjs`

Expected: all tests pass.

### Task 3: Package And Visual Verification

**Files:**
- Modify: `wordpress-theme/dist/velour-standard.zip`

**Interfaces:**
- Consumes: tested source theme from Tasks 1 and 2
- Produces: installable WordPress theme archive for staging

- [ ] **Step 1: Package the theme**

Run: `node wordpress-theme/scripts/package-theme.mjs`

Expected: `wordpress-theme/dist/velour-standard.zip` is rebuilt from current source.

- [ ] **Step 2: Run packaging and structure tests**

Run: `node --test wordpress-theme/tests/theme-structure.test.mjs`

Expected: every test passes and the archive matches source files.

- [ ] **Step 3: Install the rebuilt archive on staging after user confirmation**

Update the existing Velour Standard theme through WordPress, preserving production and staging content.

- [ ] **Step 4: Verify staging on desktop and mobile**

Check Home, About, Bundles, Contact, Shop, and one product page. Confirm reveals run once, content never overlaps, controls remain immediately usable, and reduced-motion mode shows all content without animation.

