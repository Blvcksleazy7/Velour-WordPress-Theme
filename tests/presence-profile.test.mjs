import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const themeDirectory = fileURLToPath(new URL('../velour-standard/', import.meta.url));
const scriptPath = path.join(themeDirectory, 'assets/js/velour-presence.js');

async function loadPresenceModule({ fetch, document, setTimeoutFn = setTimeout } = {}) {
  const source = await readFile(scriptPath, 'utf8');
  const context = vm.createContext({
    AbortController,
    URL,
    URLSearchParams,
    clearTimeout,
    console,
    document: document ?? { addEventListener() {}, querySelector() { return null; }, readyState: 'complete' },
    fetch: fetch ?? (async () => { throw new Error('Unexpected request'); }),
    globalThis: {
      velourPresence: {
        nonce: 'rest-nonce',
        productsUrl: 'https://velour.test/wp-json/velour/v1/products',
        recommendationUrl: 'https://velour.test/wp-json/velour/v1/recommendations',
      },
    },
    setTimeout: setTimeoutFn,
  });

  vm.runInContext(source, context, { filename: scriptPath });
  return context.globalThis;
}

function jsonResponse(payload, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    async text() {
      return typeof payload === 'string' ? payload : JSON.stringify(payload);
    },
  };
}

test('skip resolves a static result without requesting a recommendation', async () => {
  const requests = [];
  const api = await loadPresenceModule({
    fetch: async (url) => {
      requests.push(url);
      return jsonResponse({ products: [] });
    },
  });

  const result = await api.completePresenceProfile({ archetype: 'minimalist' }, { skip: true });

  assert.equal(result.key, 'minimalist');
  assert.equal(result.source, 'static');
  assert.equal(requests.some((url) => String(url).includes('/recommendations')), false);
});

test('a valid recommendation response is normalized and preserves returned handles', async () => {
  let submittedBody;
  const api = await loadPresenceModule({
    fetch: async (url, options) => {
      submittedBody = JSON.parse(options.body);
      return jsonResponse({
      profile: 'The Quiet Visionary',
      tagline: 'Light, warmth, intention.',
      personality_message: 'You lead through considered detail.',
      why_it_suits_you: 'Amber and musk echo your measured warmth.',
      scent_mood: 'Amber, musk and luminous woods.',
      recommended_fragrances: [
        { title: 'Noble Blush', handle: 'noble-blush', reason: 'Soft confidence.' },
        { title: 'Ana Rouge Musk', handle: 'ana-rouge-musk', reason: 'A composed trail.' },
      ],
      recommended_displays: [
        { title: 'Scent Display Tray', handle: 'scent-display-tray' },
      ],
      });
    },
  });

  const result = await api.requestPresenceRecommendation({ archetype: 'visionary', quiz_answers: [] });

  assert.equal(result.source, 'n8n');
  assert.equal(result.result.name, 'The Quiet Visionary');
  assert.deepEqual(
    Array.from(result.recommendedFragranceProducts, (item) => item.handle),
    ['noble-blush', 'ana-rouge-musk'],
  );
  assert.deepEqual(
    Array.from(result.recommendedDisplayProducts, (item) => item.handle),
    ['scent-display-tray'],
  );
  assert.equal(Object.hasOwn(submittedBody, 'email'), false);
});

test('email is forwarded only when it is explicitly present in the submitted payload', async () => {
  let submittedBody;
  const api = await loadPresenceModule({
    fetch: async (url, options) => {
      submittedBody = JSON.parse(options.body);
      return jsonResponse({
        profile: 'The Executive',
        tagline: 'Structured.',
        personality_message: 'Quiet command.',
        why_it_suits_you: 'A composed trail.',
        scent_mood: 'Woods and amber.',
        recommended_fragrances: [{ title: 'Club Intense Oud', handle: 'club-intense-oud' }],
        recommended_displays: [],
      });
    },
  });

  await api.requestPresenceRecommendation({
    archetype: 'executive',
    email: 'guest@example.com',
    quiz_answers: [],
  });

  assert.equal(submittedBody.email, 'guest@example.com');
});

