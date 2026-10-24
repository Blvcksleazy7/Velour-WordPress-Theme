# Velour WordPress Theme and Staging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build, package and stage a custom WooCommerce-ready WordPress theme that reuses the current Velour Shopify design and leaves the live Shopify storefront untouched.

**Architecture:** Add the WordPress theme as a new, isolated directory inside the existing GitHub repository. Port reusable Velour assets and content into WordPress templates, use WooCommerce hooks and APIs for commerce, and deploy the resulting ZIP to a cPanel staging hostname before any production DNS change.

**Tech Stack:** WordPress, PHP 8.2, WooCommerce, vanilla JavaScript, CSS, Node.js built-in test runner, cPanel WordPress Toolkit, WP-CLI.

**Spec:** `docs/superpowers/specs/2026-10-01-velour-wordpress-migration-design.md`

## Global Constraints

- Do not redesign the Velour storefront.
- Do not modify or discard the existing dirty Shopify theme files while building the WordPress theme.
- Do not point `velourstandard.co.za` away from Shopify until staging acceptance is complete.
- Do not use a paid page builder or recurring theme subscription.
- Do not expose private Shopify, Klaviyo, n8n, PayFast or BobGo credentials in theme files or browser JavaScript.
- WordPress and WooCommerce own product, cart, checkout and account behaviour; the custom theme owns presentation.
- Keep WooCommerce template overrides minimal and prefer hooks where practical.
- Preserve the existing product handles as WordPress slugs where possible.

## Review Focus

- WooCommerce missing or inactive: the theme must render an explanatory empty state without fatal PHP errors; Task 2 tests this.
- Product with no image, price or stock: the card and product page must remain usable and accurately show availability; Task 3 tests this.
- n8n unavailable or invalid response: Presence Profile must reveal its static fallback without blocking; Task 5 tests this.
- Email skipped: Presence Profile must not transmit profile data; Task 5 tests this.
- Production domain still on Shopify: staging work must use a separate hostname and must not change apex or `www`; Task 7 verifies DNS before deployment.

---

## File Structure

The new implementation lives under `wordpress-theme/velour-standard/` so the Shopify source remains intact.

- `style.css`: WordPress metadata and the Velour design system.
- `functions.php`: theme setup and imports for focused PHP modules.
- `inc/setup.php`: menus, image sizes, editor styles and theme supports.
- `inc/assets.php`: asset loading and localized frontend configuration.
- `inc/woocommerce.php`: WooCommerce supports, hooks and fragments.
- `inc/presence-profile.php`: non-secret Presence Profile settings and product lookup endpoint.
- `header.php`, `footer.php`: shared storefront shell.
- `front-page.php`: editorial Velour homepage.
- `archive-product.php`, `single-product.php`: WooCommerce entry templates.
- `page-templates/about.php`, `bundles.php`, `contact.php`, `presence-profile.php`: branded page experiences.
- `template-parts/product-card.php`: reusable WooCommerce product card.
- `404.php`, `search.php`, `page.php`, `index.php`: standard WordPress fallbacks.
- `assets/js/velour.js`: navigation, reveals, cart UI and progressive enhancement.
- `assets/js/velour-presence.js`: WordPress-adapted Presence Profile.
- `assets/images/`: repository-owned Velour imagery.
- `tests/theme-structure.test.mjs`: deterministic package and source checks.
- `wordpress-theme/scripts/package-theme.mjs`: reproducible ZIP builder.
- `wordpress-theme/dist/velour-standard.zip`: generated installable package.

### Task 1: Theme Skeleton and Structural Contract

**Files:**
- Create: `wordpress-theme/velour-standard/style.css`
- Create: `wordpress-theme/velour-standard/functions.php`
- Create: `wordpress-theme/velour-standard/inc/setup.php`
- Create: `wordpress-theme/velour-standard/inc/assets.php`
- Create: `wordpress-theme/velour-standard/header.php`
- Create: `wordpress-theme/velour-standard/footer.php`
- Create: `wordpress-theme/velour-standard/index.php`
- Create: `wordpress-theme/tests/theme-structure.test.mjs`

**Interfaces:**
- Consumes: existing `assets/velour.css`, `assets/velour.js`, image assets and navigation copy.
- Produces: `velour_standard_setup(): void`, `velour_standard_enqueue_assets(): void`, registered menu locations `primary`, `footer_shop`, and `footer_company`.

- [ ] **Step 1: Write the failing structural test**

