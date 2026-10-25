(() => {
  const config = globalThis.velourPresence || {};
  const ritualProducts = [
    { title: 'Scent Display Tray', handle: 'scent-display-tray' },
    { title: 'Executive Watch Display', handle: 'executive-watch-display' },
  ];
  const archetypes = {
    executive: {
      name: 'The Executive',
      line: 'Structured. Disciplined. Unforgettable.',
      summary: 'You move with quiet command. Your presence is built from clean decisions, sharp rituals and objects placed with intention.',
      why: 'This profile favours fragrances with structure, projection and a composed trail. The impression is authoritative, warm and controlled.',
      mood: 'Polished woods, dark amber, aromatic spice and a tailored evening finish.',
      fragrances: [
        { title: 'Asad', handle: 'asad-noir-woods' },
        { title: 'Club de Nuit Intense', handle: 'club-intense-oud' },
        { title: 'Fakhar Black', handle: 'fakhar-black-silk' },
      ],
    },
    visionary: {
      name: 'The Visionary',
      line: 'Creative. Magnetic. Distinctive.',
      summary: 'You are led by instinct, atmosphere and original taste. Your presence feels warm, expressive and slightly unexpected.',
      why: 'This direction blends texture with memorability: sweetness, amber and spice that feel creative without becoming loud.',
      mood: 'Amber warmth, soft spice, resinous sweetness and luminous depth.',
      fragrances: [
        { title: 'Vintage Radio', handle: 'vintage-radio-amber' },
        { title: 'Khamrah', handle: 'khamrah' },
        { title: 'Ana Abiyedh Rouge', handle: 'ana-rouge-musk' },
      ],
    },
    minimalist: {
      name: 'The Minimalist',
      line: 'Calm. Elegant. Intentional.',
      summary: 'Your luxury is restraint. You prefer clarity, soft materials, quiet confidence and details that never fight for attention.',
      why: 'This profile keeps scent close, elegant and cleanly memorable. It is refined enough for repetition and soft enough for a daily ritual.',
      mood: 'Creamy musk, pale florals, airy vanilla and smooth modern softness.',
      fragrances: [
        { title: 'Noble Blush', handle: 'noble-blush' },
        { title: "Bade'e Al Oud Amethyst", handle: 'badee-al-oud-sublime-copy' },
        { title: 'Ana Rouge Musk', handle: 'ana-rouge-musk' },
      ],
    },
    midnight: {
      name: 'The Midnight Presence',
      line: 'Mysterious. Intense. Unforgettable.',
      summary: 'You are drawn to shadow, velvet and lasting impact. Your presence is cinematic, private and difficult to erase from memory.',
      why: 'This profile leans into darker materials: oud, smoke, spice and dense warmth that stay behind after you leave.',
      mood: 'Oud, incense, smoked woods, burgundy warmth and nocturnal spice.',
      fragrances: [
        { title: 'Oud for Glory', handle: 'badee-al-oud-oud-for-glory' },
        { title: "Bade'e Al Oud", handle: 'badee-al-oud-reserve' },
        { title: 'Club de Nuit Intense', handle: 'club-intense-oud' },
      ],
    },
  };

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const cleanHandle = (value) => {
    const handle = String(value || '').trim().toLowerCase();
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(handle) ? handle : '';
  };

  const resultKey = (payload = {}) => (
    Object.prototype.hasOwnProperty.call(archetypes, payload.archetype) ? payload.archetype : 'executive'
  );

  const weightedFragrances = (items, preference) => {
    const weights = {
      masculine: { 'asad-noir-woods': 3, 'club-intense-oud': 3, 'fakhar-black-silk': 2, 'badee-al-oud-oud-for-glory': 3, 'badee-al-oud-reserve': 2 },
      feminine: { 'ana-rouge-musk': 3, 'noble-blush': 3, 'badee-al-oud-sublime-copy': 3, 'vintage-radio-amber': 1, khamrah: 1 },
      balanced: { 'vintage-radio-amber': 2, khamrah: 2, 'ana-rouge-musk': 2, 'badee-al-oud-reserve': 1, 'club-intense-oud': 1 },
      unspecified: {},
    };
    const selected = weights[preference] || weights.balanced;
    return items.map((item) => ({ ...item })).sort(
      (left, right) => (selected[right.handle] || 0) - (selected[left.handle] || 0),
    );
  };

  const resolveStaticPresenceResult = (payload = {}) => {
    const key = resultKey(payload);
    const result = archetypes[key];
    return {
      key,
      result: { ...result },
      archetype: result.name,
      fragranceFamily: result.mood,
      recommendedFragranceProducts: weightedFragrances(result.fragrances, payload.gender_preference),
      recommendedDisplayProducts: ritualProducts.map((item) => ({ ...item })),
      source: 'static',
    };
  };

  const normalizeItems = (items, maximum = 6) => {
    if (!Array.isArray(items) || items.length > maximum) return [];
    const seen = new Set();
    return items.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const handle = cleanHandle(item.handle);
      if (!handle || seen.has(handle)) return [];
      seen.add(handle);
      return [{
        title: String(item.title || item.name || handle).slice(0, 120),
        handle,
        reason: String(item.reason || '').slice(0, 300),
      }];
    });
  };

  const normalizeRecommendation = (payload, fallback) => {
    if (!payload || typeof payload !== 'object') return null;
    const fragrances = normalizeItems(payload.recommended_fragrances);
    const displays = normalizeItems(payload.recommended_displays);
    if (!fragrances.length) return null;
    const text = (value, defaultValue, maximum = 600) => (
      typeof value === 'string' && value.trim() ? value.trim().slice(0, maximum) : defaultValue
    );
    return {
      ...fallback,
      result: {
        name: text(payload.profile, fallback.result.name, 120),
        line: text(payload.tagline, fallback.result.line, 180),
        summary: text(payload.personality_message, fallback.result.summary),
        why: text(payload.why_it_suits_you, fallback.result.why),
        mood: text(payload.scent_mood, fallback.result.mood, 300),
      },
      recommendedFragranceProducts: fragrances,
      recommendedDisplayProducts: displays,
      source: 'n8n',
    };
  };

  const requestHeaders = () => {
    const headers = { 'Content-Type': 'application/json' };
    if (config.nonce) headers['X-WP-Nonce'] = config.nonce;
    return headers;
  };

  async function requestPresenceRecommendation(payload = {}) {
    const fallback = resolveStaticPresenceResult(payload);
    if (!config.recommendationUrl) return fallback;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(config.recommendationUrl, {
        method: 'POST',
        headers: requestHeaders(),
        signal: controller.signal,
        body: JSON.stringify(payload),
      });
      if (!response.ok) return fallback;
      const raw = await response.text();
      const recommendation = normalizeRecommendation(JSON.parse(raw), fallback);
      return recommendation || fallback;
    } catch (error) {
      return fallback;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function requestPresenceProducts(items) {
    const handles = Array.from(new Set(items.map((item) => cleanHandle(item.handle)).filter(Boolean))).slice(0, 8);
    if (!handles.length || !config.productsUrl) return [];
    try {
      const response = await fetch(config.productsUrl, {
        method: 'POST',
        headers: requestHeaders(),
        body: JSON.stringify({ handles }),
      });
      if (!response.ok) return [];
      const payload = JSON.parse(await response.text());
      return Array.isArray(payload.products) ? payload.products : [];
    } catch (error) {
      return [];
    }
  }

  const missingProduct = (item) => ({
    handle: item.handle,
    title: item.title,
    missing: true,
  });

  function productCard(product) {
    const title = escapeHtml(product.title || product.handle || 'Velour selection');
    if (product.missing) {
      return `<article class="velour-presence-product-card is-missing">
        <div class="velour-presence-product-image"><span aria-hidden="true">${title.slice(0, 1)}</span></div>
        <div><h3>${title}</h3><p>Coming soon to Velour.</p></div>
      </article>`;
    }
    const image = product.image
      ? `<img src="${escapeHtml(product.image)}" alt="${title}" loading="lazy">`
      : `<span aria-hidden="true">${title.slice(0, 1)}</span>`;
    const availability = product.available
      ? '<span class="velour-presence-availability">Available</span>'
      : '<span class="velour-presence-unavailable">Currently unavailable</span>';
    const action = product.actionUrl && product.actionLabel
      ? `<a class="velour-presence-add velour-presence-add--${escapeHtml(product.actionKind || 'view_product')}" href="${escapeHtml(product.actionUrl)}" aria-label="${escapeHtml(product.actionLabel)}: ${title}">${escapeHtml(product.actionLabel)}</a>`
      : '';
    return `<article class="velour-presence-product-card">
      <a class="velour-presence-product-image" href="${escapeHtml(product.url || '#')}" aria-label="View product: ${title}">${image}</a>
      <div><h3>${title}</h3><div class="velour-presence-price">${product.priceHtml || escapeHtml(product.priceText || 'Price unavailable')}</div>${availability}${action}</div>
    </article>`;
  }

  function hydrateProducts(grid, items) {
    if (!grid) return;
    grid.innerHTML = items.map((item) => productCard(missingProduct(item))).join('');
    requestPresenceProducts(items).then((products) => {
      const byHandle = new Map(products.map((product) => [product.handle, product]));
      grid.innerHTML = items.map((item) => productCard(byHandle.get(item.handle) || missingProduct(item))).join('');
    });
  }

  function revealPresenceResult(result) {
    if (typeof document === 'undefined') return;
    const resultPanel = document.querySelector('[data-presence-result-panel]');
    if (resultPanel) {
      document.querySelectorAll?.('[data-presence-step]').forEach((panel) => panel.classList.remove('is-active'));
      resultPanel.classList.add('is-active');
    }
    const fields = {
      '[data-presence-result-title]': result.result.name,
      '[data-presence-result-line]': result.result.line,
      '[data-presence-result-summary]': result.result.summary,
      '[data-presence-result-why]': result.result.why,
      '[data-presence-result-mood]': result.result.mood,
    };
    Object.entries(fields).forEach(([selector, value]) => {
      const element = document.querySelector(selector);
      if (element) element.textContent = value;
    });
    const status = document.querySelector('[data-presence-status]');
    if (status) status.textContent = 'Your Presence Profile is ready.';
    hydrateProducts(document.querySelector('[data-presence-fragrance-products]'), result.recommendedFragranceProducts || []);
    hydrateProducts(document.querySelector('[data-presence-ritual-products]'), result.recommendedDisplayProducts || []);
    if (resultPanel) {
      resultPanel.focus?.();
    }
  }

  async function completePresenceProfile(payload = {}, options = {}) {
    const result = options.skip
      ? resolveStaticPresenceResult(payload)
      : await requestPresenceRecommendation(payload);
    revealPresenceResult(result);
    return result;
  }

  function initVelourPresenceProfile(root = document) {
    const profile = root.querySelector('[data-presence-profile]');
    if (!profile) return;
    const panels = Array.from(profile.querySelectorAll('[data-presence-step]'));
    const progress = profile.querySelector('[data-presence-progress]');
    const scores = { executive: 0, visionary: 0, minimalist: 0, midnight: 0 };
    const answers = [];
    let step = 0;
    let genderPreference = 'balanced';

    const activateStep = (next) => {
      step = Math.max(0, Math.min(next, panels.length - 1));
      panels.forEach((panel) => panel.classList.toggle('is-active', Number(panel.dataset.presenceStep) === step));
      if (progress) progress.style.width = `${Math.min(100, (step / (panels.length - 1)) * 100)}%`;
      panels[step]?.focus?.();
    };
    const winner = () => Object.entries(scores).sort((left, right) => right[1] - left[1])[0][0];
    const payload = () => ({
      gender_preference: genderPreference,
      archetype: winner(),
      fragrance_family: archetypes[winner()].mood,
      quiz_answers: answers.slice(0, 8),
    });

    profile.addEventListener('click', (event) => {
      const control = event.target.closest?.('[data-presence-gender], [data-presence-answer], [data-presence-next], [data-presence-skip], [data-presence-retake]');
      if (!control) return;
      event.preventDefault();
      if (control.matches('[data-presence-retake]')) {
        Object.keys(scores).forEach((key) => { scores[key] = 0; });
        answers.splice(0);
        genderPreference = 'balanced';
        activateStep(0);
      } else if (control.matches('[data-presence-skip]')) {
        completePresenceProfile(payload(), { skip: true });
      } else if (control.matches('[data-presence-gender]')) {
        genderPreference = control.dataset.presenceGender || 'balanced';
        activateStep(step + 1);
      } else if (control.matches('[data-presence-answer]')) {
        const archetype = control.dataset.archetype;
        if (Object.prototype.hasOwnProperty.call(scores, archetype)) scores[archetype] += 1;
        answers.push({
          step,
          question: panels[step]?.querySelector('h2')?.textContent.trim() || '',
          answer: control.textContent.trim(),
          archetype,
        });
        activateStep(step + 1);
      } else {
        activateStep(step + 1);
      }
    });

    profile.querySelector('[data-presence-email-form]')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const requestPayload = payload();
      const email = event.currentTarget.querySelector('input[type="email"]')?.value.trim();
      if (email) requestPayload.email = email;
      completePresenceProfile(requestPayload);
    });
    activateStep(0);
  }

  globalThis.requestPresenceRecommendation = requestPresenceRecommendation;
  globalThis.revealPresenceResult = revealPresenceResult;
  globalThis.resolveStaticPresenceResult = resolveStaticPresenceResult;
  globalThis.completePresenceProfile = completePresenceProfile;
  globalThis.initVelourPresenceProfile = initVelourPresenceProfile;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => initVelourPresenceProfile(document));
    } else {
      initVelourPresenceProfile(document);
    }
  }
})();
