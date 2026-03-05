const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config({ path: './server/.env' });

const app = express();
const port = Number(process.env.PORT || 3000);
const AI_PROVIDER = (process.env.AI_PROVIDER || 'google').toLowerCase();

const AIML_API_URL = process.env.AIML_API_URL || 'https://api.aimlapi.com/v1/chat/completions';
const AIML_MODEL = process.env.AIML_MODEL || 'gpt-4o-mini';
const AIML_API_KEY = process.env.AIML_API_KEY || '';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_BASE_URL = process.env.GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS || 'gemini-2.5-flash,gemini-flash-latest,gemini-2.0-flash')
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean);

app.use(cors());
app.use(express.json({ limit: '20mb' }));

function requireAIMLKey() {
  if (!AIML_API_KEY) {
    const err = new Error('Missing AIML_API_KEY in server/.env');
    err.status = 500;
    throw err;
  }
}

async function callAIML(messages, maxTokens = 800) {
  requireAIMLKey();

  const response = await fetch(AIML_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AIML_API_KEY}`,
    },
    body: JSON.stringify({
      model: AIML_MODEL,
      max_tokens: maxTokens,
      messages,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || `AIML API error ${response.status}`);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No response content from AI model');
  }

  return content;
}

function requireGeminiKey() {
  if (!GEMINI_API_KEY) {
    const err = new Error('Missing GEMINI_API_KEY in server/.env');
    err.status = 500;
    throw err;
  }
}

function parseDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1] || 'image/jpeg',
    data: match[2] || '',
  };
}

function toGeminiContents(messages) {
  return (messages || []).map((message) => {
    const parts = [];
    const content = message?.content;

    if (typeof content === 'string') {
      parts.push({ text: content });
    } else if (Array.isArray(content)) {
      content.forEach((item) => {
        if (item?.type === 'text' && item?.text) {
          parts.push({ text: item.text });
        }
        if (item?.type === 'image_url' && item?.image_url?.url) {
          const parsed = parseDataUrl(item.image_url.url);
          if (parsed) {
            parts.push({
              inlineData: {
                mimeType: parsed.mimeType,
                data: parsed.data,
              },
            });
          }
        }
      });
    }

    return {
      role: message?.role === 'assistant' ? 'model' : 'user',
      parts,
    };
  });
}

async function callGemini(messages, maxTokens = 800, forceJson = false, responseSchema = null) {
  requireGeminiKey();

  const modelsToTry = [GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS.filter((model) => model !== GEMINI_MODEL)];
  let lastErrorMessage = 'Gemini request failed';

  for (const model of modelsToTry) {
    const response = await fetch(`${GEMINI_API_BASE_URL}/${model}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: toGeminiContents(messages),
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: maxTokens,
          ...(forceJson ? { responseMimeType: 'application/json' } : {}),
          ...((forceJson && responseSchema) ? { responseSchema } : {}),
        },
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.error?.message || data?.message || `Gemini API error ${response.status}`;
      lastErrorMessage = message;
      const unavailableModel = /not found|not available|not supported/i.test(message);
      if (unavailableModel) {
        continue;
      }
      throw new Error(message);
    }

    const parts = data?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts) || parts.length === 0) {
      lastErrorMessage = `No response content from Gemini model ${model}`;
      continue;
    }

    const text = parts
      .map((part) => part?.text || '')
      .join('')
      .trim();

    if (text) {
      return text;
    }
    lastErrorMessage = `Gemini model ${model} returned empty text response`;
  }

  throw new Error(lastErrorMessage);
}

async function callModel(messages, maxTokens = 800, forceJson = false, responseSchema = null) {
  if (AI_PROVIDER === 'aiml') {
    return callAIML(messages, maxTokens);
  }
  return callGemini(messages, maxTokens, forceJson, responseSchema);
}