Create tests asserting that the theme metadata names `Velour Standard`, all required entry templates exist, `functions.php` loads `inc/setup.php` and `inc/assets.php`, and no theme file contains Shopify Liquid delimiters.

- [ ] **Step 2: Run the structural test and verify failure**

Run: `node --test wordpress-theme/tests/theme-structure.test.mjs`

Expected: FAIL because `wordpress-theme/velour-standard/` does not exist.

- [ ] **Step 3: Implement the minimal WordPress theme skeleton**

Create the listed files, register `title-tag`, `post-thumbnails`, `custom-logo`, `html5`, menus and editor styling, and enqueue versioned theme assets with `wp_enqueue_style()` and `wp_enqueue_script()`.

- [ ] **Step 4: Run the structural test**

Run: `node --test wordpress-theme/tests/theme-structure.test.mjs`

Expected: PASS.

- [ ] **Step 5: Review the new directory only**

Run: `git diff -- wordpress-theme docs/superpowers`

Expected: no modifications to existing Shopify theme files.

### Task 2: Shared Velour Shell and Responsive Design System

**Files:**
- Modify: `wordpress-theme/velour-standard/style.css`
- Modify: `wordpress-theme/velour-standard/header.php`
- Modify: `wordpress-theme/velour-standard/footer.php`
- Create: `wordpress-theme/velour-standard/assets/js/velour.js`
- Modify: `wordpress-theme/tests/theme-structure.test.mjs`

**Interfaces:**
- Consumes: WordPress menus from Task 1 and the existing Velour CSS visual tokens.
- Produces: `.velour-shell`, `.velour-nav`, `[data-mobile-menu]`, `[data-velour-mobile-panel]`, footer social links and accessible responsive navigation.

- [ ] **Step 1: Add failing shell tests**

Assert that header and footer call `wp_head()`, `wp_body_open()` and `wp_footer()`, navigation has an accessible label, mobile controls expose `aria-expanded`, and the stylesheet defines the Velour burgundy `#5b0e1d`, antique gold `#c8a96b` and ivory `#f8f5f1` tokens.

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test wordpress-theme/tests/theme-structure.test.mjs`

Expected: FAIL on missing shell contracts.

- [ ] **Step 3: Port the shared shell and design tokens**

Adapt the Shopify header, mobile menu and footer markup to WordPress menus and URLs. Port only the Velour-specific CSS needed by the WordPress templates; remove selectors that depend on Shopify custom elements.

- [ ] **Step 4: Implement progressive navigation JavaScript**

Expose `initVelourNavigation(root: Document): void`; toggle `aria-expanded`, panel visibility and Escape-key closing without requiring JavaScript for desktop navigation.

- [ ] **Step 5: Run structural tests**

Run: `node --test wordpress-theme/tests/theme-structure.test.mjs`

Expected: PASS.

### Task 3: WooCommerce Product Presentation

**Files:**
- Create: `wordpress-theme/velour-standard/inc/woocommerce.php`
- Create: `wordpress-theme/velour-standard/template-parts/product-card.php`
- Create: `wordpress-theme/velour-standard/archive-product.php`
- Create: `wordpress-theme/velour-standard/single-product.php`
- Modify: `wordpress-theme/velour-standard/functions.php`
- Modify: `wordpress-theme/velour-standard/style.css`
- Modify: `wordpress-theme/tests/theme-structure.test.mjs`

**Interfaces:**
- Consumes: WooCommerce `WC_Product` objects and Task 2 shell.
- Produces: `velour_standard_product_card(WC_Product $product): void`, WooCommerce support, cart fragments and graceful plugin-inactive output.

- [ ] **Step 1: Add failing WooCommerce contract tests**

Assert that the theme declares WooCommerce support, product cards use WooCommerce title, permalink, image, price and stock methods, add-to-cart uses WooCommerce URLs, and the templates guard calls with `class_exists('WooCommerce')` or `function_exists()`.

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test wordpress-theme/tests/theme-structure.test.mjs`

Expected: FAIL on missing WooCommerce files and guards.

- [ ] **Step 3: Implement WooCommerce setup and product cards**

Add gallery support, remove incompatible default wrappers, render safe empty states, and preserve accurate sold-out behaviour when `is_purchasable()` or `is_in_stock()` is false.

- [ ] **Step 4: Implement shop and product templates**

Use WooCommerce loops, pagination and notices. Preserve the Velour editorial hierarchy while leaving form, variation, cart and checkout actions under WooCommerce control.

