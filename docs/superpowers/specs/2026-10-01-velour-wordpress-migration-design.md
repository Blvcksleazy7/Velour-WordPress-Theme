# Velour WordPress and WooCommerce Migration Design

## Objective

Move Velour Standard from Shopify to the existing cPanel WordPress installation without redesigning the storefront, interrupting the live Shopify store, or adding a paid page-builder subscription.

The completed WordPress site must preserve the current luxury Velour visual system, support ecommerce through WooCommerce, retain the Presence Profile experience, and integrate with PayFast, BobGo, Klaviyo and n8n.

## Current State

- The live domain `velourstandard.co.za` still resolves to Shopify.
- WordPress is installed in cPanel at the Velour domain document root.
- The WordPress installation currently contains the default starter site.
- cPanel provides PHP 8.2, WordPress Toolkit and Let's Encrypt support.
- The current Velour storefront source is stored in this repository as a Shopify Horizon-based theme with custom Velour Liquid, CSS and JavaScript.
- The GitHub source repository is `https://github.com/Blvcksleazy7/My-Shopify-Theme` and remains the migration source of truth. Existing local Velour changes must be preserved and reconciled with `origin/main`; they must not be overwritten by the newer Shopify-generated remote commit.
- The existing theme contains the home, shop, fragrance, display, bundle, product, contact and Presence Profile experiences.

## Constraints

- Do not redesign the site.
- Do not switch the live domain until staging acceptance is complete.
- Do not use Elementor Pro or another recurring page-builder subscription.
- Do not expose Shopify, Klaviyo, n8n or payment secrets in browser code.
- Do not copy Shopify-specific Liquid or AJAX endpoints into WordPress without adapting them to WordPress and WooCommerce APIs.
- Preserve user-facing URLs where practical and create redirects for changed URLs.
- Preserve the existing Shopify site as the rollback target until WordPress launch verification is complete.

## Recommended Architecture

### WordPress Theme

Create a standalone custom WordPress theme named `velour-standard`.

The theme will:

- use semantic PHP templates and WordPress template functions;
- enqueue the existing Velour CSS and adapted JavaScript;
- use WordPress menus, logo, site title and Customizer/theme settings where appropriate;
- provide responsive header, footer, mobile navigation and cart controls;
- contain WooCommerce template support without copying unnecessary WooCommerce templates;
- preserve the warm ivory, burgundy, antique gold and editorial typography system;
- avoid a page-builder dependency.

### Ecommerce

Use WooCommerce as the ecommerce engine for:

- products and product variations;
- categories for fragrances, cases and displays, and bundles;
- inventory and availability;
- cart and checkout;
- orders, customers, taxes and coupons;
- product images, prices and product metadata.

WooCommerce hooks and template overrides will be kept minimal. The theme will own presentation while WooCommerce owns commerce behaviour.

### Product Migration

Products will be imported from the existing Shopify export or a fresh Shopify product CSV. The import mapping will include:

- title and slug;
- description;
- product category and tags;
- price and sale price;
- SKU;
- inventory status;
- featured and gallery images;
- scent and display metadata used by the Presence Profile;
- redirects from existing Shopify product handles when a WordPress slug differs.

Product import will be validated with record counts, prices, image coverage and stock-state checks before launch.

### Presence Profile

The existing Presence Profile design and interaction will be adapted to WordPress.

The WordPress version will:

- retain all questions, progress states, email step and skip option;
- send quiz answers to the existing n8n recommendation webhook;
- render the AI recommendation response;
- fall back to static archetype recommendations when n8n fails;
- resolve recommended products through WooCommerce REST/AJAX endpoints or a secured WordPress endpoint;
- use WooCommerce add-to-cart URLs or AJAX for quick add;
- send email/profile data only when the visitor supplies an email address;
- preserve Klaviyo event ownership in n8n/Klaviyo rather than WordPress.

The n8n webhook URL will be configured server-side or through a non-secret theme setting. Private credentials remain in n8n.

### Integrations

#### PayFast

Use the supported PayFast WooCommerce gateway. Configure merchant credentials in WordPress administration and test in sandbox mode before production activation.

#### BobGo

Use BobGo's supported WooCommerce integration for rates, fulfilment and tracking. Credentials will be entered only in the plugin settings.

