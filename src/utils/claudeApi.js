const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || '';
const REQUEST_TIMEOUT_MS = 20000;
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_IMAGE_BASE64_CHARS = 500000;
const MAX_INGREDIENTS = 20;
const MAX_SWAP_ITEMS = 20;

const responseCache = new Map();

function withTimeout(promise, timeoutMs = REQUEST_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI request timed out')), timeoutMs);
    }),
  ]);
}

async function postJson(path, payload) {
  if (!API_BASE_URL) {
    throw new Error('Missing EXPO_PUBLIC_API_BASE_URL environment variable');
  }

  const cacheKey = getCacheKey(path, payload);
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < CACHE_TTL_MS) {
    return cached.value;
  }

  const response = await withTimeout(
    fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  );

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.error || data?.message || `AI request failed (${response.status})`;
    throw new Error(message);
  }

  responseCache.set(cacheKey, { value: data, savedAt: Date.now() });
  return data;
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function trimImageBase64(base64) {
  const clean = normalizeText(base64);
  if (!clean) {
    return '';
  }
  return clean.length > MAX_IMAGE_BASE64_CHARS ? clean.slice(0, MAX_IMAGE_BASE64_CHARS) : clean;
}

function normalizeIngredientNames(ingredients) {
  if (!Array.isArray(ingredients)) {
    return [];
  }

  return ingredients
    .map((item) => (typeof item === 'string' ? item : item?.name || ''))
    .map(normalizeText)
    .filter(Boolean)
    .slice(0, MAX_INGREDIENTS);
}

function normalizeItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      const name = normalizeText(item?.name || item);
      return name ? { name } : null;
    })
    .filter(Boolean)
    .slice(0, MAX_SWAP_ITEMS);
}

function compactMetrics(metrics) {
  if (!metrics || typeof metrics !== 'object') {
    return {};
  }

  const topIngredients = Array.isArray(metrics.topIngredients)
    ? metrics.topIngredients.map(normalizeText).filter(Boolean).slice(0, 5)
    : [];

  return {
    recipesCooked: Number(metrics.recipesCooked) || 0,
    totalSpend: Number(metrics.totalSpend) || 0,
    budgetGoal: Number(metrics.budgetGoal) || 0,
    streak: Number(metrics.streak) || 0,
    topIngredients,
  };
}

function getCacheKey(path, payload) {
  const safePayload = {
    ...payload,
    imageBase64: payload?.imageBase64
      ? `${payload.imageBase64.slice(0, 60)}...${payload.imageBase64.length}`
      : undefined,
  };
  return `${path}:${JSON.stringify(safePayload)}`;
}

export async function scanFridge(imageBase64) {
  const data = await postJson('/ai/scan-fridge', {
    imageBase64: trimImageBase64(imageBase64),
    budgetMode: 'low',
    output: 'json',
    maxOutputTokens: 400,
  });
  return Array.isArray(data?.ingredients) ? data.ingredients : [];
}

export async function generateRecipe(ingredients, cuisinePreference = 'any') {
  const data = await postJson('/ai/generate-recipe', {
    ingredients: normalizeIngredientNames(ingredients),
    cuisinePreference: normalizeText(cuisinePreference) || 'any',
    budgetMode: 'low',
    output: 'json',
    maxOutputTokens: 900,
    maxSteps: 7,
  });
  return data?.recipe || null;
}

export async function scanReceipt(imageBase64) {
  const data = await postJson('/ai/scan-receipt', {
    imageBase64: trimImageBase64(imageBase64),
    budgetMode: 'low',
    output: 'json',
    maxOutputTokens: 500,
  });
  return Array.isArray(data?.items) ? data.items : [];
}

export async function generateSwaps(items) {
  const data = await postJson('/ai/generate-swaps', {
    items: normalizeItems(items),
    budgetMode: 'low',
    output: 'json',
    maxOutputTokens: 700,
  });
  return Array.isArray(data?.swaps) ? data.swaps : [];
}

export async function generateWeeklySummary(metrics) {
  const data = await postJson('/ai/weekly-summary', {
    metrics: compactMetrics(metrics),
    budgetMode: 'low',
    maxOutputTokens: 120,
    maxSentences: 2,
  });
  return data?.summary || '';
}

export const scanFridgeWithClaude = scanFridge;
export const generateRecipeWithClaude = generateRecipe;
export const scanReceiptWithClaude = scanReceipt;
export const generateSwapsWithClaude = generateSwaps;