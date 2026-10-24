import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile as execFileCallback } from 'node:child_process';
import { copyFile, cp, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import vm from 'node:vm';

const themeDirectory = fileURLToPath(new URL('../velour-standard/', import.meta.url));
const wordpressDirectory = fileURLToPath(new URL('../', import.meta.url));
const packageScript = path.join(wordpressDirectory, 'scripts/package-theme.mjs');
const packageArchive = path.join(wordpressDirectory, 'dist/velour-standard.zip');
const execFile = promisify(execFileCallback);
const readThemeFile = (file) => readFile(path.join(themeDirectory, file), 'utf8');

const packagedThemeFiles = [
  '404.php',
  'archive-product.php',
  'assets/images/velour-bundle-complete.avif',
  'assets/images/velour-perfume-display.png',
  'assets/js/velour-presence.js',
  'assets/js/velour.js',
  'footer.php',
  'front-page.php',
  'functions.php',
  'header.php',
  'inc/assets.php',
  'inc/contact.php',
  'inc/presence-profile.php',
  'inc/setup.php',
  'inc/woocommerce.php',
  'index.php',
  'page-templates/about.php',
  'page-templates/bundles.php',
  'page-templates/contact.php',
  'page-templates/presence-profile.php',
  'page.php',
  'search.php',
  'single-product.php',
  'style.css',
  'template-parts/product-card.php',
];

async function archiveEntries(archive) {
  const { stdout } = await execFile('/usr/bin/unzip', ['-Z1', archive]);
  return stdout.trim().split('\n').filter(Boolean);
}

async function sha256(file) {
  return createHash('sha256').update(await readFile(file)).digest('hex');
}

async function extractedHashes(directory) {
  return Object.fromEntries(await Promise.all(packagedThemeFiles.map(async (file) => [
    file,
    await sha256(path.join(directory, 'velour-standard', file)),
  ])));
}

async function createPackageFixture(prefix) {
  const directory = await mkdtemp(path.join(tmpdir(), prefix));
  const wordpress = path.join(directory, 'wordpress-theme');
  const fixtureTheme = path.join(wordpress, 'velour-standard');
  const fixtureScript = path.join(wordpress, 'scripts/package-theme.mjs');

  await mkdir(path.dirname(fixtureScript), { recursive: true });
  await cp(themeDirectory, fixtureTheme, { recursive: true });
  await copyFile(packageScript, fixtureScript);

  return {
    archive: path.join(wordpress, 'dist/velour-standard.zip'),
    directory,
    script: fixtureScript,
    theme: fixtureTheme,
  };
}

test('WordPress discovers the theme as Velour Standard', async () => {
  const stylesheet = await readThemeFile('style.css');
  assert.match(stylesheet, /^\s*Theme Name:\s*Velour Standard\s*$/m);
  assert.match(stylesheet, /^\s*Text Domain:\s*velour-standard\s*$/m);
  assert.match(stylesheet, /^\s*Version:\s*\d+\.\d+\.\d+\s*$/m);
});

test('the theme contains every Task 1 entry point and module', async () => {
  for (const file of [
    'style.css',
    'functions.php',
    'inc/setup.php',
    'inc/assets.php',
    'header.php',
    'footer.php',
    'index.php',
  ]) {
    assert.ok((await stat(path.join(themeDirectory, file))).isFile(), file);
  }
});

test('functions.php loads both setup and asset modules', async () => {
  const functions = await readThemeFile('functions.php');
  for (const module of ['setup', 'assets']) {
    assert.match(
      functions,
      new RegExp(`require_once\\s+get_theme_file_path\\(\\s*['"]/?inc/${module}\\.php['"]\\s*\\)\\s*;`),
    );
  }
});

test('setup exposes the typed callback and registers WordPress theme supports', async () => {
  const setup = await readThemeFile('inc/setup.php');
  assert.match(setup, /function\s+velour_standard_setup\(\)\s*:\s*void/);
  assert.match(setup, /add_action\(\s*'after_setup_theme'\s*,\s*'velour_standard_setup'\s*\)/);
  for (const support of ['title-tag', 'post-thumbnails', 'custom-logo', 'html5', 'editor-styles']) {
    assert.match(setup, new RegExp(`add_theme_support\\(\\s*'${support}'`));
  }
  assert.match(setup, /add_editor_style\(\s*'style\.css'\s*\)/);
});

test('setup registers the three agreed menu locations', async () => {
  const setup = await readThemeFile('inc/setup.php');
  assert.match(setup, /register_nav_menus\(/);
  for (const location of ['primary', 'footer_shop', 'footer_company']) {
    assert.match(setup, new RegExp(`'${location}'\\s*=>`));
  }
});

test('assets exposes its typed callback and enqueues versioned local assets', async () => {
  const assets = await readThemeFile('inc/assets.php');
  assert.match(assets, /function\s+velour_standard_enqueue_assets\(\)\s*:\s*void/);
  assert.match(assets, /add_action\(\s*'wp_enqueue_scripts'\s*,\s*'velour_standard_enqueue_assets'\s*\)/);
  assert.match(assets, /wp_get_theme\(\)->get\(\s*'Version'\s*\)/);
  assert.match(assets, /wp_enqueue_style\(\s*'velour-standard'\s*,\s*get_stylesheet_uri\(\)\s*,\s*array\(\)\s*,\s*\$version\s*\)/);
  assert.match(assets, /get_theme_file_path\(\s*'\/assets\/js\/velour\.js'\s*\)/);
  assert.match(assets, /if\s*\(\s*file_exists\(\s*\$script_path\s*\)\s*\)/);
  assert.match(assets, /wp_enqueue_script\(\s*'velour-standard'\s*,\s*get_theme_file_uri\(\s*'\/assets\/js\/velour\.js'\s*\)\s*,\s*array\(\)\s*,\s*\$version\s*,\s*true\s*\)/);
});

test('no theme file contains Shopify Liquid delimiters', async () => {
  async function inspect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await inspect(file);
      } else if (entry.isFile() && ['.css', '.js', '.php'].includes(path.extname(file))) {
        assert.doesNotMatch(await readFile(file, 'utf8'), /\{\{|\}\}|\{%|%\}/, path.relative(themeDirectory, file));
      }
    }
  }

  await inspect(themeDirectory);
});

test('the shared shell preserves WordPress hooks and exposes accessible navigation', async () => {
  const header = await readThemeFile('header.php');
  const footer = await readThemeFile('footer.php');

  assert.match(header, /wp_head\(\)/);
  assert.match(header, /wp_body_open\(\)/);
  assert.match(header, /wp_body_open\(\)[\s\S]*?<a\b[^>]*class="[^"]*velour-skip-link[^"]*"[^>]*href="#main"/);
  assert.match(header, /class="[^"]*velour-shell/);
  assert.match(header, /class="[^"]*velour-nav/);
  assert.match(header, /<nav\b[^>]*aria-label="[^"]+"/);
  assert.match(header, /wp_nav_menu\([\s\S]*?'theme_location'\s*=>\s*'primary'/);
  const mobileToggle = header.match(/<button[\s\S]*?data-mobile-menu[\s\S]*?<\/button>/)?.[0] ?? '';
  assert.match(mobileToggle, /aria-controls="([^"]+)"/);
  assert.match(mobileToggle, /aria-expanded="false"/);
  assert.match(mobileToggle, /aria-label="[^"]*Open menu/);

  const panelId = mobileToggle.match(/aria-controls="([^"]+)"/)[1];
  assert.match(header, new RegExp(`id="${panelId}"[\\s\\S]*?data-velour-mobile-panel[\\s\\S]*?\\bhidden\\b`));
  assert.match(footer, /wp_footer\(\)/);
});

test('the footer uses WordPress menus and approved Velour contact destinations', async () => {
  const footer = await readThemeFile('footer.php');

  for (const location of ['footer_shop', 'footer_company']) {
    assert.match(footer, new RegExp(`'theme_location'\\s*=>\\s*'${location}'`));
  }

  assert.match(footer, /mailto:info\.velorfragrances@gmail\.com/);
  assert.match(footer, /https:\/\/www\.instagram\.com\/velour_standard/);
  assert.match(footer, /https:\/\/www\.tiktok\.com\/@thevelourstandard/);
  assert.match(footer, /https:\/\/www\.facebook\.com\/VelourStandard/);
  for (const network of ['Instagram', 'TikTok', 'Facebook']) {
    assert.match(footer, new RegExp(`aria-label="${network}[^\"]*"`));
  }
});