test('an aborted recommendation request resolves the static fallback', async () => {
  const api = await loadPresenceModule({
    setTimeoutFn(callback) {
      queueMicrotask(callback);
      return 1;
    },
    fetch: async (url, options) => new Promise((resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new Error('aborted')));
    }),
  });

  const result = await api.requestPresenceRecommendation({ archetype: 'minimalist', quiz_answers: [] });

  assert.equal(result.key, 'minimalist');
  assert.equal(result.source, 'static');
});

for (const [name, responder] of [
  ['invalid JSON', async () => jsonResponse('{not-json')],
  ['invalid response shape', async () => jsonResponse({ profile: 'Incomplete' })],
  ['request rejection', async () => { throw new Error('network down'); }],
  ['rate limit response', async () => jsonResponse({ code: 'presence_rate_limited', data: { retry_after: 600 } }, { ok: false, status: 429 })],
]) {
  test(`${name} resolves the selected static fallback`, async () => {
    const api = await loadPresenceModule({ fetch: responder });
    const result = await api.requestPresenceRecommendation({ archetype: 'midnight', quiz_answers: [] });

    assert.equal(result.key, 'midnight');
    assert.equal(result.source, 'static');
    assert.equal(result.recommendedFragranceProducts.length, 3);
  });
}

test('static archetypes use the corrected live product handles', async () => {
  const api = await loadPresenceModule();
  const handles = ['executive', 'visionary', 'minimalist', 'midnight']
    .flatMap((key) => api.resolveStaticPresenceResult({ archetype: key }).recommendedFragranceProducts)
    .map((item) => item.handle);

  for (const handle of [
    'noble-blush',
    'badee-al-oud-sublime-copy',
    'ana-rouge-musk',
    'club-intense-oud',
  ]) {
    assert.ok(handles.includes(handle), handle);
  }

  const ritualHandles = api.resolveStaticPresenceResult({ archetype: 'executive' })
    .recommendedDisplayProducts.map((item) => item.handle);
  assert.deepEqual(Array.from(ritualHandles), ['scent-display-tray', 'executive-watch-display']);
});

test('gender remains a secondary signal that reorders products without changing the archetype', async () => {
  const api = await loadPresenceModule();
  const result = api.resolveStaticPresenceResult({
    archetype: 'visionary',
    gender_preference: 'feminine',
  });

  assert.equal(result.key, 'visionary');
  assert.equal(result.recommendedFragranceProducts[0].handle, 'ana-rouge-musk');
});