#### Klaviyo

Use the official or supported WooCommerce integration for standard ecommerce events and lists. The Presence Profile continues to use n8n to update profile properties and emit the `Completed Presence Profile` event.

#### Analytics

Restore the existing Meta Pixel and GA4 identifiers through a lightweight integration or approved plugin. Verify page views, product views, add-to-cart, checkout and purchase events without duplicating tags.

## Staging and Domain Strategy

Create a staging hostname on cPanel, preferably `staging.velourstandard.co.za`, pointing to the cPanel server. WordPress home and site URLs will use the staging hostname during development.

The production domain remains pointed at Shopify during staging. At launch:

1. Take a final WordPress backup.
2. Export or reconcile any Shopify orders/products changed during staging.
3. Replace WordPress staging URLs with the production domain.
4. Change the apex and `www` DNS records from Shopify to cPanel.
5. Issue and verify the production Let's Encrypt certificate.
6. Verify redirects, checkout, transactional email and analytics.
7. Keep the Shopify store available as rollback until the launch window is signed off.

## Theme Deliverables

- `style.css` with WordPress theme metadata and Velour styling.
- `functions.php` with theme setup, assets, menus, WooCommerce support and safe AJAX endpoints.
- `header.php` and `footer.php`.
- `front-page.php` for the Velour homepage.
- `archive-product.php` and WooCommerce presentation hooks for the shop.
- `single-product.php` or hook-based product presentation.
- page templates for About, Bundles, Contact and Presence Profile.
- `404.php`, search and standard content templates.
- adapted `assets/js/velour.js` and `assets/js/velour-presence.js`.
- packaged installable theme ZIP.
- product import mapping and launch checklist.

## Implementation Sequence

1. Reconcile the GitHub theme source and preserve the current local Velour customizations without modifying the Shopify theme files.
2. Create the custom theme skeleton and shared layout.
3. Port the Velour visual tokens, typography and responsive system.
4. Port the homepage and editorial content sections.
5. Add WooCommerce integration and product cards.
6. Port collection, product, cart and checkout presentation.
7. Port Contact and Presence Profile experiences.
8. Package and validate the theme locally.
9. Create cPanel staging DNS and WordPress staging URL.
10. Install WooCommerce and required integrations.
11. Upload and activate the theme on staging.
12. Import products and media.
13. Complete functional, responsive and integration testing.
14. Perform production DNS and SSL cutover.

## Verification

### Theme

- PHP syntax checks pass for all theme files.
- Theme ZIP installs without errors.
- No Shopify Liquid remains in rendered WordPress templates.
- No private API keys are present in the theme package.

### Storefront

- Home, shop, category, product, cart, checkout, contact, Presence Profile and 404 pages load on desktop and mobile.
- Navigation, mobile menu, product pagination and search work.
- Product images, prices and availability come from WooCommerce.
- Add-to-cart and cart quantity changes work.

### Integrations

- PayFast sandbox checkout completes successfully.
- BobGo receives a test order and supports tracking.
- Klaviyo receives WooCommerce events once, without duplicates.
- Presence Profile with email triggers n8n and Klaviyo.
- Presence Profile skip shows a result without transmitting an email.
- GA4 and Meta events fire once per action.

### Launch

- Apex and `www` resolve to cPanel.
- HTTPS is valid with no mixed content.
- Shopify URLs redirect to matching WordPress URLs where required.
- A complete staging backup and rollback procedure exist.

## Risks and Mitigations

- **DNS downtime:** keep Shopify live until the WordPress staging site is accepted, lower DNS TTL before cutover and verify both apex and `www`.
- **Checkout failure:** test PayFast sandbox and a controlled production transaction before announcing launch.
- **Product mismatch:** reconcile product count, SKU, price, stock and images against the Shopify export.
- **Duplicate marketing events:** test event streams with browser tools and Klaviyo profiles before enabling flows.
- **Plugin conflicts:** keep the plugin set minimal and test after each integration is enabled.
- **Migration drift:** perform a final product/order reconciliation immediately before cutover.

## Acceptance Criteria

The migration is ready for production when the staging site visually matches the current Velour storefront, all core ecommerce and Presence Profile workflows pass, integrations are verified, product data reconciles, SSL is ready, and the production DNS change has a tested rollback path.