test('the stylesheet defines the Velour shell palette and accessibility safeguards', async () => {
  const stylesheet = await readThemeFile('style.css');

  assert.match(stylesheet, /--velour-(?:ink|burgundy):\s*#5b0e1d\s*;/i);
  assert.match(stylesheet, /--velour-(?:gold|antique-gold):\s*#c8a96b\s*;/i);
  assert.match(stylesheet, /--velour-(?:cream|ivory):\s*#f8f5f1\s*;/i);
  assert.match(stylesheet, /--velour-serif:\s*[^;]*(?:Georgia|serif)[^;]*;/i);
  assert.match(stylesheet, /--velour-sans:\s*[^;]*(?:Helvetica|sans-serif)[^;]*;/i);
  assert.match(stylesheet, /:focus-visible/);
  assert.match(stylesheet, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(stylesheet, /overflow-x:\s*(?:clip|hidden)/);
  assert.match(stylesheet, /\.velour-skip-link:focus/);
  assert.match(stylesheet, /\.velour-links\s+\.sub-menu[\s\S]*?list-style:\s*none/);
  assert.match(stylesheet, /\.velour-mobile-links\s+\.sub-menu/);
  assert.match(stylesheet, /\.velour-footer-links\s+\.sub-menu/);
  assert.match(stylesheet, /\.sub-menu[\s\S]*?overflow-wrap:\s*anywhere/);
  assert.match(
    stylesheet,
    /\.velour-shell\s+a\.velour-button--light\s*\{[^}]*color:\s*var\(--velour-ink\)/,
    'light CTA links must override the shared inherited link color',
  );
});

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  add(value) {
    this.values.add(value);
  }

  contains(value) {
    return this.values.has(value);
  }

  remove(value) {
    this.values.delete(value);
  }
}

class FakeElement {
  constructor(ownerDocument) {
    this.attributes = new Map();
    this.classList = new FakeClassList();
    this.dataset = {};
    this.hidden = true;
    this.listeners = new Map();
    this.focused = false;
    this.focusCount = 0;
    this.ownerDocument = ownerDocument;
    this.queryResults = new Map();
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  dispatch(type, event = {}) {
    this.listeners.get(type)?.({ type, ...event });
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  focus() {
    this.focused = true;
    this.focusCount += 1;
    if (this.ownerDocument) this.ownerDocument.activeElement = this;
  }

  querySelectorAll(selector) {
    return this.queryResults.get(selector) ?? [];
  }
}

function loadNavigationScript() {
  return readThemeFile('assets/js/velour.js').then((source) => {
    const context = vm.createContext({ globalThis: {} });
    vm.runInContext(source, context);
    return context.globalThis.initVelourNavigation;
  });
}

function loadScrollRevealScript() {
  return readThemeFile('assets/js/velour.js').then((source) => {
    const context = vm.createContext({ globalThis: {} });
    vm.runInContext(source, context);
    return context.globalThis.initVelourScrollReveals;
  });
}

function createRevealElement() {
  const element = new FakeElement();
  const properties = new Map();
  element.style = {
    getPropertyValue(name) {
      return properties.get(name) ?? '';
    },
    setProperty(name, value) {
      properties.set(name, String(value));
    },
  };
  return element;
}

function createRevealHarness(count = 3) {
  const targets = Array.from({ length: count }, () => createRevealElement());
  const group = createRevealElement();
  group.queryResults.set('[data-velour-reveal]', targets);
  const root = {
    documentElement: { classList: new FakeClassList() },
    querySelectorAll(selector) {
      if (selector === '[data-velour-reveal]') return targets;
      if (selector === '[data-velour-reveal-group]') return [group];
      return [];
    },
  };

  return { group, root, targets };
}

function createIntersectionEnvironment(reducedMotion = false) {
  const observers = [];

  class FakeIntersectionObserver {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      this.observed = [];
      this.unobserved = [];
      observers.push(this);
    }

    observe(target) {
      this.observed.push(target);
    }

    unobserve(target) {
      this.unobserved.push(target);
    }
  }

  return {
    environment: {
      IntersectionObserver: FakeIntersectionObserver,
      matchMedia() {
        return { matches: reducedMotion };
      },
    },
    observers,
  };
}

function createNavigationHarness() {
  const rootListeners = new Map();
  const root = {
    activeElement: null,
    documentElement: { classList: new FakeClassList() },
    addEventListener(type, listener) {
      rootListeners.set(type, listener);
    },
    querySelector(selector) {
      if (selector === '[data-mobile-menu]') return toggle;
      if (selector === '[data-velour-mobile-panel]') return panel;
      return null;
    },
  };
  const toggle = new FakeElement(root);
  const panel = new FakeElement(root);
  const firstLink = new FakeElement(root);
  const lastLink = new FakeElement(root);
  const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'velour-mobile-navigation');
  panel.setAttribute('id', 'velour-mobile-navigation');
  panel.queryResults.set('a[href]', [firstLink, lastLink]);
  panel.queryResults.set(focusableSelector, [firstLink, lastLink]);
  root.activeElement = toggle;

  return { firstLink, focusableSelector, lastLink, panel, root, rootListeners, toggle };
}

test('navigation initializes on DOM ready without Shopify browser APIs', async () => {
  const source = await readThemeFile('assets/js/velour.js');
  let readyListener;
  const document = {
    readyState: 'loading',
    addEventListener(type, listener) {
      if (type === 'DOMContentLoaded') readyListener = listener;
    },
    querySelector() {
      return null;
    },
  };
  const context = vm.createContext({ document, globalThis: {} });

  vm.runInContext(source, context);

  assert.equal(typeof readyListener, 'function');
  assert.doesNotThrow(() => readyListener());
  assert.doesNotMatch(source, /\/cart(?:\/add)?\.js|Shopify\b|routes\.cart/i);
});

test('navigation toggles semantic state and Escape closes it with focus restored', async () => {
  const initVelourNavigation = await loadNavigationScript();
  const { firstLink, panel, root, rootListeners, toggle } = createNavigationHarness();

  assert.equal(typeof initVelourNavigation, 'function');
  initVelourNavigation(root);
  toggle.dispatch('click');
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(toggle.getAttribute('aria-label'), 'Close menu');
  assert.equal(panel.hidden, false);
  assert.equal(root.activeElement, firstLink);
  assert.equal(root.documentElement.classList.contains('velour-menu-open'), true);

  toggle.dispatch('click');
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(toggle.getAttribute('aria-label'), 'Open menu');
  assert.equal(panel.hidden, true);
  assert.equal(root.documentElement.classList.contains('velour-menu-open'), false);

  root.activeElement = toggle;
  toggle.dispatch('click');

  rootListeners.get('keydown')({ key: 'Escape' });
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(panel.hidden, true);
  assert.equal(toggle.focused, true);
});

test('navigation traps forward and reverse focus within the open panel', async () => {
  const initVelourNavigation = await loadNavigationScript();
  const { firstLink, lastLink, root, rootListeners, toggle } = createNavigationHarness();
  initVelourNavigation(root);
  toggle.dispatch('click');

  let prevented = false;
  lastLink.focus();
  rootListeners.get('keydown')({
    key: 'Tab',
    shiftKey: false,
    preventDefault() {
      prevented = true;
    },
  });
  assert.equal(prevented, true);
  assert.equal(root.activeElement, firstLink);

  prevented = false;
  firstLink.focus();
  rootListeners.get('keydown')({
    key: 'Tab',
    shiftKey: true,
    preventDefault() {
      prevented = true;
    },
  });
  assert.equal(prevented, true);
  assert.equal(root.activeElement, lastLink);
});

test('mobile link activation closes the panel and releases the scroll lock', async () => {
  const initVelourNavigation = await loadNavigationScript();
  const { firstLink, panel, root, toggle } = createNavigationHarness();
  initVelourNavigation(root);
  toggle.dispatch('click');

  firstLink.dispatch('click');

  assert.equal(panel.hidden, true);
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(toggle.getAttribute('aria-label'), 'Open menu');
  assert.equal(root.documentElement.classList.contains('velour-menu-open'), false);
  assert.equal(root.activeElement, toggle);
});

test('navigation initialization safely ignores incomplete markup', async () => {
  const initVelourNavigation = await loadNavigationScript();
  const emptyRoot = {
    addEventListener() {
      throw new Error('listeners should not be installed without controls');
    },
    querySelector() {
      return null;
    },
  };

  assert.doesNotThrow(() => initVelourNavigation(emptyRoot));
});

test('scroll reveals observe targets and reveal each intersecting target once', async () => {
  const initVelourScrollReveals = await loadScrollRevealScript();
  const { root, targets } = createRevealHarness();
  const { environment, observers } = createIntersectionEnvironment();

  assert.equal(typeof initVelourScrollReveals, 'function');
  initVelourScrollReveals(root, environment);

  assert.equal(root.documentElement.classList.contains('velour-motion-ready'), true);
  assert.equal(observers.length, 1);
  assert.equal(observers[0].options.rootMargin, '0px 0px -8% 0px');
  assert.equal(observers[0].options.threshold, 0.14);
  assert.deepEqual(observers[0].observed, targets);

  observers[0].callback([
    { isIntersecting: false, target: targets[0] },
    { isIntersecting: true, target: targets[1] },
  ], observers[0]);

  assert.equal(targets[0].classList.contains('is-revealed'), false);
  assert.equal(targets[1].classList.contains('is-revealed'), true);
  assert.deepEqual(observers[0].unobserved, [targets[1]]);

  observers[0].callback([{ isIntersecting: true, target: targets[1] }], observers[0]);
  assert.deepEqual(observers[0].unobserved, [targets[1]]);
});

test('scroll reveals immediately expose content when IntersectionObserver is unavailable', async () => {
  const initVelourScrollReveals = await loadScrollRevealScript();
  const { root, targets } = createRevealHarness();

  initVelourScrollReveals(root, {
    matchMedia() {
      return { matches: false };
    },
  });

  assert.equal(root.documentElement.classList.contains('velour-motion-ready'), false);
  assert.equal(targets.every((target) => target.classList.contains('is-revealed')), true);
});

test('scroll reveals bypass animation when reduced motion is requested', async () => {
  const initVelourScrollReveals = await loadScrollRevealScript();
  const { root, targets } = createRevealHarness();
  const { environment, observers } = createIntersectionEnvironment(true);

  initVelourScrollReveals(root, environment);

  assert.equal(observers.length, 0);
  assert.equal(root.documentElement.classList.contains('velour-motion-ready'), false);
  assert.equal(targets.every((target) => target.classList.contains('is-revealed')), true);
});

test('scroll reveal group delays increase by 90ms and cap at 360ms', async () => {
  const initVelourScrollReveals = await loadScrollRevealScript();
  const { root, targets } = createRevealHarness(7);
  const { environment } = createIntersectionEnvironment();

  initVelourScrollReveals(root, environment);

  assert.equal(targets[0].style.getPropertyValue('--velour-reveal-delay'), '0ms');
  assert.equal(targets[1].style.getPropertyValue('--velour-reveal-delay'), '90ms');
  assert.equal(targets[4].style.getPropertyValue('--velour-reveal-delay'), '360ms');
  assert.equal(targets[6].style.getPropertyValue('--velour-reveal-delay'), '360ms');
});

test('scroll reveal initialization tolerates missing and empty roots', async () => {
  const initVelourScrollReveals = await loadScrollRevealScript();
  const emptyRoot = {
    documentElement: { classList: new FakeClassList() },
    querySelectorAll() {
      return [];
    },
  };

  assert.doesNotThrow(() => initVelourScrollReveals(null, {}));
  assert.doesNotThrow(() => initVelourScrollReveals(emptyRoot, {}));
  assert.equal(emptyRoot.documentElement.classList.contains('velour-motion-ready'), false);
});

test('editorial templates opt into reveals while Presence Profile keeps its own motion', async () => {
  const revealTemplates = [
    'front-page.php',
    'page-templates/about.php',
    'page-templates/bundles.php',
    'page-templates/contact.php',
    'archive-product.php',
    'single-product.php',
    'template-parts/product-card.php',
  ];

  for (const file of revealTemplates) {
    assert.match(await readThemeFile(file), /data-velour-reveal(?:=|\s|>)/, file);
  }

  for (const file of ['front-page.php', 'page-templates/about.php', 'page-templates/bundles.php', 'archive-product.php']) {
    assert.match(await readThemeFile(file), /data-velour-reveal-group(?:=|\s|>)/, file);
  }

  assert.doesNotMatch(await readThemeFile('page-templates/presence-profile.php'), /data-velour-reveal/);
});

test('scroll reveal CSS is progressive, editorial, and reduced-motion safe', async () => {
  const stylesheet = await readThemeFile('style.css');

  assert.match(stylesheet, /\.velour-motion-ready\s+\[data-velour-reveal\][\s\S]*?opacity:\s*0/);
  assert.match(stylesheet, /\.velour-motion-ready\s+\[data-velour-reveal\][\s\S]*?translateY\(24px\)/);
  assert.match(stylesheet, /transition[^;]*650ms/);
  assert.match(stylesheet, /transition-delay:\s*var\(--velour-reveal-delay,\s*0ms\)/);
  assert.match(stylesheet, /\[data-velour-reveal=["']image["']\][\s\S]*?scale\(0\.985\)/);
  assert.match(stylesheet, /\[data-velour-reveal\]\.is-revealed[\s\S]*?opacity:\s*1[\s\S]*?transform:\s*none/);
  assert.match(
    stylesheet,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.velour-motion-ready\s+\[data-velour-reveal\]\s*\{[^}]*transition:\s*none/,
  );
  assert.match(
    stylesheet,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.velour-motion-ready\s+\[data-velour-reveal\]\s*\{[^}]*transform:\s*none/,
  );
  assert.doesNotMatch(stylesheet, /scroll\s*\([^)]*\)|animation-timeline|view-timeline/i);
});

test('the theme contains every Task 3 WooCommerce entry point', async () => {
  for (const file of [
    'inc/woocommerce.php',
    'template-parts/product-card.php',
    'archive-product.php',
    'single-product.php',
  ]) {
    assert.ok((await stat(path.join(themeDirectory, file))).isFile(), file);
  }
});

test('functions.php loads the WooCommerce module without dropping existing modules', async () => {
  const functions = await readThemeFile('functions.php');

  for (const module of ['setup', 'assets', 'woocommerce']) {
    assert.match(
      functions,
      new RegExp(`require_once\\s+get_theme_file_path\\(\\s*['"]/?inc/${module}\\.php['"]\\s*\\)\\s*;`),
    );
  }
});

test('WooCommerce setup declares core and gallery support on after_setup_theme', async () => {
  const wooCommerce = await readThemeFile('inc/woocommerce.php');

  assert.match(wooCommerce, /function\s+velour_standard_woocommerce_setup\(\)\s*:\s*void/);
  assert.match(wooCommerce, /add_action\(\s*'after_setup_theme'\s*,\s*'velour_standard_woocommerce_setup'/);
  for (const support of ['woocommerce', 'wc-product-gallery-zoom', 'wc-product-gallery-lightbox', 'wc-product-gallery-slider']) {
    assert.match(wooCommerce, new RegExp(`add_theme_support\\(\\s*'${support}'\\s*\\)`));
  }
  assert.match(wooCommerce, /remove_action\(\s*'woocommerce_before_main_content'\s*,\s*'woocommerce_output_content_wrapper'/);
  assert.match(wooCommerce, /remove_action\(\s*'woocommerce_after_main_content'\s*,\s*'woocommerce_output_content_wrapper_end'/);
});

test('the WooCommerce module loads the product-card helper only when its API is available', async () => {
  const wooCommerce = await readThemeFile('inc/woocommerce.php');

  assert.match(wooCommerce, /class_exists\(\s*'WC_Product'\s*\)/);
  assert.match(
    wooCommerce,
    /require_once\s+get_theme_file_path\(\s*['"]\/?template-parts\/product-card\.php['"]\s*\)\s*;/,
  );
});

test('the cart count uses guarded WooCommerce APIs and refreshes as an accessible fragment', async () => {
  const wooCommerce = await readThemeFile('inc/woocommerce.php');

  assert.match(wooCommerce, /function_exists\(\s*'WC'\s*\)/);
  assert.match(wooCommerce, /function_exists\(\s*'wc_get_cart_url'\s*\)/);
  assert.match(wooCommerce, /WC\(\)->cart->get_cart_contents_count\(\)/);
  assert.match(wooCommerce, /esc_url\(\s*wc_get_cart_url\(\)\s*\)/);
  assert.match(wooCommerce, /class="velour-cart-link"[^>]*aria-label=/);
  assert.match(wooCommerce, /isset\(\s*\$args->theme_location\s*\)/);
  assert.match(wooCommerce, /'primary'\s*!==\s*\$args->theme_location/);
  assert.match(wooCommerce, /add_filter\(\s*'woocommerce_add_to_cart_fragments'/);
  assert.match(wooCommerce, /\$fragments\[\s*'a\.velour-cart-link'\s*\]/);
  assert.doesNotMatch(wooCommerce, /mini-cart|cart drawer|\/cart(?:\/add)?\.js/i);
});

test('the product card uses WC_Product APIs, honest fallbacks, and WooCommerce-owned loop actions', async () => {
  const productCard = await readThemeFile('template-parts/product-card.php');

  assert.match(productCard, /function\s+velour_standard_product_card\(\s*WC_Product\s+\$product\s*\)\s*:\s*void/);
  for (const method of [
    'get_name',
    'get_permalink',
    'get_image_id',
    'get_image',
    'get_price_html',
    'is_in_stock',
    'is_purchasable',
  ]) {
    assert.match(productCard, new RegExp(`\\$product->${method}\\(`));
  }
  assert.match(productCard, /wc_placeholder_img\(/);
  assert.match(productCard, /Price unavailable/);
  assert.match(productCard, /Out of stock/);
  assert.match(productCard, /Not available for purchase/);
  assert.match(productCard, /if\s*\(\s*\$is_purchasable\s*&&\s*\$is_in_stock\s*\)/);
  assert.match(productCard, /woocommerce_template_loop_add_to_cart\(/);
  assert.match(productCard, /class="velour-product-card__action"/);
  assert.doesNotMatch(productCard, /get_add_to_cart_url|get_add_to_cart_text|add_to_cart_button/);
  assert.doesNotMatch(productCard, /Add %s to your cart|\$button_label/);
  assert.match(productCard, /esc_url\(/);
  assert.match(productCard, /esc_attr\(/);
  assert.match(productCard, /esc_html\(/);
  assert.match(productCard, /wp_kses_post\(\s*\$price_html\s*\)/);
});

function assertSourceOrder(source, patterns) {
  let cursor = 0;

  for (const pattern of patterns) {
    const match = source.slice(cursor).match(pattern);
    assert.ok(match, `missing ordered source contract: ${pattern}`);
    cursor += match.index + match[0].length;
  }
}

test('the shop archive source preserves the canonical WooCommerce hook sequence', async () => {
  const archive = await readThemeFile('archive-product.php');

  assert.match(archive, /get_header\(\s*'shop'\s*\)/);
  assert.match(archive, /get_footer\(\s*'shop'\s*\)/);
  assert.match(archive, /class_exists\(\s*'WooCommerce'\s*\)/);
  assert.match(archive, /function_exists\(\s*'woocommerce_product_loop'\s*\)/);
  assert.match(
    archive,
    /<div\s+class="velour-shop-header-reveal"\s+data-velour-reveal>[\s\S]*?do_action\(\s*'woocommerce_shop_loop_header'\s*\)[\s\S]*?<\/div>/,
  );

  assertSourceOrder(archive, [
    /do_action\(\s*'woocommerce_before_main_content'\s*\)/,
    /do_action\(\s*'woocommerce_shop_loop_header'\s*\)/,
    /woocommerce_product_loop\(\)/,
    /do_action\(\s*'woocommerce_before_shop_loop'\s*\)/,
    /woocommerce_product_loop_start\(\)/,
    /while\s*\(\s*have_posts\(\)\s*\)/,
    /do_action\(\s*'woocommerce_shop_loop'\s*\)/,
    /velour_standard_product_card\(/,
    /woocommerce_product_loop_end\(\)/,
    /do_action\(\s*'woocommerce_after_shop_loop'\s*\)/,
    /do_action\(\s*'woocommerce_no_products_found'\s*\)/,
    /do_action\(\s*'woocommerce_after_main_content'\s*\)/,
    /do_action\(\s*'woocommerce_sidebar'\s*\)/,
  ]);

  for (const hook of [
    'woocommerce_before_main_content',
    'woocommerce_shop_loop_header',
    'woocommerce_before_shop_loop',
    'woocommerce_shop_loop',
    'woocommerce_after_shop_loop',
    'woocommerce_no_products_found',
    'woocommerce_after_main_content',
    'woocommerce_sidebar',
  ]) {
    assert.equal(archive.match(new RegExp(`do_action\\(\\s*'${hook}'`, 'g'))?.length, 1, hook);
  }

  assert.match(archive, /}\s*else\s*\{\s*\?>[\s\S]*?<main id="main" class="velour-shop velour-shop--archive">/);
  assert.match(archive, /WooCommerce is not active/);
});

test('WooCommerce wrappers and no-products presentation remain hook-owned', async () => {
  const wooCommerce = await readThemeFile('inc/woocommerce.php');

  assert.equal((wooCommerce.match(/add_action\(\s*'woocommerce_before_main_content'/g) ?? []).length, 1);
  assert.equal((wooCommerce.match(/add_action\(\s*'woocommerce_after_main_content'/g) ?? []).length, 1);
  assert.match(wooCommerce, /function\s+velour_standard_woocommerce_wrapper_start\(\)[\s\S]*?<main id="main" class="velour-shop/);
  assert.match(wooCommerce, /function\s+velour_standard_woocommerce_wrapper_end\(\)[\s\S]*?<\/main>/);
  assert.match(wooCommerce, /add_action\(\s*'woocommerce_no_products_found'\s*,\s*'velour_standard_no_products_found'/);
  assert.match(wooCommerce, /function\s+velour_standard_no_products_found\(\)[\s\S]*?No products are available/);
});

test('the single-product template delegates commerce rendering and guards inactive WooCommerce', async () => {
  const singleProduct = await readThemeFile('single-product.php');

  assert.match(singleProduct, /get_header\(/);
  assert.match(singleProduct, /get_footer\(/);
  assert.match(singleProduct, /class_exists\(\s*'WooCommerce'\s*\)/);
  assert.match(singleProduct, /function_exists\(\s*'woocommerce_content'\s*\)/);
  assert.match(singleProduct, /woocommerce_content\(\)/);
  assert.match(singleProduct, /WooCommerce is not active/);
  assert.doesNotMatch(singleProduct, /add_to_cart|variation|checkout/i);
});

test('WooCommerce presentation is scoped and contains no Shopify cart endpoints', async () => {
  const stylesheet = await readThemeFile('style.css');

  for (const selector of [
    'velour-shop',
    'velour-product-grid',
    'velour-product-card',
    'velour-product-price',
    'velour-product-availability',
    'woocommerce-notices-wrapper',
    'woocommerce-pagination',
    'velour-commerce-empty',
  ]) {
    assert.match(stylesheet, new RegExp(`\\.${selector}`));
  }

  for (const file of ['inc/woocommerce.php', 'template-parts/product-card.php', 'archive-product.php', 'single-product.php']) {
    assert.doesNotMatch(await readThemeFile(file), /\/cart(?:\/add)?\.js|Shopify\b|routes\.cart/i, file);
  }
});

test('the theme contains every Task 4 editorial route, contact module, and approved image', async () => {
  for (const file of [
    'front-page.php',
    'page.php',
    'page-templates/about.php',
    'page-templates/bundles.php',
    'page-templates/contact.php',
    '404.php',
    'search.php',
    'inc/contact.php',
    'assets/images/velour-perfume-display.png',
    'assets/images/velour-bundle-complete.avif',
  ]) {
    assert.ok((await stat(path.join(themeDirectory, file))).isFile(), file);
  }
});

test('every Task 4 template preserves the shared shell and skip-link destination', async () => {
  for (const file of [
    'front-page.php',
    'page.php',
    'page-templates/about.php',
    'page-templates/bundles.php',
    'page-templates/contact.php',
    '404.php',
    'search.php',
  ]) {
    const source = await readThemeFile(file);
    assert.match(source, /get_header\(\)/, file);
    assert.match(source, /<main\b[^>]*\bid="main"/, file);
    assert.match(source, /get_footer\(\)/, file);
  }
});

test('the homepage keeps the approved editorial story and uses guarded WooCommerce product queries', async () => {
  const homepage = await readThemeFile('front-page.php');

  for (const copy of [
    'New on Velour',
    'Middle Eastern fragrances',
    'Shop by category',
    'Featured collection',
    'Define your presence.',
    'Our philosophy',
    'Presence is built in private.',
  ]) {
    assert.match(homepage, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(homepage, /function_exists\(\s*'wc_get_products'\s*\)/);
  assert.match(homepage, /wc_get_products\(/);
  assert.match(homepage, /'category'\s*=>\s*array\(\s*'fragrances'\s*\)/);
  assert.match(homepage, /'category'\s*=>\s*array\(\s*'cases-displays'\s*\)/);
  assert.match(homepage, /function_exists\(\s*'velour_standard_product_card'\s*\)/);
  assert.match(homepage, /velour_standard_product_card\(/);
  assert.match(homepage, /The collection is being prepared/);
  assert.match(homepage, /the_content\(\)/);
  assert.doesNotMatch(homepage, /Shopify|collections\[|all_products|\/cart(?:\/add)?\.js/i);
});

test('authored front-page content replaces the built-in editorial body', async () => {
  const homepage = await readThemeFile('front-page.php');

  assert.match(homepage, /\$front_page_content\s*=\s*get_the_content\(\)/);
  assert.match(homepage, /\$has_authored_content\s*=\s*''\s*!==\s*trim\(\s*wp_strip_all_tags\(\s*\$front_page_content\s*\)\s*\)/);
  assert.match(homepage, /if\s*\(\s*\$has_authored_content\s*\)\s*:\s*\?>[\s\S]*?the_content\(\)[\s\S]*?<\?php\s+else\s*:\s*\?>[\s\S]*?New on Velour/);
  assert.equal((homepage.match(/(?<!get_)the_content\(\)/g) ?? []).length, 1);
});

test('homepage product-category destinations honor generated taxonomy permalinks and safe fallbacks', async () => {
  const homepage = await readThemeFile('front-page.php');

  assert.match(homepage, /taxonomy_exists\(\s*'product_cat'\s*\)/);
  assert.match(homepage, /get_term_by\(\s*'slug'\s*,\s*\$slug\s*,\s*'product_cat'\s*\)/);
  assert.match(homepage, /get_term_link\(\s*\$term\s*\)/);
  assert.match(homepage, /is_wp_error\(\s*\$term_url\s*\)/);
  assert.match(homepage, /velour_standard_product_term_url\(\s*'fragrances'\s*,\s*\$shop_url\s*\)/);
  assert.match(homepage, /velour_standard_product_term_url\(\s*'cases-displays'\s*,\s*\$shop_url\s*\)/);
  assert.match(homepage, /get_post_type_archive_link\(\s*'product'\s*\)[\s\S]*?home_url\(\s*'\/'\s*\)/);
  assert.doesNotMatch(homepage, /\/product-category\//);
});

test('editorial page templates keep editable content and their established Velour copy', async () => {
  const page = await readThemeFile('page.php');
  const about = await readThemeFile('page-templates/about.php');
  const bundles = await readThemeFile('page-templates/bundles.php');

  assert.match(page, /echo\s+esc_html\(\s*get_the_title\(\)\s*\)/);
  assert.match(page, /the_content\(\)/);

  for (const source of [about, bundles]) {
    assert.match(source, /get_the_content\(\)/);
    assert.match(source, /the_content\(\)/);
  }

  assert.match(about, /Presence is built in private\./);
  assert.match(about, /Quiet luxury/);
  assert.match(about, /Discipline/);
  assert.match(about, /Environment/);
  assert.match(about, /Ritual/);
  assert.match(bundles, /The Executive Setup/);
  assert.match(bundles, /The Signature Ritual/);
  assert.match(bundles, /The Complete Velour Set/);
  assert.match(bundles, /velour-bundle-complete\.avif/);
});

test('the contact form exposes the exact approved fields and subject allowlist', async () => {
  const contact = await readThemeFile('page-templates/contact.php');
  const labels = [...contact.matchAll(/<label\b[\s\S]*?<span>([^<]+)<\/span>[\s\S]*?<\/(?:label)>/g)].map((match) => match[1].trim());
  const subjects = [...contact.matchAll(/<option\s+value="([^"]+)"/g)].map((match) => match[1]);

  assert.deepEqual(labels, [
    'Full Name',
    'Email Address',
    'Order Number (Optional)',
    'Subject',
    'Message',
  ]);
  assert.deepEqual(subjects, [
    'General Enquiry',
    'Order Support',
    'Shipping Question',
    'Return Request',
    'Product Recommendation',
    'Wholesale / Partnership',
    'Other',
  ]);
  assert.match(contact, /action="<\?php echo esc_url\(\s*admin_url\(\s*'admin-post\.php'\s*\)\s*\); \?>"/);
  assert.match(contact, /wp_nonce_field\(\s*'velour_standard_contact'\s*,\s*'velour_contact_nonce'\s*\)/);
  assert.match(contact, /name="velour_website"/);
  assert.match(contact, /name="velour_started_at"/);
  assert.match(contact, /name="velour_timing_token"/);
  assert.match(contact, /wp_hash\(\s*\(string\)\s*\$form_started_at\s*,\s*'nonce'\s*\)/);
  assert.match(contact, /name="velour_name"[^>]*maxlength="120"/);
  assert.match(contact, /name="velour_email"[^>]*maxlength="254"/);
  assert.match(contact, /name="velour_order_number"[^>]*maxlength="64"/);
  assert.match(contact, /name="velour_message"[^>]*maxlength="5000"/);
  assert.match(contact, /role="(?:status|alert)"/);
  assert.match(contact, /get_the_content\(\)/);
  assert.match(contact, /the_content\(\)/);
});

test('the contact handler enforces method, nonce, spam, sanitization, and safe mail boundaries', async () => {
  const functions = await readThemeFile('functions.php');
  const contact = await readThemeFile('inc/contact.php');

  assert.match(functions, /require_once\s+get_theme_file_path\(\s*['"]\/?inc\/contact\.php['"]\s*\)\s*;/);
  assert.match(contact, /add_action\(\s*'admin_post_nopriv_velour_standard_contact'/);
  assert.match(contact, /add_action\(\s*'admin_post_velour_standard_contact'/);
  assert.match(contact, /\$_SERVER\['REQUEST_METHOD'\][\s\S]*?'POST'/);
  assert.match(contact, /wp_verify_nonce\(/);
  assert.match(contact, /velour_website/);
  assert.match(contact, /sanitize_text_field\(/);
  assert.match(contact, /sanitize_email\(/);
  assert.match(contact, /sanitize_textarea_field\(/);
  assert.match(contact, /is_email\(/);
  assert.match(contact, /in_array\(\s*\$subject\s*,\s*\$allowed_subjects\s*,\s*true\s*\)/);
  const handlerSubjects = [...contact.matchAll(/^\s*'((?:General Enquiry|Order Support|Shipping Question|Return Request|Product Recommendation|Wholesale \/ Partnership|Other))',\s*$/gm)].map((match) => match[1]);
  assert.deepEqual(handlerSubjects, [
    'General Enquiry',
    'Order Support',
    'Shipping Question',
    'Return Request',
    'Product Recommendation',
    'Wholesale / Partnership',
    'Other',
  ]);
  assert.match(contact, /get_option\(\s*'admin_email'\s*\)/);
  assert.match(contact, /wp_mail\(\s*\$recipient\s*,\s*\$mail_subject\s*,\s*\$body\s*,\s*\$headers\s*\)/);
  assert.match(contact, /wp_safe_redirect\(/);
  assert.match(contact, /add_query_arg\(\s*'contact_status'\s*,\s*\$status/);
  assert.doesNotMatch(contact, /\$_POST[^;]*(?:recipient|headers)|wp_mail\([^;]*\$_POST/i);
  assert.doesNotMatch(contact, /add_query_arg\([^;]*(?:name|email|message|order|subject)/i);
});

test('the contact handler bounds payloads and rejects implausibly fast or stale forms', async () => {
  const contact = await readThemeFile('inc/contact.php');

  assert.match(contact, /velour_started_at/);
  assert.match(contact, /velour_timing_token/);
  assert.match(contact, /wp_hash\(\s*\(string\)\s*\$started_at\s*,\s*'nonce'\s*\)/);
  assert.match(contact, /hash_equals\(/);
  assert.match(contact, /\$form_age\s*=\s*time\(\)\s*-\s*\$started_at/);
  assert.match(contact, /\$form_age\s*<\s*3/);
  assert.match(contact, /\$form_age\s*>\s*2\s*\*\s*HOUR_IN_SECONDS/);
  for (const [field, limit] of [['name', 120], ['email', 254], ['order_number', 64], ['subject', 40], ['message', 5000]]) {
    assert.match(contact, new RegExp(`velour_standard_contact_length\\(\\s*\\$${field}\\s*\\)\\s*>\\s*${limit}`));
  }
});

test('anonymous contact mail uses a stable address-only HMAC throttle key', async () => {
  const contact = await readThemeFile('inc/contact.php');

  assert.match(contact, /function\s+velour_standard_contact_rate_key\(\)\s*:\s*string/);
  assert.match(contact, /\$_SERVER\['REMOTE_ADDR'\]/);
  assert.match(contact, /hash_hmac\(\s*'sha256'\s*,\s*\$ip\s*,\s*wp_salt\(\s*'auth'\s*\)\s*\)/);
  assert.doesNotMatch(contact, /HTTP_USER_AGENT|HTTP_X_FORWARDED_FOR|HTTP_FORWARDED|HTTP_CF_CONNECTING_IP|\$user_agent/);
  assert.match(contact, /get_transient\(\s*\$rate_key\s*\)/);
  assert.match(contact, /\$attempts\s*>=\s*5/);
  assert.match(contact, /set_transient\(\s*\$rate_key\s*,\s*\$attempts\s*\+\s*1\s*,\s*10\s*\*\s*MINUTE_IN_SECONDS\s*\)/);
  assert.doesNotMatch(contact, /set_transient\([^;]*(?:REMOTE_ADDR|HTTP_USER_AGENT|\$ip|\$user_agent)/);
});

test('contact mail has one sanitized Reply-To header and truthful controlled statuses', async () => {
  const handler = await readThemeFile('inc/contact.php');
  const template = await readThemeFile('page-templates/contact.php');

  assert.match(handler, /str_replace\(\s*array\(\s*"\\r"\s*,\s*"\\n"\s*\)\s*,\s*''\s*,\s*\$email\s*\)/);
  assert.match(handler, /\$headers\s*=\s*array\(\s*'Reply-To: '\s*\.\s*\$reply_to_email\s*\)/);
  assert.match(handler, /array\(\s*'submitted'\s*,\s*'invalid'\s*,\s*'error'\s*,\s*'rate_limited'\s*\)/);
  assert.match(template, /'submitted'\s*===\s*\$status/);
  assert.match(template, /Your note has been submitted/);
  assert.match(template, /'rate_limited'\s*===\s*\$status/);
  assert.doesNotMatch(template, /has been (?:received|delivered)/i);
  assert.doesNotMatch(handler, /Reply-To:[^\n]*\$(?:name|subject|message|order_number)/);
});

test('search and not-found templates preserve useful WordPress routes', async () => {
  const search = await readThemeFile('search.php');
  const notFound = await readThemeFile('404.php');

  assert.match(search, /get_search_form\(\)/);
  assert.match(search, /have_posts\(\)/);
  assert.match(search, /echo\s+esc_url\(\s*get_permalink\(\)\s*\)/);
  assert.match(search, /echo\s+esc_html\(\s*get_the_title\(\)\s*\)/);
  assert.match(search, /the_posts_pagination\(/);
  assert.match(notFound, /get_search_form\(\)/);
  assert.match(notFound, /home_url\(\s*'\/'\s*\)/);
  assert.match(notFound, /home_url\(\s*'\/shop\/'\s*\)/);
});

test('Presence Profile files are loaded and use the shared WordPress shell', async () => {
  for (const file of [
    'inc/presence-profile.php',
    'page-templates/presence-profile.php',
    'assets/js/velour-presence.js',
  ]) {
    assert.ok((await stat(path.join(themeDirectory, file))).isFile(), file);
  }

  const functions = await readThemeFile('functions.php');
  const template = await readThemeFile('page-templates/presence-profile.php');
  assert.match(functions, /require_once\s+get_theme_file_path\(\s*['"]\/?inc\/presence-profile\.php['"]\s*\)\s*;/);
  assert.match(template, /Template Name:\s*Presence Profile/);
  assert.match(template, /get_header\(\)/);
  assert.match(template, /<main\b[^>]*\bid="main"/);
  assert.match(template, /get_footer\(\)/);
  assert.match(template, /data-presence-gender/);
  assert.match(template, /data-presence-email-form/);
  assert.match(template, /data-presence-skip/);
  assert.match(template, /Complete Your Ritual/);
  assert.match(template, /data-presence-status[^>]*role="status"[^>]*aria-live="polite"/);
  assertSourceOrder(template, [
    /data-presence-status[^>]*role="status"[^>]*aria-live="polite"/,
    /data-presence-result-panel[^>]*role="region"[^>]*aria-labelledby="velour-presence-result-title"/,
    /id="velour-presence-result-title"[^>]*data-presence-result-title/,
  ]);
});

test('Presence Profile assets and REST configuration are localized only on its template', async () => {
  const assets = await readThemeFile('inc/assets.php');

  assert.match(assets, /is_page_template\(\s*'page-templates\/presence-profile\.php'\s*\)/);
  assert.match(assets, /wp_enqueue_script\(\s*'velour-presence'/);
  assert.match(assets, /wp_localize_script\(\s*'velour-presence'\s*,\s*'velourPresence'/);
  assert.match(assets, /rest_url\(\s*'velour\/v1\/recommendations'\s*\)/);
  assert.match(assets, /rest_url\(\s*'velour\/v1\/products'\s*\)/);
  assert.match(assets, /wp_create_nonce\(\s*'wp_rest'\s*\)/);
  assert.doesNotMatch(assets, /webhook|n8n|secret|api[_-]?key/i);
});

test('Presence Profile registers bounded recommendation and product REST routes', async () => {
  const presence = await readThemeFile('inc/presence-profile.php');

  assert.match(presence, /add_action\(\s*'rest_api_init'\s*,\s*'velour_standard_register_presence_routes'\s*\)/);
  assert.match(presence, /register_rest_route\(\s*'velour\/v1'\s*,\s*'\/recommendations'/);
  assert.match(presence, /register_rest_route\(\s*'velour\/v1'\s*,\s*'\/products'/);
  assert.match(presence, /'methods'\s*=>\s*WP_REST_Server::CREATABLE/);
  assert.match(presence, /'permission_callback'\s*=>\s*'velour_standard_presence_permission'/);
  assert.match(presence, /CONTENT_LENGTH/);
  assert.match(presence, />\s*16384/);
  assert.match(presence, /count\(\s*\$answers\s*\)\s*>\s*8/);
  assert.match(presence, /count\(\s*\$handles\s*\)\s*>\s*8/);
  assert.match(presence, /array_diff\(\s*array_keys\(/);
  assert.match(presence, /sanitize_email\(/);
  assert.match(presence, /sanitize_text_field\(/);
  assert.match(presence, /sanitize_title\(/);
});

test('Presence Profile public access requires a REST nonce or an exact normalized same-site Origin', async () => {
  const presence = await readThemeFile('inc/presence-profile.php');

  assert.match(presence, /wp_verify_nonce\(\s*\$nonce\s*,\s*'wp_rest'\s*\)/);
  assert.match(presence, /get_header\(\s*'Origin'\s*\)/);
  assert.match(presence, /home_url\(\s*'\/'\s*\)/);
  assert.match(presence, /wp_parse_url\(/);
  assert.match(presence, /hash_equals\(/);
  assert.match(presence, /new\s+WP_Error\(/);
  assert.match(presence, /rest_forbidden_origin/);
  assert.match(presence, /CSRF[^\n]*origin[^\n]*not authorization/i);
});

test('public recommendations are rate limited by a private server-observed address digest', async () => {
  const presence = await readThemeFile('inc/presence-profile.php');

  assert.match(presence, /function\s+velour_standard_presence_rate_key\(\)\s*:\s*string/);
  assert.match(presence, /\$_SERVER\['REMOTE_ADDR'\]/);
  assert.match(presence, /hash_hmac\(\s*'sha256'\s*,\s*\$ip\s*,\s*wp_salt\(\s*'auth'\s*\)\s*\)/);
  assert.doesNotMatch(presence, /HTTP_USER_AGENT|HTTP_X_FORWARDED_FOR|HTTP_FORWARDED|HTTP_CF_CONNECTING_IP|\$user_agent/);
  assert.match(presence, /get_transient\(\s*\$rate_key\s*\)/);
  assert.match(presence, /\$attempts\s*>=\s*(?:[3-9]|10)/);
  assert.match(presence, /set_transient\(\s*\$rate_key\s*,\s*\$attempts\s*\+\s*1\s*,\s*10\s*\*\s*MINUTE_IN_SECONDS\s*\)/);
  assert.match(presence, /presence_rate_limited/);
  assert.match(presence, /'status'\s*=>\s*429/);
  assert.match(presence, /'retry_after'\s*=>\s*\$retry_after/);
  assert.match(presence, /presence_rate_limited[\s\S]*?10\s*\*\s*MINUTE_IN_SECONDS/);
  assert.doesNotMatch(presence, /set_transient\([^;]*(?:REMOTE_ADDR|\$ip|\$email|\$answers|\$payload)/);
});

test('normalized duplicate recommendations are suppressed with an HMAC-only transient', async () => {
  const presence = await readThemeFile('inc/presence-profile.php');

  assert.match(presence, /function\s+velour_standard_presence_replay_key\(\s*array\s+\$payload\s*\)\s*:\s*string/);
  assert.match(presence, /hash_hmac\(\s*'sha256'\s*,\s*wp_json_encode\(\s*\$payload\s*\)\s*,\s*wp_salt\(\s*'nonce'\s*\)\s*\)/);
  assert.match(presence, /get_transient\(\s*\$replay_key\s*\)/);
  assert.match(presence, /set_transient\(\s*\$replay_key\s*,\s*1\s*,\s*2\s*\*\s*MINUTE_IN_SECONDS\s*\)/);
  assert.match(presence, /presence_duplicate_submission/);
  assert.match(presence, /presence_duplicate_submission[\s\S]*?2\s*\*\s*MINUTE_IN_SECONDS/);
  assert.doesNotMatch(presence, /set_transient\([^;]*(?:\$email|\$answers|\$payload|quiz_answers)/);
  assertSourceOrder(presence, [
    /velour_standard_sanitize_presence_payload\(\s*\$request\s*\)/,
    /velour_standard_presence_guard_submission\(\s*\$payload\s*\)/,
    /wp_remote_post\(/,
  ]);
});

test('recommendation proxy uses safe server-side configuration and validates the n8n response', async () => {
  const presence = await readThemeFile('inc/presence-profile.php');

  assert.match(presence, /defined\(\s*'VELOUR_PRESENCE_WEBHOOK_URL'\s*\)/);
  assert.match(presence, /getenv\(\s*'VELOUR_PRESENCE_WEBHOOK_URL'\s*\)/);
  assert.match(presence, /apply_filters\(\s*'velour_standard_presence_webhook_url'/);
  assert.match(presence, /wp_http_validate_url\(/);
  assert.match(presence, /wp_remote_post\(/);
  assert.match(presence, /'timeout'\s*=>\s*(?:[1-9]|10)/);
  assert.match(presence, /wp_remote_retrieve_response_code\(/);
  assert.match(presence, /json_decode\(/);
  assert.match(presence, /velour_standard_validate_recommendation/);
  assert.doesNotMatch(presence, /https?:\/\/[^'"\s]*n8n|webhook\/velour|\b(?:sk|pk)_[A-Za-z0-9_-]{20,}|Bearer\s+[A-Za-z0-9._-]{20,}/i);
});

test('product lookup returns published products with WooCommerce-owned action semantics', async () => {
  const presence = await readThemeFile('inc/presence-profile.php');

  assert.match(presence, /class_exists\(\s*'WooCommerce'\s*\)/);
  assert.match(presence, /function_exists\(\s*'wc_get_product'\s*\)/);
  assert.match(presence, /get_page_by_path\(\s*\$handle\s*,\s*OBJECT\s*,\s*'product'\s*\)/);
  assert.match(presence, /'publish'\s*!==\s*\$post->post_status/);
  assert.match(presence, /array_unique\(/);
  assert.match(presence, /\$handles\s+as\s+\$handle/);
  for (const method of ['get_name', 'get_slug', 'get_image_id', 'get_price_html', 'is_in_stock', 'is_purchasable', 'add_to_cart_url', 'add_to_cart_text', 'get_type']) {
    assert.match(presence, new RegExp(`\\$product->${method}\\(`));
  }
  assert.match(presence, /wp_get_attachment_image_url\(/);
  assert.match(presence, /wp_strip_all_tags\(/);
  assert.match(presence, /get_permalink\(/);
  assert.match(presence, /esc_url_raw\(\s*\$product->add_to_cart_url\(\)\s*\)/);
  assert.match(presence, /sanitize_text_field\(\s*\$product->add_to_cart_text\(\)\s*\)/);
  assert.match(presence, /'simple'\s*===\s*\$product->get_type\(\)/);
  for (const actionKind of ['quick_add', 'select_options', 'view_products', 'buy_product', 'view_product']) {
    assert.match(presence, new RegExp(`'${actionKind}'`));
  }
  assert.match(presence, /'available'\s*=>\s*\$available/);
  assert.match(presence, /'actionKind'\s*=>\s*\$action_kind/);
  assert.match(presence, /'actionLabel'\s*=>\s*\$action_label/);
  assert.match(presence, /'actionUrl'\s*=>\s*\$action_url/);
  assert.doesNotMatch(presence, /wc_get_cart_url\(|add_query_arg\(\s*'add-to-cart'/);
});

test('Presence Profile styling keeps the full-screen flow, responsive layout, focus, and reduced motion', async () => {
  const stylesheet = await readThemeFile('style.css');

  for (const selector of [
    'velour-presence-profile',
    'velour-presence-panel',
    'velour-presence-progress',
    'velour-presence-answers',
    'velour-presence-result-grid',
    'velour-presence-product-grid',
  ]) {
    assert.match(stylesheet, new RegExp(`\\.${selector}`));
  }
  assert.match(stylesheet, /\.velour-presence-profile[\s\S]*?min-height:\s*(?:100vh|100svh)/);
  assert.match(stylesheet, /\.velour-presence-answers[^}]*button:focus-visible/);
  assert.match(stylesheet, /@media\s*\(max-width:[\s\S]*?\.velour-presence/);
  assert.match(stylesheet, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.velour-presence/);
});

test('Task 4 styles remain scoped to editorial and utility surfaces', async () => {
  const stylesheet = await readThemeFile('style.css');

  for (const selector of [
    'velour-home',
    'velour-editorial-page',
    'velour-about-hero',
    'velour-bundles-hero',
    'velour-contact-form',
    'velour-search-results',
    'velour-not-found',
  ]) {
    assert.match(stylesheet, new RegExp(`\\.${selector}`));
  }
});

test('the installable package contains exactly the approved theme under one root', async () => {
  assert.ok((await stat(packageScript)).isFile(), 'package script is missing');
  assert.ok((await stat(packageArchive)).isFile(), 'theme package is missing');

  const entries = await archiveEntries(packageArchive);
  assert.equal(entries[0], 'velour-standard/');
  assert.ok(entries.every((entry) => entry === 'velour-standard/' || entry.startsWith('velour-standard/')));
  assert.deepEqual(
    entries.filter((entry) => !entry.endsWith('/')).sort(),
    packagedThemeFiles.map((file) => `velour-standard/${file}`).sort(),
  );
});

test('the installable package contains no Liquid, Shopify AJAX, credentials, or webhook URLs', async () => {
  const textFiles = packagedThemeFiles.filter((file) => ['.css', '.js', '.php'].includes(path.extname(file)));
  const forbiddenPatterns = [
    /\{\{|\}\}|\{%|%\}/,
    /\/(?:cart(?:\/add|\/change|\/update|\/clear)?\.js|recommendations\/products\.json|search\/suggest\.json)/i,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\b(?:(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9_-]{16,}|sk-[A-Za-z0-9_-]{20,}|(?:AKIA|ASIA)[A-Z0-9]{16}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|shpat_[A-Fa-f0-9]{32}|xox[baprs]-[A-Za-z0-9-]{20,})\b/,
    /\bBearer\s+[A-Za-z0-9._~+\/-]{16,}={0,2}\b/i,
    /https?:\/\/[^\s'"<>]*\/webhook(?:-test)?(?:\/[^\s'"<>]*)?/i,
    /\b(?:[A-Z][A-Z0-9]*_)*(?:API_KEY|API_TOKEN|ACCESS_TOKEN|AUTH_TOKEN|CLIENT_SECRET|PASSWORD|PRIVATE_KEY|SECRET_KEY)\s*=\s*['"]?[^\s'";]+/i,
  ];

  for (const file of textFiles) {
    const { stdout } = await execFile('/usr/bin/unzip', ['-p', packageArchive, `velour-standard/${file}`]);
    for (const pattern of forbiddenPatterns) {
      assert.doesNotMatch(stdout, pattern, file);
    }
  }
});

test('packaging preserves approved images byte-for-byte', async () => {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'velour-package-images-'));

  try {
    await execFile('/usr/bin/unzip', ['-q', packageArchive, '-d', temporaryDirectory]);
    for (const file of [
      'assets/images/velour-bundle-complete.avif',
      'assets/images/velour-perfume-display.png',
    ]) {
      assert.equal(
        await sha256(path.join(temporaryDirectory, 'velour-standard', file)),
        await sha256(path.join(themeDirectory, file)),
        file,
      );
    }
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
});

test('two package builds produce identical listings and extracted file hashes', async () => {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'velour-package-reproducibility-'));
  const firstArchive = path.join(temporaryDirectory, 'first.zip');
  const secondArchive = path.join(temporaryDirectory, 'second.zip');
  const firstExtraction = path.join(temporaryDirectory, 'first');
  const secondExtraction = path.join(temporaryDirectory, 'second');

  try {
    await execFile(process.execPath, [packageScript]);
    await copyFile(packageArchive, firstArchive);
    await execFile(process.execPath, [packageScript]);
    await copyFile(packageArchive, secondArchive);

    assert.deepEqual(await archiveEntries(firstArchive), await archiveEntries(secondArchive));
    await execFile('/usr/bin/unzip', ['-q', firstArchive, '-d', firstExtraction]);
    await execFile('/usr/bin/unzip', ['-q', secondArchive, '-d', secondExtraction]);
    assert.deepEqual(await extractedHashes(firstExtraction), await extractedHashes(secondExtraction));
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
});

test('packaging fails closed on an unknown theme file without replacing the archive', async () => {
  const unexpectedFile = path.join(themeDirectory, 'unexpected.php');
  const archiveHash = await sha256(packageArchive);

  try {
    await writeFile(unexpectedFile, '<?php // Must never be packaged.\n', 'utf8');
    await assert.rejects(
      execFile(process.execPath, [packageScript]),
      /Unknown theme path: unexpected\.php/,
    );
    assert.equal(await sha256(packageArchive), archiveHash);
  } finally {
    await rm(unexpectedFile, { force: true });
  }
});

test('packaging rejects a symlinked source root and preserves the previous archive', async () => {
  const fixture = await createPackageFixture('velour-package-root-symlink-');
  const outsideTheme = path.join(fixture.directory, 'outside-theme');

  try {
    await execFile(process.execPath, [fixture.script]);
    const archiveHash = await sha256(fixture.archive);
    await rename(fixture.theme, outsideTheme);
    await symlink(outsideTheme, fixture.theme, 'dir');

    await assert.rejects(
      execFile(process.execPath, [fixture.script]),
      /Theme source root must be a non-symlinked directory/,
    );
    assert.equal(await sha256(fixture.archive), archiveHash);
  } finally {
    await rm(fixture.directory, { force: true, recursive: true });
  }
});

test('packaging rejects a symlinked allowlisted file and preserves the previous archive', async () => {
  const fixture = await createPackageFixture('velour-package-entry-symlink-');
  const header = path.join(fixture.theme, 'header.php');
  const outsideFile = path.join(fixture.directory, 'outside-header.php');

  try {
    await execFile(process.execPath, [fixture.script]);
    const archiveHash = await sha256(fixture.archive);
    await rename(header, outsideFile);
    await symlink(outsideFile, header, 'file');

    await assert.rejects(
      execFile(process.execPath, [fixture.script]),
      /Unsupported theme path: header\.php/,
    );
    assert.equal(await sha256(fixture.archive), archiveHash);
  } finally {
    await rm(fixture.directory, { force: true, recursive: true });
  }
});

test('packaging rejects requirement-derived credential mutations and preserves the previous archive', async () => {
  const fixture = await createPackageFixture('velour-package-secret-mutations-');
  const header = path.join(fixture.theme, 'header.php');
  const originalHeader = await readFile(header, 'utf8');
  const secrets = [
    'AWS_ACCESS_KEY_ID=AKIA0123456789ABCDEF',
    'AWS_SECRET_ACCESS_KEY=0123456789abcdefghijklmnopqrstuvwxyzABCD',
    'DATABASE_URL=postgres://user:password@example.test/velour',
    "define('AUTH_KEY', '0123456789abcdefghijklmnopqrstuvwxyzABCD');",
    "define('SECURE_AUTH_SALT', '0123456789abcdefghijklmnopqrstuvwxyzABCD');",
    'WORDPRESS_LOGGED_IN_KEY=0123456789abcdefghijklmnopqrstuvwxyzABCD',
    'NONCE_SALT=0123456789abcdefghijklmnopqrstuvwxyzABCD',
    'GITLAB_TOKEN=glpat-0123456789abcdefghijklmnopqrst',
    'GITHUB_TOKEN=ghp_0123456789abcdefghijklmnopqrst',
    'DEPLOY_SECRET=0123456789abcdefghijklmnopqrstuvwxyzABCD',
    'SESSION_TOKEN=0123456789abcdefghijklmnopqrstuvwxyzABCD',
    'ADMIN_PASSWORD=0123456789abcdefghijklmnopqrstuvwxyzABCD',
    'service_token=0123456789abcdefghijklmnopqrstuvwxyzABCD',
    '"client_secret": "0123456789abcdefghijklmnopqrstuvwxyzABCD"',
    'Authorization: Bearer abcdefghijklmnopqrstuvwxyz0123456789',
    '-----BEGIN OPENSSH PRIVATE KEY-----',
  ];

  try {
    await execFile(process.execPath, [fixture.script]);
    const archiveHash = await sha256(fixture.archive);

    for (const secret of secrets) {
      await writeFile(header, `${originalHeader}\n${secret}\n`, 'utf8');
      await assert.rejects(
        execFile(process.execPath, [fixture.script]),
        /Forbidden .+ found in header\.php/,
        secret,
      );
      assert.equal(await sha256(fixture.archive), archiveHash, secret);
    }
  } finally {
    await rm(fixture.directory, { force: true, recursive: true });
  }
});

test('packaging permits harmless secret-related variable names without assigned values', async () => {
  const fixture = await createPackageFixture('velour-package-secret-near-miss-');
  const header = path.join(fixture.theme, 'header.php');
  const originalHeader = await readFile(header, 'utf8');

  try {
    await writeFile(
      header,
      `${originalHeader}\n<?php // AWS_ACCESS_KEY_ID DATABASE_URL AUTH_KEY GITLAB_TOKEN DEPLOY_SECRET SESSION_TOKEN ADMIN_PASSWORD\n`,
      'utf8',
    );
    await execFile(process.execPath, [fixture.script]);
    assert.ok((await stat(fixture.archive)).isFile());
  } finally {
    await rm(fixture.directory, { force: true, recursive: true });
  }
});

test('packaging permits exact runtime environment references without literal fallbacks', async () => {
  const fixture = await createPackageFixture('velour-package-runtime-secrets-');
  const phpFile = path.join(fixture.theme, 'header.php');
  const jsFile = path.join(fixture.theme, 'assets/js/velour.js');
  const originalPhp = await readFile(phpFile, 'utf8');
  const originalJs = await readFile(jsFile, 'utf8');
  const accepted = [
    [phpFile, originalPhp, "<?php $API_TOKEN = getenv( 'API_TOKEN' ); ?>"],
    [phpFile, originalPhp, "<?php $config = array( 'client_secret' => getenv( 'CLIENT_SECRET' ) ); ?>"],
    [phpFile, originalPhp, "<?php $config = [ 'client_secret' => getenv( 'CLIENT_SECRET' ) ]; ?>"],
    [phpFile, originalPhp, "<?php $config = [ 'client_secret' => getenv( 'CLIENT_SECRET' ), 'api_token' => $_ENV['API_TOKEN'] ]; ?>"],
    [phpFile, originalPhp, "<?php define( 'AUTH_KEY', getenv( 'AUTH_KEY' ) ); ?>"],
    [phpFile, originalPhp, "<?php $API_TOKEN = $_ENV['API_TOKEN']; ?>"],
    [phpFile, originalPhp, "<?php $API_TOKEN = $_SERVER['API_TOKEN']; ?>"],
    [phpFile, originalPhp, "<?php $API_TOKEN = $_ENV['API_TOKEN'] ?? $_SERVER['API_TOKEN']; ?>"],
    [phpFile, originalPhp, "<?php $api_token = getenv( 'API_TOKEN' ); ?>"],
    [phpFile, originalPhp, "<?php $client_secret = $_ENV['CLIENT_SECRET']; ?>"],
    [phpFile, originalPhp, "<?php $admin_password = $_SERVER['ADMIN_PASSWORD']; ?>"],
    [phpFile, originalPhp, "<?php $config['api_token'] = getenv( 'API_TOKEN' ); ?>"],
    [phpFile, originalPhp, "<?php define( 'api_token', getenv( 'API_TOKEN' ) ); ?>"],
    [phpFile, originalPhp, "<?php define( 'auth_key', getenv( 'AUTH_KEY' ) ); ?>"],
    [jsFile, originalJs, 'const API_TOKEN = process.env.API_TOKEN;'],
    [jsFile, originalJs, 'const API_TOKEN = globalThis.process?.env?.API_TOKEN;'],
    [jsFile, originalJs, "const API_TOKEN = process.env['API_TOKEN'];"],
    [jsFile, originalJs, 'const config = { client_secret: process.env.CLIENT_SECRET };'],
    [jsFile, originalJs, 'const config = { client_secret: process.env.CLIENT_SECRET, api_token: process.env.API_TOKEN };'],
  ];

  try {
    for (const [file, original, source] of accepted) {
      await writeFile(phpFile, originalPhp, 'utf8');
      await writeFile(jsFile, originalJs, 'utf8');
      await writeFile(file, `${original}\n${source}\n`, 'utf8');
      await execFile(process.execPath, [fixture.script]);
      assert.ok((await stat(fixture.archive)).isFile(), source);
    }
  } finally {
    await rm(fixture.directory, { force: true, recursive: true });
  }
});

test('packaging rejects runtime references with literal fallbacks or concatenations', async () => {
  const fixture = await createPackageFixture('velour-package-runtime-fallbacks-');
  const phpFile = path.join(fixture.theme, 'header.php');
  const jsFile = path.join(fixture.theme, 'assets/js/velour.js');
  const originalPhp = await readFile(phpFile, 'utf8');
  const originalJs = await readFile(jsFile, 'utf8');
  const rejected = [
    [phpFile, originalPhp, "<?php $API_TOKEN = getenv( 'API_TOKEN' ) ?: 'literal-fallback-secret-0123456789'; ?>"],
    [phpFile, originalPhp, "<?php $config = array( 'client_secret' => getenv( 'CLIENT_SECRET' ) . 'literal-secret-0123456789' ); ?>"],
    [phpFile, originalPhp, "<?php $API_TOKEN = $_ENV['API_TOKEN'] ?? 'literal-fallback-secret-0123456789'; ?>"],
    [phpFile, originalPhp, "<?php $API_TOKEN = $_SERVER['API_TOKEN'] . 'literal-secret-0123456789'; ?>"],
    [jsFile, originalJs, "const API_TOKEN = process.env.API_TOKEN || 'literal-fallback-secret-0123456789';"],
    [jsFile, originalJs, "const API_TOKEN = globalThis.process?.env?.API_TOKEN + 'literal-secret-0123456789';"],
    [phpFile, originalPhp, "<?php $API_TOKEN = getenv( 'API_TOKEN' )\n    ?: 'literal-fallback-secret-0123456789'; ?>"],
    [jsFile, originalJs, "const API_TOKEN = process.env.API_TOKEN\n  + 'literal-secret-0123456789';"],
  ];

  try {
    await execFile(process.execPath, [fixture.script]);
    const archiveHash = await sha256(fixture.archive);

    for (const [file, original, source] of rejected) {
      await writeFile(phpFile, originalPhp, 'utf8');
      await writeFile(jsFile, originalJs, 'utf8');
      await writeFile(file, `${original}\n${source}\n`, 'utf8');
      await assert.rejects(
        execFile(process.execPath, [fixture.script]),
        /Forbidden .+ found in (?:header\.php|assets\/js\/velour\.js)/,
        source,
      );
      assert.equal(await sha256(fixture.archive), archiveHash, source);
    }
  } finally {
    await rm(fixture.directory, { force: true, recursive: true });
  }
});

test('packaging rejects lowercase, indexed, and define credential literals and fallbacks', async () => {
  const fixture = await createPackageFixture('velour-package-php-credential-shapes-');
  const phpFile = path.join(fixture.theme, 'header.php');
  const originalPhp = await readFile(phpFile, 'utf8');
  const rejected = [
    "<?php $api_token = 'literal-secret-0123456789'; ?>",
    "<?php $api_token = getenv( 'API_TOKEN' ) ?: 'literal-secret-0123456789'; ?>",
    "<?php $api_token = getenv( 'API_TOKEN' ) . 'literal-secret-0123456789'; ?>",
    "<?php $client_secret = 'literal-secret-0123456789'; ?>",
    "<?php $admin_password = 'literal-secret-0123456789'; ?>",
    "<?php $private_key = 'literal-secret-0123456789'; ?>",
    "<?php $service_token = 'literal-secret-0123456789'; ?>",
    "<?php $config['api_token'] = 'literal-secret-0123456789'; ?>",
    "<?php define( 'API_TOKEN', 'literal-secret-0123456789' ); ?>",
    "<?php define( 'auth_key', 'literal-secret-0123456789' ); ?>",
    "<?php define( 'secure_auth_salt', getenv( 'SECURE_AUTH_SALT' ) ?: 'literal-secret-0123456789' ); ?>",
    "<?php $config['api_token'] = getenv( 'API_TOKEN' ) ?: 'literal-secret-0123456789'; ?>",
    "<?php $config['client_secret'] = $_ENV['CLIENT_SECRET'] . 'literal-secret-0123456789'; ?>",
    "<?php define( 'API_TOKEN', getenv( 'API_TOKEN' ) ?: 'literal-secret-0123456789' ); ?>",
    "<?php define( 'CLIENT_SECRET', getenv( 'CLIENT_SECRET' ) . 'literal-secret-0123456789' ); ?>",
    "<?php $api_token = getenv( 'API_TOKEN' )\n    ?: 'literal-secret-0123456789'; ?>",
    "<?php $config['api_token'] = $_SERVER['API_TOKEN']\n    . 'literal-secret-0123456789'; ?>",
    "<?php define( 'ADMIN_PASSWORD', getenv( 'ADMIN_PASSWORD' )\n    ?: 'literal-secret-0123456789' ); ?>",
  ];

  try {
    await execFile(process.execPath, [fixture.script]);
    const archiveHash = await sha256(fixture.archive);

    for (const source of rejected) {
      await writeFile(phpFile, `${originalPhp}\n${source}\n`, 'utf8');
      await assert.rejects(
        execFile(process.execPath, [fixture.script]),
        /Forbidden .+ found in header\.php/,
        source,
      );
      assert.equal(await sha256(fixture.archive), archiveHash, source);
    }
  } finally {
    await rm(fixture.directory, { force: true, recursive: true });
  }
});

test('packaging rejects malformed UTF-8 in a text file and preserves the previous archive', async () => {
  const fixture = await createPackageFixture('velour-package-invalid-text-');
  const header = path.join(fixture.theme, 'header.php');

  try {
    await execFile(process.execPath, [fixture.script]);
    const archiveHash = await sha256(fixture.archive);
    await writeFile(header, Buffer.from([0xc3, 0x28]));

    await assert.rejects(
      execFile(process.execPath, [fixture.script]),
      /Packaged text file is not valid UTF-8: header\.php/,
    );
    assert.equal(await sha256(fixture.archive), archiveHash);
  } finally {
    await rm(fixture.directory, { force: true, recursive: true });
  }
});

test('cleanup attempts every operation and preserves the original packaging error', async () => {
  const moduleUrl = `${pathToFileURL(packageScript).href}?cleanup-test=${Date.now()}`;
  const { settleCleanup } = await import(moduleUrl);
  const originalError = new Error('original packaging failure');
  let secondCleanupAttempted = false;

  await assert.rejects(
    settleCleanup([
      async () => {
        throw new Error('temporary ZIP cleanup failed');
      },
      async () => {
        secondCleanupAttempted = true;
      },
    ], originalError),
    (error) => error === originalError && error.cleanupErrors?.length === 1,
  );
  assert.equal(secondCleanupAttempted, true);

  const frozenError = Object.freeze(new Error('non-extensible packaging failure'));
  await assert.rejects(
    settleCleanup([async () => {
      throw new Error('cleanup also failed');
    }], frozenError),
    (error) => error === frozenError,
  );
});