- [ ] **Step 5: Run structural tests**

Run: `node --test wordpress-theme/tests/theme-structure.test.mjs`

Expected: PASS.

### Task 4: Homepage and Editorial Pages

**Files:**
- Create: `wordpress-theme/velour-standard/front-page.php`
- Create: `wordpress-theme/velour-standard/page.php`
- Create: `wordpress-theme/velour-standard/page-templates/about.php`
- Create: `wordpress-theme/velour-standard/page-templates/bundles.php`
- Create: `wordpress-theme/velour-standard/page-templates/contact.php`
- Create: `wordpress-theme/velour-standard/404.php`
- Create: `wordpress-theme/velour-standard/search.php`
- Copy: `assets/velour-perfume-display.png` to `wordpress-theme/velour-standard/assets/images/velour-perfume-display.png`
- Copy: `assets/velour-bundle-complete.avif` to `wordpress-theme/velour-standard/assets/images/velour-bundle-complete.avif`
- Modify: `wordpress-theme/velour-standard/style.css`
- Modify: `wordpress-theme/tests/theme-structure.test.mjs`

**Interfaces:**
- Consumes: Task 2 shell and Task 3 product-card helper.
- Produces: branded home, About, Bundles, Contact, Search and 404 routes.

- [ ] **Step 1: Add failing page-template tests**

Assert that the homepage contains the approved Velour hero and philosophy copy, the contact form contains Full Name, Email Address, optional Order Number, Subject and Message, and the Subject list contains all seven approved options.

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test wordpress-theme/tests/theme-structure.test.mjs`

Expected: FAIL on missing page templates.

- [ ] **Step 3: Port the homepage sections**

Adapt the existing Liquid homepage into PHP and WordPress queries for featured fragrances and displays. Keep content editable through page content and documented theme settings without adding a page builder.

- [ ] **Step 4: Implement editorial and utility pages**

Create the About, Bundles, Contact, Search and 404 templates. Use `wp_mail()` through a nonce-protected handler for the contact form and sanitize every submitted field.

- [ ] **Step 5: Run structural tests**

Run: `node --test wordpress-theme/tests/theme-structure.test.mjs`

Expected: PASS.

### Task 5: Presence Profile Port

**Files:**
- Create: `wordpress-theme/velour-standard/inc/presence-profile.php`
- Create: `wordpress-theme/velour-standard/page-templates/presence-profile.php`
- Create: `wordpress-theme/velour-standard/assets/js/velour-presence.js`
- Modify: `wordpress-theme/velour-standard/functions.php`
- Modify: `wordpress-theme/velour-standard/style.css`
- Create: `wordpress-theme/tests/presence-profile.test.mjs`

**Interfaces:**
- Consumes: existing quiz copy and archetypes, WordPress REST API, WooCommerce product slugs, and the configured n8n webhook URL.
- Produces: REST routes `velour/v1/recommendations` and `velour/v1/products`, client functions `requestPresenceRecommendation(payload): Promise<Result>` and `revealPresenceResult(result): void`.

- [ ] **Step 1: Write failing browser-independent Presence Profile tests**

Test that skip never calls the recommendation endpoint, invalid responses use static fallback data, valid handles are passed to the product lookup endpoint, and endpoint failure still resolves a result.

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test wordpress-theme/tests/presence-profile.test.mjs`

Expected: FAIL because the WordPress Presence Profile module does not exist.

- [ ] **Step 3: Implement secured WordPress REST routes**

Register public read/submit routes with strict schema validation, origin checks for the configured site URL, short request timeouts and no private credentials. Map product slugs to WooCommerce title, image, price, availability and add-to-cart URL.

- [ ] **Step 4: Port the quiz UI and fallback logic**

Reuse the existing layout and archetypes, replace Shopify `/products/{handle}.js` calls with the WordPress product endpoint, and preserve the email and skip semantics.

- [ ] **Step 5: Run Presence Profile and structural tests**

Run: `node --test wordpress-theme/tests/presence-profile.test.mjs wordpress-theme/tests/theme-structure.test.mjs`

Expected: PASS.

### Task 6: Reproducible Theme Package

**Files:**
- Create: `wordpress-theme/scripts/package-theme.mjs`
- Modify: `wordpress-theme/tests/theme-structure.test.mjs`
- Generate: `wordpress-theme/dist/velour-standard.zip`

