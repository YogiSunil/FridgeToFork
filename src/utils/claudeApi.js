const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || '';
const USE_MOCK_AI = process.env.EXPO_PUBLIC_USE_MOCK_AI === 'true';
const REQUEST_TIMEOUT_MS = 45000;
const MAX_RETRIES = 2;
const RETRY_BACKOFF_MS = 1200;
const CACHE_TTL_MS = 10 * 60 * 1000;
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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetry(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('timed out') ||
    message.includes('network request failed') ||
    message.includes('fetch failed') ||
    message.includes('failed to fetch')
  );
}

async function fetchWithRetry(url, options) {
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await withTimeout(fetch(url, options));
    } catch (error) {
      lastError = error;
      if (!shouldRetry(error) || attempt === MAX_RETRIES) {
        break;
      }
      await delay(RETRY_BACKOFF_MS * (attempt + 1));
    }
  }

  if (String(lastError?.message || '').toLowerCase().includes('timed out')) {
    throw new Error(`AI request timed out. Check API server and network reachability at ${API_BASE_URL}.`);
  }

  throw lastError || new Error('AI request failed');
}

async function postJson(path, payload) {
  if (!API_BASE_URL) {
    if (USE_MOCK_AI) {
      return getMockResponse(path, payload);
    }
    throw new Error('Missing EXPO_PUBLIC_API_BASE_URL. Set it in .env (use your computer LAN IP, not localhost, when testing on phone).');
  }

  const cacheKey = getCacheKey(path, payload);
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < CACHE_TTL_MS) {
    return cached.value;
  }

  const response = await fetchWithRetry(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

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

function getMockResponse(path, payload) {
  if (path === '/ai/scan-fridge') {
    return {
      ingredients: [
        { name: 'eggs', quantity: '6', category: 'protein' },
        { name: 'milk', quantity: '1 carton', category: 'dairy' },
        { name: 'tomatoes', quantity: '3', category: 'vegetable' },
      ],
    };
  }

  if (path === '/ai/generate-recipe') {
    const ingredientList = Array.isArray(payload?.ingredients) && payload.ingredients.length
      ? payload.ingredients
      : ['eggs', 'milk', 'tomatoes'];

    return {
      recipe: {
        title: 'Quick Fridge Omelette',
        description: 'A fast and tasty way to use your fridge ingredients.',
        cuisine: payload?.cuisinePreference || 'Any',
        prepTime: '5 mins',
        cookTime: '10 mins',
        servings: 2,
        difficulty: 'Easy',
        calories: 380,
        ingredients: ingredientList.map((name) => ({ name, amount: 'as needed' })),
        steps: [
          { step: 1, instruction: 'Whisk eggs and prep ingredients.', duration: '3 mins' },
          { step: 2, instruction: 'Cook on medium heat and stir gently.', duration: '7 mins' },
        ],
        tips: 'Add herbs for extra flavor.',
      },
    };
  }

  if (path === '/ai/scan-receipt') {
    return {
      items: [
        { name: 'Whole Milk', price: 3.99, category: 'dairy', isHealthy: true },
        { name: 'White Bread', price: 2.79, category: 'grain', isHealthy: false },
        { name: 'Tomatoes', price: 4.49, category: 'vegetable', isHealthy: true },
      ],
    };
  }

  if (path === '/ai/generate-swaps') {
    return {
      swaps: [
        {
          original: 'White Bread',
          healthierSwap: 'Whole Wheat Bread',
          healthierReason: 'Higher fiber and better satiety.',
          cheaperSwap: 'Store Brand Whole Wheat',
          cheaperReason: 'Similar nutrition at lower price.',
          savings: 0.8,
        },
      ],
    };
  }

  if (path === '/ai/weekly-summary') {
    return {
      summary: 'Nice progress this week. You balanced cooking at home with mindful grocery spending.',
    };
  }

  return {};
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function sanitizeImageBase64(base64) {
  const clean = normalizeText(base64);
  if (!clean) {
    return '';
  }
  const dataUrlMatch = clean.match(/^data:[^;]+;base64,(.+)$/i);
  return dataUrlMatch ? dataUrlMatch[1] : clean;
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

export async function scanFridge(input) {
  const imageBase64 = typeof input === 'string' ? input : input?.imageBase64;
  const mimeType = normalizeText(typeof input === 'string' ? 'image/jpeg' : input?.mimeType) || 'image/jpeg';

  const data = await postJson('/ai/scan-fridge', {
    imageBase64: sanitizeImageBase64(imageBase64),
    mimeType,
    budgetMode: 'low',
    output: 'json',
    maxOutputTokens: 1000,
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

export async function scanReceipt(input) {
  const imageBase64 = typeof input === 'string' ? input : input?.imageBase64;
  const mimeType = normalizeText(typeof input === 'string' ? 'image/jpeg' : input?.mimeType) || 'image/jpeg';

  const data = await postJson('/ai/scan-receipt', {
    imageBase64: sanitizeImageBase64(imageBase64),
    mimeType,
    budgetMode: 'low',
    output: 'json',
    maxOutputTokens: 1200,
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