test('revealing a result renders product-owned actions, accessible names, and missing products accurately', async () => {
  const requests = [];
  const elements = new Map();
  for (const selector of [
    '[data-presence-result-title]',
    '[data-presence-result-line]',
    '[data-presence-result-summary]',
    '[data-presence-result-why]',
    '[data-presence-result-mood]',
    '[data-presence-status]',
    '[data-presence-fragrance-products]',
    '[data-presence-ritual-products]',
  ]) {
    elements.set(selector, { innerHTML: '', textContent: '' });
  }
  const document = {
    addEventListener() {},
    readyState: 'complete',
    querySelector(selector) { return elements.get(selector) ?? null; },
  };
  const api = await loadPresenceModule({
    document,
    fetch: async (url, options) => {
      requests.push({ url: String(url), body: JSON.parse(options.body) });
      return jsonResponse({
        products: [
          {
            handle: 'noble-blush',
            title: 'Noble Blush',
            available: true,
            image: '',
            priceHtml: '<span>R 899</span>',
            priceText: 'R 899',
            url: 'https://velour.test/product/noble-blush/',
            actionKind: 'quick_add',
            actionLabel: 'Add to cart',
            actionUrl: 'https://velour.test/cart/?add-to-cart=10',
          },
          {
            handle: 'signature-set',
            title: 'Signature Set',
            available: true,
            image: '',
            priceHtml: '<span>From R 1,499</span>',
            priceText: 'From R 1,499',
            url: 'https://velour.test/product/signature-set/',
            actionKind: 'select_options',
            actionLabel: 'Select options',
            actionUrl: 'https://velour.test/product/signature-set/',
          },
          {
            handle: 'collector-case',
            title: 'Collector Case',
            available: true,
            image: '',
            priceHtml: '<span>R 2,999</span>',
            priceText: 'R 2,999',
            url: 'https://velour.test/product/collector-case/',
            actionKind: 'buy_product',
            actionLabel: 'Buy product',
            actionUrl: 'https://partner.test/collector-case',
          },
          { handle: 'missing-scent', title: 'Missing Scent', missing: true },
        ],
      });
    },
  });

  const returnValue = api.revealPresenceResult({
    ...api.resolveStaticPresenceResult({ archetype: 'minimalist' }),
    recommendedFragranceProducts: [
      { title: 'Noble Blush', handle: 'noble-blush' },
      { title: 'Signature Set', handle: 'signature-set' },
      { title: 'Collector Case', handle: 'collector-case' },
      { title: 'Missing Scent', handle: 'missing-scent' },
    ],
    recommendedDisplayProducts: [],
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(returnValue, undefined);
  assert.deepEqual(Array.from(requests[0].body.handles), ['noble-blush', 'signature-set', 'collector-case', 'missing-scent']);
  assert.match(elements.get('[data-presence-fragrance-products]').innerHTML, /Noble Blush/);
  assert.match(elements.get('[data-presence-fragrance-products]').innerHTML, /Coming soon to Velour\./);
  assert.match(elements.get('[data-presence-fragrance-products]').innerHTML, /add-to-cart=10/);
  assert.match(elements.get('[data-presence-fragrance-products]').innerHTML, /Select options/);
  assert.match(elements.get('[data-presence-fragrance-products]').innerHTML, /Buy product/);
  assert.match(elements.get('[data-presence-fragrance-products]').innerHTML, /aria-label="Add to cart: Noble Blush"/);
  assert.match(elements.get('[data-presence-fragrance-products]').innerHTML, /aria-label="Select options: Signature Set"/);
  assert.match(elements.get('[data-presence-fragrance-products]').innerHTML, /aria-label="Buy product: Collector Case"/);
  assert.match(elements.get('[data-presence-fragrance-products]').innerHTML, /aria-label="View product: Noble Blush"/);
  assert.match(elements.get('[data-presence-fragrance-products]').innerHTML, /aria-label="View product: Signature Set"/);
  assert.match(elements.get('[data-presence-fragrance-products]').innerHTML, /aria-label="View product: Collector Case"/);
  assert.doesNotMatch(elements.get('[data-presence-fragrance-products]').innerHTML, /Signature Set[\s\S]*?Currently unavailable/);
  assert.doesNotMatch(elements.get('[data-presence-fragrance-products]').innerHTML, /\/cart\/add\.js/);
});

test('the result region is revealed and named before its live status is announced', async () => {
  const events = [];
  const status = {
    set textContent(value) {
      if (value) events.push('announce');
    },
  };
  const resultPanel = {
    classList: { add() { events.push('reveal'); } },
    focus() { events.push('focus'); },
  };
  const fields = new Map([
    ['[data-presence-status]', status],
    ['[data-presence-result-panel]', resultPanel],
  ]);
  const document = {
    addEventListener() {},
    readyState: 'complete',
    querySelector(selector) { return fields.get(selector) ?? null; },
    querySelectorAll() { return []; },
  };
  const api = await loadPresenceModule({ document });

  api.revealPresenceResult(api.resolveStaticPresenceResult({ archetype: 'executive' }));

  assert.ok(events.indexOf('reveal') >= 0);
  assert.ok(events.indexOf('announce') > events.indexOf('reveal'));
  assert.ok(events.indexOf('focus') > events.indexOf('reveal'));
});

test('the browser module exposes the required public interface without Shopify or Klaviyo calls', async () => {
  const source = await readFile(scriptPath, 'utf8');
  const api = await loadPresenceModule();

  assert.equal(typeof api.requestPresenceRecommendation, 'function');
  assert.equal(typeof api.revealPresenceResult, 'function');
  assert.match(source, /matches\('\[data-presence-skip\]'\)[\s\S]*?completePresenceProfile\(payload\(\), \{ skip: true \}\)/);
  assert.doesNotMatch(source, /\/cart\/add\.js|\/products\/[^'"`$]+\.js|Shopify|Klaviyo|klaviyo/i);
  assert.doesNotMatch(source, /n8n\.[a-z0-9.-]+|webhook\/velour/i);
});