async function parseOrRepairJson(rawText, contextLabel, maxTokens = 700) {
  try {
    return parseJsonFromModel(rawText);
  } catch {
    const repairPrompt = `Convert the following text into strict valid JSON only.
Context: ${contextLabel}
Rules:
- Return only JSON (no markdown, no explanation)
- If expecting a list, return a JSON array
- Use double quotes and valid numbers

Text:
${rawText}`;

    const repairedText = await callModel(
      [{ role: 'user', content: repairPrompt }],
      Math.min(Math.max(Number(maxTokens) || 700, 300), 1200),
      true
    );

    return parseJsonFromModel(repairedText);
  }
}

function extractReceiptItemsFromText(rawText) {
  if (typeof rawText !== 'string') return [];

  const lines = rawText
    .replace(/[\r\t]+/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed = [];
  const seen = new Set();

  for (const line of lines) {
    const match = line.match(/([A-Za-z][A-Za-z0-9\s&'\-]{1,60})\s+\$?(\d+(?:\.\d{2})?)/);
    if (!match) continue;

    const name = match[1].trim();
    const price = Number(match[2]);
    if (!name || !Number.isFinite(price)) continue;

    const key = `${name.toLowerCase()}-${price}`;
    if (seen.has(key)) continue;
    seen.add(key);

    parsed.push({
      name,
      price: Math.round(price * 100) / 100,
      category: 'other',
      isHealthy: false,
    });
  }

  return parsed.slice(0, 30);
}

function parseJsonFromModel(text) {
  if (typeof text !== 'string') {
    throw new Error('AI returned non-text response');
  }

  const cleaned = text.replace(/```json|```/gi, '').trim();

  const candidates = [];
  candidates.push(cleaned);

  const fencedMatches = cleaned.match(/\[[\s\S]*\]|\{[\s\S]*\}/g);
  if (Array.isArray(fencedMatches)) {
    fencedMatches.forEach((candidate) => candidates.push(candidate));
  }

  const balanced = extractBalancedJson(cleaned);
  if (balanced) {
    candidates.push(balanced);
  }

  for (const candidate of candidates) {
    const parsed = tryParseJson(candidate);
    if (parsed !== null) {
      return parsed;
    }
  }

  throw new Error('AI response was not valid JSON');
}

function tryParseJson(input) {
  if (typeof input !== 'string') return null;
  const normalized = normalizeJsonString(input);
  if (!normalized) return null;

  try {
    return JSON.parse(normalized);
  } catch {
    return null;
  }
}

function normalizeJsonString(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, '$1')
    .trim();
}

function extractBalancedJson(input) {
  if (typeof input !== 'string') return '';

  const startIndex = input.search(/[\[{]/);
  if (startIndex === -1) return '';

  const startChar = input[startIndex];
  const endChar = startChar === '[' ? ']' : '}';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = startIndex; i < input.length; i += 1) {
    const char = input[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === startChar) depth += 1;
    if (char === endChar) depth -= 1;

    if (depth === 0) {
      return input.slice(startIndex, i + 1);
    }
  }

  return '';
}

function toText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function toPositiveInt(value, fallback = 1) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) return Math.round(parsed);
  return fallback;
}

function normalizeRecipeResponse(recipe, sourceIngredients = []) {
  const inputIngredients = Array.isArray(sourceIngredients)
    ? sourceIngredients.map((item) => toText(item)).filter(Boolean)
    : [];

  const safeIngredients = Array.isArray(recipe?.ingredients)
    ? recipe.ingredients
        .map((item, index) => ({
          name: toText(item?.name, inputIngredients[index] || `Ingredient ${index + 1}`),
          amount: toText(item?.amount, 'as needed'),
        }))
        .filter((item) => item.name)
    : [];

  const finalIngredients = safeIngredients.length
    ? safeIngredients
    : inputIngredients.slice(0, 8).map((name) => ({ name, amount: 'as needed' }));

  const safeSteps = Array.isArray(recipe?.steps)
    ? recipe.steps
        .map((item, index) => ({
          step: toPositiveInt(item?.step, index + 1),
          instruction: toText(item?.instruction),
          duration: toText(item?.duration),
        }))
        .filter((step) => step.instruction)
    : [];

  const finalSteps = safeSteps.length
    ? safeSteps
    : [
        { step: 1, instruction: 'Prepare and measure all listed ingredients.' },
        { step: 2, instruction: 'Cook using your preferred method until flavors combine well.' },
        { step: 3, instruction: 'Taste, adjust seasoning, and serve warm.' },
      ];

  return {
    id: toText(recipe?.id, `recipe-${Date.now()}`),
    title: toText(recipe?.title, 'Custom Home Recipe'),
    description: toText(recipe?.description, 'A simple dish generated from your available ingredients.'),
    cuisine: toText(recipe?.cuisine, 'Any'),
    prepTime: toText(recipe?.prepTime, '15 mins'),
    cookTime: toText(recipe?.cookTime, '20 mins'),
    servings: toPositiveInt(recipe?.servings, 2),
    difficulty: toText(recipe?.difficulty, 'Medium'),
    calories: Number.isFinite(Number(recipe?.calories)) ? Number(recipe.calories) : null,
    tips: toText(recipe?.tips, 'Use fresh ingredients for best taste.'),
    ingredients: finalIngredients,
    steps: finalSteps,
  };
}

function normalizeReceiptItemsResponse(items) {
  if (!Array.isArray(items)) return [];

  const allowedCategories = new Set([
    'dairy', 'protein', 'vegetable', 'fruit', 'grain', 'snack', 'beverage', 'condiment', 'frozen', 'other',
  ]);

  const seen = new Set();
  const normalized = [];

  for (const item of items) {
    const name = toText(item?.name).replace(/\s+/g, ' ');
    const price = Number(item?.price);
    if (!name || !Number.isFinite(price) || price < 0) continue;

    const categoryRaw = toText(item?.category, 'other').toLowerCase();
    const category = allowedCategories.has(categoryRaw) ? categoryRaw : 'other';
    const key = `${name.toLowerCase()}-${Math.round(price * 100)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    normalized.push({
      name,
      price: Math.round(price * 100) / 100,
      category,
      isHealthy: Boolean(item?.isHealthy),
    });
  }

  return normalized.slice(0, 60);
}

function normalizeFridgeIngredientsResponse(items) {
  if (!Array.isArray(items)) return [];

  const allowedCategories = new Set([
    'dairy', 'protein', 'vegetable', 'fruit', 'grain', 'snack', 'beverage', 'condiment', 'frozen', 'other',
  ]);

  const seen = new Set();
  const normalized = [];

  for (const item of items) {
    const name = toText(item?.name).replace(/\s+/g, ' ');
    if (!name) continue;

    const quantity = toText(item?.quantity, '1');
    const categoryRaw = toText(item?.category, 'other').toLowerCase();
    const category = allowedCategories.has(categoryRaw) ? categoryRaw : 'other';
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    normalized.push({ name, quantity, category });
  }

  return normalized.slice(0, 80);
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    provider: AI_PROVIDER,
    model: AI_PROVIDER === 'aiml' ? AIML_MODEL : GEMINI_MODEL,
  });
});

app.post('/ai/scan-receipt', async (req, res) => {
  try {
    const { imageBase64, mimeType, maxOutputTokens } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const safeMimeType = /^image\/(jpeg|jpg|png|webp|heic|heif)$/i.test(String(mimeType || ''))
      ? String(mimeType).toLowerCase()
      : 'image/jpeg';

    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${safeMimeType};base64,${imageBase64}` },
          },
          {
            type: 'text',
            text: `Extract grocery line items from this receipt.
Rules:
- Return ONLY valid JSON array
- Include item name and unit/line price for each purchased food item
- Exclude subtotal, tax, total, card, payment, membership, cashier, IDs
- Keep abbreviated names if needed (example: "GV WHOLE GAL")
- Try to return as many valid food items as visible
Format:
[{"name":"Whole Milk","price":3.99,"category":"dairy","isHealthy":true}]
Categories: dairy, protein, vegetable, fruit, grain, snack, beverage, condiment, frozen, other`,
          },
        ],
      },
    ];

    const receiptSchema = {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          price: { type: 'NUMBER' },
          category: { type: 'STRING' },
          isHealthy: { type: 'BOOLEAN' },
        },
        required: ['name', 'price'],
      },
    };

    const text = await callModel(
      messages,
      Number(maxOutputTokens) || 1400,
      true,
      receiptSchema
    );

    let items;
    try {
      items = await parseOrRepairJson(text, 'receipt items array', Number(maxOutputTokens) || 1400);
    } catch {
      items = extractReceiptItemsFromText(text);
    }

    items = normalizeReceiptItemsResponse(Array.isArray(items) ? items : []);

    if (items.length < 3) {
      try {
        const retryMessages = [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:${safeMimeType};base64,${imageBase64}` },
              },
              {
                type: 'text',
                text: `Second pass OCR: previous extraction had too few items.
Return ONLY JSON array with as many grocery food line items as possible (target at least 8 when visible).
Use format [{"name":"string","price":0.0,"category":"other","isHealthy":false}].`,
              },
            ],
          },
        ];

        const retryText = await callModel(
          retryMessages,
          Math.max(Number(maxOutputTokens) || 1400, 1600),
          true,
          receiptSchema
        );

        let retryItems;
        try {
          retryItems = await parseOrRepairJson(retryText, 'receipt items array retry', Math.max(Number(maxOutputTokens) || 1400, 1600));
        } catch {
          retryItems = extractReceiptItemsFromText(retryText);
        }

        const normalizedRetryItems = normalizeReceiptItemsResponse(Array.isArray(retryItems) ? retryItems : []);
        if (normalizedRetryItems.length > items.length) {
          items = normalizedRetryItems;
        }
      } catch {
      }
    }

    res.json({ items: Array.isArray(items) ? items : [] });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Receipt scan failed' });
  }
});

app.post('/ai/scan-fridge', async (req, res) => {
  try {
    const { imageBase64, mimeType, maxOutputTokens } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const safeMimeType = /^image\/(jpeg|jpg|png|webp|heic|heif)$/i.test(String(mimeType || ''))
      ? String(mimeType).toLowerCase()
      : 'image/jpeg';

    const messages = [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${safeMimeType};base64,${imageBase64}` } },
          {
            type: 'text',
            text: `Analyze this fridge image and list all visible food ingredients.
Rules:
- Return ONLY valid JSON array
- Exclude non-food items and packaging-only text when unclear
- Include as many visible ingredients as possible
Format:
[{"name":"eggs","quantity":"6","category":"protein"}]
Categories: dairy, protein, vegetable, fruit, grain, snack, beverage, condiment, frozen, other`,
          },
        ],
      },
    ];

    const fridgeSchema = {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          quantity: { type: 'STRING' },
          category: { type: 'STRING' },
        },
        required: ['name'],
      },
    };

    const text = await callModel(messages, Number(maxOutputTokens) || 1200, true, fridgeSchema);
    const parsed = await parseOrRepairJson(text, 'fridge ingredients array', Number(maxOutputTokens) || 1200);
    let ingredients = normalizeFridgeIngredientsResponse(Array.isArray(parsed) ? parsed : []);

    if (ingredients.length < 2) {
      try {
        const retryText = await callModel([
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:${safeMimeType};base64,${imageBase64}` } },
              {
                type: 'text',
                text: 'Second pass: extract all visible edible ingredients from this fridge image. Return ONLY JSON array as [{"name":"item","quantity":"1","category":"other"}].',
              },
            ],
          },
        ], Math.max(Number(maxOutputTokens) || 1200, 1400), true, fridgeSchema);

        const retryParsed = await parseOrRepairJson(retryText, 'fridge ingredients array retry', Math.max(Number(maxOutputTokens) || 1200, 1400));
        const retryIngredients = normalizeFridgeIngredientsResponse(Array.isArray(retryParsed) ? retryParsed : []);
        if (retryIngredients.length > ingredients.length) {
          ingredients = retryIngredients;
        }
      } catch {
      }
    }

    res.json({ ingredients });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Fridge scan failed' });
  }
});

app.post('/ai/generate-recipe', async (req, res) => {
  try {
    const { ingredients = [], cuisinePreference = 'any', maxOutputTokens } = req.body || {};
    const ingredientList = Array.isArray(ingredients) ? ingredients : [];
    const messages = [
      {
        role: 'user',
        content: `Create one practical recipe using these ingredients: ${ingredientList.join(', ')}. Cuisine preference: ${cuisinePreference}. Return ONLY strict JSON with this shape: {"title":"string","description":"string","cuisine":"string","prepTime":"string","cookTime":"string","servings":2,"difficulty":"Easy|Medium|Hard","calories":450,"ingredients":[{"name":"string","amount":"string"}],"steps":[{"step":1,"instruction":"string","duration":"string"}],"tips":"string"}. Include at least 3 ingredients and 3 steps.`,
      },
    ];

    const recipeSchema = {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        description: { type: 'STRING' },
        cuisine: { type: 'STRING' },
        prepTime: { type: 'STRING' },
        cookTime: { type: 'STRING' },
        servings: { type: 'NUMBER' },
        difficulty: { type: 'STRING' },
        calories: { type: 'NUMBER' },
        ingredients: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              name: { type: 'STRING' },
              amount: { type: 'STRING' },
            },
            required: ['name'],
          },
        },
        steps: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              step: { type: 'NUMBER' },
              instruction: { type: 'STRING' },
              duration: { type: 'STRING' },
            },
            required: ['step', 'instruction'],
          },
        },
        tips: { type: 'STRING' },
      },
      required: ['title', 'ingredients', 'steps'],
    };

    const text = await callModel(
      messages,
      Number(maxOutputTokens) || 1100,
      true,
      recipeSchema
    );
    const parsed = await parseOrRepairJson(text, 'recipe object', Number(maxOutputTokens) || 1100);
    const normalizedRecipe = normalizeRecipeResponse(parsed, ingredientList);
    res.json({ recipe: normalizedRecipe });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Recipe generation failed' });
  }
});

app.post('/ai/generate-swaps', async (req, res) => {
  try {
    const { items = [], maxOutputTokens } = req.body || {};
    const itemNames = items.map((i) => i.name).filter(Boolean).join(', ');

    const messages = [
      {
        role: 'user',
        content: `Suggest healthier and cheaper swaps for: ${itemNames}. Return ONLY JSON array with original, healthierSwap, healthierReason, cheaperSwap, cheaperReason, savings.`,
      },
    ];

    const text = await callModel(messages, Number(maxOutputTokens) || 900, true);
    const swaps = await parseOrRepairJson(text, 'swap suggestions array', Number(maxOutputTokens) || 900);
    res.json({ swaps: Array.isArray(swaps) ? swaps : [] });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Swap generation failed' });
  }
});

app.post('/ai/weekly-summary', async (req, res) => {
  try {
    const { metrics = {}, maxOutputTokens } = req.body || {};
    const messages = [
      {
        role: 'user',
        content: `Write a friendly 2-sentence weekly summary from this JSON: ${JSON.stringify(metrics)}. No markdown.`,
      },
    ];

    const summary = await callModel(messages, Number(maxOutputTokens) || 180);
    res.json({ summary: String(summary).trim() });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Weekly summary generation failed' });
  }
});

app.use((err, _req, res, _next) => {
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const server = app.listen(port, () => {
  console.log(`AI backend running on http://localhost:${port}`);
});

server.on('error', (error) => {
  if (error?.code === 'EADDRINUSE') {
    console.log(`Port ${port} is already in use. Existing API server is likely already running.`);
    process.exit(0);
    return;
  }

  console.error(error);
  process.exit(1);
});