**Interfaces:**
- Consumes: completed `wordpress-theme/velour-standard/` directory.
- Produces: an installable ZIP whose root directory is exactly `velour-standard/`.

- [ ] **Step 1: Add failing package tests**

Assert that the ZIP excludes `.DS_Store`, tests, docs, source Shopify files and secrets; includes all required templates; and contains no Liquid syntax or private-key patterns.

- [ ] **Step 2: Run package tests and verify failure**

Run: `node --test wordpress-theme/tests/theme-structure.test.mjs`

Expected: FAIL because the package does not exist.

- [ ] **Step 3: Implement the package script**

Create a clean temporary staging directory, copy an explicit allowlist of theme files, scan for forbidden patterns, and invoke `/usr/bin/zip` to create the package.

- [ ] **Step 4: Build and verify the package**

Run: `node wordpress-theme/scripts/package-theme.mjs && unzip -t wordpress-theme/dist/velour-standard.zip && node --test wordpress-theme/tests/*.test.mjs`

Expected: ZIP integrity succeeds and all tests pass.

### Task 7: cPanel Staging Deployment

**Files:**
- Deploy: `wordpress-theme/dist/velour-standard.zip`
- Create in WordPress: required pages and menu assignments.
- Configure in cPanel: staging hostname and Let's Encrypt certificate.

**Interfaces:**
- Consumes: packaged theme from Task 6 and cPanel WordPress installation.
- Produces: HTTPS staging site with the custom theme active and production DNS unchanged.

- [ ] **Step 1: Record pre-deployment state**

Verify `dig +short velourstandard.co.za A` still resolves to Shopify `23.227.38.65`, export a WordPress Toolkit backup, and record the active theme and plugin list.

- [ ] **Step 2: Create staging hostname**

Create `staging.velourstandard.co.za` on the cPanel server, issue Let's Encrypt and update WordPress `home` and `siteurl` for staging without changing apex or `www`.

- [ ] **Step 3: Install WooCommerce and upload the custom theme**

Install the free WooCommerce plugin, upload `velour-standard.zip`, activate the theme, and run `wp rewrite flush`.

- [ ] **Step 4: Run server-side checks**

Run through WP-CLI: `find wp-content/themes/velour-standard -name '*.php' -exec php -l {} \;`, `wp theme status velour-standard`, and `wp plugin status woocommerce`.

Expected: all PHP files report no syntax errors; theme and WooCommerce are active.

- [ ] **Step 5: Create pages and menus**

Create Home, Shop, Fragrances, Cases & Displays, Bundles, About, Presence Profile and Contact pages; assign templates and primary/footer menus; set Home as the static front page and Shop as the WooCommerce shop page.

- [ ] **Step 6: Verify staging visually and functionally**

Check desktop and mobile screenshots; navigation, search, product archive, product page, cart, checkout shell, contact validation, Presence Profile skip and n8n fallback. Confirm the production domain still resolves to Shopify.

### Task 8: Product Import and Integration Readiness

**Files:**
- Create: `wordpress-theme/migration/product-import-map.md`
- Create: `wordpress-theme/migration/launch-checklist.md`
- Input: fresh Shopify product CSV supplied or exported at execution time.

**Interfaces:**
- Consumes: Shopify product CSV and staged WooCommerce installation.
- Produces: reconciled WooCommerce catalog and documented readiness gates for PayFast, BobGo, Klaviyo, analytics and production cutover.

- [ ] **Step 1: Define product field mapping and reconciliation checks**

Map Shopify Handle to WordPress slug, Title, Body HTML, Vendor, Product Category, Tags, Variant SKU, Variant Price, inventory, image URLs and Velour fragrance metadata. Define expected counts and mismatch reporting.

- [ ] **Step 2: Import products into staging**

Use WooCommerce's CSV importer, review mappings before committing the import, and retain the import report.

- [ ] **Step 3: Reconcile catalog data**

Compare product count, slugs, SKUs, prices, stock states, category assignments and image coverage with the source CSV. Correct mapping rules and re-import only affected records.

- [ ] **Step 4: Prepare integration checklist**

Document the exact staging tests for PayFast sandbox, BobGo fulfilment, WooCommerce Klaviyo events, Presence Profile event, GA4 and Meta. Keep all production activation steps unchecked until credentials and test evidence are available.

- [ ] **Step 5: Complete staging acceptance report**

Record passed checks, remaining blockers, screenshots and the explicit rollback procedure. Do not modify production DNS in this task.

